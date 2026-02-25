import { pgTable, text, varchar, integer, boolean, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const casteEnum = pgEnum("caste", ["sheikh", "pir", "murid"]);
export const genderEnum = pgEnum("gender", ["male", "female"]);
export const verificationStatusEnum = pgEnum("verification_status", ["none", "pending", "approved", "rejected"]);

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
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
  isPremium: boolean("is_premium").default(false),
  premiumUntil: timestamp("premium_until"),
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

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  isVerified: true,
  verificationStatus: true,
  isPremium: true,
  premiumUntil: true,
  createdAt: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = insertUserSchema.extend({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  age: z.number().min(18).max(80),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type Dislike = typeof dislikes.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Message = typeof messages.$inferSelect;

export type SafeUser = Omit<User, "password">;

export type MatchWithUser = Match & {
  otherUser: SafeUser;
  lastMessage?: Message | null;
  unreadCount?: number;
};
