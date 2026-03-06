import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSession, registerAuthRoutes, isAuthenticated } from "./auth";
import { profileUpdateSchema, users, matches, messages, events, eventAttendees, magicLinkTokens } from "@shared/schema";
import { verifyCountryFromRequest, verifyIraqFromRequest, getClientIp, lookupIpCountry } from "./geo";
import { setupWs } from "./ws";
import { z } from "zod";
import { checkFacePresent } from "./moderation";
import { db } from "./db";
import { count, sql, eq, asc, desc, or, and, ilike } from "drizzle-orm";
import { randomUUID, randomBytes } from "crypto";
import { sendMagicLinkEmail, sendPhotoApprovedEmail, sendPhotoRejectedEmail, sendAccountDeletedEmail, sendSupportMessageAlertEmail } from "./email";
import OpenAI from "openai";
import { registerAdminRoutes, writeAuditLog } from "./admin-routes";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SUPPORT_ACCOUNT_EMAIL = "support@gustilk.com";

const SUPPORT_ACCOUNT_PASSWORD = "GodFirst@11";

async function getOrCreateSupportAccount(): Promise<typeof users.$inferSelect> {
  const bcrypt = await import("bcryptjs");
  const supportHash = await bcrypt.hash(SUPPORT_ACCOUNT_PASSWORD, 10);
  const [existing] = await db.select().from(users).where(eq(users.email, SUPPORT_ACCOUNT_EMAIL));
  if (existing) {
    const [updated] = await db.update(users).set({ passwordHash: supportHash }).where(eq(users.email, SUPPORT_ACCOUNT_EMAIL)).returning();
    return updated;
  }
  const id = randomUUID();
  const [created] = await db.insert(users).values({
    id,
    email: SUPPORT_ACCOUNT_EMAIL,
    passwordHash: supportHash,
    firstName: "Gûstîlk",
    lastName: "Support",
    fullName: "Gûstîlk Support",
    isSystemAccount: true,
    isAdmin: false,
    isVerified: true,
    verificationStatus: "approved",
    profileVisible: false,
    mainPhotoUrl: "/gustilk-logo.svg",
    bio: "Official Gûstîlk Support Assistant — here to help you 24/7.",
  } as any).returning();
  console.log("[system] Created support account:", created.id);
  return created;
}

async function isAdminMatch(match: { user1Id: string; user2Id: string }): Promise<boolean> {
  const [u1, u2] = await Promise.all([storage.getUserById(match.user1Id), storage.getUserById(match.user2Id)]);
  return !!(u1?.isAdmin || u2?.isAdmin || u1?.isSystemAccount || u2?.isSystemAccount);
}

const SUPPORT_AI_SYSTEM_PROMPT = `You are the Official Gûstîlk Support Assistant — a friendly AI for the Gûstîlk app, a Yezidi community dating platform. You help users with:

• How matching works — members are matched within their caste (Sheikh, Pir, or Mirid) with members of the opposite gender
• Profile setup — photos (up to 6), verification selfie, bio, caste, age, occupation
• Photo & identity verification — admins review selfies and photos within 24–48 hours; you'll be notified by email once approved or if changes are needed
• Premium subscription — required to message matches, see who liked you, make video calls, and send virtual gifts
• Community events — browse and RSVP to local Yezidi events in the Events tab
• Account settings — change language (English, Arabic, German, Armenian, Russian, Kurdish), notifications, privacy, blocking/reporting users
• Technical issues — camera access, login problems, forgotten password (use the magic link option)
• Virtual gifts — premium users can send animated gifts to their matches in the chat

If the user describes harassment, abuse, impersonation, or a safety threat, respond warmly but tell them you are escalating this to the admin team and ask them to also use the in-app Report button on the offending profile.

Important rules:
- Always be transparent that you are an AI assistant, not a human
- If asked for human support, tell users to email support@gustilk.com
- Be warm, empathetic, and concise (under 150 words per reply)
- Respond in the user's language if it is one of the six supported languages (English, Arabic, German, Armenian, Russian, Kurdish) — otherwise respond in English`;

async function generateSupportAiReply(matchId: string, supportAccountId: string): Promise<void> {
  try {
    const history = await storage.getMessages(matchId);
    // Use the last 20 messages to keep context within token budget
    const recent = history.slice(-20);
    const chatMessages: { role: "user" | "assistant"; content: string }[] = recent
      .filter(m => m.text && m.text.trim().length > 0)
      .map(m => ({
        role: m.senderId === supportAccountId ? "assistant" : "user",
        content: m.text,
      }));
    if (chatMessages.length === 0 || chatMessages[chatMessages.length - 1].role !== "user") return;
    const aiReply = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SUPPORT_AI_SYSTEM_PROMPT },
        ...chatMessages,
      ],
    });
    const aiText = aiReply.choices[0]?.message?.content;
    if (aiText) await storage.sendMessage(matchId, supportAccountId, aiText);
  } catch (e) {
    console.error("[AI support reply error]", e);
  }
}

