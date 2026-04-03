import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, text, integer, boolean, pgEnum } from "drizzle-orm/pg-core";

export interface PhotoSlot {
  url: string;
  status: "pending" | "approved" | "rejected";
  reason?: string;
  rejectedAt?: string;
  isMain?: boolean;
}

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
export const verificationStatusEnum = pgEnum("verification_status", ["none", "pending", "approved", "rejected", "banned"]);

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
  state: text("state"),
  city: text("city"),
  age: integer("age"),
  dateOfBirth: text("date_of_birth"),
  bio: text("bio").default(""),
  occupation: text("occupation").default(""),
  photos: text("photos").array().default([]),
  pendingPhotos: text("pending_photos").array().default([]),
  photoSlots: jsonb("photo_slots").$type<PhotoSlot[]>().default([]),
  mainPhotoUrl: text("main_photo_url"),
  profileVisible: boolean("profile_visible").default(false),
  languages: text("languages").array().default([]),

  isVerified: boolean("is_verified").default(false),
  verificationStatus: verificationStatusEnum("verification_status").default("none"),
  verificationSelfie: text("verification_selfie").default(""),
  rejectionReason: text("rejection_reason").default(""),
  applicationCount: integer("application_count").default(1),
  applicationHistory: jsonb("application_history").$type<Array<{ action: string; reason?: string; date: string }>>().default([]),
  isPremium: boolean("is_premium").default(false),
  premiumUntil: timestamp("premium_until"),
  isAdmin: boolean("is_admin").default(false),
  isSystemAccount: boolean("is_system_account").default(false),
  activitySeenAt: timestamp("activity_seen_at"),
  matchesSeenAt: timestamp("matches_seen_at"),
  photosBlurred: boolean("photos_blurred").default(false),
  suspiciousLoginAt: timestamp("suspicious_login_at"),
  suspiciousLoginIp: text("suspicious_login_ip"),
  isEmailVerified: boolean("is_email_verified").default(false),
  emailActivationCode: varchar("email_activation_code", { length: 6 }),
  emailActivationExpiry: timestamp("email_activation_expiry"),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type SafeUser = User;
