import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, text, integer, boolean, pgEnum } from "drizzle-orm/pg-core";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const casteEnum = pgEnum("caste", ["sheikh", "pir", "murid"]);
export const genderEnum = pgEnum("gender", ["male", "female"]);
export const verificationStatusEnum = pgEnum("verification_status", ["none", "pending", "approved", "rejected"]);

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  phone: varchar("phone").unique(),
  passwordHash: text("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),

  fullName: text("full_name"),
  caste: casteEnum("caste"),
  gender: genderEnum("gender"),
  country: text("country"),
  city: text("city"),
  age: integer("age"),
  dateOfBirth: text("date_of_birth"),
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
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type SafeUser = User;
