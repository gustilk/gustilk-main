import { db } from "./db";
import { users, likes, dislikes, matches, messages, events, eventAttendees, reports, otpCodes, passkeys, blocks, visitors, gifts, magicLinkTokens } from "@shared/schema";
import type { User, SafeUser, Match, Message, MatchWithUser, Event, EventWithAttendance, Report, InsertUser, PhotoSlot, Block, Gift } from "@shared/schema";
import { eq, and, or, ne, notInArray, desc, sql, isNotNull } from "drizzle-orm";
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
  updateVerificationStatus(userId: string, status: "approved" | "rejected" | "banned", isVerified?: boolean, reason?: string): Promise<void>;
  banUser(userId: string, reason?: string): Promise<void>;
  reapplyUser(userId: string, newSelfie?: string): Promise<void>;

  getUsersWithPendingPhotoSlots(): Promise<SafeUser[]>;
  approvePhotoSlot(userId: string, slotIdx: number): Promise<{ user: SafeUser }>;
  rejectPhotoSlot(userId: string, slotIdx: number, reason: string): Promise<{ user: SafeUser }>;
  setMainPhoto(userId: string, slotIdx: number): Promise<void>;

  sendGift(senderId: string, recipientId: string, matchId: string, giftType: string, message: string, animationStyle: string): Promise<Gift>;
  getGiftsInMatch(matchId: string): Promise<Gift[]>;
  getGiftsReceived(userId: string): Promise<Gift[]>;

  recordVisit(fromUserId: string, toUserId: string): Promise<void>;
  getVisitors(userId: string): Promise<{ user: SafeUser; createdAt: Date }[]>;
  getLikesReceived(userId: string): Promise<{ user: SafeUser; createdAt: Date }[]>;
  getLikesSent(userId: string): Promise<{ user: SafeUser; createdAt: Date }[]>;

  blockUser(blockerId: string, blockedId: string): Promise<void>;
  unblockUser(blockerId: string, blockedId: string): Promise<void>;
  getBlockedUsers(blockerId: string): Promise<SafeUser[]>;

  createReport(reporterId: string, reportedUserId: string, reason: string, description: string): Promise<Report>;
  listReports(): Promise<Report[]>;
  resolveReport(reportId: string): Promise<void>;
}

