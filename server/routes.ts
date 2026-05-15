import type { Express } from "express";
import rateLimit from "express-rate-limit";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSession, registerAuthRoutes, isAuthenticated, sessionMiddleware } from "./auth";
import { profileUpdateSchema, privacySettingsSchema, users, matches, messages, events, eventAttendees, magicLinkTokens } from "@shared/schema";
import { verifyCountryFromRequest, verifyIraqFromRequest, getClientIp, lookupIpCountry } from "./geo";
import { setupWs } from "./ws";
import { z } from "zod";
import { checkFacePresent } from "./moderation";
import { db } from "./db";
import { cacheDel } from "./cache";
import { count, sql, eq, asc, desc, or, and, ilike, isNotNull } from "drizzle-orm";
import { randomUUID, randomBytes } from "crypto";
import { sendMagicLinkEmail, sendPhotoApprovedEmail, sendPhotoRejectedEmail, sendAccountDeletedEmail, sendSupportMessageAlertEmail, sendAdminApprovalNeededEmail } from "./email";
import { registerAdminRoutes, writeAuditLog } from "./admin-routes";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const SUPPORT_ACCOUNT_EMAIL = "support@gustilk.com";

async function getOrCreateSupportAccount(): Promise<typeof users.$inferSelect> {
  const secret = process.env.SUPPORT_ACCOUNT_SECRET;
  if (!secret) throw new Error("SUPPORT_ACCOUNT_SECRET environment variable is not set");
  const bcrypt = await import("bcryptjs");
  const supportHash = await bcrypt.hash(secret, 10);
  const [existing] = await db.select().from(users).where(eq(users.email, SUPPORT_ACCOUNT_EMAIL));
  if (existing) {
    const [updated] = await db.update(users).set({ passwordHash: supportHash, profileVisible: false, isSystemAccount: true, isEmailVerified: true, gender: null, caste: null }).where(eq(users.email, SUPPORT_ACCOUNT_EMAIL)).returning();
    return updated;
  }
  const id = randomUUID();
  const [created] = await db.insert(users).values({
    id,
    email: SUPPORT_ACCOUNT_EMAIL,
    passwordHash: supportHash,
    firstName: "Gûstîlk",
    lastName: "Support",
    fullName: "Gûstîlk Support",
    isSystemAccount: true,
    isAdmin: false,
    isVerified: true,
    isEmailVerified: true,
    verificationStatus: "approved",
    profileVisible: false,
    gender: null,
    caste: null,
    mainPhotoUrl: "/gustilk-logo.svg",
    bio: "Official Gûstîlk Support Assistant — here to help you 24/7.",
  } as any).returning();
  console.log("[system] Created support account:", created.id);
  return created;
}

async function isAdminMatch(match: { user1Id: string; user2Id: string }): Promise<boolean> {
  const [u1, u2] = await Promise.all([storage.getUserById(match.user1Id), storage.getUserById(match.user2Id)]);
  return !!(u1?.isAdmin || u2?.isAdmin || u1?.isSystemAccount || u2?.isSystemAccount);
}

async function notifyAdminNewApplicant(applicantId: string): Promise<void> {
  try {
    const [adminUser] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.isAdmin, true))
      .limit(1);
    const adminEmail = adminUser?.email;
    if (!adminEmail) return;
    const applicant = await storage.getUserById(applicantId);
    if (!applicant) return;
    const name = applicant.fullName ?? applicant.firstName ?? "A new member";
    const email = applicant.email ?? applicant.phone ?? "unknown";
    sendAdminApprovalNeededEmail(adminEmail, name, email).catch(() => {});
  } catch {
  }
}

