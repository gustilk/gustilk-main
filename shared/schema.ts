import { pgTable, text, varchar, integer, boolean, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const casteEnum = pgEnum("caste", ["sheikh", "pir", "murid"]);
export const genderEnum = pgEnum("gender", ["male", "female"]);
export const verificationStatusEnum = pgEnum("verification_status", ["none", "pending", "approved", "rejected"]);

export const otpCodes = pgTable("otp_codes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  identifier: text("identifier").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: text("email").unique(),
  phone: text("phone").unique(),
  googleId: text("google_id").unique(),
  facebookId: text("facebook_id").unique(),
  instagramId: text("instagram_id").unique(),
  snapchatId: text("snapchat_id").unique(),
  password: text("password").default(""),
  fullName: text("full_name").notNull(),
  caste: casteEnum("caste").notNull(),
  gender: genderEnum("gender").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  age: integer("age").notNull(),
  bio: text("bio").default(""),
  occupation: text("occupation").default(""),
  photos: text("photos").array().default([]),
  languages: text("languages").array().default([]),
  isVerified: boolean("is_verified").default(false),
  verificationStatus: verificationStatusEnum("verification_status").default("none"),
  verificationSelfie: text("verification_selfie").default(""),
  isPremium: boolean("is_premium").default(false),
  premiumUntil: timestamp("premium_until"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const likes = pgTable("likes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  fromUserId: varchar("from_user_id", { length: 36 }).notNull().references(() => users.id),
  toUserId: varchar("to_user_id", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueLike: uniqueIndex("likes_from_to_unique").on(table.fromUserId, table.toUserId),
}));

export const dislikes = pgTable("dislikes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  fromUserId: varchar("from_user_id", { length: 36 }).notNull().references(() => users.id),
  toUserId: varchar("to_user_id", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueDislike: uniqueIndex("dislikes_from_to_unique").on(table.fromUserId, table.toUserId),
}));

export const matches = pgTable("matches", {
  id: varchar("id", { length: 36 }).primaryKey(),
  user1Id: varchar("user1_id", { length: 36 }).notNull().references(() => users.id),
  user2Id: varchar("user2_id", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  matchId: varchar("match_id", { length: 36 }).notNull().references(() => matches.id),
  senderId: varchar("sender_id", { length: 36 }).notNull().references(() => users.id),
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: varchar("id", { length: 36 }).primaryKey(),
  reporterId: varchar("reporter_id", { length: 36 }).notNull().references(() => users.id),
  reportedUserId: varchar("reported_user_id", { length: 36 }).notNull().references(() => users.id),
  reason: text("reason").notNull(),
  description: text("description").default(""),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventAttendees = pgTable("event_attendees", {
  id: varchar("id", { length: 36 }).primaryKey(),
  eventId: varchar("event_id", { length: 36 }).notNull().references(() => events.id),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueAttendee: uniqueIndex("event_attendees_unique").on(table.eventId, table.userId),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  isVerified: true,
  verificationStatus: true,
  verificationSelfie: true,
  isPremium: true,
  premiumUntil: true,
  isAdmin: true,
  createdAt: true,
});

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(6),
});

export const sendOtpSchema = z.object({
  phone: z.string().min(7),
  purpose: z.enum(["login", "register"]),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(7),
  code: z.string().length(6),
  registrationData: z.object({
    fullName: z.string().min(2),
    password: z.string().min(6),
    caste: z.enum(["sheikh", "pir", "murid"]),
    gender: z.enum(["male", "female"]),
    country: z.string().min(1),
    city: z.string().min(1),
    age: z.number().min(18).max(80),
    bio: z.string().default(""),
    occupation: z.string().default(""),
    languages: z.array(z.string()).default([]),
  }).optional(),
});

export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6),
  fullName: z.string().min(2),
  age: z.number().min(18).max(80),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(7).optional().or(z.literal("")),
}).refine(d => d.email || d.phone, { message: "Email or phone required" });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type OtpCode = typeof otpCodes.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type Dislike = typeof dislikes.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Event = typeof events.$inferSelect;
export type EventAttendee = typeof eventAttendees.$inferSelect;
export type Report = typeof reports.$inferSelect;

export type SafeUser = Omit<User, "password">;

export type MatchWithUser = Match & {
  otherUser: SafeUser;
  lastMessage?: Message | null;
  unreadCount?: number;
};

export type EventWithAttendance = Event & {
  isAttending: boolean;
};
