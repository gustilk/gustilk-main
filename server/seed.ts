import { db } from "./db";
import { users } from "@shared/schema";
import { count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const seedUsers = [
  {
    email: "layla.sheikh@example.com",
    password: "password123",
    fullName: "Layla Ibrahim",
    caste: "sheikh" as const,
    gender: "female" as const,
    country: "Germany",
    city: "Stuttgart",
    age: 24,
    bio: "I love traditional Yezidi music and poetry. Looking for someone who shares my values and appreciates our rich cultural heritage.",
    occupation: "Teacher",
    languages: ["Kurdish", "German", "English"],
    photos: ["/images/profile1.svg"],
  },
  {
    email: "dilan.sheikh@example.com",
    password: "password123",
    fullName: "Dilan Hasan",
    caste: "sheikh" as const,
    gender: "female" as const,
    country: "Sweden",
    city: "Stockholm",
    age: 26,
    bio: "Medical student with a passion for helping our community. Family-oriented and deeply connected to Yezidi traditions.",
    occupation: "Medical Student",
    languages: ["Kurdish", "Swedish", "English", "Arabic"],
    photos: ["/images/profile2.svg"],
  },
  {
    email: "azar.sheikh@example.com",
    password: "password123",
    fullName: "Azar Khalaf",
    caste: "sheikh" as const,
    gender: "male" as const,
    country: "USA",
    city: "Nashville",
    age: 28,
    bio: "Engineer by day, musician by night. I play traditional Yezidi instruments and hope to find a partner who loves our culture.",
    occupation: "Software Engineer",
    languages: ["Kurdish", "English"],
    photos: ["/images/profile3.svg"],
  },
  {
    email: "shirin.pir@example.com",
    password: "password123",
    fullName: "Shirin Dawud",
    caste: "pir" as const,
    gender: "female" as const,
    country: "Australia",
    city: "Sydney",
    age: 23,
    bio: "Graphic designer who loves art and storytelling. Proud of my Pir heritage and looking to build a beautiful life together.",
    occupation: "Graphic Designer",
    languages: ["Kurdish", "English"],
    photos: ["/images/profile4.svg"],
  },
  {
    email: "demo@gustilk.com",
    password: "demo1234",
    fullName: "Khalid Mirza",
    caste: "sheikh" as const,
    gender: "male" as const,
    country: "Germany",
    city: "Hannover",
    age: 27,
    bio: "Demo account — explore Gûstîlk freely. I am a community organizer passionate about Yezidi culture and bringing people together.",
    occupation: "Community Organizer",
    languages: ["Kurdish", "German", "English"],
    photos: ["/images/profile5.svg"],
  },
];

export async function seedDatabase() {
  try {
    const [{ value }] = await db.select({ value: count() }).from(users);
    if (Number(value) > 0) {
      console.log("Database already seeded, skipping.");
      return;
    }

    for (const userData of seedUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      await db.insert(users).values({
        ...userData,
        id: randomUUID(),
        password: hashedPassword,
        photos: userData.photos,
        languages: userData.languages,
      });
    }

    console.log(`Seeded ${seedUsers.length} users.`);
  } catch (err) {
    console.error("Seed error:", err);
  }
}
