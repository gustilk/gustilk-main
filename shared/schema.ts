// Re-export Replit Auth tables and types (users, sessions)
export * from "./models/auth";

import { pgTable, varchar, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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

// Profile update validation schema
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
  verificationSelfie: z.string().optional(),
  verificationStatus: z.literal("pending").optional(),
});

export type OtpCode = typeof otpCodes.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type Dislike = typeof dislikes.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Event = typeof events.$inferSelect;
export type EventAttendee = typeof eventAttendees.$inferSelect;
export type Report = typeof reports.$inferSelect;

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