type SupportRule = { keywords: RegExp; reply: string };
const SUPPORT_RULES: SupportRule[] = [
  {
    keywords: /match|how.*work|discover|like|swipe|heart|caste|sheikh|pir|mirid|murid/i,
    reply: `Great question! Here's how matching works on Gûstîlk:\n\n• Profiles are matched strictly within your caste (Sheikh, Pir, or Mirid) with members of the opposite gender.\n• Tap the heart on a profile to like them — they'll disappear from your Discover feed and appear in their "Likes You" inbox.\n• If they like you back, you both match and can start messaging (Premium required to send messages).\n• Disliking someone removes them from your feed permanently.\n\nNeed anything else? 😊`,
  },
  {
    keywords: /premium|subscri|paid|unlock|upgrade|price|cost|pay/i,
    reply: `Gûstîlk Premium unlocks the full experience:\n\n✅ Send messages to your matches\n✅ See who liked you in the Activity tab\n✅ Video calls with matches\n✅ Send virtual gifts\n\nFree accounts can still like profiles and receive matches — you just need Premium to chat.\n\nTo upgrade, go to the **Premium** tab or tap the crown icon on your profile. If you have trouble with a payment, email support@gustilk.com and we'll sort it out.`,
  },
  {
    keywords: /verif|selfie|photo|approv|pending|reject|banned|reapply|re-apply|visible|profile.*not show/i,
    reply: `Profile verification on Gûstîlk:\n\n• Upload a clear selfie — our admin team reviews it within 24–48 hours.\n• You'll get an email once approved (or if changes are needed).\n• While your application is pending, your profile isn't visible in Discover yet.\n• If your profile was declined, correct the issue and tap **Re-apply for Verification** in your profile settings.\n\nFor photos: each photo is individually reviewed. Approved photos appear on your profile; rejected ones are flagged with a reason.\n\nStill waiting? Email support@gustilk.com with your registered email and we'll check your status.`,
  },
  {
    keywords: /messag|chat|send.*message|can.*message|cannot message|message.*not work/i,
    reply: `Messaging on Gûstîlk requires a **Premium subscription**.\n\nOnce you're Premium:\n• Open the **Matches** tab to see all your conversations.\n• Tap any match to open the chat.\n• You can also send virtual gifts from the chat screen.\n\nIf you're Premium and still can't message, try logging out and back in. If the issue persists, email support@gustilk.com.`,
  },
  {
    keywords: /activity|likes you|who liked|visitor|likes sent/i,
    reply: `The **Activity** tab has three sections:\n\n👍 **Likes** — Everyone who has liked your profile. Premium users can Accept (like back) or Pass directly from here.\n👁 **Visitors** — Recent profile views.\n❤️ **Likes Sent** — Profiles you've already liked.\n\nPremium is required to act on incoming likes from the Activity tab.`,
  },
  {
    keywords: /event|community|rsvp|attend/i,
    reply: `Gûstîlk features a **Community Events** tab where you can:\n\n• Browse upcoming Yezidi community events.\n• RSVP to events you're interested in.\n• See other members who are attending.\n\nEvents are added by the Gûstîlk team and community organizers. If you'd like to list an event, email support@gustilk.com.`,
  },
  {
    keywords: /password|forgot|login|sign in|can.*log|reset|magic link|passkey|biometric/i,
    reply: `Having trouble logging in? Here are your options:\n\n🔑 **Forgot password** — On the login screen, tap **"Magic Link"** and enter your email. You'll receive a one-click sign-in link.\n📱 **Passkey / biometric login** — Available after your first successful login. Set it up in Account Settings.\n\nIf you're locked out and the magic link isn't arriving, check your spam folder or email support@gustilk.com with your registered email address.`,
  },
  {
    keywords: /report|block|harass|abuse|fake|spam|unsafe|danger|threat|impersonat/i,
    reply: `Your safety is our top priority. Here's what to do:\n\n🚩 **Report a user** — Tap the flag icon on their profile to report harassment, fake accounts, or abuse. Our team reviews all reports.\n🚫 **Block a user** — Blocking prevents them from seeing your profile or contacting you.\n\nIf you feel you're in immediate danger, please contact local authorities.\n\nI'm flagging your message for our admin team to review. You can also reach us directly at support@gustilk.com.`,
  },
  {
    keywords: /language|english|arabic|german|armenian|russian|kurdish|kurmanji/i,
    reply: `Gûstîlk supports **6 languages**: English, Arabic, German, Armenian, Russian, and Kurdish (Kurmanji).\n\nTo change your display language:\n1. Go to **Profile → Settings**.\n2. Tap **Language**.\n3. Select your preferred language.\n\nThe app will update immediately. If your language isn't listed, let us know at support@gustilk.com — we're always working to expand.`,
  },
  {
    keywords: /delete.*account|account.*delete|remove.*account|close.*account/i,
    reply: `We're sorry to see you go! To delete your account:\n\n1. Go to **Profile → Settings → Account**.\n2. Tap **Delete Account** and confirm.\n\n⚠️ This is permanent — all your matches, messages, and profile data will be removed and cannot be recovered.\n\nIf you're leaving because of an issue we can fix, please let us know at support@gustilk.com — we'd love the chance to help first.`,
  },
  {
    keywords: /human|real person|agent|staff|team|not.*robot|not.*bot|speak.*person|talk.*person/i,
    reply: `Totally understood! I'm an automated support assistant, but a real member of our team is here to help.\n\n📧 Email us at **support@gustilk.com** and a human will respond within 24 hours.\n\nPlease include your registered email address in your message so we can look up your account quickly.`,
  },
  {
    keywords: /gift|virtual gift|send.*gift/i,
    reply: `Virtual gifts are a fun Premium feature! 🎁\n\nTo send a gift:\n1. Open a chat with one of your matches.\n2. Tap the **gift icon** in the chat toolbar.\n3. Pick an animated gift and send it.\n\nGifts are visible to both of you in the chat. Premium subscription is required to send gifts.`,
  },
  {
    keywords: /video.*call|call.*video|voice call/i,
    reply: `Video calling is available for **Premium members** with an active match.\n\nTo start a video call:\n1. Open a chat with your match.\n2. Tap the **video camera icon** in the chat header.\n\nBoth users need a stable internet connection. If calls aren't connecting, try switching between Wi-Fi and mobile data. Persistent issues? Email support@gustilk.com.`,
  },
];

const SUPPORT_FALLBACK = `Thanks for reaching out to Gûstîlk Support! 😊\n\nI'm the automated support assistant. I'm not sure I fully understood your question — could you give me a bit more detail?\n\nOr if you'd prefer to speak with a human, email us at **support@gustilk.com** and our team will get back to you within 24 hours.`;

