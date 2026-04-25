/**
 * Test seed: 12 Murid users (6F + 6M), all approved + premium.
 * Simulates: mutual likes (→ matches + messages), one-sided likes,
 * dislikes, blocks, and visitor records.
 *
 * Run: npx tsx server/seed-test-murid.ts
 */

import { db } from "./db";
import {
  users, likes, dislikes, matches, messages, blocks, visitors,
} from "@shared/schema";
import type { PhotoSlot } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

function slots(url: string): PhotoSlot[] {
  return [{ url, status: "approved" as const, isMain: true }];
}

const FEMALE_PHOTO = "/images/profile1.svg";
const MALE_PHOTO   = "/images/profile3.svg";

const females = [
  { fullName: "Amira Hassan",   email: "amira.murid@test.com",   age: 22, country: "Germany",   city: "Hannover",   bio: "I enjoy community gatherings and cooking traditional food.", occupation: "Student" },
  { fullName: "Soraya Khalil",  email: "soraya.murid@test.com",  age: 25, country: "Sweden",    city: "Gothenburg", bio: "Love hiking and Yezidi music.", occupation: "Nurse" },
  { fullName: "Jinan Dawud",    email: "jinan.murid@test.com",   age: 27, country: "USA",       city: "Lincoln",    bio: "Family is everything to me. Looking for a serious partner.", occupation: "Teacher" },
  { fullName: "Bayan Mirza",    email: "bayan.murid@test.com",   age: 23, country: "Australia", city: "Melbourne",  bio: "Passionate about preserving our language and heritage.", occupation: "Graphic Designer" },
  { fullName: "Nour Barakat",   email: "nour.murid@test.com",    age: 26, country: "UK",        city: "London",     bio: "Working in healthcare, proud of my roots.", occupation: "Pharmacist" },
  { fullName: "Randa Ibrahim",  email: "randa.murid@test.com",   age: 24, country: "Germany",   city: "Bielefeld",  bio: "Entrepreneur building a future while honoring tradition.", occupation: "Business Owner" },
];

const males = [
  { fullName: "Kawa Rashid",    email: "kawa.murid@test.com",    age: 28, country: "Germany",   city: "Hannover",   bio: "Software developer who loves music and tradition.", occupation: "Software Engineer" },
  { fullName: "Soran Hadi",     email: "soran.murid@test.com",   age: 30, country: "Sweden",    city: "Gothenburg", bio: "Community organizer and proud Murid.", occupation: "Community Leader" },
  { fullName: "Diyar Aziz",     email: "diyar.murid@test.com",   age: 26, country: "USA",       city: "Nashville",  bio: "Mechanic by trade, poet by heart.", occupation: "Mechanic" },
  { fullName: "Faris Naif",     email: "faris.murid@test.com",   age: 29, country: "Australia", city: "Sydney",     bio: "Chef who cooks traditional Yezidi dishes.", occupation: "Chef" },
  { fullName: "Haval Sulayman", email: "haval.murid@test.com",   age: 27, country: "UK",        city: "Manchester", bio: "Teacher and football coach.", occupation: "Teacher" },
  { fullName: "Zervan Jundi",   email: "zervan.murid@test.com",  age: 31, country: "Germany",   city: "Bielefeld",  bio: "Civil engineer with a love for history.", occupation: "Civil Engineer" },
];

async function insertUser(profile: typeof females[0], gender: "female" | "male") {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, profile.email));
  if (existing.length > 0) {
    console.log(`  skip (exists): ${profile.email}`);
    return existing[0].id;
  }
  const id = randomUUID();
  const hash = await bcrypt.hash("Test1234!", 10);
  const photo = gender === "female" ? FEMALE_PHOTO : MALE_PHOTO;
  await db.insert(users).values({
    id,
    email: profile.email,
    passwordHash: hash,
    firstName: profile.fullName.split(" ")[0],
    lastName:  profile.fullName.split(" ")[1],
    fullName:  profile.fullName,
    gender,
    caste: "murid",
    age: profile.age,
    country: profile.country,
    city: profile.city,
    bio: profile.bio,
    occupation: profile.occupation,
    languages: ["English"],
    photos: [photo],
    photoSlots: slots(photo),
    mainPhotoUrl: photo,
    verificationStatus: "approved",
    isVerified: true,
    isEmailVerified: true,
    isPremium: true,
    premiumUntil: new Date("2099-12-31"),
    profileVisible: true,
    isSystemAccount: false,
    isAdmin: false,
  });
  console.log(`  created: ${profile.fullName} (${gender})`);
  return id;
}

async function addLike(fromId: string, toId: string) {
  try {
    await db.insert(likes).values({ id: randomUUID(), fromUserId: fromId, toUserId: toId });
  } catch { /* duplicate — skip */ }
}

async function addDislike(fromId: string, toId: string) {
  try {
    await db.insert(dislikes).values({ id: randomUUID(), fromUserId: fromId, toUserId: toId });
  } catch { /* duplicate — skip */ }
}

