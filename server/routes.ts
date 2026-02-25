import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./auth";
import { registerSchema, sendOtpSchema, verifyOtpSchema } from "@shared/schema";
import passport from "passport";
import { z } from "zod";
import { generateOtp, sendSms } from "./twilio";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupAuth(app);

  // ─── AUTH ────────────────────────────────────────────────
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      if (data.email) {
        const existing = await storage.getUserByEmail(data.email);
        if (existing) return res.status(400).json({ error: "Email already in use" });
      }
      if (data.phone) {
        const existing = await storage.getUserByPhone(data.phone);
        if (existing) return res.status(400).json({ error: "Phone number already in use" });
      }
      const user = await storage.createUser(data as any);
      req.login(user as any, (err) => {
        if (err) return res.status(500).json({ error: "Login failed after register" });
        res.json({ user });
      });
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: "Identifier and password required" });

    const user = await storage.getUserByIdentifier(identifier);
    if (!user) return res.status(401).json({ error: "No account found with that email or phone" });

    const bcrypt = await import("bcryptjs");
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Incorrect password" });

    req.login(user as any, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      const { password: _, ...safe } = user;
      res.json({ user: safe });
    });
  });

  // ─── OTP ─────────────────────────────────────────────────
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phone, purpose } = sendOtpSchema.parse(req.body);
      if (purpose === "login") {
        const existing = await storage.getUserByPhone(phone);
        if (!existing) return res.status(404).json({ error: "No account found with this number" });
      }
      if (purpose === "register") {
        const existing = await storage.getUserByPhone(phone);
        if (existing) return res.status(400).json({ error: "Phone number already registered" });
      }
      const code = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await storage.createOtp(phone, code, expiresAt);
      const ok = await sendSms(phone, `Your Gûstîlk code: ${code}. Valid for 10 minutes.`);
      if (!ok) return res.status(500).json({ error: "Failed to send SMS" });
      res.json({ ok: true, devCode: process.env.NODE_ENV !== "production" ? code : undefined });
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { phone, code, registrationData } = verifyOtpSchema.parse(req.body);
      const valid = await storage.verifyOtp(phone, code);
      if (!valid) return res.status(400).json({ error: "Invalid or expired code" });

      let user = await storage.getUserByPhone(phone);

      if (!user && registrationData) {
        await storage.createUser({
          ...registrationData,
          phone,
          email: undefined as any,
        } as any);
        user = await storage.getUserByPhone(phone);
      }

      if (!user) return res.status(400).json({ error: "Account not found. Please register first." });

      req.login(user as any, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        const { password: _pw, ...safe } = user as any;
        res.json({ user: safe });
      });
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => res.json({ ok: true }));
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await storage.getUserById((req.user as any).id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password: _, ...safe } = user;
    res.json({ user: safe });
  });

  // ─── PROFILE ─────────────────────────────────────────────
  const profileUpdateSchema = z.object({
    fullName: z.string().min(2).optional(),
    city: z.string().min(1).optional(),
    country: z.string().min(1).optional(),
    bio: z.string().max(500).optional(),
    occupation: z.string().max(100).optional(),
    languages: z.array(z.string()).optional(),
    photos: z.array(z.string()).optional(),
    age: z.number().min(18).max(80).optional(),
    gender: z.enum(["male", "female"]).optional(),
    verificationSelfie: z.string().optional(),
    verificationStatus: z.enum(["none", "pending", "approved", "rejected"]).optional(),
  });

  app.put("/api/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const data = profileUpdateSchema.parse(req.body);
      const updated = await storage.updateUser(userId, data as any);
      res.json({ user: updated });
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/profile/:id", requireAuth, async (req, res) => {
    const user = await storage.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password: _, ...safe } = user;
    res.json({ user: safe });
  });

  // ─── DISCOVER ─────────────────────────────────────────────
  app.get("/api/discover", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUserById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const minAge = parseInt(req.query.minAge as string) || 18;
      const maxAge = parseInt(req.query.maxAge as string) || 80;

      const profiles = await storage.getDiscoverProfiles(userId, user.caste, minAge, maxAge);
      res.json({ profiles });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── LIKES / DISLIKES ────────────────────────────────────
  app.post("/api/like/:userId", requireAuth, async (req, res) => {
    try {
      const fromUserId = (req.user as any).id;
      const toUserId = req.params.userId;
      if (fromUserId === toUserId) return res.status(400).json({ error: "Cannot like yourself" });
      const result = await storage.likeUser(fromUserId, toUserId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/dislike/:userId", requireAuth, async (req, res) => {
    try {
      const fromUserId = (req.user as any).id;
      await storage.dislikeUser(fromUserId, req.params.userId);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── MATCHES ─────────────────────────────────────────────
  app.get("/api/matches", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const matchList = await storage.getMatches(userId);
      res.json({ matches: matchList });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── MESSAGES ────────────────────────────────────────────
  app.get("/api/messages/:matchId", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const match = await storage.getMatch(req.params.matchId);
      if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const msgs = await storage.getMessages(req.params.matchId);
      await storage.markMessagesRead(req.params.matchId, userId);
      res.json({ messages: msgs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/messages/:matchId", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const match = await storage.getMatch(req.params.matchId);
      if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const { text } = z.object({ text: z.string().min(1).max(2000) }).parse(req.body);
      const msg = await storage.sendMessage(req.params.matchId, userId, text);
      res.json({ message: msg });
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: err.message });
    }
  });

  // ─── EVENTS ──────────────────────────────────────────────
  app.get("/api/events", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const eventList = await storage.listEvents(userId);
      res.json({ events: eventList });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/events/:eventId", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const event = await storage.getEvent(req.params.eventId, userId);
      if (!event) return res.status(404).json({ error: "Event not found" });
      res.json({ event });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/events/:eventId/attend", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      await storage.attendEvent(req.params.eventId, userId);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/events/:eventId/attend", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      await storage.unattendEvent(req.params.eventId, userId);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── REPORTS ─────────────────────────────────────────────
  app.post("/api/reports", requireAuth, async (req, res) => {
    try {
      const reporterId = (req.user as any).id;
      const { reportedUserId, reason, description } = z.object({
        reportedUserId: z.string(),
        reason: z.string().min(1),
        description: z.string().max(1000).default(""),
      }).parse(req.body);
      if (reporterId === reportedUserId) return res.status(400).json({ error: "Cannot report yourself" });
      const report = await storage.createReport(reporterId, reportedUserId, reason, description);
      res.json({ report });
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: err.message });
    }
  });

  // ─── ADMIN ───────────────────────────────────────────────
  app.get("/api/admin/verifications", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const adminUser = await storage.getUserById(userId);
      if (!adminUser?.isAdmin) return res.status(403).json({ error: "Forbidden" });
      const pending = await storage.getPendingVerifications();
      res.json({ users: pending });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/reports", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const adminUser = await storage.getUserById(userId);
      if (!adminUser?.isAdmin) return res.status(403).json({ error: "Forbidden" });
      const reportList = await storage.listReports();
      res.json({ reports: reportList });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/reports/:reportId/resolve", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const adminUser = await storage.getUserById(userId);
      if (!adminUser?.isAdmin) return res.status(403).json({ error: "Forbidden" });
      await storage.resolveReport(req.params.reportId);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/verify/:userId", requireAuth, async (req, res) => {
    try {
      const adminId = (req.user as any).id;
      const adminUser = await storage.getUserById(adminId);
      if (!adminUser?.isAdmin) return res.status(403).json({ error: "Forbidden" });

      const { action } = z.object({ action: z.enum(["approve", "reject", "ban"]) }).parse(req.body);
      const targetId = req.params.userId;

      if (action === "approve") {
        await storage.updateVerificationStatus(targetId, "approved", true);
      } else if (action === "reject") {
        await storage.updateVerificationStatus(targetId, "rejected", false);
      } else {
        await storage.banUser(targetId);
      }

      res.json({ ok: true });
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}
