import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import type { Express } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const PgSession = connectPgSimple(session);

function getBaseUrl(): string {
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
  }
  return "http://localhost:5000";
}

export function setupAuth(app: Express) {
  app.use(session({
    store: new PgSession({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || "gustilk-secret-2024",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 30 * 24 * 60 * 60 * 1000 },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) return done(null, false, { message: "Invalid email or password" });
      const valid = await bcrypt.compare(password, user.password || "");
      if (!valid) return done(null, false, { message: "Invalid email or password" });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  const GOOGLE_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  if (GOOGLE_ID && GOOGLE_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: GOOGLE_ID,
      clientSecret: GOOGLE_SECRET,
      callbackURL: `${getBaseUrl()}/api/auth/google/callback`,
    }, async (_at, _rt, profile, done) => {
      try {
        const { user, isNew } = await storage.findOrCreateSocialUser("google", profile.id, {
          email: profile.emails?.[0]?.value,
          fullName: profile.displayName,
          photo: profile.photos?.[0]?.value,
        });
        return done(null, { ...user, _socialNew: isNew });
      } catch (err) { return done(err as Error); }
    }));
  }

  const FB_ID = process.env.FACEBOOK_APP_ID;
  const FB_SECRET = process.env.FACEBOOK_APP_SECRET;
  if (FB_ID && FB_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: FB_ID,
      clientSecret: FB_SECRET,
      callbackURL: `${getBaseUrl()}/api/auth/facebook/callback`,
      profileFields: ["id", "displayName", "email", "photos"],
    }, async (_at, _rt, profile, done) => {
      try {
        const { user, isNew } = await storage.findOrCreateSocialUser("facebook", profile.id, {
          email: (profile as any).emails?.[0]?.value,
          fullName: profile.displayName,
          photo: (profile as any).photos?.[0]?.value,
        });
        return done(null, { ...user, _socialNew: isNew });
      } catch (err) { return done(err as Error); }
    }));
  }

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user || false);
    } catch (err) { done(err); }
  });
}

export function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: "Unauthorized" });
}
