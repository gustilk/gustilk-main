import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./auth";
import { registerSchema, loginSchema } from "@shared/schema";
import passport from "passport";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupAuth(app);

  // ─── AUTH ────────────────────────────────────────────────
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) return res.status(400).json({ error: "Email already in use" });
      const user = await storage.createUser(data);
      req.login(user as any, (err) => {
        if (err) return res.status(500).json({ error: "Login failed after register" });
        res.json({ user });
      });
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    try {
      loginSchema.parse(req.body);
    } catch (err: any) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(401).json({ error: info?.message || "Invalid credentials" });
      req.login(user, (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        const { password: _, ...safe } = user;
        res.json({ user: safe });
      });
    })(req, res, next);
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

  return httpServer;
}
