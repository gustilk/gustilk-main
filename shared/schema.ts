// Re-export Replit Auth tables and types (users, sessions)
export * from "./models/auth";

import { pgTable, varchar, text, integer, boolean, timestamp, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { users } from "./models/auth";
import { z } from "zod";

export const passkeys = pgTable("passkeys", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  deviceType: text("device_type").default(""),
  transports: text("transports").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Passkey = typeof passkeys.$inferSelect;

export const otpCodes = pgTable("otp_codes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  identifier: text("identifier").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const magicLinkTokens = pgTable("magic_link_tokens", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const likes = pgTable("likes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueLike: uniqueIndex("likes_from_to_unique").on(table.fromUserId, table.toUserId),
}));

export const dislikes = pgTable("dislikes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueDislike: uniqueIndex("dislikes_from_to_unique").on(table.fromUserId, table.toUserId),
}));

export const matches = pgTable("matches", {
  id: varchar("id", { length: 36 }).primaryKey(),
  user1Id: varchar("user1_id").notNull().references(() => users.id),
  user2Id: varchar("user2_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  matchId: varchar("match_id", { length: 36 }).notNull().references(() => matches.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  text: text("text").notNull(),
  readAt: timestamp("read_at"),
  expiresAt: timestamp("expires_at"),
  expired: boolean("expired").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const events = pgTable("events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  date: timestamp("date").notNull(),
  location: text("location").notNull(),
  country: text("country").notNull(),
  organizer: text("organizer").notNull(),
  imageUrl: text("image_url").default(""),
  attendeeCount: integer("attendee_count").default(0),
  creatorId: varchar("creator_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gifts = pgTable("gifts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  recipientId: varchar("recipient_id").notNull().references(() => users.id),
  matchId: varchar("match_id", { length: 36 }).notNull().references(() => matches.id),
  giftType: text("gift_type").notNull(),
  message: text("message").default(""),
  animationStyle: text("animation_style").default("none"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const visitors = pgTable("visitors", {
  id: varchar("id", { length: 36 }).primaryKey(),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueVisit: uniqueIndex("visitors_from_to_unique").on(table.fromUserId, table.toUserId),
}));

export const blocks = pgTable("blocks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  blockerId: varchar("blocker_id").notNull().references(() => users.id),
  blockedId: varchar("blocked_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueBlock: uniqueIndex("blocks_blocker_blocked_unique").on(table.blockerId, table.blockedId),
}));

export const reports = pgTable("reports", {
  id: varchar("id", { length: 36 }).primaryKey(),
  reporterId: varchar("reporter_id").notNull().references(() => users.id),
  reportedUserId: varchar("reported_user_id").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  description: text("description").default(""),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventAttendees = pgTable("event_attendees", {
  id: varchar("id", { length: 36 }).primaryKey(),
  eventId: varchar("event_id", { length: 36 }).notNull().references(() => events.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueAttendee: uniqueIndex("event_attendees_unique").on(table.eventId, table.userId),
}));

// ─── NEW ADMIN TABLES ──────────────────────────────────────────────────────────

export const blacklist = pgTable("blacklist", {
  id: varchar("id", { length: 36 }).primaryKey(),
  type: text("type").notNull(),
  value: text("value").notNull(),
  reason: text("reason").default(""),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const promoCodes = pgTable("promo_codes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  code: text("code").notNull(),
  description: text("description").default(""),
  discountPercent: integer("discount_percent").notNull().default(100),
  maxUses: integer("max_uses").default(0),
  usedCount: integer("used_count").default(0),
  expiresAt: timestamp("expires_at"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  adminId: varchar("admin_id").references(() => users.id),
  adminEmail: text("admin_email").default(""),
  action: text("action").notNull(),
  targetType: text("target_type").default(""),
  targetId: text("target_id").default(""),
  details: text("details").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const announcements = pgTable("announcements", {
  id: varchar("id", { length: 36 }).primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const successStories = pgTable("success_stories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  names: text("names").notNull(),
  story: text("story").notNull(),
  photoUrl: text("photo_url").default(""),
  visible: boolean("visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── VALIDATION SCHEMAS ────────────────────────────────────────────────────────

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  caste: z.enum(["sheikh", "pir", "murid"]).optional(),
  gender: z.enum(["male", "female"]).optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  age: z.number().min(18).max(80).optional(),
  dateOfBirth: z.string().optional(),
  bio: z.string().max(500).optional(),
  occupation: z.string().max(100).optional(),
  languages: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
  removedRejectedUrls: z.array(z.string()).optional(),
  verificationSelfie: z.string().optional(),
  verificationStatus: z.literal("pending").optional(),
});

// ─── TYPES ─────────────────────────────────────────────────────────────────────

export type OtpCode = typeof otpCodes.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type Gift = typeof gifts.$inferSelect;
export type Visitor = typeof visitors.$inferSelect;
export type Dislike = typeof dislikes.$inferSelect;
export type Block = typeof blocks.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Event = typeof events.$inferSelect;
export type EventAttendee = typeof eventAttendees.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Blacklist = typeof blacklist.$inferSelect;
export type PromoCode = typeof promoCodes.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type SuccessStory = typeof successStories.$inferSelect;

export type MatchWithUser = Match & {
  otherUser: User;
  lastMessage?: Message | null;
  unreadCount?: number;
};

export type EventWithAttendance = Event & {
  isAttending: boolean;
  isCreator: boolean;
};

// Keep InsertUser type for storage compatibility
import type { User } from "./models/auth";
export type InsertUser = Omit<User, "id" | "createdAt" | "updatedAt">;
