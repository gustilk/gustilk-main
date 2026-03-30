import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { pool, db } from "./db";
import { storage } from "./storage";
import { users, passkeys } from "@shared/schema";
import type { User } from "@shared/schema";
import { isValidListedPhone } from "@shared/countries";
import { eq, and } from "drizzle-orm";

const emailSchema = z.string().email("Please enter a valid email address");

const PgSession = connectPgSimple(session);

declare module "express-session" {
  interface SessionData {
    userId: string;
    webAuthnChallenge?: string;
    webAuthnPhone?: string;
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
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    })
  );
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) return next();
  res.status(401).json({ message: "Unauthorized" });
}

function safeUser(user: User) {
  const { passwordHash: _ph, ...rest } = user;
  return rest;
}

const ALLOWED_ORIGINS = [
  "https://gustilk.com",
  "https://www.gustilk.com",
];

function getOriginAndRpId(req: Request): { origin: string; rpID: string } {
  const origin = req.get("origin") || `https://${req.hostname}`;
  const hostname = new URL(origin).hostname;
  const rpID = hostname.replace(/^www\./, "");
  return { origin, rpID };
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) =>
    req.session.save(err => (err ? reject(err) : resolve()))
  );
}

// Rate limiters — applied per-IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { message: "Too many registration attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const passKeyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { message: "Too many passkey attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/me", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });
      db.update(users).set({ activitySeenAt: new Date() }).where(eq(users.id, req.session.userId!)).catch(() => {});
      res.json({ user: safeUser(user) });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/register", registerLimiter, async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });
      if (!firstName?.trim()) return res.status(400).json({ message: "First name is required" });

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
        firstName: firstName.trim(),
        lastName: lastName?.trim() || null,
        fullName: lastName?.trim() ? `${firstName.trim()} ${lastName.trim()}` : firstName.trim(),
      }).returning();

      req.session.userId = user.id;
      await saveSession(req);
      res.json({ user: safeUser(user) });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", loginLimiter, async (req, res) => {
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
      await saveSession(req);
      res.json({ user: safeUser(user) });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Passkey / Biometric auth ──────────────────────────────────────────────

  app.post("/api/auth/passkey/options", passKeyLimiter, async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ message: "Phone required" });

      const normalized = phone.replace(/\s+/g, "");
      if (!isValidListedPhone(normalized)) {
        return res.status(400).json({ message: "Phone number not supported." });
      }

      const { origin, rpID } = getOriginAndRpId(req);

      let [user] = await db.select().from(users).where(eq(users.phone, normalized));
      const userPasskeys = user
        ? await db.select().from(passkeys).where(eq(passkeys.userId, user.id))
        : [];

      if (userPasskeys.length > 0) {
        const options = await generateAuthenticationOptions({
          rpID,
          allowCredentials: userPasskeys.map(p => ({
            id: p.credentialId,
            transports: (p.transports ?? []) as AuthenticatorTransportFuture[],
          })),
          userVerification: "required",
          timeout: 60000,
        });

        req.session.webAuthnChallenge = options.challenge;
        req.session.webAuthnPhone = normalized;
        await saveSession(req);

        return res.json({ type: "authenticate", options });
      }

      if (!user) {
        [user] = await db.insert(users).values({ id: randomUUID(), phone: normalized }).returning();
      }

      const options = await generateRegistrationOptions({
        rpName: "Gûstîlk",
        rpID,
        userID: new TextEncoder().encode(user.id),
        userName: normalized,
        userDisplayName: user.fullName || normalized,
        timeout: 60000,
        attestationType: "none",
        excludeCredentials: [],
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "required",
          authenticatorAttachment: "platform",
        },
      });

      req.session.webAuthnChallenge = options.challenge;
      req.session.webAuthnPhone = normalized;
      await saveSession(req);

      res.json({ type: "register", options });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/passkey/register-verify", passKeyLimiter, async (req, res) => {
    try {
      const challenge = req.session.webAuthnChallenge;
      const phone = req.session.webAuthnPhone;
      if (!challenge || !phone) {
        return res.status(400).json({ message: "Session expired. Please try again." });
      }

      const { origin, rpID } = getOriginAndRpId(req);

      const verification = await verifyRegistrationResponse({
        response: req.body,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return res.status(400).json({ message: "Biometric registration failed. Please try again." });
      }

      const { credential } = verification.registrationInfo;

      const [user] = await db.select().from(users).where(eq(users.phone, phone));
      if (!user) return res.status(400).json({ message: "User not found." });

      await db.insert(passkeys).values({
        id: randomUUID(),
        userId: user.id,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter,
        deviceType: (credential as { credentialDeviceType?: string; deviceType?: string }).credentialDeviceType ?? (credential as { deviceType?: string }).deviceType ?? "",
        transports: credential.transports ?? [],
      });

      delete req.session.webAuthnChallenge;
      delete req.session.webAuthnPhone;

      req.session.userId = user.id;
      await saveSession(req);
      res.json({ user: safeUser(user) });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/passkey/auth-verify", async (req, res) => {
    try {
      const challenge = req.session.webAuthnChallenge;
      const phone = req.session.webAuthnPhone;
      if (!challenge || !phone) {
        return res.status(400).json({ message: "Session expired. Please try again." });
      }

      const { origin, rpID } = getOriginAndRpId(req);

      const credentialId = req.body.id;
      const [dbPasskey] = await db.select().from(passkeys).where(eq(passkeys.credentialId, credentialId));
      if (!dbPasskey) return res.status(400).json({ message: "Passkey not found." });

      const verification = await verifyAuthenticationResponse({
        response: req.body,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: dbPasskey.credentialId,
          publicKey: Buffer.from(dbPasskey.publicKey, "base64url"),
          counter: dbPasskey.counter,
          transports: (dbPasskey.transports ?? []) as AuthenticatorTransportFuture[],
        },
        requireUserVerification: true,
      });

      if (!verification.verified) {
        return res.status(400).json({ message: "Biometric authentication failed. Please try again." });
      }

      await db.update(passkeys)
        .set({ counter: verification.authenticationInfo.newCounter })
        .where(eq(passkeys.id, dbPasskey.id));

      const [user] = await db.select().from(users).where(eq(users.id, dbPasskey.userId));
      if (!user) return res.status(400).json({ message: "User not found." });

      delete req.session.webAuthnChallenge;
      delete req.session.webAuthnPhone;

      req.session.userId = user.id;
      await saveSession(req);
      res.json({ user: safeUser(user) });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });
}