async function addBlock(blockerId: string, blockedId: string) {
  try {
    await db.insert(blocks).values({ id: randomUUID(), blockerId, blockedId });
  } catch { /* duplicate — skip */ }
}

async function addVisit(fromId: string, toId: string) {
  try {
    await db.insert(visitors).values({ id: randomUUID(), fromUserId: fromId, toUserId: toId });
  } catch { /* duplicate — skip */ }
}

async function getOrCreateMatch(u1: string, u2: string): Promise<string> {
  // check both orderings
  const existing = await db.select({ id: matches.id }).from(matches).where(
    and(eq(matches.user1Id, u1), eq(matches.user2Id, u2))
  );
  if (existing.length > 0) return existing[0].id;
  const existing2 = await db.select({ id: matches.id }).from(matches).where(
    and(eq(matches.user1Id, u2), eq(matches.user2Id, u1))
  );
  if (existing2.length > 0) return existing2[0].id;
  const id = randomUUID();
  await db.insert(matches).values({ id, user1Id: u1, user2Id: u2 });
  return id;
}

async function addMessages(matchId: string, senderId: string, receiverId: string, texts: string[]) {
  for (let i = 0; i < texts.length; i++) {
    const sender = i % 2 === 0 ? senderId : receiverId;
    await db.insert(messages).values({
      id: randomUUID(),
      matchId,
      senderId: sender,
      text: texts[i],
    });
  }
}

async function main() {
  console.log("\n=== Seeding 12 Murid test users ===");

  const fIds: string[] = [];
  const mIds: string[] = [];

  for (const f of females) fIds.push(await insertUser(f, "female"));
  for (const m of males)   mIds.push(await insertUser(m, "male"));

  console.log("\n=== Mutual likes → matches + messages ===");
  // Pairs 0–3: full mutual like → match → conversation
  const matchPairs = [
    [0, 0], [1, 1], [2, 2], [3, 3],
  ] as const;

  for (const [fi, mi] of matchPairs) {
    await addLike(fIds[fi], mIds[mi]);
    await addLike(mIds[mi], fIds[fi]);
    const matchId = await getOrCreateMatch(fIds[fi], mIds[mi]);
    console.log(`  match: ${females[fi].fullName} ↔ ${males[mi].fullName}`);

    await addMessages(matchId, fIds[fi], mIds[mi], [
      "Hi! Nice to meet you 👋",
      "Hello! Great to meet you too ☀️",
      "Your profile caught my eye ✨",
      "Thank you! Tell me about yourself?",
      "I am from the community in " + females[fi].city + ", you?",
      "I live in " + males[mi].city + "! Small world 😊",
    ]);
  }

  console.log("\n=== One-sided likes (no match yet) ===");
  // Males 4 & 5 like females 4 & 5 but females haven't liked back
  await addLike(mIds[4], fIds[4]);
  await addLike(mIds[5], fIds[5]);
  await addLike(mIds[4], fIds[0]); // extra like on already-matched female
  console.log(`  ${males[4].fullName} → ${females[4].fullName} (pending)`);
  console.log(`  ${males[5].fullName} → ${females[5].fullName} (pending)`);

  // Females 4 & 5 like males 0 & 1 (who already have matches — tests multiple likes)
  await addLike(fIds[4], mIds[0]);
  await addLike(fIds[5], mIds[1]);
  console.log(`  ${females[4].fullName} → ${males[0].fullName} (pending)`);
  console.log(`  ${females[5].fullName} → ${males[1].fullName} (pending)`);

  console.log("\n=== Dislikes ===");
  await addDislike(mIds[2], fIds[5]);   // male 2 passed on female 5
  await addDislike(fIds[3], mIds[5]);   // female 3 passed on male 5
  console.log(`  ${males[2].fullName} disliked ${females[5].fullName}`);
  console.log(`  ${females[3].fullName} disliked ${males[5].fullName}`);

  console.log("\n=== Block ===");
  await addBlock(mIds[5], fIds[2]);   // male 5 blocked female 2
  console.log(`  ${males[5].fullName} blocked ${females[2].fullName}`);

  console.log("\n=== Visitor records ===");
  // Several users visited each other's profiles
  const visitPairs: [number, number][] = [
    [0,0],[1,1],[2,2],[3,3],[4,4],[5,5],
    [0,2],[1,3],[2,4],[3,0],[4,1],[5,2],
  ];
  for (const [mi, fi] of visitPairs) {
    await addVisit(mIds[mi], fIds[fi]);
    await addVisit(fIds[fi], mIds[mi]);
  }
  console.log("  Added visitor records.");

  console.log("\n=== Summary ===");
  console.log(`  6 female Murid users created`);
  console.log(`  6 male   Murid users created`);
  console.log(`  4 mutual matches with conversations`);
  console.log(`  4 one-sided likes (pending match)`);
  console.log(`  2 dislikes`);
  console.log(`  1 block`);
  console.log(`  Visitor records seeded`);
  console.log("\nDone.\n");
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
