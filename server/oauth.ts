import type { Express, Request } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import rateLimit from "express-rate-limit";
import { randomUUID } from "crypto";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, or } from "drizzle-orm";
import type { User } from "@shared/schema";

// ─── Session save helper ───────────────────────────────────────────────────────
function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) =>
    req.session.save((err) => (err ? reject(err) : resolve()))
  );
}

function skipLocalhost(req: Request): boolean {
  const ip = req.ip ?? "";
  return ip === "127.0.0.1" || ip === "::1" || ip.startsWith("::ffff:127.");
}

const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipLocalhost,
});

// ─── Find or create user from OAuth profile ────────────────────────────────────
async function findOrCreateOAuthUser(params: {
  providerId: string;
  providerColumn: "google_id" | "facebook_id" | "apple_id";
  drizzleField: "googleId" | "facebookId" | "appleId";
  email: string | null;
  firstName: string;
  lastName: string | null;
  profileImageUrl?: string | null;
}): Promise<User> {
  const { providerId, providerColumn, drizzleField, email, firstName, lastName, profileImageUrl } = params;

  // 1. Find by provider ID
  const byProvider = await db.select().from(users)
    .where(eq((users as any)[drizzleField], providerId))
    .limit(1);
  if (byProvider.length > 0) return byProvider[0];

  // 2. Find by email and link provider
  if (email) {
    const byEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (byEmail.length > 0) {
      await db.update(users)
        .set({ [drizzleField]: providerId } as any)
        .where(eq(users.id, byEmail[0].id));
      return { ...byEmail[0], [drizzleField]: providerId } as User;
    }
  }

  // 3. Create new user
  const id = randomUUID();
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const [created] = await db.insert(users).values({
    id,
    email,
    firstName,
    lastName,
    fullName,
    [drizzleField]: providerId,
    passwordHash: null,
    isEmailVerified: true,
    verificationStatus: "none",
    profileVisible: false,
    ...(profileImageUrl ? { mainPhotoUrl: profileImageUrl } : {}),
  } as any).returning();

  return created;
}

// ─── Redirect target after OAuth ──────────────────────────────────────────────
function getSuccessRedirect(req: Request): string {
  if (req.session.oauthPlatform === "capacitor") {
    return "gustilk://oauth/callback?success=true";
  }
  return "/discover";
}

// ─── Register OAuth routes ────────────────────────────────────────────────────
export function registerOAuthRoutes(app: Express) {
  app.use(passport.initialize());

  // ── Google ─────────────────────────────────────────────────────────────────
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL ?? "/api/auth/google/callback",
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? null;
          const user = await findOrCreateOAuthUser({
            providerId: profile.id,
            providerColumn: "google_id",
            drizzleField: "googleId",
            email,
            firstName: profile.name?.givenName ?? "User",
            lastName: profile.name?.familyName ?? null,
            profileImageUrl: profile.photos?.[0]?.value ?? null,
          });
          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      }
    ));

    app.get("/api/auth/google", oauthLimiter, (req, res, next) => {
      if (req.query.platform) req.session.oauthPlatform = req.query.platform as string;
      next();
    }, passport.authenticate("google", { scope: ["profile", "email"], session: false }));

    app.get("/api/auth/google/callback",
      passport.authenticate("google", { session: false, failureRedirect: "/?oauth=error" }),
      async (req, res) => {
        try {
          const user = req.user as User;
          req.session.userId = user.id;
          delete req.session.oauthPlatform;
          await saveSession(req);
          res.redirect(getSuccessRedirect(req));
        } catch {
          res.redirect("/?oauth=error");
        }
      }
    );
  }
}