const SUPPORT_AI_SYSTEM_PROMPT = `You are the Official Gûstîlk Support Assistant — a warm, knowledgeable AI for the Gûstîlk app, a Yezidi community dating platform. You have deep knowledge of every feature and policy.

MATCHING & DISCOVERY
• Members are matched strictly within their caste (Sheikh, Pir, or Mirid) with members of the opposite gender
• Swipe right (heart) to like someone — they disappear from your Discover feed
• If they also like you back from their "Likes You" inbox, you match and can message each other
• Liked profiles move to the other person's "Likes You" tab (Activity page) — not your Discover feed
• Disliking someone removes them from your feed permanently

PROFILE & VERIFICATION
• Complete your profile: add a bio, occupation, city, caste, date of birth, and up to 6 approved photos
• A verification selfie is required — the admin team reviews it within 24–48 hours
• You will receive an email once your profile is approved or if changes are needed
• While pending, your profile is not visible in Discover
• You can re-apply for verification after making corrections

PREMIUM SUBSCRIPTION
• Free users can like and match but cannot send messages
• Premium unlocks: messaging matches, seeing who liked you in Activity, video calls, sending virtual gifts
• Upgrade from the Premium tab or the profile page

MESSAGING & CHAT
• Only premium members can send messages to their matches
• The Matches page shows all your conversations and the Gûstîlk Support chat
• You can view a match's full profile by tapping their avatar in the chat header
• Virtual gifts (animated) can be sent from the chat screen (premium only)

ACTIVITY TAB
• "Likes" shows everyone who has liked you — premium users can Accept (like back) or Pass (decline) directly
• "Visitors" shows recent profile views
• "Likes Sent" shows profiles you have already liked

COMMUNITY EVENTS
• Browse Yezidi community events in the Events tab
• RSVP to events and see who else is attending

ACCOUNT & SETTINGS
• Change display language: English, Arabic, German, Armenian, Russian, Kurdish (Kurmanji)
• Enable/disable notifications, manage privacy settings, block or report users
• Forgot password? Use the Magic Link option on the login screen — a one-click link is sent to your email
• Biometric / passkey login is available after your first login with phone number verification

SAFETY & REPORTING
• Use the flag icon on any profile to report harassment, fake accounts, or abuse
• Blocked users cannot see your profile or contact you

If the user describes harassment, abuse, impersonation, or a safety threat, respond with empathy, confirm you are flagging it for the admin team, and remind them to use the in-app Report button on the offending profile.

IMPORTANT RULES
- Always be transparent that you are an AI assistant, not a human
- If a user explicitly requests a human agent, tell them to email support@gustilk.com and that a human will respond within 24 hours
- Be warm, empathetic, and concise (aim for under 120 words per reply unless a detailed explanation is genuinely needed)
- Never make up information — if you are unsure, say so and direct them to support@gustilk.com
- Respond in the user's language if it is one of the six supported languages (English, Arabic, German, Armenian, Russian, Kurdish) — otherwise respond in English`;

async function generateSupportAiReply(matchId: string, supportAccountId: string): Promise<void> {
  try {
    const history = await storage.getMessages(matchId);
    const recent = history.slice(-20);
    const chatMessages: { role: "user" | "assistant"; content: string }[] = recent
      .filter(m => m.text && m.text.trim().length > 0)
      .map(m => ({
        role: m.senderId === supportAccountId ? "assistant" : "user",
        content: m.text,
      }));
    if (chatMessages.length === 0 || chatMessages[chatMessages.length - 1].role !== "user") return;
    // Try AI first; fall back to rule-based on any error
    let replyText: string | null = null;
    const openaiClient = getOpenAI();
    if (openaiClient) {
      try {
        const aiReply = await openaiClient.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SUPPORT_AI_SYSTEM_PROMPT },
            ...chatMessages,
          ],
          max_tokens: 400,
        });
        replyText = aiReply.choices[0]?.message?.content ?? null;
      } catch (aiErr) {
        console.error("[AI support reply error]", aiErr);
      }
    }
    if (!replyText) {
      const lastUserMsg = chatMessages.filter(m => m.role === "user").pop()?.content ?? "";
      const matched = SUPPORT_RULES.find(rule => rule.keywords.test(lastUserMsg));
      replyText = matched ? matched.reply : SUPPORT_FALLBACK;
    }
    if (replyText) await storage.sendMessage(matchId, supportAccountId, replyText);
  } catch (e) {
    console.error("[Support reply error]", e);
  }
}

