import { db } from "./db";
import { users, likes, dislikes, matches, messages, events, eventAttendees, reports, otpCodes, passkeys } from "@shared/schema";
import type { User, SafeUser, Match, Message, MatchWithUser, Event, EventWithAttendance, Report, InsertUser } from "@shared/schema";
import { eq, and, or, ne, notInArray, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUserById(id: string): Promise<User | undefined>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<SafeUser>;
  deleteUser(id: string): Promise<void>;

  getDiscoverProfiles(userId: string, caste: string, gender: string, minAge: number, maxAge: number): Promise<SafeUser[]>;

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
  updateVerificationStatus(userId: string, status: "approved" | "rejected" | "banned", isVerified?: boolean): Promise<void>;
  banUser(userId: string): Promise<void>;

  getUsersWithPendingPhotos(): Promise<SafeUser[]>;
  approvePendingPhoto(userId: string, photoIndex: number): Promise<void>;
  rejectPendingPhoto(userId: string, photoIndex: number): Promise<void>;

  createReport(reporterId: string, reportedUserId: string, reason: string, description: string): Promise<Report>;
  listReports(): Promise<Report[]>;
  resolveReport(reportId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<SafeUser> {
    const [updated] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    const userMatches = await db.select({ id: matches.id }).from(matches)
      .where(or(eq(matches.user1Id, id), eq(matches.user2Id, id)));
    if (userMatches.length > 0) {
      const matchIds = userMatches.map(m => m.id);
      for (const matchId of matchIds) {
        await db.delete(messages).where(eq(messages.matchId, matchId));
      }
      await db.delete(matches).where(or(eq(matches.user1Id, id), eq(matches.user2Id, id)));
    }
    await db.delete(likes).where(or(eq(likes.fromUserId, id), eq(likes.toUserId, id)));
    await db.delete(dislikes).where(or(eq(dislikes.fromUserId, id), eq(dislikes.toUserId, id)));
    await db.delete(eventAttendees).where(eq(eventAttendees.userId, id));
    await db.delete(reports).where(or(eq(reports.reporterId, id), eq(reports.reportedUserId, id)));
    await db.delete(otpCodes).where(sql`identifier IN (SELECT email FROM users WHERE id = ${id} UNION SELECT phone FROM users WHERE id = ${id})`);
    await db.delete(passkeys).where(eq(passkeys.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async getDiscoverProfiles(userId: string, caste: string, gender: string, minAge: number, maxAge: number): Promise<SafeUser[]> {
    const likedIds = db.select({ id: likes.toUserId }).from(likes).where(eq(likes.fromUserId, userId));
    const dislikedIds = db.select({ id: dislikes.toUserId }).from(dislikes).where(eq(dislikes.fromUserId, userId));
    const oppositeGender = gender === "male" ? "female" : "male";

    return db.select().from(users).where(
      and(
        ne(users.id, userId),
        eq(users.caste, caste as any),
        eq(users.gender, oppositeGender as any),
        sql`${users.age} >= ${minAge}`,
        sql`${users.age} <= ${maxAge}`,
        notInArray(users.id, likedIds),
        notInArray(users.id, dislikedIds),
        sql`${users.verificationStatus} != 'banned'`,
      )
    ).limit(50);
  }

  async likeUser(fromUserId: string, toUserId: string): Promise<{ matched: boolean; matchId?: string }> {
    await db.insert(likes).values({ id: randomUUID(), fromUserId, toUserId }).onConflictDoNothing();

    const [mutual] = await db.select().from(likes).where(
      and(eq(likes.fromUserId, toUserId), eq(likes.toUserId, fromUserId))
    );

    if (mutual) {
      const existingMatch = await db.select().from(matches).where(
        or(
          and(eq(matches.user1Id, fromUserId), eq(matches.user2Id, toUserId)),
          and(eq(matches.user1Id, toUserId), eq(matches.user2Id, fromUserId))
        )
      );
      if (existingMatch.length > 0) return { matched: true, matchId: existingMatch[0].id };

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

      const [lastMessage] = await db.select().from(messages)
        .where(eq(messages.matchId, match.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      const unreadRows = await db.select().from(messages).where(
        and(eq(messages.matchId, match.id), ne(messages.senderId, userId), sql`${messages.readAt} IS NULL`)
      );

      result.push({ ...match, otherUser, lastMessage: lastMessage || null, unreadCount: unreadRows.length });
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
    const [msg] = await db.insert(messages).values({ id: randomUUID(), matchId, senderId, text }).returning();
    return msg;
  }

  async markMessagesRead(matchId: string, userId: string): Promise<void> {
    await db.update(messages).set({ readAt: new Date() }).where(
      and(eq(messages.matchId, matchId), ne(messages.senderId, userId), sql`${messages.readAt} IS NULL`)
    );
  }

  async listEvents(userId: string): Promise<EventWithAttendance[]> {
    const allEvents = await db.select().from(events).orderBy(events.date);
    const attendedRows = await db.select().from(eventAttendees).where(eq(eventAttendees.userId, userId));
    const attendedIds = new Set(attendedRows.map(r => r.eventId));
    return allEvents.map(e => ({ ...e, isAttending: attendedIds.has(e.id), isCreator: e.creatorId === userId }));
  }

  async getEvent(eventId: string, userId: string): Promise<EventWithAttendance | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return undefined;
    const [attending] = await db.select().from(eventAttendees).where(
      and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId))
    );
    return { ...event, isAttending: !!attending, isCreator: event.creatorId === userId };
  }

  async attendEvent(eventId: string, userId: string): Promise<void> {
    await db.insert(eventAttendees).values({ id: randomUUID(), eventId, userId }).onConflictDoNothing();
    await db.update(events).set({ attendeeCount: sql`${events.attendeeCount} + 1` }).where(eq(events.id, eventId));
  }

  async unattendEvent(eventId: string, userId: string): Promise<void> {
    await db.delete(eventAttendees).where(
      and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId))
    );
    await db.update(events).set({ attendeeCount: sql`${events.attendeeCount} - 1` }).where(eq(events.id, eventId));
  }

  async getPendingVerifications(): Promise<SafeUser[]> {
    return db.select().from(users).where(eq(users.verificationStatus, "pending"));
  }

  async updateVerificationStatus(userId: string, status: "approved" | "rejected" | "banned", isVerified = false): Promise<void> {
    await db.update(users).set({ verificationStatus: status, isVerified, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async banUser(userId: string): Promise<void> {
    await db.update(users).set({ verificationStatus: "banned", isVerified: false, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async createReport(reporterId: string, reportedUserId: string, reason: string, description: string): Promise<Report> {
    const [report] = await db.insert(reports).values({
      id: randomUUID(), reporterId, reportedUserId, reason, description
    }).returning();
    return report;
  }

  async listReports(): Promise<Report[]> {
    return db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  async resolveReport(reportId: string): Promise<void> {
    await db.update(reports).set({ status: "resolved" }).where(eq(reports.id, reportId));
  }

  async getUsersWithPendingPhotos(): Promise<SafeUser[]> {
    const allUsers = await db.select().from(users);
    return allUsers.filter(u => u.pendingPhotos && u.pendingPhotos.length > 0);
  }

  async approvePendingPhoto(userId: string, photoIndex: number): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;
    const pending = user.pendingPhotos ?? [];
    if (photoIndex < 0 || photoIndex >= pending.length) return;
    const photo = pending[photoIndex];
    const newPending = pending.filter((_, i) => i !== photoIndex);
    const newPhotos = [...(user.photos ?? []), photo];
    await db.update(users).set({ pendingPhotos: newPending, photos: newPhotos, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async rejectPendingPhoto(userId: string, photoIndex: number): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;
    const pending = user.pendingPhotos ?? [];
    if (photoIndex < 0 || photoIndex >= pending.length) return;
    const newPending = pending.filter((_, i) => i !== photoIndex);
    await db.update(users).set({ pendingPhotos: newPending, updatedAt: new Date() }).where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
