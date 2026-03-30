import { db } from "./db";
import { users, likes, dislikes, matches, messages, events, eventAttendees, reports, otpCodes, passkeys, blocks, visitors, gifts, magicLinkTokens, blacklist, auditLogs } from "@shared/schema";
import type { User, SafeUser, Match, Message, MatchWithUser, Event, EventWithAttendance, Report, InsertUser, PhotoSlot, Block, Gift } from "@shared/schema";
import { eq, and, or, ne, notInArray, inArray, isNull, desc, sql, isNotNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { cacheGet, cacheSet, cacheDel, cacheDelPrefix, TTL } from "./cache";

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

  cleanupExpiredMessages(): Promise<number>;

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

const REJECTION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Slim column set for list/card contexts (discover, matches, visitors, activity).
 * Excludes the large base64 columns (photos[], photoSlots, verificationSelfie,
 * pendingPhotos) that are only needed when viewing a full profile. This alone
 * can cut per-row data from ~3 MB to ~1 KB for text-heavy profiles.
 */
const CARD_COLUMNS = {
  id: users.id,
  email: users.email,
  phone: users.phone,
  firstName: users.firstName,
  lastName: users.lastName,
  profileImageUrl: users.profileImageUrl,
  fullName: users.fullName,
  caste: users.caste,
  gender: users.gender,
  country: users.country,
  state: users.state,
  city: users.city,
  age: users.age,
  dateOfBirth: users.dateOfBirth,
  bio: users.bio,
  occupation: users.occupation,
  languages: users.languages,
  mainPhotoUrl: users.mainPhotoUrl,
  profileVisible: users.profileVisible,
  isVerified: users.isVerified,
  verificationStatus: users.verificationStatus,
  rejectionReason: users.rejectionReason,
  applicationCount: users.applicationCount,
  isPremium: users.isPremium,
  premiumUntil: users.premiumUntil,
  isAdmin: users.isAdmin,
  isSystemAccount: users.isSystemAccount,
  activitySeenAt: users.activitySeenAt,
  matchesSeenAt: users.matchesSeenAt,
  photosBlurred: users.photosBlurred,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

type CardRow = { [K in keyof typeof CARD_COLUMNS]: any };

/**
 * Inflates a slim CARD_COLUMNS row into a SafeUser by supplying safe empty
 * values for the stripped columns. Sets `photos` to `[mainPhotoUrl]` so
 * existing UI code that reads `photos[0]` continues to work without changes.
 */
function enrichCardUser(row: CardRow): SafeUser {
  return {
    ...row,
    passwordHash: null,
    photos: row.mainPhotoUrl ? [row.mainPhotoUrl] : [],
    pendingPhotos: [],
    photoSlots: [],
    verificationSelfie: "",
    applicationHistory: [],
  } as unknown as SafeUser;
}

function getSlots(user: User): PhotoSlot[] {
  return (user.photoSlots as PhotoSlot[] | null) ?? [];
}

function pruneExpiredRejections(slots: PhotoSlot[]): { slots: PhotoSlot[]; changed: boolean } {
  const now = Date.now();
  let changed = false;
  const updated = slots.map(s => {
    if (s.status === "rejected" && s.rejectedAt) {
      const age = now - new Date(s.rejectedAt).getTime();
      if (age >= REJECTION_EXPIRY_MS) {
        changed = true;
        return { url: "", status: "pending" as const, isMain: false };
      }
    }
    return s;
  });
  return { slots: updated, changed };
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: string): Promise<User | undefined> {
    const ck = `user:${id}`;
    const cached = cacheGet<User>(ck);
    const base = cached ?? await (async () => {
      const [row] = await db.select().from(users).where(eq(users.id, id));
      return row;
    })();
    if (!base) return undefined;

    const { slots, changed } = pruneExpiredRejections(getSlots(base));
    if (changed) {
      const approvedSlots = slots.filter(s => s.status === "approved");
      const [updated] = await db.update(users).set({
        photoSlots: slots as any,
        photos: approvedSlots.map(s => s.url).filter(Boolean),
        updatedAt: new Date(),
      }).where(eq(users.id, id)).returning();
      cacheSet(ck, updated, TTL.USER);
      cacheDelPrefix("discover:");
      return updated;
    }

    if (!cached) cacheSet(ck, base, TTL.USER);
    return base;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<SafeUser> {
    const [updated] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    cacheDel(`user:${id}`);
    cacheDelPrefix(`discover:`);
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    cacheDel(`user:${id}`);
    cacheDelPrefix(`discover:`);

    // 1. Get all match IDs for this user
    const userMatches = await db.select({ id: matches.id }).from(matches)
      .where(or(eq(matches.user1Id, id), eq(matches.user2Id, id)));
    const matchIds = userMatches.map(m => m.id);

    // 2. Delete messages for those matches
    if (matchIds.length > 0) {
      await db.delete(messages).where(inArray(messages.matchId, matchIds));
    }

    // 3. Delete gifts BEFORE matches (gifts.match_id FK references matches.id)
    if (matchIds.length > 0) {
      await db.delete(gifts).where(inArray(gifts.matchId, matchIds));
    }
    // Also catch any gifts by sender/recipient not covered above
    await db.delete(gifts).where(or(eq(gifts.senderId, id), eq(gifts.recipientId, id)));

    // 4. Now safe to delete matches
    await db.delete(matches).where(or(eq(matches.user1Id, id), eq(matches.user2Id, id)));

    // 5. NULL out nullable FKs that would block user row deletion
    await db.update(events).set({ creatorId: null }).where(eq(events.creatorId, id));
    await db.update(blacklist).set({ createdBy: null }).where(eq(blacklist.createdBy, id));
    await db.update(auditLogs).set({ adminId: null }).where(eq(auditLogs.adminId, id));

    // 6. Delete remaining related records
    await db.delete(visitors).where(or(eq(visitors.fromUserId, id), eq(visitors.toUserId, id)));
    await db.delete(blocks).where(or(eq(blocks.blockerId, id), eq(blocks.blockedId, id)));
    await db.delete(likes).where(or(eq(likes.fromUserId, id), eq(likes.toUserId, id)));
    await db.delete(dislikes).where(or(eq(dislikes.fromUserId, id), eq(dislikes.toUserId, id)));
    await db.delete(eventAttendees).where(eq(eventAttendees.userId, id));
    await db.delete(reports).where(or(eq(reports.reporterId, id), eq(reports.reportedUserId, id)));
    await db.delete(magicLinkTokens).where(eq(magicLinkTokens.userId, id));
    await db.delete(otpCodes).where(sql`identifier IN (SELECT email FROM users WHERE id = ${id} UNION SELECT phone FROM users WHERE id = ${id})`);
    await db.delete(passkeys).where(eq(passkeys.userId, id));

    // 7. Finally delete the user
    await db.delete(users).where(eq(users.id, id));
  }

  async getDiscoverProfiles(userId: string, caste: string, gender: string, minAge: number, maxAge: number): Promise<SafeUser[]> {
    const ck = `discover:${userId}:${caste}:${gender}:${minAge}:${maxAge}`;
    const cached = cacheGet<SafeUser[]>(ck);
    if (cached !== undefined) return cached;

    const likedIds = db.select({ id: likes.toUserId }).from(likes).where(eq(likes.fromUserId, userId));
    const dislikedIds = db.select({ id: dislikes.toUserId }).from(dislikes).where(eq(dislikes.fromUserId, userId));
    const blockedByMe = db.select({ id: blocks.blockedId }).from(blocks).where(eq(blocks.blockerId, userId));
    const blockedMe = db.select({ id: blocks.blockerId }).from(blocks).where(eq(blocks.blockedId, userId));
    const matchedIds = db
      .select({ id: matches.user1Id })
      .from(matches)
      .where(eq(matches.user2Id, userId))
      .union(
        db.select({ id: matches.user2Id })
          .from(matches)
          .where(eq(matches.user1Id, userId))
      );
    const oppositeGender = gender === "male" ? "female" : "male";

    const rows = await db.select(CARD_COLUMNS).from(users).where(
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
        notInArray(users.id, matchedIds),
        eq(users.verificationStatus, "approved"),
        eq(users.profileVisible, true),
        isNotNull(users.mainPhotoUrl),
        ne(users.isSystemAccount, true),
        ne(users.isAdmin, true),
      )
    ).limit(50);

    const result = rows.map(enrichCardUser);
    cacheSet(ck, result, TTL.DISCOVER);
    return result;
  }

  async likeUser(fromUserId: string, toUserId: string): Promise<{ matched: boolean; matchId?: string }> {
    await db.insert(likes).values({ id: randomUUID(), fromUserId, toUserId }).onConflictDoNothing();
    // A like changes what future discover calls return for this user — bust their discover cache.
    cacheDelPrefix(`discover:${fromUserId}:`);
    cacheDel(`matches:${fromUserId}`);
    cacheDel(`matches:${toUserId}`);

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
    cacheDelPrefix(`discover:${fromUserId}:`);
  }

  async getMatches(userId: string): Promise<MatchWithUser[]> {
    const ck = `matches:${userId}`;
    const cached = cacheGet<MatchWithUser[]>(ck);
    if (cached !== undefined) return cached;

    // 1. Fetch all match rows for this user — ID-only for blocks
    const [userMatches, blockedByMeRows, blockedMeRows] = await Promise.all([
      db.select().from(matches)
        .where(or(eq(matches.user1Id, userId), eq(matches.user2Id, userId)))
        .orderBy(desc(matches.createdAt)),
      db.select({ id: blocks.blockedId }).from(blocks).where(eq(blocks.blockerId, userId)),
      db.select({ id: blocks.blockerId }).from(blocks).where(eq(blocks.blockedId, userId)),
    ]);

    if (userMatches.length === 0) { cacheSet(ck, [], TTL.MATCHES); return []; }

    const hiddenIds = new Set([...blockedByMeRows.map(r => r.id), ...blockedMeRows.map(r => r.id)]);
    const visibleMatches = userMatches.filter(m => {
      const otherId = m.user1Id === userId ? m.user2Id : m.user1Id;
      return !hiddenIds.has(otherId);
    });

    if (visibleMatches.length === 0) { cacheSet(ck, [], TTL.MATCHES); return []; }

    const matchIds = visibleMatches.map(m => m.id);
    const otherUserIds = [...new Set(
      visibleMatches.map(m => m.user1Id === userId ? m.user2Id : m.user1Id)
    )];

    // 2. Three parallel queries instead of N×3 sequential queries:
    //    a) slim user rows for all other users (no photo blobs)
    //    b) latest message per match via DISTINCT ON (one DB round-trip)
    //    c) unread count per match via GROUP BY (one DB round-trip)
    const [otherUserRows, lastMsgRows, unreadRows] = await Promise.all([
      db.select(CARD_COLUMNS).from(users).where(inArray(users.id, otherUserIds)),
      db.selectDistinctOn([messages.matchId], {
        id: messages.id,
        matchId: messages.matchId,
        senderId: messages.senderId,
        text: messages.text,
        readAt: messages.readAt,
        expiresAt: messages.expiresAt,
        expired: messages.expired,
        createdAt: messages.createdAt,
      }).from(messages)
        .where(inArray(messages.matchId, matchIds))
        .orderBy(messages.matchId, desc(messages.createdAt)),
      db.select({
        matchId: messages.matchId,
        count: sql<number>`count(*)::int`.as("count"),
      }).from(messages).where(
        and(
          inArray(messages.matchId, matchIds),
          ne(messages.senderId, userId),
          isNull(messages.readAt),
          eq(messages.expired, false),
        )
      ).groupBy(messages.matchId),
    ]);

    const userMap = new Map(otherUserRows.map(u => [u.id, enrichCardUser(u)]));
    const lastMsgMap = new Map(lastMsgRows.map(m => [m.matchId, m as Message]));
    const unreadMap = new Map(unreadRows.map(r => [r.matchId, r.count]));

    const result: MatchWithUser[] = [];
    for (const match of visibleMatches) {
      const otherId = match.user1Id === userId ? match.user2Id : match.user1Id;
      const otherUser = userMap.get(otherId);
      if (!otherUser) continue;
      result.push({
        ...match,
        otherUser,
        lastMessage: lastMsgMap.get(match.id) ?? null,
        unreadCount: unreadMap.get(match.id) ?? 0,
      });
    }

    cacheSet(ck, result, TTL.MATCHES);
    return result;
  }

  async getMatch(matchId: string): Promise<Match | undefined> {
    const ck = `match:${matchId}`;
    const cached = cacheGet<Match>(ck);
    if (cached !== undefined) return cached;
    const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
    if (match) cacheSet(ck, match, TTL.MATCH);
    return match;
  }

  async getMessages(matchId: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.matchId, matchId)).orderBy(messages.createdAt);
  }

  async sendMessage(matchId: string, senderId: string, text: string): Promise<Message> {
    const [msg] = await db.insert(messages).values({ id: randomUUID(), matchId, senderId, text }).returning();
    // Bust both parties' match lists so unreadCount + lastMessage are fresh.
    const match = await this.getMatch(matchId);
    if (match) {
      cacheDel(`matches:${match.user1Id}`);
      cacheDel(`matches:${match.user2Id}`);
    }
    return msg;
  }

  async markMessagesRead(matchId: string, userId: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.update(messages)
      .set({ readAt: new Date(), expiresAt })
      .where(and(
        eq(messages.matchId, matchId),
        ne(messages.senderId, userId),
        sql`${messages.readAt} IS NULL`,
      ));
    cacheDel(`matches:${userId}`);
  }

  async cleanupExpiredMessages(): Promise<number> {
    const now = new Date();
    const expired = await db.update(messages)
      .set({ text: "", expired: true })
      .where(and(
        sql`${messages.expiresAt} IS NOT NULL`,
        sql`${messages.expiresAt} <= ${now.toISOString()}`,
        eq(messages.expired, false),
      ))
      .returning({ id: messages.id });
    return expired.length;
  }

  async listEvents(userId: string): Promise<EventWithAttendance[]> {
    // Cache the raw events list globally (same for all users), then merge per-user attendance cheaply.
    const evtCk = "events:all";
    let allEvents = cacheGet<Event[]>(evtCk);
    if (!allEvents) {
      allEvents = await db.select().from(events).orderBy(events.date);
      cacheSet(evtCk, allEvents, TTL.EVENTS);
    }
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
    cacheDel("events:all");
  }

  async unattendEvent(eventId: string, userId: string): Promise<void> {
    await db.delete(eventAttendees).where(
      and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId))
    );
    await db.update(events).set({ attendeeCount: sql`${events.attendeeCount} - 1` }).where(eq(events.id, eventId));
    cacheDel("events:all");
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
    if (status === "approved") {
      // Female users set their own profileVisible preference during registration — don't override it.
      // Only set profileVisible=true automatically for male users (or users with no gender set).
      if (user?.gender !== "female") {
        updates.profileVisible = true;
      }
      updates.rejectionReason = "";
    }
    if (status === "rejected") { updates.profileVisible = false; updates.rejectionReason = reason ?? ""; }
    if (status === "banned") { updates.profileVisible = false; updates.rejectionReason = reason ?? ""; }
    await db.update(users).set(updates as any).where(eq(users.id, userId));
    cacheDel(`user:${userId}`);
    cacheDelPrefix("discover:");
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
    cacheDel(`user:${userId}`);
    cacheDelPrefix("discover:");
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
    cacheDel(`user:${userId}`);
  }

  async getUsersWithPendingPhotoSlots(): Promise<SafeUser[]> {
    return db.select().from(users).where(
      sql`${users.photoSlots} IS NOT NULL
        AND jsonb_array_length(${users.photoSlots}::jsonb) > 0
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(${users.photoSlots}::jsonb) AS slot
          WHERE slot->>'status' = 'pending'
        )`
    );
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

    // Female users manage their own profileVisible preference — don't override it on photo approval.
    // For male users and accounts with no gender, set profileVisible=true when a photo is approved.
    const setProfileVisible = user?.gender !== "female";
    const [updated] = await db.update(users).set({
      photoSlots: slots,
      mainPhotoUrl: mainPhotoUrl ?? null,
      ...(setProfileVisible ? { profileVisible: true } : {}),
      photos: approvedSlots.map(s => s.url),
      updatedAt: new Date(),
    }).where(eq(users.id, userId)).returning();
    cacheDel(`user:${userId}`);
    cacheDelPrefix("discover:");
    return { user: updated };
  }

  async rejectPhotoSlot(userId: string, slotIdx: number, reason: string): Promise<{ user: SafeUser }> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    const slots = [...getSlots(user)];
    if (slotIdx < 0 || slotIdx >= slots.length) throw new Error("Invalid slot index");

    const rejectedUrl = slots[slotIdx].url;
    slots[slotIdx] = { ...slots[slotIdx], status: "rejected", reason, rejectedAt: new Date().toISOString(), isMain: false };

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
    cacheDel(`user:${userId}`);
    cacheDelPrefix("discover:");
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
    cacheDel(`user:${userId}`);
    cacheDelPrefix("discover:");
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
    if (rows.length === 0) return [];
    const fromIds = [...new Set(rows.map(r => r.fromUserId))];
    const userRows = await db.select(CARD_COLUMNS).from(users).where(inArray(users.id, fromIds));
    const userMap = new Map(userRows.map(u => [u.id, enrichCardUser(u)]));
    return rows
      .map(r => ({ user: userMap.get(r.fromUserId), createdAt: r.createdAt! }))
      .filter((r): r is { user: SafeUser; createdAt: Date } => !!r.user);
  }

  async getLikesReceived(userId: string): Promise<{ user: SafeUser; createdAt: Date }[]> {
    const rows = await db.select().from(likes).where(eq(likes.toUserId, userId)).orderBy(desc(likes.createdAt));
    if (rows.length === 0) return [];
    const fromIds = [...new Set(rows.map(r => r.fromUserId))];
    const userRows = await db.select(CARD_COLUMNS).from(users).where(inArray(users.id, fromIds));
    const userMap = new Map(userRows.map(u => [u.id, enrichCardUser(u)]));
    return rows
      .map(r => ({ user: userMap.get(r.fromUserId), createdAt: r.createdAt! }))
      .filter((r): r is { user: SafeUser; createdAt: Date } => !!r.user);
  }

  async getLikesSent(userId: string): Promise<{ user: SafeUser; createdAt: Date }[]> {
    const rows = await db.select().from(likes).where(eq(likes.fromUserId, userId)).orderBy(desc(likes.createdAt));
    if (rows.length === 0) return [];
    const toIds = [...new Set(rows.map(r => r.toUserId))];
    const userRows = await db.select(CARD_COLUMNS).from(users).where(inArray(users.id, toIds));
    const userMap = new Map(userRows.map(u => [u.id, enrichCardUser(u)]));
    return rows
      .map(r => ({ user: userMap.get(r.toUserId), createdAt: r.createdAt! }))
      .filter((r): r is { user: SafeUser; createdAt: Date } => !!r.user);
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    await db.insert(blocks).values({ id: randomUUID(), blockerId, blockedId }).onConflictDoNothing();
    cacheDel(`matches:${blockerId}`);
    cacheDel(`matches:${blockedId}`);
    cacheDelPrefix(`discover:${blockerId}:`);
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await db.delete(blocks).where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)));
    cacheDel(`matches:${blockerId}`);
    cacheDel(`matches:${blockedId}`);
    cacheDelPrefix(`discover:${blockerId}:`);
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
