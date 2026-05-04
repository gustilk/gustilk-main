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
import { isValidListedPhone } from "@shared/countries";
import { eq, and } from "drizzle-orm";
import { sendActivationCodeEmail } from "./email";
import { verifyIraqFromRequest, getClientIp } from "./geo";

const emailSchema = z.string().email("Please enter a valid email address");

// Fire-and-forget: flag Iraq accounts that log in from outside Iraq
async function flagSuspiciousLoginIfNeeded(req: Request, user: { id: string; country?: string | null }) {
  if (user.country !== "Iraq") return;
  const { isIraq } = await verifyIraqFromRequest(req);
  if (!isIraq) {
    const ip = getClientIp(req) ?? "unknown";
    db.update(users).set({ suspiciousLoginAt: new Date(), suspiciousLoginIp: ip } as any)
      .where(eq(users.id, user.id)).catch(() => {});
  }
}

// ── Password security ──────────────────────────────────────────────────────────
const COMMON_PASSWORDS = new Set([
  "password","password1","password12","password123","password1234",
  "123456","1234567","12345678","123456789","1234567890",
  "qwerty","qwerty123","qwerty1","qwertyuiop",
  "abc123","abc1234","iloveyou","admin","admin123","welcome","welcome1",
  "monkey","dragon","master","master123","hello","hello123",
  "shadow","sunshine","princess","football","charlie","donald",
  "letmein","696969","superman","batman","trustno1","pass123",
  "111111","000000","987654321","666666","121212","654321",
]);

function generateActivationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return "This password is too common — please choose a stronger one";
  }
  return null;
}

const PgSession = connectPgSimple(session);

declare module "express-session" {
  interface SessionData {
    userId: string;
    webAuthnChallenge?: string;
    webAuthnPhone?: string;
  }
}

export const sessionMiddleware = session({
  store: new PgSession({ pool, tableName: "sessions" }),
  secret: process.env.SESSION_SECRET || "gustilk-dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  },
});

export function setupSession(app: Express) {
  app.use(sessionMiddleware);
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) return next();
  res.status(401).json({ message: "Unauthorized" });
}

function safeUser(user: Record<string, any>) {
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

// Skip rate limiting for loopback requests (automated tests running on the same machine).
function skipLocalhost(req: Request): boolean {
  const ip = req.ip ?? req.socket?.remoteAddress ?? "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipLocalhost,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Too many registration attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipLocalhost,
});

const passKeyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { message: "Too many passkey attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipLocalhost,
});

