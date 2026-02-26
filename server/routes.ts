import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSession, registerAuthRoutes, isAuthenticated } from "./auth";
import { profileUpdateSchema, users, matches, messages, events, eventAttendees } from "@shared/schema";
import { verifyCountryFromRequest, verifyIraqFromRequest, getClientIp, lookupIpCountry } from "./geo";
import { setupWs } from "./ws";
import { z } from "zod";
import { moderatePhotos, checkFacePresent } from "./moderation";
import { db } from "./db";
import { count, sql, eq, asc, desc, or, ilike } from "drizzle-orm";
import { randomUUID } from "crypto";

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
      if (isInitialSetup) {
        const submittedPhotos: string[] = (parsed as any).photos ?? [];
        if (submittedPhotos.length < 1) {
          return res.status(400).json({ error: "You must upload at least one profile photo to complete your profile." });
        }
        if (!(parsed as any).verificationSelfie) {
          return res.status(400).json({ error: "A verification selfie is required to complete your profile." });
        }
      }

      // Enforce max 6 photos at all times
      const allPhotos: string[] = (parsed as any).photos ?? [];
      if (allPhotos.length > 6) {
        return res.status(400).json({ error: "You can upload a maximum of 6 photos." });
      }

      // Moderate only newly uploaded photos (base64 data URLs, not already-stored ones)
      const existingPhotos: string[] = user?.photos ?? [];
      const newPhotos = allPhotos.filter(p => p.startsWith("data:image") && !existingPhotos.includes(p));
      console.log(`[routes] profile update: ${allPhotos.length} total photos, ${newPhotos.length} new to scan`);
      if (newPhotos.length > 0) {
        const photoCheck = await moderatePhotos(newPhotos);
        console.log(`[routes] moderation result: safe=${photoCheck.safe}, reason=${photoCheck.reason ?? "none"}`);
        if (!photoCheck.safe) {
          return res.status(400).json({ error: "One or more photos contain inappropriate or explicit content and cannot be uploaded." });
        }
      }

      // Moderate verification selfie if newly submitted
      const selfie: string | undefined = (parsed as any).verificationSelfie;
      if (selfie && selfie.startsWith("data:image") && selfie !== user?.verificationSelfie) {
        const selfieCheck = await moderatePhotos([selfie]);
        if (!selfieCheck.safe) {
          return res.status(400).json({ error: "The verification photo contains inappropriate content." });
        }
      }

      const data = user?.country ? rest : parsed;
      const updated = await storage.updateUser(userId, data as any);
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
    const result = await storage.likeUser(userId, req.params.targetId as string);
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
      const check = await moderatePhotos([selfie]);
      if (!check.safe) {
        return res.status(400).json({ error: "The verification photo contains inappropriate content." });
      }
    }
    await storage.updateUser(userId, { verificationSelfie: selfie, verificationStatus: "pending" });
    res.json({ ok: true });
  });

  // ─── REPORTS ──────────────────────────────────────────────
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
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;
    const whereClause = search
      ? or(ilike(users.fullName, `%${search}%`), ilike(users.email, `%${search}%`), ilike(users.city, `%${search}%`))
      : undefined;
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