function getSlots(user: User): PhotoSlot[] {
  return (user.photoSlots as PhotoSlot[] | null) ?? [];
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
    await db.delete(gifts).where(or(eq(gifts.senderId, id), eq(gifts.recipientId, id)));
    await db.delete(visitors).where(or(eq(visitors.fromUserId, id), eq(visitors.toUserId, id)));
    await db.delete(blocks).where(or(eq(blocks.blockerId, id), eq(blocks.blockedId, id)));
    await db.delete(likes).where(or(eq(likes.fromUserId, id), eq(likes.toUserId, id)));
    await db.delete(dislikes).where(or(eq(dislikes.fromUserId, id), eq(dislikes.toUserId, id)));
    await db.delete(eventAttendees).where(eq(eventAttendees.userId, id));
    await db.delete(reports).where(or(eq(reports.reporterId, id), eq(reports.reportedUserId, id)));
    await db.delete(magicLinkTokens).where(eq(magicLinkTokens.userId, id));
    await db.delete(otpCodes).where(sql`identifier IN (SELECT email FROM users WHERE id = ${id} UNION SELECT phone FROM users WHERE id = ${id})`);
    await db.delete(passkeys).where(eq(passkeys.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async getDiscoverProfiles(userId: string, caste: string, gender: string, minAge: number, maxAge: number): Promise<SafeUser[]> {
    const likedIds = db.select({ id: likes.toUserId }).from(likes).where(eq(likes.fromUserId, userId));
    const dislikedIds = db.select({ id: dislikes.toUserId }).from(dislikes).where(eq(dislikes.fromUserId, userId));
    const blockedByMe = db.select({ id: blocks.blockedId }).from(blocks).where(eq(blocks.blockerId, userId));
    const blockedMe = db.select({ id: blocks.blockerId }).from(blocks).where(eq(blocks.blockedId, userId));
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
        notInArray(users.id, blockedByMe),
        notInArray(users.id, blockedMe),
        sql`${users.verificationStatus} != 'banned'`,
        eq(users.profileVisible, true),
        isNotNull(users.mainPhotoUrl),
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

    const blockedByMeRows = await db.select({ id: blocks.blockedId }).from(blocks).where(eq(blocks.blockerId, userId));
    const blockedMeRows = await db.select({ id: blocks.blockerId }).from(blocks).where(eq(blocks.blockedId, userId));
    const hiddenIds = new Set([...blockedByMeRows.map(r => r.id), ...blockedMeRows.map(r => r.id)]);

    const result: MatchWithUser[] = [];
    for (const match of userMatches) {
      const otherId = match.user1Id === userId ? match.user2Id : match.user1Id;
      if (hiddenIds.has(otherId)) continue;
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
    return db.select().from(users).where(
      sql`${users.verificationStatus} = 'pending'
        OR (
          ${users.photoSlots} IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(${users.photoSlots}::jsonb) AS slot
            WHERE slot->>'status' = 'pending'
          )
        )`
    );
  }

  async updateVerificationStatus(userId: string, status: "approved" | "rejected" | "banned", isVerified = false, reason?: string): Promise<void> {
    const user = await this.getUserById(userId);
    const history = ((user as any)?.applicationHistory as Array<{ action: string; reason?: string; date: string }> | null) ?? [];
    const updates: Record<string, unknown> = {
      verificationStatus: status,
      isVerified,
      updatedAt: new Date(),
      applicationHistory: [...history, { action: status, reason: reason ?? "", date: new Date().toISOString() }],
    };
    if (status === "approved") { updates.profileVisible = true; updates.rejectionReason = ""; }
    if (status === "rejected") { updates.profileVisible = false; updates.rejectionReason = reason ?? ""; }
    if (status === "banned") { updates.profileVisible = false; updates.rejectionReason = reason ?? ""; }
    await db.update(users).set(updates as any).where(eq(users.id, userId));
  }

  async banUser(userId: string, reason?: string): Promise<void> {
    const user = await this.getUserById(userId);
    const history = ((user as any)?.applicationHistory as Array<{ action: string; reason?: string; date: string }> | null) ?? [];
    await db.update(users).set({
      verificationStatus: "banned",
      isVerified: false,
      profileVisible: false,
      rejectionReason: reason ?? "",
      applicationHistory: [...history, { action: "banned", reason: reason ?? "", date: new Date().toISOString() }] as any,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
  }

  async reapplyUser(userId: string, newSelfie?: string): Promise<void> {
    const user = await this.getUserById(userId);
    const currentCount = ((user as any)?.applicationCount as number | null) ?? 1;
    const slots = getSlots(user!).map(s =>
      s.status === "rejected" ? { ...s, status: "pending" as const, reason: undefined } : s
    );
    const updates: Record<string, unknown> = {
      verificationStatus: "pending",
      isVerified: false,
      profileVisible: false,
      rejectionReason: "",
      applicationCount: currentCount + 1,
      photoSlots: slots,
      updatedAt: new Date(),
    };
    if (newSelfie) updates.verificationSelfie = newSelfie;
    await db.update(users).set(updates as any).where(eq(users.id, userId));
  }

  async getUsersWithPendingPhotoSlots(): Promise<SafeUser[]> {
    const allUsers = await db.select().from(users);
    return allUsers.filter(u => {
      const slots = getSlots(u);
      return slots.some(s => s.status === "pending");
    });
  }

  async approvePhotoSlot(userId: string, slotIdx: number): Promise<{ user: SafeUser }> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    const slots = [...getSlots(user)];
    if (slotIdx < 0 || slotIdx >= slots.length) throw new Error("Invalid slot index");

    slots[slotIdx] = { ...slots[slotIdx], status: "approved" };

    const approvedSlots = slots.filter(s => s.status === "approved");
    let mainPhotoUrl = user.mainPhotoUrl;
    if (!mainPhotoUrl && approvedSlots.length > 0) {
      mainPhotoUrl = approvedSlots[0].url;
      slots[slots.findIndex(s => s.url === mainPhotoUrl)] = {
        ...slots[slots.findIndex(s => s.url === mainPhotoUrl)],
        isMain: true,
      };
    }

    const [updated] = await db.update(users).set({
      photoSlots: slots,
      mainPhotoUrl: mainPhotoUrl ?? null,
      profileVisible: true,
      photos: approvedSlots.map(s => s.url),
      updatedAt: new Date(),
    }).where(eq(users.id, userId)).returning();
    return { user: updated };
  }

  async rejectPhotoSlot(userId: string, slotIdx: number, reason: string): Promise<{ user: SafeUser }> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    const slots = [...getSlots(user)];
    if (slotIdx < 0 || slotIdx >= slots.length) throw new Error("Invalid slot index");

    const rejectedUrl = slots[slotIdx].url;
    slots[slotIdx] = { ...slots[slotIdx], status: "rejected", reason, isMain: false };

    const approvedSlots = slots.filter(s => s.status === "approved");
    let mainPhotoUrl = user.mainPhotoUrl;
    if (mainPhotoUrl === rejectedUrl) {
      mainPhotoUrl = approvedSlots[0]?.url ?? null;
      if (mainPhotoUrl) {
        const newMainIdx = slots.findIndex(s => s.url === mainPhotoUrl);
        if (newMainIdx >= 0) slots[newMainIdx] = { ...slots[newMainIdx], isMain: true };
      }
    }

    const [updated] = await db.update(users).set({
      photoSlots: slots,
      mainPhotoUrl: mainPhotoUrl ?? null,
      photos: approvedSlots.map(s => s.url),
      updatedAt: new Date(),
    }).where(eq(users.id, userId)).returning();
    return { user: updated };
  }

  async setMainPhoto(userId: string, slotIdx: number): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;
    const slots = [...getSlots(user)];
    if (slotIdx < 0 || slotIdx >= slots.length) return;
    if (slots[slotIdx].status !== "approved") return;

    const newMain = slots[slotIdx].url;
    const updatedSlots = slots.map((s, i) => ({ ...s, isMain: i === slotIdx }));

    await db.update(users).set({
      photoSlots: updatedSlots,
      mainPhotoUrl: newMain,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
  }

  async sendGift(senderId: string, recipientId: string, matchId: string, giftType: string, message: string, animationStyle: string = "none"): Promise<Gift> {
    const [gift] = await db.insert(gifts).values({ id: randomUUID(), senderId, recipientId, matchId, giftType, message, animationStyle }).returning();
    return gift;
  }

  async getGiftsInMatch(matchId: string): Promise<Gift[]> {
    return db.select().from(gifts).where(eq(gifts.matchId, matchId)).orderBy(desc(gifts.createdAt));
  }

  async getGiftsReceived(userId: string): Promise<Gift[]> {
    return db.select().from(gifts).where(eq(gifts.recipientId, userId)).orderBy(desc(gifts.createdAt));
  }

  async recordVisit(fromUserId: string, toUserId: string): Promise<void> {
    if (fromUserId === toUserId) return;
    await db.insert(visitors).values({ id: randomUUID(), fromUserId, toUserId }).onConflictDoUpdate({
      target: [visitors.fromUserId, visitors.toUserId],
      set: { createdAt: new Date() },
    });
  }

  async getVisitors(userId: string): Promise<{ user: SafeUser; createdAt: Date }[]> {
    const rows = await db.select().from(visitors).where(eq(visitors.toUserId, userId)).orderBy(desc(visitors.createdAt));
    const result: { user: SafeUser; createdAt: Date }[] = [];
    for (const row of rows) {
      const [u] = await db.select().from(users).where(eq(users.id, row.fromUserId));
      if (u) result.push({ user: u, createdAt: row.createdAt! });
    }
    return result;
  }

  async getLikesReceived(userId: string): Promise<{ user: SafeUser; createdAt: Date }[]> {
    const rows = await db.select().from(likes).where(eq(likes.toUserId, userId)).orderBy(desc(likes.createdAt));
    const result: { user: SafeUser; createdAt: Date }[] = [];
    for (const row of rows) {
      const [u] = await db.select().from(users).where(eq(users.id, row.fromUserId));
      if (u) result.push({ user: u, createdAt: row.createdAt! });
    }
    return result;
  }

  async getLikesSent(userId: string): Promise<{ user: SafeUser; createdAt: Date }[]> {
    const rows = await db.select().from(likes).where(eq(likes.fromUserId, userId)).orderBy(desc(likes.createdAt));
    const result: { user: SafeUser; createdAt: Date }[] = [];
    for (const row of rows) {
      const [u] = await db.select().from(users).where(eq(users.id, row.toUserId));
      if (u) result.push({ user: u, createdAt: row.createdAt! });
    }
    return result;
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    await db.insert(blocks).values({ id: randomUUID(), blockerId, blockedId }).onConflictDoNothing();
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await db.delete(blocks).where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)));
  }

  async getBlockedUsers(blockerId: string): Promise<SafeUser[]> {
    const blockedRows = await db.select({ blockedId: blocks.blockedId }).from(blocks).where(eq(blocks.blockerId, blockerId));
    if (blockedRows.length === 0) return [];
    const result: SafeUser[] = [];
    for (const { blockedId } of blockedRows) {
      const [u] = await db.select().from(users).where(eq(users.id, blockedId));
      if (u) result.push(u);
    }
    return result;
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
}

export const storage = new DatabaseStorage();