export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/me", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });
      db.update(users).set({ activitySeenAt: new Date() } as any).where(eq(users.id, req.session.userId!)).catch(() => {});

      // Auto-correct premium expiry: if premiumUntil has passed, clear isPremium flag silently
      const now = new Date();
      if (user.isPremium && user.premiumUntil && user.premiumUntil < now) {
        storage.updateUser(user.id, { isPremium: false, premiumUntil: null }).catch(() => {});
        (user as any).isPremium = false;
        (user as any).premiumUntil = null;
      }
      // Reverse desync: premiumUntil still in future but isPremium was somehow false
      if (!user.isPremium && user.premiumUntil && user.premiumUntil > now) {
        storage.updateUser(user.id, { isPremium: true }).catch(() => {});
        (user as any).isPremium = true;
      }

      res.json({ user: safeUser(user as any) });
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

      const pwError = validatePassword(password);
      if (pwError) return res.status(400).json({ message: pwError });

      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase().trim()));
      if (existing) return res.status(409).json({ message: "An account with this email already exists" });

      const hash = await bcrypt.hash(password, 10);
      const code = generateActivationCode();
      const expiry = new Date(Date.now() + 15 * 60 * 1000);

      await db.insert(users).values({
        id: randomUUID(),
        email: email.toLowerCase().trim(),
        passwordHash: hash,
        firstName: firstName.trim(),
        lastName: lastName?.trim() || null,
        fullName: lastName?.trim() ? `${firstName.trim()} ${lastName.trim()}` : firstName.trim(),
        isEmailVerified: false,
        emailActivationCode: code,
        emailActivationExpiry: expiry,
      });

      sendActivationCodeEmail(email.toLowerCase().trim(), firstName.trim(), code).catch(() => {});
      res.json({ pending: true, email: email.toLowerCase().trim() });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Email activation ───────────────────────────────────────────────────────

  app.post("/api/auth/activate", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) return res.status(400).json({ message: "Email and code are required" });

      const [user] = await db.select().from(users).where(eq(users.email, (email as string).toLowerCase().trim()));
      if (!user) return res.status(400).json({ message: "Invalid activation code" });
      if (user.isEmailVerified) return res.status(400).json({ message: "Email already verified — please sign in" });

      if (!user.emailActivationCode || !user.emailActivationExpiry) {
        return res.status(400).json({ message: "No activation code found. Please request a new one." });
      }
      if (new Date() > new Date(user.emailActivationExpiry)) {
        return res.status(400).json({ message: "Activation code has expired — please request a new one." });
      }
      if (user.emailActivationCode !== String(code).trim()) {
        return res.status(400).json({ message: "Incorrect activation code. Please check your email." });
      }

      await db.update(users).set({
        isEmailVerified: true,
        emailActivationCode: null as any,
        emailActivationExpiry: null as any,
      }).where(eq(users.id, user.id));

      req.session.userId = user.id;
      await saveSession(req);
      flagSuspiciousLoginIfNeeded(req, user).catch(() => {});
      const updated = await storage.getUserById(user.id);
      res.json({ user: safeUser(updated as any) });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/resend-activation", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email required" });

      const [user] = await db.select().from(users).where(eq(users.email, (email as string).toLowerCase().trim()));
      // Always return ok — never reveal whether an email is registered
      if (!user || user.isEmailVerified) return res.json({ ok: true });

      const code = generateActivationCode();
      const expiry = new Date(Date.now() + 15 * 60 * 1000);
      await db.update(users).set({ emailActivationCode: code, emailActivationExpiry: expiry }).where(eq(users.id, user.id));
      sendActivationCodeEmail(user.email!, user.firstName ?? "there", code).catch(() => {});
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Dev-only: return activation code for automated tests ───────────────────
  app.get("/api/auth/dev/activation-code", async (req, res) => {
    if (process.env.NODE_ENV === "production") return res.status(404).json({ message: "Not found" });
    const email = (req.query.email as string | undefined)?.toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "email query param required" });
    const [user] = await db
      .select({ code: users.emailActivationCode, expiry: users.emailActivationExpiry, verified: users.isEmailVerified })
      .from(users).where(eq(users.email, email));
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ code: user.code, expiry: user.expiry, isEmailVerified: user.verified });
  });

  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });

      const emailResult = emailSchema.safeParse(email.trim());
      if (!emailResult.success) return res.status(400).json({ message: emailResult.error.errors[0].message });

      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
      if (!user || !user.passwordHash) return res.status(401).json({ message: "No account found with that email address." });

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(401).json({ message: "Incorrect password. Please try again." });

      if (!user.isEmailVerified && !user.isAdmin && !user.isSystemAccount) {
        return res.status(403).json({ message: "Please verify your email address before signing in. Check your inbox for the activation code." });
      }

      req.session.userId = user.id;
      await saveSession(req);
      flagSuspiciousLoginIfNeeded(req, user).catch(() => {});
      res.json({ user: safeUser(user as any) });
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
        deviceType: (credential as any).credentialDeviceType ?? (credential as any).deviceType ?? "",
        transports: credential.transports ?? [],
      });

      delete req.session.webAuthnChallenge;
      delete req.session.webAuthnPhone;

      req.session.userId = user.id;
      await saveSession(req);
      flagSuspiciousLoginIfNeeded(req, user).catch(() => {});
      res.json({ user: safeUser(user as any) });
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
      flagSuspiciousLoginIfNeeded(req, user).catch(() => {});
      res.json({ user: safeUser(user as any) });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });
}