function getUserId(req: any): string {
  return req.session?.userId;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupSession(app);
  registerAuthRoutes(app);
  setupWs(httpServer, sessionMiddleware);

  // Ensure support account exists on startup
  getOrCreateSupportAccount().catch(e => console.error("[startup] support account error:", e));

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

  // â"€â"€â"€ MAGIC LINK AUTH â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const forgotPasswordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });
  app.post("/api/auth/forgot-password", forgotPasswordLimiter, async (req, res) => {
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

  // â"€â"€â"€ FACE CHECK â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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

  // â"€â"€â"€ PROFILE â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  app.put("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const parsed = profileUpdateSchema.parse(req.body);
      const user = await storage.getUserById(userId);

      // Country is locked once set — ignore any country update if the user already has one
      const { country: _ignored, ...rest } = parsed as any;

      let grantIraqPremium = false;
      if (!user?.country && (parsed as any).country) {
        // First time setting country — verify server-side that the IP matches
        const claimedCountry: string = (parsed as any).country;
        const geoCheck = await verifyCountryFromRequest(req, claimedCountry);
        if (!geoCheck.allowed) {
          return res.status(403).json({ error: geoCheck.reason ?? "Location verification failed." });
        }
        // Iraq is always free — grant permanent premium right now so they never need to visit the Premium page
        if (claimedCountry === "Iraq") grantIraqPremium = true;
      }

      const photosIncluded = Array.isArray((parsed as any).photos);

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

      // Face detection gate — run whenever a new verification selfie is being submitted
      const incomingSelfie: string | undefined = (parsed as any).verificationSelfie;
      if (incomingSelfie && incomingSelfie.startsWith("data:image")) {
        const faceCheck = await checkFacePresent(incomingSelfie);
        if (!faceCheck.faceDetected) {
          return res.status(400).json({
            error: faceCheck.reason ?? "No clear face detected in your selfie. Please take a well-lit photo facing the camera directly.",
          });
        }
      }

      // Only rebuild photo slots if the request actually included a photos array
      const existingSlots: any[] = (user?.photoSlots as any[] | null) ?? [];
      const existingApproved: string[] = user?.photos ?? [];

      let updatedSlots = existingSlots;
      let keptApproved = existingApproved;
      let newUploads: string[] = [];

      if (photosIncluded) {
        // Index all existing slot URLs for O(1) lookup
        const existingSlotUrlSet = new Set(existingSlots.map((s: any) => s.url));

        // A photo is "kept approved" if it already lives in an approved slot.
        // This works for both HTTP URLs and base64 data URIs — the only thing
        // that matters is whether the identical string is already stored.
        const keptApprovedUrlSet = new Set(
          submittedPhotos.filter(p => existingSlots.some((s: any) => s.status === "approved" && s.url === p))
        );

        // A photo is "new" if its exact string does not exist in any slot yet.
        newUploads = submittedPhotos.filter(p => !existingSlotUrlSet.has(p));

        // Rebuild slots:
        //   • Approved slots the user kept → stay approved (never reset)
        //   • Pending slots → always kept (awaiting admin review)
        //   • Rejected slots → kept, but auto-retired (FIFO) when new uploads are present
        //     so that each new upload consumes exactly one "freed" slot without exceeding the limit
        let slotsToKeep = existingSlots.filter((s: any) =>
          (s.status === "approved" && keptApprovedUrlSet.has(s.url)) ||
          s.status === "pending" ||
          s.status === "rejected"
        );
        let autoRetire = newUploads.length;
        const keptSlots = slotsToKeep.filter((s: any) => {
          if (s.status === "rejected" && autoRetire > 0) { autoRetire--; return false; }
          return true;
        });
        const newPendingSlots = newUploads.map((url: string) => ({ url, status: "pending" as const }));
        updatedSlots = [...keptSlots, ...newPendingSlots];

        if (updatedSlots.length > 6) {
          return res.status(400).json({ error: "You can have a maximum of 6 photos." });
        }

        const keptApprovedUnordered = keptSlots.filter((s: any) => s.status === "approved").map((s: any) => s.url);
        const keptApprovedSet = new Set(keptApprovedUnordered);
        keptApproved = submittedPhotos.filter(p => keptApprovedSet.has(p));
      }

      let mainPhotoUrl = user?.mainPhotoUrl;
      if (photosIncluded) {
        // Respect the order the frontend submitted: first approved URL = new main photo
        const firstSubmittedApproved = submittedPhotos.find(p => keptApproved.includes(p));
        if (firstSubmittedApproved) {
          mainPhotoUrl = firstSubmittedApproved;
        } else if (mainPhotoUrl && !keptApproved.includes(mainPhotoUrl)) {
          // Current main was removed — fall back to first remaining approved photo
          mainPhotoUrl = keptApproved[0] ?? null;
        }
      }

      const data = user?.country ? rest : parsed;
      // Detect first-time pending transition to trigger admin notification
      const becomingPending =
        (data as any).verificationStatus === "pending" &&
        user?.verificationStatus !== "pending";
      const updated = await storage.updateUser(userId, {
        ...(data as any),
        ...(grantIraqPremium ? { isPremium: true, premiumUntil: null } : {}),
        ...(photosIncluded ? {
          photoSlots: updatedSlots,
          photos: keptApproved,
          pendingPhotos: newUploads,
          mainPhotoUrl: mainPhotoUrl ?? null,
        } : {}),
      });
      if (becomingPending) notifyAdminNewApplicant(userId);
      res.json({ user: updated });
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/profile/:userId", isAuthenticated, async (req: any, res) => {
    const user = await storage.getUserById(req.params.userId as string);
    if (!user) return res.status(404).json({ error: "User not found" });
    const viewerId = getUserId(req);
    let isMatchedWithViewer = false;
    if (viewerId && viewerId !== req.params.userId) {
      const viewerMatches = await storage.getMatches(viewerId);
      isMatchedWithViewer = viewerMatches.some(m => m.otherUser?.id === req.params.userId);
    }
    res.json({ user, isMatchedWithViewer });
  });

  app.patch("/api/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const parsed = privacySettingsSchema.parse(req.body);
      const currentUser = await storage.getUserById(userId);
      // photosBlurred is a female-only feature — strip it for non-female users
      const safePayload = currentUser?.gender !== "female" ? {} : parsed;
      const updated = await storage.updateUser(userId, safePayload);
      res.json({ user: updated });
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: err.message });
    }
  });

  // â"€â"€â"€ DISCOVER â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  app.get("/api/discover", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const user = await storage.getUserById(userId);
    if (!user || !user.caste || !user.gender) return res.status(400).json({ error: "Profile incomplete" });
    const minAge = parseInt(req.query.minAge as string) || 18;
    const maxAge = parseInt(req.query.maxAge as string) || 80;
    const country = ((req.query.country as string) || "").trim() || undefined;
    const profiles = await storage.getDiscoverProfiles(userId, user.caste as string, user.gender as string, minAge, maxAge, country);
    res.json({ profiles });
  });

  // â"€â"€â"€ LIKES / DISLIKES â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  app.post("/api/like/:targetId", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const targetId = req.params.targetId as string;
    if (targetId === userId) return res.status(400).json({ error: "You cannot like yourself." });
    const comment = typeof req.body?.comment === "string" && req.body.comment.trim() ? req.body.comment.trim().slice(0, 300) : undefined;
    const result = await storage.likeUser(userId, targetId, comment);
    res.json(result);
  });

  app.post("/api/dislike/:targetId", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const targetId = req.params.targetId as string;
    if (targetId === userId) return res.status(400).json({ error: "You cannot dislike yourself." });
    await storage.dislikeUser(userId, targetId);
    res.json({ ok: true });
  });

  app.delete("/api/like/:targetId", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const targetId = req.params.targetId as string;
    await storage.unlikeUser(userId, targetId);
    res.json({ ok: true });
  });

  app.delete("/api/dislike/:targetId", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const targetId = req.params.targetId as string;
    await storage.undislikeUser(userId, targetId);
    res.json({ ok: true });
  });

  app.delete("/api/dislikes", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    await storage.clearAllDislikes(userId);
    res.json({ ok: true });
  });

  // â"€â"€â"€ MATCHES â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  app.get("/api/matches", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const matchList = await storage.getMatches(userId);
    res.json({ matches: matchList });
  });

  // â"€â"€â"€ MESSAGES â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  app.get("/api/messages/:matchId", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const user = await storage.getUserById(userId);
    const match = await storage.getMatch(req.params.matchId as string);
    if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const adminChat = await isAdminMatch(match);
    if (!user?.isPremium && !adminChat) return res.status(403).json({ error: "Premium required to view messages" });
    const msgs = await storage.getMessages(req.params.matchId as string);
    res.json({ messages: msgs });
  });

  app.post("/api/messages/:matchId", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const user = await storage.getUserById(userId);
    const match = await storage.getMatch(req.params.matchId as string);
    if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const adminChat = await isAdminMatch(match);
    if (!user?.isPremium && !adminChat) return res.status(403).json({ error: "Premium required to send messages" });
    const { text } = z.object({ text: z.string().min(1).max(2000) }).parse(req.body);
    const msg = await storage.sendMessage(req.params.matchId as string, userId, text);
    // Auto AI reply when a regular user messages the support account or admin chat
    const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
    const otherUser = await storage.getUserById(otherUserId);
    if ((otherUser?.isSystemAccount || otherUser?.isAdmin) && !user?.isAdmin && !user?.isSystemAccount) {
      generateSupportAiReply(match.id, otherUserId);
      if (otherUser?.isSystemAccount) {
        const displayName = user?.fullName ?? user?.firstName ?? user?.email ?? "A user";
        sendSupportMessageAlertEmail(displayName, text, match.id).catch(() => {});
      }
    }
    res.json({ message: msg });
  });

  app.post("/api/messages/:matchId/read", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    await storage.markMessagesRead(req.params.matchId as string, userId);
    res.json({ ok: true });
  });

  // â"€â"€â"€ EVENTS â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  app.get("/api/events", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const user = await storage.getUserById(userId);
    const evList = await storage.listEvents(userId, !!user?.isAdmin);
    res.json({ events: evList });
  });

  app.get("/api/events/my-pending", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const pending = await db.select().from(events)
      .where(and(eq(events.creatorId, userId), eq(events.isApproved, false)))
      .orderBy(events.date);
    res.json({ events: pending.map(e => ({ ...e, isAttending: false, isCreator: true })) });
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
    const user = await storage.getUserById(userId);
    const schema = z.object({
      title: z.string().min(1), description: z.string().min(1),
      type: z.enum(["cultural", "meetup", "online"]),
      date: z.string(), location: z.string().min(1),
      country: z.string().min(1), organizer: z.string().min(1),
      imageUrl: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const isApproved = !!user?.isAdmin;
    const [event] = await db.insert(events).values({
      id: randomUUID(), ...data,
      date: new Date(data.date), imageUrl: data.imageUrl ?? "",
      attendeeCount: 0, creatorId: userId, isApproved,
    }).returning();
    cacheDel("events:all");
    cacheDel("events:approved");
    res.json({ event });
  });

  app.patch("/api/events/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const currentUser = await storage.getUserById(userId);
    const [event] = await db.select().from(events).where(eq(events.id, req.params.id as string));
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.creatorId !== userId && !currentUser?.isAdmin) return res.status(403).json({ error: "Not your event" });
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
    const currentUser = await storage.getUserById(userId);
    const [event] = await db.select().from(events).where(eq(events.id, req.params.id as string));
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.creatorId !== userId && !currentUser?.isAdmin) return res.status(403).json({ error: "Not your event" });
    await db.delete(eventAttendees).where(eq(eventAttendees.eventId, req.params.id as string));
    await db.delete(events).where(eq(events.id, req.params.id as string));
    res.json({ ok: true });
  });

  // â"€â"€â"€ PREMIUM â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  app.post("/api/premium/subscribe", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const user = await storage.getUserById(userId);

    if (user?.country !== "Iraq") {
      // Non-Iraq users require payment integration (not yet live)
      return res.status(402).json({ error: "Payment required. Contact support@gustilk.com to get early access." });
    }

    // Iraq is always free — country was geo-verified at signup, no re-check needed here.
    // premiumUntil: null means no expiry — Iraq premium is permanent.
    await storage.updateUser(userId, { isPremium: true, premiumUntil: null });
    res.json({ ok: true });
  });

  app.post("/api/premium/restore", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const user = await storage.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = new Date();

    // Web / server-side record check
    if (user.premiumUntil && user.premiumUntil > now) {
      // Subscription record is still valid — re-activate the flag if it was lost
      if (!user.isPremium) {
        await storage.updateUser(userId, { isPremium: true });
      }
      return res.json({
        restored: true,
        isPremium: true,
        premiumUntil: user.premiumUntil,
        message: "Your Premium membership has been restored.",
      });
    }

    // No valid subscription found — clean up any stale flag
    if (user.isPremium) {
      await storage.updateUser(userId, { isPremium: false, premiumUntil: null });
    }
    res.json({
      restored: false,
      isPremium: false,
      premiumUntil: null,
      message: "No active subscription found.",
    });
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
    notifyAdminNewApplicant(userId);
    res.json({ ok: true });
  });

  app.post("/api/profile/reapply", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const user = await storage.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.verificationStatus === "banned") return res.status(403).json({ error: "Banned accounts cannot reapply." });
    if (user.verificationStatus === "pending") return res.status(400).json({ error: "Already pending review." });
    const { selfie } = z.object({ selfie: z.string().optional() }).parse(req.body);
    if (selfie && selfie.startsWith("data:image")) {
      const faceCheck = await checkFacePresent(selfie);
      if (!faceCheck.faceDetected) return res.status(400).json({ error: "Please upload a clear selfie showing your face." });
    }
    await storage.reapplyUser(userId, selfie);
    notifyAdminNewApplicant(userId);
    res.json({ ok: true });
  });

  // ─── SUPPORT CHAT ─────────────────────────────────────────
  app.post("/api/support/start", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const supportAccount = await getOrCreateSupportAccount();
      const existing = await db.select().from(matches).where(
        or(
          and(eq(matches.user1Id, supportAccount.id), eq(matches.user2Id, userId)),
          and(eq(matches.user1Id, userId), eq(matches.user2Id, supportAccount.id))
        )
      );
      if (existing.length > 0) return res.json({ matchId: existing[0].id });
      const matchId = randomUUID();
      await db.insert(matches).values({ id: matchId, user1Id: supportAccount.id, user2Id: userId });
      const openingMsg = `Hello! I'm the Gûstîlk Support Assistant — an AI available 24/7. How can I help you today?`;
      await storage.sendMessage(matchId, supportAccount.id, openingMsg);
      res.json({ matchId });
    } catch (e: any) {
      console.error("[support/start]", e);
      res.status(500).json({ error: "Failed to start support chat" });
    }
  });

  // ─── GIFTS ────────────────────────────────────────────────
  app.post("/api/gifts", isAuthenticated, async (req, res) => {
    const senderId = getUserId(req);
    const sender = await storage.getUserById(senderId);
    if (!sender?.isPremium) return res.status(403).json({ error: "Premium required to send gifts" });

    const { recipientId, matchId, giftType, message, animationStyle } = z.object({
      recipientId: z.string(),
      matchId: z.string(),
      giftType: z.string().min(1),
      message: z.string().max(200).optional().default(""),
      animationStyle: z.enum(["none","confetti","sparkles","fireworks","hearts","flowers"]).default("none"),
    }).parse(req.body);

    const gift = await storage.sendGift(senderId, recipientId, matchId, giftType, message, animationStyle);
    res.json({ gift });
  });

  app.get("/api/gifts/match/:matchId", isAuthenticated, async (req, res) => {
    const gifts = await storage.getGiftsInMatch(req.params.matchId);
    res.json({ gifts });
  });

  app.get("/api/gifts/received", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const gifts = await storage.getGiftsReceived(userId);
    res.json({ gifts });
  });

  // ─── SEEN ─────────────────────────────────────────────────
  app.post("/api/seen/matches", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    await db.update(messages)
      .set({ readAt: new Date() })
      .where(and(eq(messages.readAt, null as any), sql`${messages.senderId} != ${userId}`));
    await db.update(users).set({ matchesSeenAt: new Date() } as any).where(eq(users.id, userId));
    cacheDel(`matches:${userId}`);
    res.json({ ok: true });
  });

  app.post("/api/seen/activity", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const now = new Date();
    await db.update(users).set({ activitySeenAt: now } as any).where(eq(users.id, userId));
    cacheDel(`user:${userId}`);
    res.json({ ok: true });
  });

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

  // ─── PUSH NOTIFICATIONS ───────────────────────────────────
  app.post("/api/push/register", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const { token, platform } = req.body;
    if (!token || !platform) return res.status(400).json({ error: "token and platform required" });
    await storage.updateUser(userId, { pushToken: token, pushPlatform: platform } as any);
    res.json({ ok: true });
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

  // â"€â"€â"€ ADMIN â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const ROLE_RANK: Record<string, number> = { user: 0, moderator: 1, admin: 2, super_admin: 3 };
  function getEffectiveRank(user: any): number {
    const r = ROLE_RANK[user?.role ?? "user"] ?? 0;
    return user?.isAdmin && r < ROLE_RANK.admin ? ROLE_RANK.admin : r;
  }

  async function requireAdmin(req: any, res: any, next: any) {
    const userId = getUserId(req);
    const user = await storage.getUserById(userId);
    if (!user?.isAdmin && getEffectiveRank(user) < ROLE_RANK.moderator) return res.status(403).json({ error: "Admin only" });
    next();
  }

  async function requireSuperAdmin(req: any, res: any, next: any) {
    const userId = getUserId(req);
    const user = await storage.getUserById(userId);
    if (getEffectiveRank(user) < ROLE_RANK.super_admin) return res.status(403).json({ error: "Super admin only" });
    next();
  }

  async function requireModerator(req: any, res: any, next: any) {
    const userId = getUserId(req);
    const user = await storage.getUserById(userId);
    if (getEffectiveRank(user) < ROLE_RANK.moderator) return res.status(403).json({ error: "Moderator access required" });
    next();
  }

  app.get("/api/admin/verifications", isAuthenticated, requireAdmin, async (_req, res) => {
    const pending = await storage.getPendingVerifications();
    res.json({ users: pending });
  });

  app.post("/api/admin/verify/:userId", isAuthenticated, requireAdmin, async (req, res) => {
    const adminId = getUserId(req);
    const targetId = req.params.userId as string;
    const { action, reason } = z.object({
      action: z.enum(["approve", "reject", "ban"]),
      reason: z.string().optional(),
    }).parse(req.body);

    if (action === "ban") {
      await storage.banUser(targetId, reason);
    } else {
      await storage.updateVerificationStatus(targetId, action === "approve" ? "approved" : "rejected", action === "approve", reason);
      // Also approve/reject all pending photo slots
      if (action === "approve") {
        const targetUser = await storage.getUserById(targetId);
        const slots = (targetUser?.photoSlots as any[] | null) ?? [];
        for (let i = 0; i < slots.length; i++) {
          if (slots[i]?.status === "pending") {
            await storage.approvePhotoSlot(targetId, i);
          }
        }
      }
    }

    // Welcome message from support account on first approval
    if (action === "approve") {
      try {
        const supportAccount = await getOrCreateSupportAccount();
        const existing = await db.select().from(matches).where(
          or(
            and(eq(matches.user1Id, supportAccount.id), eq(matches.user2Id, targetId)),
            and(eq(matches.user1Id, targetId), eq(matches.user2Id, supportAccount.id))
          )
        );
        let supportMatchId: string;
        if (existing.length > 0) {
          supportMatchId = existing[0].id;
        } else {
          supportMatchId = randomUUID();
          await db.insert(matches).values({ id: supportMatchId, user1Id: supportAccount.id, user2Id: targetId });
        }
        const welcomeMsg = `Welcome to Gûstîlk! 🎉 Your account is now verified and you are part of our community. I am the Gûstîlk Support Assistant — an AI here 24/7 to help you. Feel free to ask me anything about matching, your profile, events, premium features, or any issue you run into. We hope you find meaningful connections here!`;
        await storage.sendMessage(supportMatchId, supportAccount.id, welcomeMsg);
      } catch (e) {
        console.error("[welcome-message error]", e);
      }
    }

    // Auto-message the user on reject or ban
    if (action === "reject" || action === "ban") {
      try {
        const existing = await db.select().from(matches).where(
          or(
            and(eq(matches.user1Id, adminId), eq(matches.user2Id, targetId)),
            and(eq(matches.user1Id, targetId), eq(matches.user2Id, adminId))
          )
        );
        let matchId: string;
        if (existing.length > 0) {
          matchId = existing[0].id;
        } else {
          matchId = randomUUID();
          await db.insert(matches).values({ id: matchId, user1Id: adminId, user2Id: targetId });
        }
        const defaultMsg = action === "ban"
          ? "Your account has been suspended for violating our community guidelines."
          : "Thank you for registering on Gûstîlk. Unfortunately, we were unable to approve your account at this time.";
        const msg = reason?.trim() ? `${defaultMsg} ${reason.trim()}` : defaultMsg;
        await storage.sendMessage(matchId, adminId, msg);
      } catch (e) {
        console.error("[verify auto-message error]", e);
      }
    }

    const adminUser = await storage.getUserById(adminId);
    await writeAuditLog(adminId, adminUser?.email ?? "", `verify:${action}`, "user", targetId, reason ?? "");

    res.json({ ok: true });
  });

  app.post("/api/admin/ban/:userId", isAuthenticated, requireAdmin, async (req, res) => {
    await storage.banUser(req.params.userId as string);
    res.json({ ok: true });
  });

  // ── Suspicious logins ─────────────────────────────────────────────────────
  app.get("/api/admin/suspicious-logins", isAuthenticated, requireAdmin, async (_req, res) => {
    const flagged = await db
      .select()
      .from(users)
      .where(and(eq(users.country, "Iraq"), isNotNull(users.suspiciousLoginAt)))
      .orderBy(desc(users.suspiciousLoginAt));
    res.json({ users: flagged.map(u => ({
      id: u.id, fullName: u.fullName, email: u.email,
      isPremium: u.isPremium, premiumUntil: u.premiumUntil,
      suspiciousLoginAt: u.suspiciousLoginAt, suspiciousLoginIp: u.suspiciousLoginIp,
      mainPhotoUrl: u.mainPhotoUrl,
    })) });
  });

  app.post("/api/admin/suspicious-logins/:userId/revoke-premium", isAuthenticated, requireAdmin, async (req, res) => {
    await db.update(users)
      .set({ isPremium: false, premiumUntil: null } as any)
      .where(eq(users.id, String(req.params.userId)));
    res.json({ ok: true });
  });

  app.post("/api/admin/suspicious-logins/:userId/dismiss", isAuthenticated, requireAdmin, async (req, res) => {
    await db.update(users)
      .set({ suspiciousLoginAt: null, suspiciousLoginIp: null } as any)
      .where(eq(users.id, String(req.params.userId)));
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
    const premiumFilter = (req.query.premium as string) || "";
    const casteFilter = (req.query.caste as string) || "";
    const limit = Math.min(parseInt(req.query.limit as string) || 500, 1000);
    const offset = parseInt(req.query.offset as string) || 0;
    const conditions: any[] = [];
    if (search) conditions.push(or(ilike(users.fullName, `%${search}%`), ilike(users.email, `%${search}%`), ilike(users.city, `%${search}%`)));
    if (countryFilter) conditions.push(ilike(users.country, `%${countryFilter}%`));
    if (cityFilter) conditions.push(ilike(users.city, `%${cityFilter}%`));
    if (premiumFilter === "premium") conditions.push(eq(users.isPremium, true));
    if (premiumFilter === "non_premium") conditions.push(eq(users.isPremium, false));
    if (casteFilter && ["sheikh", "pir", "murid"].includes(casteFilter)) conditions.push(eq(users.caste, casteFilter as any));
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
      profileVisible: z.boolean().optional(),
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
      if (data.isBanned) { updates.isVerified = false; updates.profileVisible = false; }
    }
    if (data.isAdmin !== undefined) updates.isAdmin = data.isAdmin;
    if (data.profileVisible !== undefined) updates.profileVisible = data.profileVisible;
    await db.update(users).set(updates).where(eq(users.id, req.params.id as string));
    res.json({ ok: true });
  });

  app.delete("/api/admin/users/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const targetId = req.params.id as string;
      const adminId = getUserId(req);

      const [targetUser, adminUser] = await Promise.all([
        storage.getUserById(targetId),
        storage.getUserById(adminId),
      ]);

      if (!targetUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const wasPremium = !!targetUser.isPremium;
      const adminEmail = adminUser?.email ?? "";
      const displayName = targetUser.fullName ?? targetUser.firstName ?? "Member";

      if (wasPremium) {
        await writeAuditLog(
          adminId,
          adminEmail,
          "premium_cancelled_on_deletion",
          "user",
          targetId,
          `Account deleted by admin. Premium subscription cancelled immediately. User: ${targetUser.email ?? targetUser.phone ?? targetId}. FLAG FOR REFUND REVIEW.`,
        );
        if (targetUser.email) {
          sendAccountDeletedEmail(targetUser.email, displayName, true).catch(() => {});
        }
      } else if (targetUser.email) {
        sendAccountDeletedEmail(targetUser.email, displayName, false).catch(() => {});
      }

      await writeAuditLog(
        adminId,
        adminEmail,
        "delete_user",
        "user",
        targetId,
        `Deleted user: ${targetUser.email ?? targetUser.phone ?? targetId}${wasPremium ? " (had active premium)" : ""}`,
      );

      await storage.deleteUser(targetId);
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin] delete user error:", err);
      res.status(500).json({ error: "Failed to delete user" });
    }
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
    const { cacheGet: cGet, cacheSet: cSet, TTL: CT } = await import("./cache");
    const ck = "admin:stats";
    const cached = cGet<object>(ck);
    if (cached) return res.json(cached);

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
    const result = {
      totalUsers: Number(tu.n), premiumUsers: Number(pu.n), verifiedUsers: Number(vu.n),
      bannedUsers: Number(bu.n), totalMatches: Number(tm.n), totalMessages: Number(tms.n),
      totalEvents: Number(te.n), newThisWeek: Number(nw.n),
    };
    cSet(ck, result, CT.ADMIN_STATS);
    res.json(result);
  });

  app.get("/api/admin/events", isAuthenticated, requireAdmin, async (_req, res) => {
    const allEvents = await db.select().from(events).orderBy(asc(events.date));
    res.json({ events: allEvents });
  });

  app.patch("/api/admin/events/:id/approve", isAuthenticated, requireAdmin, async (req, res) => {
    const [event] = await db.update(events)
      .set({ isApproved: true })
      .where(eq(events.id, req.params.id as string))
      .returning();
    if (!event) return res.status(404).json({ error: "Event not found" });
    cacheDel("events:all");
    cacheDel("events:approved");
    res.json({ ok: true });
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
      date: new Date(data.date), imageUrl: data.imageUrl ?? "", attendeeCount: 0, isApproved: true,
    }).returning();
    cacheDel("events:all");
    cacheDel("events:approved");
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

  // Admin: start or resume a direct chat with any user
  app.post("/api/admin/start-chat/:userId", isAuthenticated, requireAdmin, async (req, res) => {
    const adminId = getUserId(req);
    const targetId = req.params.userId as string;
    const existing = await db.select().from(matches).where(
      or(
        and(eq(matches.user1Id, adminId), eq(matches.user2Id, targetId)),
        and(eq(matches.user1Id, targetId), eq(matches.user2Id, adminId))
      )
    );
    if (existing.length > 0) return res.json({ matchId: existing[0].id });
    const matchId = randomUUID();
    await db.insert(matches).values({ id: matchId, user1Id: adminId, user2Id: targetId });
    res.json({ matchId });
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

  // â"€â"€â"€ CHANGE PASSWORD â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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

  // â"€â"€â"€ CHANGE PHONE â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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

  // â"€â"€â"€ DELETE ACCOUNT â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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

  // ─── EXTENDED ADMIN ROUTES ────────────────────────────────────────────────
  async function broadcastSupportMessage(message: string): Promise<void> {
    const supportAccount = await getOrCreateSupportAccount();
    const verifiedUsers = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.isEmailVerified, true), eq(users.isSystemAccount, false)));
    for (const { id: targetId } of verifiedUsers) {
      if (targetId === supportAccount.id) continue;
      try {
        const existing = await db.select({ id: matches.id }).from(matches).where(
          or(
            and(eq(matches.user1Id, supportAccount.id), eq(matches.user2Id, targetId)),
            and(eq(matches.user1Id, targetId), eq(matches.user2Id, supportAccount.id))
          )
        );
        let matchId: string;
        if (existing.length > 0) {
          matchId = existing[0].id;
        } else {
          matchId = randomUUID();
          await db.insert(matches).values({ id: matchId, user1Id: supportAccount.id, user2Id: targetId });
        }
        await storage.sendMessage(matchId, supportAccount.id, message);
      } catch (e) {
        console.error(`[broadcast] failed for user ${targetId}:`, e);
      }
    }
  }

  registerAdminRoutes(app, isAuthenticated, requireAdmin, requireSuperAdmin, broadcastSupportMessage);

  // ─── HOURLY MESSAGE EXPIRY CLEANUP ────────────────────────────────────────
  const runMsgCleanup = async () => {
    try {
      const n = await storage.cleanupExpiredMessages();
      if (n > 0) console.log(`[msg-cleanup] Expired ${n} message(s)`);
    } catch (e) {
      console.error("[msg-cleanup] Error:", e);
    }
  };
  runMsgCleanup();
  setInterval(runMsgCleanup, 60 * 60 * 1000);

  return httpServer;
}

