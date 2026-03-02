import { db } from "./db";
import { users, events } from "@shared/schema";
import { count, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

const seedProfiles = [
  {
    fullName: "Layla Ibrahim",
    email: "layla.sheikh@example.com",
    caste: "sheikh" as const,
    gender: "female" as const,
    country: "Germany",
    city: "Stuttgart",
    age: 24,
    bio: "I love traditional Yezidi music and poetry. Looking for someone who shares my values and appreciates our rich cultural heritage.",
    occupation: "Teacher",
    languages: ["German", "English"],
    photos: ["/images/profile1.svg"],
  },
  {
    fullName: "Dilan Hasan",
    email: "dilan.sheikh@example.com",
    caste: "sheikh" as const,
    gender: "female" as const,
    country: "Sweden",
    city: "Stockholm",
    age: 26,
    bio: "Medical student with a passion for helping our community. Family-oriented and deeply connected to Yezidi traditions.",
    occupation: "Medical Student",
    languages: ["English", "Arabic"],
    photos: ["/images/profile2.svg"],
  },
  {
    fullName: "Azar Khalaf",
    email: "azar.sheikh@example.com",
    caste: "sheikh" as const,
    gender: "male" as const,
    country: "USA",
    city: "Nashville",
    age: 28,
    bio: "Engineer by day, musician by night. I play traditional Yezidi instruments and hope to find a partner who loves our culture.",
    occupation: "Software Engineer",
    languages: ["English"],
    photos: ["/images/profile3.svg"],
  },
  {
    fullName: "Shirin Dawud",
    email: "shirin.pir@example.com",
    caste: "pir" as const,
    gender: "female" as const,
    country: "Australia",
    city: "Sydney",
    age: 23,
    bio: "Graphic designer who loves art and storytelling. Proud of my Pir heritage and looking to build a beautiful life together.",
    occupation: "Graphic Designer",
    languages: ["English"],
    photos: ["/images/profile4.svg"],
  },
  {
    fullName: "Farhad Mirza",
    email: "farhad.murid@example.com",
    caste: "murid" as const,
    gender: "male" as const,
    country: "Germany",
    city: "Bielefeld",
    age: 29,
    bio: "Community leader and entrepreneur. I believe in preserving our traditions while embracing the future.",
    occupation: "Entrepreneur",
    languages: ["German", "English", "Arabic"],
    photos: ["/images/profile5.svg"],
  },
  {
    fullName: "Narin Barakat",
    email: "narin.pir@example.com",
    caste: "pir" as const,
    gender: "female" as const,
    country: "Belgium",
    city: "Brussels",
    age: 25,
    bio: "Passionate about Yezidi heritage and language preservation. I teach Kurdish to diaspora children on weekends.",
    occupation: "Language Teacher",
    languages: ["French", "English"],
    photos: [],
  },
];

const seedEvents = [
  {
    title: "Yezidi Cultural Festival 2026",
    description: "Join us for a celebration of Yezidi music, dance, and food. Families and singles welcome. A great opportunity to connect with community members from across Europe.",
    type: "cultural",
    date: new Date("2026-03-15T14:00:00Z"),
    location: "Bielefeld, Germany",
    country: "Germany",
    organizer: "Yezidi Community Germany e.V.",
    imageUrl: "",
    attendeeCount: 142,
  },
  {
    title: "Community Meetup — Hannover",
    description: "Monthly singles meetup for the Yezidi community in Hannover. Relaxed atmosphere, great conversations, and a chance to meet someone special.",
    type: "meetup",
    date: new Date("2026-03-08T18:00:00Z"),
    location: "Hannover, Germany",
    country: "Germany",
    organizer: "Yezidi Youth Hannover",
    imageUrl: "",
    attendeeCount: 38,
  },
  {
    title: "Online Yezidi Language Class",
    description: "Learn or improve your Kurmanji Kurdish in a supportive online environment. Taught by native speakers. Open to all Yezidi diaspora worldwide.",
    type: "online",
    date: new Date("2026-03-22T17:00:00Z"),
    location: "Online (Zoom)",
    country: "International",
    organizer: "Yazda Education Program",
    imageUrl: "",
    attendeeCount: 67,
  },
  {
    title: "Şingal Solidarity Evening",
    description: "An evening of remembrance and solidarity for our brothers and sisters in Şingal. Poetry, music, and discussion. All welcome.",
    type: "cultural",
    date: new Date("2026-04-03T19:00:00Z"),
    location: "Stockholm, Sweden",
    country: "Sweden",
    organizer: "Yezidi Association Sweden",
    imageUrl: "",
    attendeeCount: 89,
  },
  {
    title: "Singles Dinner — Erbil",
    description: "An exclusive dinner for Yezidi singles in the Kurdistan Region. Elegant setting, delicious food, and meaningful connections.",
    type: "meetup",
    date: new Date("2026-04-12T19:30:00Z"),
    location: "Erbil, Kurdistan Region",
    country: "Iraq",
    organizer: "Gûstîlk Community Team",
    imageUrl: "",
    attendeeCount: 24,
  },
  {
    title: "Yezidi Heritage Online Summit",
    description: "International online summit bringing together scholars, community leaders, and youth to discuss the preservation of Yezidi heritage and culture.",
    type: "online",
    date: new Date("2026-05-01T15:00:00Z"),
    location: "Online (YouTube Live)",
    country: "International",
    organizer: "Yezidi International",
    imageUrl: "",
    attendeeCount: 310,
  },
];

export async function seedDatabase() {
  try {
    const [existingAdmin] = await db.select({ id: users.id, passwordHash: users.passwordHash }).from(users).where(eq(users.email, "admin@gustilk.com"));
    const adminHash = await bcrypt.hash("admin1234", 10);
    if (!existingAdmin) {
      await db.insert(users).values({
        id: randomUUID(),
        email: "admin@gustilk.com",
        passwordHash: adminHash,
        firstName: "Admin",
        lastName: "Gustilk",
        fullName: "Admin Gustilk",
        isAdmin: true,
        caste: "murid",
        gender: "male",
        country: "USA",
        state: "Nebraska",
        city: "Lincoln",
        age: 42,
        verificationStatus: "approved",
        isVerified: true,
      });
      console.log("Seeded admin user.");
    } else {
      await db.update(users).set({ passwordHash: adminHash, isAdmin: true }).where(eq(users.email, "admin@gustilk.com"));
      console.log("Admin credentials refreshed.");
    }

    const [{ value: userCount }] = await db.select({ value: count() }).from(users);
    if (Number(userCount) === 1) {
      for (const p of seedProfiles) {
        await db.insert(users).values({
          id: randomUUID(),
          ...p,
          photos: p.photos,
          languages: p.languages,
        });
      }
      console.log(`Seeded ${seedProfiles.length} users.`);
    } else {
      console.log("Users already seeded, skipping.");
    }

    const [{ value: eventCount }] = await db.select({ value: count() }).from(events);
    if (Number(eventCount) === 0) {
      for (const ev of seedEvents) {
        await db.insert(events).values({ id: randomUUID(), ...ev });
      }
      console.log(`Seeded ${seedEvents.length} events.`);
    } else {
      console.log("Events already seeded, skipping.");
    }
  } catch (err) {
    console.error("Seed error:", err);
  }
}