function getUserId(req: any): string {
  return req.session?.userId;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupSession(app);
  registerAuthRoutes(app);
  setupWs(httpServer);

  // Ensure support account exists on startup
  getOrCreateSupportAccount().catch(e => console.error("[startup] support account error:", e));

  // ─── GEO DETECT (public — used on login screen) ───────────
  app.get("/api/geo/detect", async (req, res) => {
    try {
      const ip = getClientIp(req);
      if (!ip) return res.json({ countryCode: null });
      const geo = await lookupIpCountry(ip);
      res.json({ countryCode: geo?.countryCode ?? null });
    } catch {
      res.json({ countryCode: null });
    }
  });

  // ─── MAGIC LINK AUTH ─────────────────────────────────────
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      const [user] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()));
      if (!user || !user.email) {
        return res.json({ ok: true });
      }
      await db
        .update(magicLinkTokens)
        .set({ used: true })
        .where(eq(magicLinkTokens.userId, user.id));
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await db.insert(magicLinkTokens).values({
        id: randomUUID(),
        userId: user.id,
        token,
        expiresAt,
        used: false,
      });
      const proto = (req.get("x-forwarded-proto") as string) || req.protocol;
      const host = req.get("x-forwarded-host") || req.get("host");
      const baseUrl = `${proto}://${host}`;
      const magicLink = `${baseUrl}/api/auth/magic-link?token=${token}`;
      await sendMagicLinkEmail(user.email, magicLink);
      return res.json({ ok: true });
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid email address" });
      console.error("[forgot-password]", err?.message ?? err);
      return res.status(500).json({ error: "Failed to send email. Please try again." });
    }
  });

  app.get("/api/auth/magic-link", async (req, res) => {
    try {
      const token = String(req.query.token ?? "");
      if (!token) return res.redirect("/?magic=invalid");
      const [row] = await db
        .select()
        .from(magicLinkTokens)
        .where(eq(magicLinkTokens.token, token));
      if (!row || row.used || !row.expiresAt || row.expiresAt < new Date()) {
        return res.redirect("/?magic=invalid");
      }
      await db
        .update(magicLinkTokens)
        .set({ used: true })
        .where(eq(magicLinkTokens.id, row.id));
      (req.session as any).userId = row.userId;
      req.session.save(() => res.redirect("/"));
    } catch (err: any) {
      console.error("[magic-link]", err?.message ?? err);
      return res.redirect("/?magic=invalid");
    }
  });

  // ─── FACE CHECK ──────────────────────────────────────────
  app.post("/api/check-face", isAuthenticated, async (req, res) => {
    try {
      const { image } = req.body;
      if (!image || typeof image !== "string" || !image.startsWith("data:image")) {
        return res.status(400).json({ error: "Invalid image data" });
      }
      const result = await checkFacePresent(image);
      return res.json(result);
    } catch (err: any) {
      console.error("[check-face] error:", err?.message ?? err);
      return res.status(500).json({ faceDetected: false, reason: "Face scan failed — please try again" });
    }
  });

  // ─── PROFILE ─────────────────────────────────────────────
  app.put("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const parsed = profileUpdateSchema.parse(req.body);
      const user = await storage.getUserById(userId);

      // Country is locked once set — ignore any country update if the user already has one
      const { country: _ignored, ...rest } = parsed as any;

      if (!user?.country && (parsed as any).country) {
        // First time setting country — verify server-side that the IP matches
        const claimedCountry: string = (parsed as any).country;
        const geoCheck = await verifyCountryFromRequest(req, claimedCountry);
        if (!geoCheck.allowed) {
          return res.status(403).json({ error: geoCheck.reason ?? "Location verification failed." });
        }
      }

      const photosIncluded = Array.isArray((parsed as any).photos);

      // Enforce at least 1 profile photo on initial profile setup
      const isInitialSetup = !user?.caste;
      const submittedPhotos: string[] = (parsed as any).photos ?? [];
      if (isInitialSetup) {
        if (submittedPhotos.length < 1) {
          return res.status(400).json({ error: "You must upload at least one profile photo to complete your profile." });
        }
        if (!(parsed as any).verificationSelfie) {
          return res.status(400).json({ error: "A verification selfie is required to complete your profile." });
        }
      }

      // Face detection gate — run whenever a new verification selfie is being submitted
      const incomingSelfie: string | undefined = (parsed as any).verificationSelfie;
      if (incomingSelfie && incomingSelfie.startsWith("data:image")) {
        const faceCheck = await checkFacePresent(incomingSelfie);
        if (!faceCheck.faceDetected) {
          return res.status(400).json({
            error: faceCheck.reason ?? "No clear face detected in your selfie. Please take a well-lit photo facing the camera directly.",
          });
        }
      }

      // Only rebuild photo slots if the request actually included a photos array
      const existingSlots: any[] = (user?.photoSlots as any[] | null) ?? [];
      const existingApproved: string[] = user?.photos ?? [];

      let updatedSlots = existingSlots;
      let keptApproved = existingApproved;
      let newUploads: string[] = [];

      if (photosIncluded) {
        // Index all existing slot URLs for O(1) lookup
        const existingSlotUrlSet = new Set(existingSlots.map((s: any) => s.url));

        // A photo is "kept approved" if it already lives in an approved slot.
        // This works for both HTTP URLs and base64 data URIs — the only thing
        // that matters is whether the identical string is already stored.
        const keptApprovedUrlSet = new Set(
          submittedPhotos.filter(p => existingSlots.some((s: any) => s.status === "approved" && s.url === p))
        );

        // A photo is "new" if its exact string does not exist in any slot yet.
        newUploads = submittedPhotos.filter(p => !existingSlotUrlSet.has(p));

        // Rebuild slots:
        //   • Approved slots the user kept → stay approved (never reset)
        //   • Pending slots → always kept (awaiting admin review)
        //   • Rejected slots → kept, but auto-retired (FIFO) when new uploads are present
        //     so that each new upload consumes exactly one "freed" slot without exceeding the limit
        let slotsToKeep = existingSlots.filter((s: any) =>
          (s.status === "approved" && keptApprovedUrlSet.has(s.url)) ||
          s.status === "pending" ||
          s.status === "rejected"
        );
        let autoRetire = newUploads.length;
        const keptSlots = slotsToKeep.filter((s: any) => {
          if (s.status === "rejected" && autoRetire > 0) { autoRetire--; return false; }
          return true;
        });
        const newPendingSlots = newUploads.map((url: string) => ({ url, status: "pending" as const }));
        updatedSlots = [...keptSlots, ...newPendingSlots];

        if (updatedSlots.length > 6) {
          return res.status(400).json({ error: "You can have a maximum of 6 photos." });
        }

        keptApproved = keptSlots.filter((s: any) => s.status === "approved").map((s: any) => s.url);
      }

      let mainPhotoUrl = user?.mainPhotoUrl;
      if (photosIncluded) {
        // Respect the order the frontend submitted: first approved URL = new main photo
        const firstSubmittedApproved = submittedPhotos.find(p => keptApproved.includes(p));
        if (firstSubmittedApproved) {
          mainPhotoUrl = firstSubmittedApproved;
        } else if (mainPhotoUrl && !keptApproved.includes(mainPhotoUrl)) {
          // Current main was removed — fall back to first remaining approved photo
          mainPhotoUrl = keptApproved[0] ?? null;
        }
      }

      const data = user?.country ? rest : parsed;
      const updated = await storage.updateUser(userId, {
        ...(data as any),
        ...(photosIncluded ? {
          photoSlots: updatedSlots,
          photos: keptApproved,
          pendingPhotos: newUploads,
          mainPhotoUrl: mainPhotoUrl ?? null,
        } : {}),
      });
      res.json({ user: updated });
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/profile/:userId", isAuthenticated, async (req: any, res) => {
    const user = await storage.getUserById(req.params.userId as string);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  });

  // ─── DISCOVER ─────────────────────────────────────────────
  app.get("/api/discover", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const user = await storage.getUserById(userId);
    if (!user || !user.caste || !user.gender) return res.status(400).json({ error: "Profile incomplete" });
    const minAge = parseInt(req.query.minAge as string) || 18;
    const maxAge = parseInt(req.query.maxAge as string) || 80;
    const profiles = await storage.getDiscoverProfiles(userId, user.caste as string, user.gender as string, minAge, maxAge);
    res.json({ profiles });
  });

  // ─── LIKES / DISLIKES ─────────────────────────────────────
  app.post("/api/like/:targetId", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const targetId = req.params.targetId as string;
    const result = await storage.likeUser(userId, targetId);
    res.json(result);
  });

  app.post("/api/dislike/:targetId", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    await storage.dislikeUser(userId, req.params.targetId as string);
    res.json({ ok: true });
  });

  // ─── MATCHES ──────────────────────────────────────────────
  app.get("/api/matches", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const matchList = await storage.getMatches(userId);
    res.json({ matches: matchList });
  });

  // ─── MESSAGES ─────────────────────────────────────────────
  app.get("/api/messages/:matchId", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const user = await storage.getUserById(userId);
    const match = await storage.getMatch(req.params.matchId as string);
    if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const adminChat = await isAdminMatch(match);
    if (!user?.isPremium && !adminChat) return res.status(403).json({ error: "Premium required to view messages" });
    const msgs = await storage.getMessages(req.params.matchId as string);
    res.json({ messages: msgs });
  });

  app.post("/api/messages/:matchId", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const user = await storage.getUserById(userId);
    const match = await storage.getMatch(req.params.matchId as string);
    if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const adminChat = await isAdminMatch(match);
    if (!user?.isPremium && !adminChat) return res.status(403).json({ error: "Premium required to send messages" });
    const { text } = z.object({ text: z.string().min(1).max(2000) }).parse(req.body);
    const msg = await storage.sendMessage(req.params.matchId as string, userId, text);
    // Auto AI reply when a regular user messages the support account or admin chat
    const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
    const otherUser = await storage.getUserById(otherUserId);
    if ((otherUser?.isSystemAccount || otherUser?.isAdmin) && !user?.isAdmin && !user?.isSystemAccount) {
      generateSupportAiReply(match.id, otherUserId);
      if (otherUser?.isSystemAccount) {
        const displayName = user?.fullName ?? user?.firstName ?? user?.email ?? "A user";
        sendSupportMessageAlertEmail(displayName, text, match.id).catch(() => {});
      }
    }
    res.json({ message: msg });
  });

  app.post("/api/messages/:matchId/read", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    await storage.markMessagesRead(req.params.matchId as string, userId);
    res.json({ ok: true });
  });

  // ─── EVENTS ───────────────────────────────────────────────
  app.get("/api/events", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const evList = await storage.listEvents(userId);
    res.json({ events: evList });
  });

  app.get("/api/events/:eventId", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const ev = await storage.getEvent(req.params.eventId as string, userId);
    if (!ev) return res.status(404).json({ error: "Event not found" });
    res.json({ event: ev });
  });

  app.post("/api/events/:eventId/attend", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    await storage.attendEvent(req.params.eventId as string, userId);
    res.json({ ok: true });
  });

  app.post("/api/events/:eventId/unattend", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    await storage.unattendEvent(req.params.eventId as string, userId);
    res.json({ ok: true });
  });

  app.post("/api/events", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const schema = z.object({
      title: z.string().min(1), description: z.string().min(1),
      type: z.enum(["cultural", "meetup", "online"]),
      date: z.string(), location: z.string().min(1),
      country: z.string().min(1), organizer: z.string().min(1),
      imageUrl: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const [event] = await db.insert(events).values({
      id: randomUUID(), ...data,
      date: new Date(data.date), imageUrl: data.imageUrl ?? "",
      attendeeCount: 0, creatorId: userId,
    }).returning();
    res.json({ event });
  });

  app.patch("/api/events/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const currentUser = await storage.getUserById(userId);
    const [event] = await db.select().from(events).where(eq(events.id, req.params.id as string));
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.creatorId !== userId && !currentUser?.isAdmin) return res.status(403).json({ error: "Not your event" });
    const schema = z.object({
      title: z.string().optional(), description: z.string().optional(),
      type: z.enum(["cultural", "meetup", "online"]).optional(),
      date: z.string().optional(), location: z.string().optional(),
      country: z.string().optional(), organizer: z.string().optional(),
      imageUrl: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const updates: Record<string, unknown> = { ...data };
    if (data.date) updates.date = new Date(data.date);
    await db.update(events).set(updates).where(eq(events.id, req.params.id as string));
    res.json({ ok: true });
  });

  app.delete("/api/events/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const currentUser = await storage.getUserById(userId);
    const [event] = await db.select().from(events).where(eq(events.id, req.params.id as string));
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.creatorId !== userId && !currentUser?.isAdmin) return res.status(403).json({ error: "Not your event" });
    await db.delete(eventAttendees).where(eq(eventAttendees.eventId, req.params.id as string));
    await db.delete(events).where(eq(events.id, req.params.id as string));
    res.json({ ok: true });
  });

  // ─── PREMIUM ──────────────────────────────────────────────
  app.post("/api/premium/subscribe", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const user = await storage.getUserById(userId);

    // Iraq users get free premium — but we verify server-side that the connection is actually from Iraq
    if (user?.country === "Iraq") {
      const geoCheck = await verifyIraqFromRequest(req);
      if (!geoCheck.isIraq) {
        return res.status(403).json({ error: geoCheck.reason ?? "Free membership is only available from Iraq." });
      }
    }

    const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await storage.updateUser(userId, { isPremium: true, premiumUntil: until });
    res.json({ ok: true });
  });

  // ─── VERIFICATION ─────────────────────────────────────────
  app.post("/api/verify/submit", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const { selfie } = z.object({ selfie: z.string().min(1) }).parse(req.body);
    if (selfie.startsWith("data:image")) {
      const faceCheck = await checkFacePresent(selfie);
      if (!faceCheck.faceDetected) {
        return res.status(400).json({ error: "Please upload a clear selfie showing your face." });
      }
    }
    await storage.updateUser(userId, { verificationSelfie: selfie, verificationStatus: "pending" });
    res.json({ ok: true });
  });

  app.post("/api/profile/reapply", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const user = await storage.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.verificationStatus === "banned") return res.status(403).json({ error: "Banned accounts cannot reapply." });
    if (user.verificationStatus === "pending") return res.status(400).json({ error: "Already pending review." });
    const { selfie } = z.object({ selfie: z.string().optional() }).parse(req.body);
    if (selfie && selfie.startsWith("data:image")) {
      const faceCheck = await checkFacePresent(selfie);
      if (!faceCheck.faceDetected) return res.status(400).json({ error: "Please upload a clear selfie showing your face." });
    }
    await storage.reapplyUser(userId, selfie);
    res.json({ ok: true });
  });

  // ─── SUPPORT CHAT ─────────────────────────────────────────
  app.post("/api/support/start", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const supportAccount = await getOrCreateSupportAccount();
      const existing = await db.select().from(matches).where(
        or(
          and(eq(matches.user1Id, supportAccount.id), eq(matches.user2Id, userId)),
          and(eq(matches.user1Id, userId), eq(matches.user2Id, supportAccount.id))
        )
      );
      if (existing.length > 0) return res.json({ matchId: existing[0].id });
      const matchId = randomUUID();
      await db.insert(matches).values({ id: matchId, user1Id: supportAccount.id, user2Id: userId });
      const openingMsg = `Hello! I'm the Gûstîlk Support Assistant — an AI available 24/7. How can I help you today?`;
      await storage.sendMessage(matchId, supportAccount.id, openingMsg);
      res.json({ matchId });
    } catch (e: any) {
      console.error("[support/start]", e);
      res.status(500).json({ error: "Failed to start support chat" });
    }
  });

  // ─── REPORTS ──────────────────────────────────────────────
  // ─── GIFTS ────────────────────────────────────────────────
  app.post("/api/gifts", isAuthenticated, async (req, res) => {
    const senderId = getUserId(req);
    const sender = await storage.getUserById(senderId);
    if (!sender?.isPremium) return res.status(403).json({ error: "Premium required to send gifts" });

    const { recipientId, matchId, giftType, message, animationStyle } = z.object({
      recipientId: z.string(),
      matchId: z.string(),
      giftType: z.string().min(1),
      message: z.string().max(200).optional().default(""),
      animationStyle: z.enum(["none","confetti","sparkles","fireworks","hearts","flowers"]).default("none"),
    }).parse(req.body);

    const gift = await storage.sendGift(senderId, recipientId, matchId, giftType, message, animationStyle);
    res.json({ gift });
  });

  app.get("/api/gifts/match/:matchId", isAuthenticated, async (req, res) => {
    const gifts = await storage.getGiftsInMatch(req.params.matchId);
    res.json({ gifts });
  });

  app.get("/api/gifts/received", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const gifts = await storage.getGiftsReceived(userId);
    res.json({ gifts });
  });

  // ─── SEEN ─────────────────────────────────────────────────
  app.post("/api/seen/matches", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    // Mark all unread messages sent to this user as read
    await db.update(messages)
      .set({ readAt: new Date() })
      .where(and(eq(messages.readAt, null as any), sql`${messages.senderId} != ${userId}`));
    // Update matchesSeenAt
    await db.update(users).set({ matchesSeenAt: new Date() } as any).where(eq(users.id, userId));
    res.json({ ok: true });
  });

  app.post("/api/seen/activity", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    await db.update(users).set({ activitySeenAt: new Date() } as any).where(eq(users.id, userId));
    res.json({ ok: true });
  });

  // ─── ACTIVITY ─────────────────────────────────────────────
  app.post("/api/users/:userId/visit", isAuthenticated, async (req, res) => {
    const fromUserId = getUserId(req);
    const toUserId = String(req.params.userId);
    await storage.recordVisit(fromUserId, toUserId);
    res.json({ ok: true });
  });

  app.get("/api/activity/likes-received", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const items = await storage.getLikesReceived(userId);
    res.json({ items });
  });

  app.get("/api/activity/likes-sent", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const items = await storage.getLikesSent(userId);
    res.json({ items });
  });

  app.get("/api/activity/visitors", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const items = await storage.getVisitors(userId);
    res.json({ items });
  });

  // ─── BLOCKS ───────────────────────────────────────────────
  app.get("/api/blocks", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const blocked = await storage.getBlockedUsers(userId);
    res.json({ users: blocked });
  });

  app.post("/api/users/:userId/block", isAuthenticated, async (req, res) => {
    const blockerId = getUserId(req);
    const blockedId = String(req.params.userId);
    if (blockerId === blockedId) return res.status(400).json({ error: "Cannot block yourself" });
    await storage.blockUser(blockerId, blockedId);
    res.json({ ok: true });
  });

  app.delete("/api/users/:userId/block", isAuthenticated, async (req, res) => {
    const blockerId = getUserId(req);
    const blockedId = String(req.params.userId);
    await storage.unblockUser(blockerId, blockedId);
    res.json({ ok: true });
  });

  app.post("/api/reports", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const { reportedUserId, reason, description } = z.object({
      reportedUserId: z.string(),
      reason: z.string().min(1),
      description: z.string().default(""),
    }).parse(req.body);
    const report = await storage.createReport(userId, reportedUserId, reason, description);
    res.json({ report });
  });

  // ─── ADMIN ────────────────────────────────────────────────
  async function requireAdmin(req: any, res: any, next: any) {
    const userId = getUserId(req);
    const user = await storage.getUserById(userId);
    if (!user?.isAdmin) return res.status(403).json({ error: "Admin only" });
    next();
  }

  app.get("/api/admin/verifications", isAuthenticated, requireAdmin, async (_req, res) => {
    const pending = await storage.getPendingVerifications();
    res.json({ users: pending });
  });

  app.post("/api/admin/verify/:userId", isAuthenticated, requireAdmin, async (req, res) => {
    const adminId = getUserId(req);
    const targetId = req.params.userId as string;
    const { action, reason } = z.object({
      action: z.enum(["approve", "reject", "ban"]),
      reason: z.string().optional(),
    }).parse(req.body);

    if (action === "ban") {
      await storage.banUser(targetId, reason);
    } else {
      await storage.updateVerificationStatus(targetId, action === "approve" ? "approved" : "rejected", action === "approve", reason);
      // Also approve/reject all pending photo slots
      if (action === "approve") {
        const targetUser = await storage.getUserById(targetId);
        const slots = (targetUser?.photoSlots as any[] | null) ?? [];
        for (let i = 0; i < slots.length; i++) {
          if (slots[i]?.status === "pending") {
            await storage.approvePhotoSlot(targetId, i);
          }
        }
      }
    }

    // Welcome message from support account on first approval
    if (action === "approve") {
      try {
        const supportAccount = await getOrCreateSupportAccount();
        const existing = await db.select().from(matches).where(
          or(
            and(eq(matches.user1Id, supportAccount.id), eq(matches.user2Id, targetId)),
            and(eq(matches.user1Id, targetId), eq(matches.user2Id, supportAccount.id))
          )
        );
        let supportMatchId: string;
        if (existing.length > 0) {
          supportMatchId = existing[0].id;
        } else {
          supportMatchId = randomUUID();
          await db.insert(matches).values({ id: supportMatchId, user1Id: supportAccount.id, user2Id: targetId });
        }
        const welcomeMsg = `Welcome to Gûstîlk! 🎉 Your account is now verified and you are part of our community. I am the Gûstîlk Support Assistant — an AI here 24/7 to help you. Feel free to ask me anything about matching, your profile, events, premium features, or any issue you run into. We hope you find meaningful connections here!`;
        await storage.sendMessage(supportMatchId, supportAccount.id, welcomeMsg);
      } catch (e) {
        console.error("[welcome-message error]", e);
      }
    }

    // Auto-message the user on reject or ban
    if (action === "reject" || action === "ban") {
      try {
        const existing = await db.select().from(matches).where(
          or(
            and(eq(matches.user1Id, adminId), eq(matches.user2Id, targetId)),
            and(eq(matches.user1Id, targetId), eq(matches.user2Id, adminId))
          )
        );
        let matchId: string;
        if (existing.length > 0) {
          matchId = existing[0].id;
        } else {
          matchId = randomUUID();
          await db.insert(matches).values({ id: matchId, user1Id: adminId, user2Id: targetId });
        }
        const defaultMsg = action === "ban"
          ? "Your account has been suspended for violating our community guidelines."
          : "Thank you for registering on Gûstîlk. Unfortunately, we were unable to approve your account at this time.";
        const msg = reason?.trim() ? `${defaultMsg} ${reason.trim()}` : defaultMsg;
        await storage.sendMessage(matchId, adminId, msg);
      } catch (e) {
        console.error("[verify auto-message error]", e);
      }
    }

    res.json({ ok: true });
  });

  app.post("/api/admin/ban/:userId", isAuthenticated, requireAdmin, async (req, res) => {
    await storage.banUser(req.params.userId as string);
    res.json({ ok: true });
  });

  app.get("/api/admin/reports", isAuthenticated, requireAdmin, async (_req, res) => {
    const reps = await storage.listReports();
    res.json({ reports: reps });
  });

  app.post("/api/admin/reports/:reportId/resolve", isAuthenticated, requireAdmin, async (req, res) => {
    await storage.resolveReport(req.params.reportId as string);
    res.json({ ok: true });
  });

  app.get("/api/admin/users", isAuthenticated, requireAdmin, async (req, res) => {
    const search = ((req.query.search as string) || "").trim();
    const countryFilter = ((req.query.country as string) || "").trim();
    const cityFilter = ((req.query.city as string) || "").trim();
    const premiumFilter = (req.query.premium as string) || "";
    const casteFilter = (req.query.caste as string) || "";
    const limit = Math.min(parseInt(req.query.limit as string) || 500, 1000);
    const offset = parseInt(req.query.offset as string) || 0;
    const conditions: any[] = [];
    if (search) conditions.push(or(ilike(users.fullName, `%${search}%`), ilike(users.email, `%${search}%`), ilike(users.city, `%${search}%`)));
    if (countryFilter) conditions.push(ilike(users.country, `%${countryFilter}%`));
    if (cityFilter) conditions.push(ilike(users.city, `%${cityFilter}%`));
    if (premiumFilter === "premium") conditions.push(eq(users.isPremium, true));
    if (premiumFilter === "non_premium") conditions.push(eq(users.isPremium, false));
    if (casteFilter && ["sheikh", "pir", "murid"].includes(casteFilter)) conditions.push(eq(users.caste, casteFilter as any));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [allUsers, [countRow]] = await Promise.all([
      whereClause
        ? db.select().from(users).where(whereClause).orderBy(desc(users.createdAt)).limit(limit).offset(offset)
        : db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset),
      whereClause
        ? db.select({ n: count() }).from(users).where(whereClause)
        : db.select({ n: count() }).from(users),
    ]);
    res.json({ users: allUsers, total: Number(countRow.n) });
  });

  app.patch("/api/admin/users/:id", isAuthenticated, requireAdmin, async (req, res) => {
    const schema = z.object({
      isPremium: z.boolean().optional(),
      isBanned: z.boolean().optional(),
      isAdmin: z.boolean().optional(),
      profileVisible: z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.isPremium !== undefined) {
      updates.isPremium = data.isPremium;
      if (data.isPremium) updates.premiumUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      else updates.premiumUntil = null;
    }
    if (data.isBanned !== undefined) {
      updates.verificationStatus = data.isBanned ? "banned" : "none";
      if (data.isBanned) { updates.isVerified = false; updates.profileVisible = false; }
    }
    if (data.isAdmin !== undefined) updates.isAdmin = data.isAdmin;
    if (data.profileVisible !== undefined) updates.profileVisible = data.profileVisible;
    await db.update(users).set(updates).where(eq(users.id, req.params.id as string));
    res.json({ ok: true });
  });

  app.delete("/api/admin/users/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const targetId = req.params.id as string;
      const adminId = getUserId(req);

      const [targetUser, adminUser] = await Promise.all([
        storage.getUserById(targetId),
        storage.getUserById(adminId),
      ]);

      if (!targetUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const wasPremium = !!targetUser.isPremium;
      const adminEmail = adminUser?.email ?? "";
      const displayName = targetUser.fullName ?? targetUser.firstName ?? "Member";

      if (wasPremium) {
        await writeAuditLog(
          adminId,
          adminEmail,
          "premium_cancelled_on_deletion",
          "user",
          targetId,
          `Account deleted by admin. Premium subscription cancelled immediately. User: ${targetUser.email ?? targetUser.phone ?? targetId}. FLAG FOR REFUND REVIEW.`,
        );
        if (targetUser.email) {
          sendAccountDeletedEmail(targetUser.email, displayName, true).catch(() => {});
        }
      } else if (targetUser.email) {
        sendAccountDeletedEmail(targetUser.email, displayName, false).catch(() => {});
      }

      await writeAuditLog(
        adminId,
        adminEmail,
        "delete_user",
        "user",
        targetId,
        `Deleted user: ${targetUser.email ?? targetUser.phone ?? targetId}${wasPremium ? " (had active premium)" : ""}`,
      );

      await storage.deleteUser(targetId);
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin] delete user error:", err);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.get("/api/admin/pending-photos", isAuthenticated, requireAdmin, async (_req, res) => {
    const usersWithPending = await storage.getUsersWithPendingPhotoSlots();
    res.json({ users: usersWithPending });
  });

  app.post("/api/admin/photos/:userId/approve/:slotIdx", isAuthenticated, requireAdmin, async (req, res) => {
    const userId = String(req.params.userId);
    const slotIdx = parseInt(String(req.params.slotIdx));
    const { user } = await storage.approvePhotoSlot(userId, slotIdx);
    if (user.email) {
      sendPhotoApprovedEmail(user.email, user.fullName ?? user.firstName ?? "Member").catch(() => {});
    }
    res.json({ ok: true, user });
  });

  app.post("/api/admin/photos/:userId/reject/:slotIdx", isAuthenticated, requireAdmin, async (req, res) => {
    const userId = String(req.params.userId);
    const slotIdx = parseInt(String(req.params.slotIdx));
    const reason = String(req.body?.reason ?? "");
    const { user } = await storage.rejectPhotoSlot(userId, slotIdx, reason);
    if (user.email) {
      sendPhotoRejectedEmail(user.email, user.fullName ?? user.firstName ?? "Member", reason).catch(() => {});
    }
    res.json({ ok: true, user });
  });

  app.post("/api/profile/set-main-photo", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const { slotIdx } = z.object({ slotIdx: z.number().int().min(0) }).parse(req.body);
    await storage.setMainPhoto(userId, slotIdx);
    const updated = await storage.getUserById(userId);
    res.json({ user: updated });
  });

  app.get("/api/admin/stats", isAuthenticated, requireAdmin, async (_req, res) => {
    const { cacheGet: cGet, cacheSet: cSet, TTL: CT } = await import("./cache");
    const ck = "admin:stats";
    const cached = cGet<object>(ck);
    if (cached) return res.json(cached);

    const [[tu], [pu], [vu], [bu], [tm], [tms], [te], [nw]] = await Promise.all([
      db.select({ n: count() }).from(users),
      db.select({ n: count() }).from(users).where(sql`${users.isPremium} = true`),
      db.select({ n: count() }).from(users).where(sql`${users.isVerified} = true`),
      db.select({ n: count() }).from(users).where(sql`${users.verificationStatus} = 'banned'`),
      db.select({ n: count() }).from(matches),
      db.select({ n: count() }).from(messages),
      db.select({ n: count() }).from(events),
      db.select({ n: count() }).from(users).where(sql`${users.createdAt} > now() - interval '7 days'`),
    ]);
    const result = {
      totalUsers: Number(tu.n), premiumUsers: Number(pu.n), verifiedUsers: Number(vu.n),
      bannedUsers: Number(bu.n), totalMatches: Number(tm.n), totalMessages: Number(tms.n),
      totalEvents: Number(te.n), newThisWeek: Number(nw.n),
    };
    cSet(ck, result, CT.ADMIN_STATS);
    res.json(result);
  });

  app.get("/api/admin/events", isAuthenticated, requireAdmin, async (_req, res) => {
    const allEvents = await db.select().from(events).orderBy(asc(events.date));
    res.json({ events: allEvents });
  });

  app.post("/api/admin/events", isAuthenticated, requireAdmin, async (req, res) => {
    const schema = z.object({
      title: z.string().min(1), description: z.string().min(1),
      type: z.enum(["cultural", "meetup", "online"]),
      date: z.string(), location: z.string().min(1),
      country: z.string().min(1), organizer: z.string().min(1),
      imageUrl: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const [event] = await db.insert(events).values({
      id: randomUUID(), ...data,
      date: new Date(data.date), imageUrl: data.imageUrl ?? "", attendeeCount: 0,
    }).returning();
    res.json({ event });
  });

  app.patch("/api/admin/events/:id", isAuthenticated, requireAdmin, async (req, res) => {
    const schema = z.object({
      title: z.string().optional(), description: z.string().optional(),
      type: z.enum(["cultural", "meetup", "online"]).optional(),
      date: z.string().optional(), location: z.string().optional(),
      country: z.string().optional(), organizer: z.string().optional(),
      imageUrl: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const updates: Record<string, unknown> = { ...data };
    if (data.date) updates.date = new Date(data.date);
    await db.update(events).set(updates).where(eq(events.id, req.params.id as string));
    res.json({ ok: true });
  });

  app.delete("/api/admin/events/:id", isAuthenticated, requireAdmin, async (req, res) => {
    await db.delete(eventAttendees).where(eq(eventAttendees.eventId, req.params.id as string));
    await db.delete(events).where(eq(events.id, req.params.id as string));
    res.json({ ok: true });
  });

  // Any user: start or resume a chat with admin (support)
  app.post("/api/support/start-chat", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const [adminUser] = await db.select({ id: users.id }).from(users).where(eq(users.isAdmin, true)).limit(1);
    if (!adminUser) return res.status(404).json({ error: "Support not available" });
    const adminId = adminUser.id;
    const existing = await db.select().from(matches).where(
      or(
        and(eq(matches.user1Id, userId), eq(matches.user2Id, adminId)),
        and(eq(matches.user1Id, adminId), eq(matches.user2Id, userId))
      )
    );
    if (existing.length > 0) return res.json({ matchId: existing[0].id });
    const matchId = randomUUID();
    await db.insert(matches).values({ id: matchId, user1Id: adminId, user2Id: userId });
    res.json({ matchId });
  });

  // Admin: start or resume a direct chat with any user
  app.post("/api/admin/start-chat/:userId", isAuthenticated, requireAdmin, async (req, res) => {
    const adminId = getUserId(req);
    const targetId = req.params.userId as string;
    const existing = await db.select().from(matches).where(
      or(
        and(eq(matches.user1Id, adminId), eq(matches.user2Id, targetId)),
        and(eq(matches.user1Id, targetId), eq(matches.user2Id, adminId))
      )
    );
    if (existing.length > 0) return res.json({ matchId: existing[0].id });
    const matchId = randomUUID();
    await db.insert(matches).values({ id: matchId, user1Id: adminId, user2Id: targetId });
    res.json({ matchId });
  });

  // ─── CHANGE EMAIL ─────────────────────────────────────────
  app.patch("/api/auth/change-email", isAuthenticated, async (req: any, res) => {
    try {
      const bcrypt = await import("bcryptjs");
      const { newEmail, currentPassword } = req.body;
      if (!newEmail || !currentPassword) return res.status(400).json({ message: "New email and current password are required" });
      const userId = getUserId(req);
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || !user.passwordHash) return res.status(400).json({ message: "Password authentication not set up for this account" });
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) return res.status(401).json({ message: "Current password is incorrect" });
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, newEmail.toLowerCase().trim()));
      if (existing) return res.status(409).json({ message: "That email is already in use" });
      await db.update(users).set({ email: newEmail.toLowerCase().trim() }).where(eq(users.id, userId));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── CHANGE PASSWORD ──────────────────────────────────────
  app.patch("/api/auth/change-password", isAuthenticated, async (req: any, res) => {
    try {
      const bcrypt = await import("bcryptjs");
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ message: "Both current and new password are required" });
      if (newPassword.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });
      const userId = getUserId(req);
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || !user.passwordHash) return res.status(400).json({ message: "Password authentication not set up for this account" });
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) return res.status(401).json({ message: "Current password is incorrect" });
      const hash = await bcrypt.hash(newPassword, 10);
      await db.update(users).set({ passwordHash: hash }).where(eq(users.id, userId));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── CHANGE PHONE ─────────────────────────────────────────
  app.patch("/api/auth/change-phone", isAuthenticated, async (req: any, res) => {
    try {
      const { newPhone } = req.body;
      if (!newPhone) return res.status(400).json({ message: "New phone number is required" });
      const userId = getUserId(req);
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, newPhone.trim()));
      if (existing && existing.id !== userId) return res.status(409).json({ message: "That phone number is already in use" });
      await db.update(users).set({ phone: newPhone.trim() }).where(eq(users.id, userId));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── DELETE ACCOUNT ───────────────────────────────────────
  app.delete("/api/account", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      await storage.deleteUser(userId);
      req.session.destroy(() => {});
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── EXTENDED ADMIN ROUTES ────────────────────────────────────────────────
  registerAdminRoutes(app, isAuthenticated, requireAdmin);

  // ─── HOURLY MESSAGE EXPIRY CLEANUP ────────────────────────────────────────
  const runMsgCleanup = async () => {
    try {
      const n = await storage.cleanupExpiredMessages();
      if (n > 0) console.log(`[msg-cleanup] Expired ${n} message(s)`);
    } catch (e) {
      console.error("[msg-cleanup] Error:", e);
    }
  };
  runMsgCleanup();
  setInterval(runMsgCleanup, 60 * 60 * 1000);

  return httpServer;
}
