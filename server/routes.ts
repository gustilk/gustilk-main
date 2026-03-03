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
import { sendMagicLinkEmail, sendPhotoApprovedEmail, sendPhotoRejectedEmail } from "./email";
import twilio from "twilio";

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

async function sendSmsNotification(toPhone: string, body: string): Promise<void> {
  if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) return;
  try {
    await twilioClient.messages.create({ from: process.env.TWILIO_PHONE_NUMBER, to: toPhone, body });
  } catch (e) {
    console.error("SMS send error:", e);
  }
}

function getUserId(req: any): string {
  return req.session?.userId;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupSession(app);
  registerAuthRoutes(app);
  setupWs(httpServer);

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

      // Build updated photoSlots from existing + new uploads
      const existingSlots: any[] = (user?.photoSlots as any[] | null) ?? [];
      const existingApproved: string[] = user?.photos ?? [];

      // Approved slots user is keeping (submitted by URL, not base64)
      const keptApprovedUrls = submittedPhotos.filter(p => !p.startsWith("data:image") && existingApproved.includes(p));

      // New base64 uploads → pending slots
      const newUploads = submittedPhotos.filter(p => p.startsWith("data:image"));

      const removedRejectedUrls: string[] = (parsed as any).removedRejectedUrls ?? [];

      // Reconstruct slots: keep existing non-removed approved/pending/rejected slots, add new uploads
      const keptSlots = existingSlots.filter(s =>
        (s.status === "approved" && keptApprovedUrls.includes(s.url)) ||
        s.status === "pending" ||
        (s.status === "rejected" && !removedRejectedUrls.includes(s.url))
      );
      const newPendingSlots = newUploads.map((url: string) => ({ url, status: "pending" as const }));
      const updatedSlots = [...keptSlots, ...newPendingSlots];

      if (updatedSlots.length > 6) {
        return res.status(400).json({ error: "You can have a maximum of 6 photos." });
      }

      const keptApproved = keptSlots.filter(s => s.status === "approved").map((s: any) => s.url);
      let mainPhotoUrl = user?.mainPhotoUrl;
      if (mainPhotoUrl && !keptApproved.includes(mainPhotoUrl)) {
        mainPhotoUrl = keptApproved[0] ?? null;
      }

      const data = user?.country ? rest : parsed;
      const updated = await storage.updateUser(userId, {
        ...(data as any),
        photoSlots: updatedSlots,
        photos: keptApproved,
        pendingPhotos: newUploads,
        mainPhotoUrl: mainPhotoUrl ?? null,
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

    // Send SMS to the liked user if they have a phone number
    const [liker, liked] = await Promise.all([
      storage.getUserById(userId),
      storage.getUserById(targetId),
    ]);
    if (liked?.phone && liker) {
      const likerName = liker.firstName ?? liker.fullName?.split(" ")[0] ?? "Someone";
      if (result.matched) {
        await sendSmsNotification(liked.phone, `💛 You matched with ${likerName} on Gûstîlk! Open the app to start chatting.`);
      } else {
        await sendSmsNotification(liked.phone, `💛 ${likerName} liked your profile on Gûstîlk! Open the app to see who it is.`);
      }
    }
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
    if (!user?.isPremium) return res.status(403).json({ error: "Premium required to view messages" });
    const match = await storage.getMatch(req.params.matchId as string);
    if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const msgs = await storage.getMessages(req.params.matchId as string);
    res.json({ messages: msgs });
  });

  app.post("/api/messages/:matchId", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const user = await storage.getUserById(userId);
    if (!user?.isPremium) return res.status(403).json({ error: "Premium required to send messages" });
    const match = await storage.getMatch(req.params.matchId as string);
    if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { text } = z.object({ text: z.string().min(1).max(2000) }).parse(req.body);
    const msg = await storage.sendMessage(req.params.matchId as string, userId, text);
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
    const [event] = await db.select().from(events).where(eq(events.id, req.params.id as string));
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.creatorId !== userId) return res.status(403).json({ error: "Not your event" });
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
    const [event] = await db.select().from(events).where(eq(events.id, req.params.id as string));
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.creatorId !== userId) return res.status(403).json({ error: "Not your event" });
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

  // ─── REPORTS ──────────────────────────────────────────────
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
    const { action } = z.object({ action: z.enum(["approve", "reject", "ban"]) }).parse(req.body);
    if (action === "ban") {
      await storage.banUser(req.params.userId as string);
    } else {
      await storage.updateVerificationStatus(
        req.params.userId as string,
        action === "approve" ? "approved" : "rejected",
        action === "approve"
      );
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
    const limit = Math.min(parseInt(req.query.limit as string) || 500, 1000);
    const offset = parseInt(req.query.offset as string) || 0;
    const conditions: any[] = [];
    if (search) conditions.push(or(ilike(users.fullName, `%${search}%`), ilike(users.email, `%${search}%`), ilike(users.city, `%${search}%`)));
    if (countryFilter) conditions.push(ilike(users.country, `%${countryFilter}%`));
    if (cityFilter) conditions.push(ilike(users.city, `%${cityFilter}%`));
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
      if (data.isBanned) updates.isVerified = false;
    }
    if (data.isAdmin !== undefined) updates.isAdmin = data.isAdmin;
    await db.update(users).set(updates).where(eq(users.id, req.params.id as string));
    res.json({ ok: true });
  });

  app.delete("/api/admin/users/:id", isAuthenticated, requireAdmin, async (req, res) => {
    await storage.deleteUser(req.params.id as string);
    res.json({ ok: true });
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
    res.json({
      totalUsers: Number(tu.n), premiumUsers: Number(pu.n), verifiedUsers: Number(vu.n),
      bannedUsers: Number(bu.n), totalMatches: Number(tm.n), totalMessages: Number(tms.n),
      totalEvents: Number(te.n), newThisWeek: Number(nw.n),
    });
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

  return httpServer;
}
