import { db } from "./db";
import { users, likes, dislikes, matches, messages, events, eventAttendees } from "@shared/schema";
import type { User, InsertUser, SafeUser, Match, Message, MatchWithUser, Event, EventWithAttendance } from "@shared/schema";
import { eq, and, or, ne, notInArray, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  createUser(data: InsertUser & { password: string }): Promise<SafeUser>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<SafeUser>;
  deleteUser(id: string): Promise<void>;

  getDiscoverProfiles(userId: string, caste: string, minAge: number, maxAge: number): Promise<SafeUser[]>;

  likeUser(fromUserId: string, toUserId: string): Promise<{ matched: boolean; matchId?: string }>;
  dislikeUser(fromUserId: string, toUserId: string): Promise<void>;

  getMatches(userId: string): Promise<MatchWithUser[]>;
  getMatch(matchId: string): Promise<Match | undefined>;

  getMessages(matchId: string): Promise<Message[]>;
  sendMessage(matchId: string, senderId: string, text: string): Promise<Message>;
  markMessagesRead(matchId: string, userId: string): Promise<void>;

  listEvents(userId: string): Promise<EventWithAttendance[]>;
  getEvent(eventId: string, userId: string): Promise<EventWithAttendance | undefined>;
  attendEvent(eventId: string, userId: string): Promise<void>;
  unattendEvent(eventId: string, userId: string): Promise<void>;

  getPendingVerifications(): Promise<SafeUser[]>;
  updateVerificationStatus(userId: string, status: "approved" | "rejected", isVerified?: boolean): Promise<void>;
  banUser(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createUser(data: InsertUser & { password: string }): Promise<SafeUser> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const id = randomUUID();
    const [user] = await db.insert(users).values({
      ...data,
      id,
      password: hashedPassword,
    }).returning();
    const { password: _, ...safe } = user;
    return safe;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<SafeUser> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    const { password: _, ...safe } = user;
    return safe;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getDiscoverProfiles(userId: string, caste: string, minAge: number = 18, maxAge: number = 80): Promise<SafeUser[]> {
    const likedRows = await db.select({ id: likes.toUserId }).from(likes).where(eq(likes.fromUserId, userId));
    const dislikedRows = await db.select({ id: dislikes.toUserId }).from(dislikes).where(eq(dislikes.fromUserId, userId));
    const excludeIds = [userId, ...likedRows.map(r => r.id), ...dislikedRows.map(r => r.id)];

    const query = db.select().from(users).where(
      and(
        eq(users.caste, caste as any),
        notInArray(users.id, excludeIds),
        sql`${users.age} >= ${minAge}`,
        sql`${users.age} <= ${maxAge}`,
      )
    ).limit(20);

    const results = await query;
    return results.map(({ password: _, ...safe }) => safe);
  }

  async likeUser(fromUserId: string, toUserId: string): Promise<{ matched: boolean; matchId?: string }> {
    await db.insert(likes).values({ id: randomUUID(), fromUserId, toUserId }).onConflictDoNothing();

    const [mutualLike] = await db.select().from(likes).where(
      and(eq(likes.fromUserId, toUserId), eq(likes.toUserId, fromUserId))
    );

    if (mutualLike) {
      const existingMatch = await db.select().from(matches).where(
        or(
          and(eq(matches.user1Id, fromUserId), eq(matches.user2Id, toUserId)),
          and(eq(matches.user1Id, toUserId), eq(matches.user2Id, fromUserId))
        )
      );
      if (existingMatch.length > 0) {
        return { matched: true, matchId: existingMatch[0].id };
      }
      const matchId = randomUUID();
      await db.insert(matches).values({ id: matchId, user1Id: fromUserId, user2Id: toUserId });
      return { matched: true, matchId };
    }

    return { matched: false };
  }

  async dislikeUser(fromUserId: string, toUserId: string): Promise<void> {
    await db.insert(dislikes).values({ id: randomUUID(), fromUserId, toUserId }).onConflictDoNothing();
  }

  async getMatches(userId: string): Promise<MatchWithUser[]> {
    const userMatches = await db.select().from(matches).where(
      or(eq(matches.user1Id, userId), eq(matches.user2Id, userId))
    ).orderBy(desc(matches.createdAt));

    const result: MatchWithUser[] = [];
    for (const match of userMatches) {
      const otherId = match.user1Id === userId ? match.user2Id : match.user1Id;
      const [otherUser] = await db.select().from(users).where(eq(users.id, otherId));
      if (!otherUser) continue;
      const { password: _, ...safeUser } = otherUser;

      const [lastMsg] = await db.select().from(messages)
        .where(eq(messages.matchId, match.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      const unreadRows = await db.select().from(messages).where(
        and(eq(messages.matchId, match.id), ne(messages.senderId, userId), sql`${messages.readAt} IS NULL`)
      );

      result.push({
        ...match,
        otherUser: safeUser,
        lastMessage: lastMsg || null,
        unreadCount: unreadRows.length,
      });
    }
    return result;
  }

  async getMatch(matchId: string): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
    return match;
  }

  async getMessages(matchId: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.matchId, matchId)).orderBy(messages.createdAt);
  }

  async sendMessage(matchId: string, senderId: string, text: string): Promise<Message> {
    const [msg] = await db.insert(messages).values({
      id: randomUUID(),
      matchId,
      senderId,
      text,
    }).returning();
    return msg;
  }

  async markMessagesRead(matchId: string, userId: string): Promise<void> {
    await db.update(messages).set({ readAt: new Date() }).where(
      and(eq(messages.matchId, matchId), ne(messages.senderId, userId), sql`${messages.readAt} IS NULL`)
    );
  }

  async listEvents(userId: string): Promise<EventWithAttendance[]> {
    const allEvents = await db.select().from(events).orderBy(events.date);
    const attending = await db.select().from(eventAttendees).where(eq(eventAttendees.userId, userId));
    const attendingSet = new Set(attending.map(a => a.eventId));
    return allEvents.map(e => ({ ...e, isAttending: attendingSet.has(e.id) }));
  }

  async getEvent(eventId: string, userId: string): Promise<EventWithAttendance | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return undefined;
    const [att] = await db.select().from(eventAttendees).where(
      and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId))
    );
    return { ...event, isAttending: !!att };
  }

  async attendEvent(eventId: string, userId: string): Promise<void> {
    await db.insert(eventAttendees).values({ id: randomUUID(), eventId, userId }).onConflictDoNothing();
    await db.update(events).set({ attendeeCount: sql`${events.attendeeCount} + 1` }).where(eq(events.id, eventId));
  }

  async unattendEvent(eventId: string, userId: string): Promise<void> {
    await db.delete(eventAttendees).where(
      and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId))
    );
    await db.update(events).set({ attendeeCount: sql`GREATEST(${events.attendeeCount} - 1, 0)` }).where(eq(events.id, eventId));
  }

  async getPendingVerifications(): Promise<SafeUser[]> {
    const pending = await db.select().from(users).where(eq(users.verificationStatus, "pending"));
    return pending.map(({ password: _, ...safe }) => safe);
  }

  async updateVerificationStatus(userId: string, status: "approved" | "rejected", isVerified?: boolean): Promise<void> {
    await db.update(users).set({
      verificationStatus: status,
      isVerified: isVerified ?? (status === "approved"),
    }).where(eq(users.id, userId));
  }

  async banUser(userId: string): Promise<void> {
    await db.update(users).set({
      verificationStatus: "rejected",
      isVerified: false,
    }).where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
