console.log("FACEBOOK_CALLBACK_URL:", process.env.FACEBOOK_CALLBACK_URL);
import type { Express, Request } from "express";
import passport from "passport";
import { Strategy as FacebookStrategy } from "passport-facebook";
import rateLimit from "express-rate-limit";
import { randomUUID } from "crypto";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { User } from "@shared/schema";

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

async function findOrCreateOAuthUser(params: {
  providerId: string;
  drizzleField: "facebookId";
  email: string | null;
  firstName: string;
  lastName: string | null;
  profileImageUrl?: string | null;
}): Promise<User> {
  const { providerId, drizzleField, email, firstName, lastName, profileImageUrl } = params;

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

export function registerOAuthRoutes(app: Express) {
  app.use(passport.initialize());

  // ── Facebook ───────────────────────────────────────────────────────────────
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL ?? "/api/auth/facebook/callback",
        profileFields: ["id", "emails", "name", "picture.type(large)"],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? null;
          const user = await findOrCreateOAuthUser({
            providerId: profile.id,
            drizzleField: "facebookId",
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

    app.get("/api/auth/facebook", oauthLimiter,
      passport.authenticate("facebook", { scope: ["email", "public_profile"], session: false })
    );

    app.get("/api/auth/facebook/callback",
      passport.authenticate("facebook", { session: false, failureRedirect: "/?oauth=error" }),
      async (req, res) => {
        try {
          const user = req.user as User;
          req.session.userId = user.id;
          await saveSession(req);
          res.redirect("/discover");
        } catch {
          res.redirect("/?oauth=error");
        }
      }
    );
  }
}
