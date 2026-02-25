import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import twilio from "twilio";
import { randomUUID } from "crypto";
import { z } from "zod";
import { pool, db } from "./db";
import { storage } from "./storage";
import { users, otpCodes } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";

const emailSchema = z.string().email("Please enter a valid email address");
const phoneSchema = z.string().regex(/^\+[1-9]\d{6,14}$/, "Phone number must be in international format (e.g. +9647701234567)");

const PgSession = connectPgSimple(session);

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export function setupSession(app: Express) {
  app.use(
    session({
      store: new PgSession({ pool, tableName: "sessions" }),
      secret: process.env.SESSION_SECRET || "gustilk-dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    })
  );
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) return next();
  res.status(401).json({ message: "Unauthorized" });
}

function twilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Twilio credentials not configured");
  return twilio(sid, token);
}

function safeUser(user: Record<string, any>) {
  const { passwordHash: _ph, ...rest } = user;
  return rest;
}

export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/me", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({ user: safeUser(user as any) });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });

      const emailResult = emailSchema.safeParse(email.trim());
      if (!emailResult.success) return res.status(400).json({ message: emailResult.error.errors[0].message });

      if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase().trim()));
      if (existing) return res.status(409).json({ message: "An account with this email already exists" });

      const hash = await bcrypt.hash(password, 10);
      const [user] = await db.insert(users).values({
        id: randomUUID(),
        email: email.toLowerCase().trim(),
        passwordHash: hash,
      }).returning();

      req.session.userId = user.id;
      res.json({ user: safeUser(user as any) });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });

      const emailResult = emailSchema.safeParse(email.trim());
      if (!emailResult.success) return res.status(400).json({ message: emailResult.error.errors[0].message });

      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
      if (!user || !user.passwordHash) return res.status(401).json({ message: "Invalid email or password" });

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(401).json({ message: "Invalid email or password" });

      req.session.userId = user.id;
      res.json({ user: safeUser(user as any) });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ message: "Phone number required" });

      const normalized = phone.replace(/\s+/g, "");
      const phoneResult = phoneSchema.safeParse(normalized);
      if (!phoneResult.success) return res.status(400).json({ message: phoneResult.error.errors[0].message });
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db.insert(otpCodes).values({ id: randomUUID(), identifier: normalized, code, expiresAt, used: false });

      const client = twilioClient();
      await client.messages.create({
        body: `Your Gûstîlk verification code is: ${code}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: normalized,
      });

      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { phone, code } = req.body;
      if (!phone || !code) return res.status(400).json({ message: "Phone and code required" });

      const normalized = phone.replace(/\s+/g, "");
      const [otp] = await db
        .select()
        .from(otpCodes)
        .where(and(eq(otpCodes.identifier, normalized), eq(otpCodes.code, code), eq(otpCodes.used, false), gt(otpCodes.expiresAt, new Date())))
        .limit(1);

      if (!otp) return res.status(400).json({ message: "Invalid or expired code" });

      await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otp.id));

      let [user] = await db.select().from(users).where(eq(users.phone, normalized));
      if (!user) {
        [user] = await db.insert(users).values({ id: randomUUID(), phone: normalized }).returning();
      }

      req.session.userId = user.id;
      res.json({ user: safeUser(user as any) });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });
}
