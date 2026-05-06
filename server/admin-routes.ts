import type { Express } from "express";
import { db } from "./db";
import {
  blacklist, promoCodes, auditLogs, appSettings, announcements, successStories,
  users, matches, messages, likes, reports, events, passkeys,
} from "@shared/schema";
import { eq, desc, sql, count, and, or, gte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { sendRoleAssignedEmail } from "./email";

function getUserId(req: any): string { return req.session?.userId; }

// ─── AUDIT LOG HELPER ─────────────────────────────────────────────────────────
export async function writeAuditLog(
  adminId: string,
  adminEmail: string,
  action: string,
  targetType = "",
  targetId = "",
  details = "",
) {
  await db.insert(auditLogs).values({
    id: randomUUID(), adminId, adminEmail, action, targetType, targetId, details,
  }).catch(() => {});
}

// ─── ANALYTICS CACHE ──────────────────────────────────────────────────────────
let analyticsCache: { data: any; ts: number } | null = null;
const ANALYTICS_TTL = 60 * 60 * 1000;

export function registerAdminRoutes(app: Express, isAuthenticated: any, requireAdmin: any, requireSuperAdmin: any) {

  // ─── BLACKLIST ─────────────────────────────────────────────────────────────
  app.get("/api/admin/blacklist", isAuthenticated, requireAdmin, async (_req, res) => {
    const rows = await db.select().from(blacklist).orderBy(desc(blacklist.createdAt));
    res.json({ blacklist: rows });
  });

  app.post("/api/admin/blacklist", isAuthenticated, requireAdmin, async (req, res) => {
    const schema = z.object({
      type: z.enum(["email", "phone", "ip"]),
      value: z.string().min(1),
      reason: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const adminId = getUserId(req);
    const [adminUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, adminId));
    const [row] = await db.insert(blacklist).values({
      id: randomUUID(), ...data, reason: data.reason ?? "", createdBy: adminId,
    }).returning();
    await writeAuditLog(adminId, adminUser?.email ?? "", "blacklist_add", "blacklist", row.id, `${data.type}: ${data.value}`);
    res.json({ ok: true, row });
  });

  app.delete("/api/admin/blacklist/:id", isAuthenticated, requireAdmin, async (req, res) => {
    const adminId = getUserId(req);
    const [adminUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, adminId));
    await db.delete(blacklist).where(eq(blacklist.id, req.params.id));
    await writeAuditLog(adminId, adminUser?.email ?? "", "blacklist_remove", "blacklist", req.params.id);
    res.json({ ok: true });
  });

  // ─── PROMO CODES ───────────────────────────────────────────────────────────
  app.get("/api/admin/promo-codes", isAuthenticated, requireAdmin, async (_req, res) => {
    const rows = await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
    res.json({ codes: rows });
  });

  app.post("/api/admin/promo-codes", isAuthenticated, requireAdmin, async (req, res) => {
    const schema = z.object({
      code: z.string().min(2).toUpperCase(),
      description: z.string().optional(),
      discountPercent: z.number().min(1).max(100).default(100),
      maxUses: z.number().min(0).default(0),
      expiresAt: z.string().optional(),
      active: z.boolean().default(true),
    });
    const data = schema.parse(req.body);
    const adminId = getUserId(req);
    const [adminUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, adminId));
    const [row] = await db.insert(promoCodes).values({
      id: randomUUID(),
      code: data.code,
      description: data.description ?? "",
      discountPercent: data.discountPercent,
      maxUses: data.maxUses,
      usedCount: 0,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      active: data.active,
    }).returning();
    await writeAuditLog(adminId, adminUser?.email ?? "", "promo_code_create", "promo_code", row.id, data.code);
    res.json({ ok: true, code: row });
  });

  app.patch("/api/admin/promo-codes/:id", isAuthenticated, requireAdmin, async (req, res) => {
    const schema = z.object({ active: z.boolean().optional() });
    const data = schema.parse(req.body);
    await db.update(promoCodes).set(data).where(eq(promoCodes.id, req.params.id));
    res.json({ ok: true });
  });

  app.delete("/api/admin/promo-codes/:id", isAuthenticated, requireAdmin, async (req, res) => {
    const adminId = getUserId(req);
    const [adminUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, adminId));
    await db.delete(promoCodes).where(eq(promoCodes.id, req.params.id));
    await writeAuditLog(adminId, adminUser?.email ?? "", "promo_code_delete", "promo_code", req.params.id);
    res.json({ ok: true });
  });

  // ─── AUDIT LOGS ────────────────────────────────────────────────────────────
  app.get("/api/admin/audit-logs", isAuthenticated, requireAdmin, async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const [rows, [countRow]] = await Promise.all([
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset),
      db.select({ n: count() }).from(auditLogs),
    ]);
    res.json({ logs: rows, total: Number(countRow.n) });
  });

  // ─── APP SETTINGS ──────────────────────────────────────────────────────────
  app.get("/api/admin/settings", isAuthenticated, requireAdmin, async (_req, res) => {
    const rows = await db.select().from(appSettings);
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value;

    const defaults: Record<string, string> = {
      minAge: "18",
      maxAge: "80",
      maintenanceMode: "false",
      allowSheikh: "true",
      allowPir: "true",
      allowMurid: "true",
      premiumMonthlyPrice: "9.99",
      premiumYearlyPrice: "79.99",
      guidelines: "Be respectful. Be honest. No harassment. No fake profiles.",
    };
    res.json({ settings: { ...defaults, ...settings } });
  });

  app.put("/api/admin/settings", isAuthenticated, requireAdmin, async (req, res) => {
    const data = z.record(z.string()).parse(req.body);
    const adminId = getUserId(req);
    const [adminUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, adminId));
    for (const [key, value] of Object.entries(data)) {
      const existing = await db.select({ id: appSettings.id }).from(appSettings).where(eq(appSettings.key, key));
      if (existing.length > 0) {
        await db.update(appSettings).set({ value, updatedAt: new Date() }).where(eq(appSettings.key, key));
      } else {
        await db.insert(appSettings).values({ id: randomUUID(), key, value });
      }
    }
    await writeAuditLog(adminId, adminUser?.email ?? "", "settings_update", "settings", "", Object.keys(data).join(", "));
    res.json({ ok: true });
  });

  // ─── ANNOUNCEMENTS ─────────────────────────────────────────────────────────
  app.get("/api/admin/announcements", isAuthenticated, requireAdmin, async (_req, res) => {
    const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
    res.json({ announcements: rows });
  });

  app.get("/api/announcements/active", isAuthenticated, async (_req, res) => {
    const rows = await db.select().from(announcements).where(eq(announcements.active, true)).orderBy(desc(announcements.createdAt));
    res.json({ announcements: rows });
  });

  app.post("/api/admin/announcements", isAuthenticated, requireAdmin, async (req, res) => {
    const schema = z.object({
      title: z.string().min(1),
      content: z.string().min(1),
      active: z.boolean().default(true),
    });
    const data = schema.parse(req.body);
    const adminId = getUserId(req);
    const [adminUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, adminId));
    const [row] = await db.insert(announcements).values({ id: randomUUID(), ...data }).returning();
    await writeAuditLog(adminId, adminUser?.email ?? "", "announcement_create", "announcement", row.id, data.title);
    res.json({ ok: true, announcement: row });
  });

  app.patch("/api/admin/announcements/:id", isAuthenticated, requireAdmin, async (req, res) => {
    const schema = z.object({
      title: z.string().optional(),
      content: z.string().optional(),
      active: z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    await db.update(announcements).set(data).where(eq(announcements.id, req.params.id));
    res.json({ ok: true });
  });

  app.delete("/api/admin/announcements/:id", isAuthenticated, requireAdmin, async (req, res) => {
    await db.delete(announcements).where(eq(announcements.id, req.params.id));
    res.json({ ok: true });
  });

  // ─── SUCCESS STORIES ───────────────────────────────────────────────────────
  app.get("/api/admin/success-stories", isAuthenticated, requireAdmin, async (_req, res) => {
    const rows = await db.select().from(successStories).orderBy(desc(successStories.createdAt));
    res.json({ stories: rows });
  });

  app.get("/api/success-stories", async (_req, res) => {
    const rows = await db.select().from(successStories).where(eq(successStories.visible, true)).orderBy(desc(successStories.createdAt));
    res.json({ stories: rows });
  });

  app.post("/api/admin/success-stories", isAuthenticated, requireAdmin, async (req, res) => {
    const schema = z.object({
      names: z.string().min(1),
      story: z.string().min(1),
      photoUrl: z.string().optional(),
      visible: z.boolean().default(true),
    });
    const data = schema.parse(req.body);
    const [row] = await db.insert(successStories).values({
      id: randomUUID(), names: data.names, story: data.story,
      photoUrl: data.photoUrl ?? "", visible: data.visible,
    }).returning();
    res.json({ ok: true, story: row });
  });

  app.patch("/api/admin/success-stories/:id", isAuthenticated, requireAdmin, async (req, res) => {
    const schema = z.object({
      names: z.string().optional(),
      story: z.string().optional(),
      photoUrl: z.string().optional(),
      visible: z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    await db.update(successStories).set(data).where(eq(successStories.id, req.params.id));
    res.json({ ok: true });
  });

  app.delete("/api/admin/success-stories/:id", isAuthenticated, requireAdmin, async (req, res) => {
    await db.delete(successStories).where(eq(successStories.id, req.params.id));
    res.json({ ok: true });
  });

  // ─── ANALYTICS ─────────────────────────────────────────────────────────────
  app.get("/api/admin/analytics", isAuthenticated, requireAdmin, async (_req, res) => {
    try {
      const now = Date.now();
      if (analyticsCache && now - analyticsCache.ts < ANALYTICS_TTL) {
        return res.json(analyticsCache.data);
      }

      const [
        [totalUsers], [premiumUsers], [verifiedUsers], [bannedUsers],
        [maleUsers], [femaleUsers],
        [sheikhUsers], [pirUsers], [muridUsers],
        [todaySignups], [weekSignups], [monthSignups],
        [totalMatches], [totalMessages], [totalEvents],
        dailySignups,
      ] = await Promise.all([
        db.select({ n: count() }).from(users),
        db.select({ n: count() }).from(users).where(sql`${users.isPremium} = true`),
        db.select({ n: count() }).from(users).where(sql`${users.isVerified} = true`),
        db.select({ n: count() }).from(users).where(sql`${users.verificationStatus} = 'banned'`),
        db.select({ n: count() }).from(users).where(sql`${users.gender} = 'male'`),
        db.select({ n: count() }).from(users).where(sql`${users.gender} = 'female'`),
        db.select({ n: count() }).from(users).where(sql`${users.caste} = 'sheikh'`),
        db.select({ n: count() }).from(users).where(sql`${users.caste} = 'pir'`),
        db.select({ n: count() }).from(users).where(sql`${users.caste} = 'murid'`),
        db.select({ n: count() }).from(users).where(sql`${users.createdAt} > now() - interval '1 day'`),
        db.select({ n: count() }).from(users).where(sql`${users.createdAt} > now() - interval '7 days'`),
        db.select({ n: count() }).from(users).where(sql`${users.createdAt} > now() - interval '30 days'`),
        db.select({ n: count() }).from(matches),
        db.select({ n: count() }).from(messages),
        db.select({ n: count() }).from(events),
        db.execute(sql`
          SELECT DATE(created_at) as day, COUNT(*)::int as count
          FROM users
          WHERE created_at > now() - interval '30 days'
          GROUP BY DATE(created_at)
          ORDER BY day ASC
        `),
      ]);

      const data = {
        users: {
          total: Number(totalUsers.n),
          premium: Number(premiumUsers.n),
          verified: Number(verifiedUsers.n),
          banned: Number(bannedUsers.n),
          male: Number(maleUsers.n),
          female: Number(femaleUsers.n),
          sheikh: Number(sheikhUsers.n),
          pir: Number(pirUsers.n),
          murid: Number(muridUsers.n),
          todaySignups: Number(todaySignups.n),
          weekSignups: Number(weekSignups.n),
          monthSignups: Number(monthSignups.n),
        },
        engagement: {
          totalMatches: Number(totalMatches.n),
          totalMessages: Number(totalMessages.n),
          totalEvents: Number(totalEvents.n),
        },
        dailySignups: ((dailySignups as any).rows ?? []).map((r: any) => ({ day: r.day, count: Number(r.count) })),
        cachedAt: new Date().toISOString(),
      };

      analyticsCache = { data, ts: now };
      res.json(data);
    } catch (err) {
      console.error("[admin] analytics error:", err);
      res.status(500).json({ error: "Failed to load analytics" });
    }
  });

  // Force refresh analytics cache
  app.post("/api/admin/analytics/refresh", isAuthenticated, requireAdmin, async (_req, res) => {
    analyticsCache = null;
    res.json({ ok: true });
  });

  // ─── EXPORT ────────────────────────────────────────────────────────────────
  app.get("/api/admin/export/:type", isAuthenticated, requireAdmin, async (req, res) => {
    const type = req.params.type as string;
    const adminId = getUserId(req);
    const [adminUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, adminId));

    if (type === "users") {
      const rows = await db.select({
        id: users.id, email: users.email, fullName: users.fullName,
        gender: users.gender, caste: users.caste, age: users.age,
        city: users.city, country: users.country, isPremium: users.isPremium,
        isVerified: users.isVerified, verificationStatus: users.verificationStatus,
        createdAt: users.createdAt,
      }).from(users).orderBy(desc(users.createdAt));

      const header = "id,email,fullName,gender,caste,age,city,country,isPremium,isVerified,status,createdAt\n";
      const csv = header + rows.map(r =>
        [r.id, r.email, `"${r.fullName ?? ""}"`, r.gender, r.caste, r.age, r.city, r.country, r.isPremium, r.isVerified, r.verificationStatus, r.createdAt].join(",")
      ).join("\n");

      await writeAuditLog(adminId, adminUser?.email ?? "", "export_users");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=users.csv");
      return res.send(csv);
    }

    if (type === "matches") {
      const rows = await db.select().from(matches).orderBy(desc(matches.createdAt));
      const header = "id,user1Id,user2Id,createdAt\n";
      const csv = header + rows.map(r => [r.id, r.user1Id, r.user2Id, r.createdAt].join(",")).join("\n");
      await writeAuditLog(adminId, adminUser?.email ?? "", "export_matches");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=matches.csv");
      return res.send(csv);
    }

    if (type === "reports") {
      const rows = await db.select().from(reports).orderBy(desc(reports.createdAt));
      const header = "id,reporterId,reportedUserId,reason,status,createdAt\n";
      const csv = header + rows.map(r => [r.id, r.reporterId, r.reportedUserId, `"${r.reason}"`, r.status, r.createdAt].join(",")).join("\n");
      await writeAuditLog(adminId, adminUser?.email ?? "", "export_reports");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=reports.csv");
      return res.send(csv);
    }

    res.status(400).json({ error: "Unknown export type" });
  });

  // ─── MODERATION QUEUE (photos/bios needing review) ─────────────────────────
  app.get("/api/admin/moderation", isAuthenticated, requireAdmin, async (_req, res) => {
    const allUsers = await db.select().from(users).where(
      sql`${users.verificationStatus} = 'pending' OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(${users.photoSlots}::jsonb) AS slot
        WHERE slot->>'status' = 'pending'
      )`
    ).orderBy(desc(users.createdAt)).limit(50);
    res.json({ users: allUsers });
  });

  // ─── DUPLICATE DETECTION ───────────────────────────────────────────────────
  app.get("/api/admin/duplicates", isAuthenticated, requireAdmin, async (_req, res) => {
    const dupes = await db.execute(sql`
      SELECT u1.id as id1, u1.email as email1, u1.full_name as name1,
             u2.id as id2, u2.email as email2, u2.full_name as name2,
             u1.city, u1.age
      FROM users u1
      JOIN users u2 ON u1.id < u2.id
        AND u1.is_admin = false AND u2.is_admin = false
        AND (
          (u1.city IS NOT NULL AND u1.city = u2.city AND u1.age = u2.age AND u1.gender = u2.gender)
        )
      ORDER BY u1.created_at DESC
      LIMIT 50
    `);
    res.json({ duplicates: (dupes as any).rows ?? [] });
  });

  // ─── USER DETAIL ───────────────────────────────────────────────────────────
  app.get("/api/admin/users/:id", isAuthenticated, requireAdmin, async (req, res) => {
    const [user] = await db.select().from(users).where(eq(users.id, req.params.id));
    if (!user) return res.status(404).json({ error: "User not found" });

    const [matchCount, messageCount] = await Promise.all([
      db.select({ n: count() }).from(matches).where(
        or(eq(matches.user1Id, req.params.id), eq(matches.user2Id, req.params.id))
      ),
      db.execute(sql`
        SELECT COUNT(*)::int as n FROM messages m
        JOIN matches mt ON m.match_id = mt.id
        WHERE mt.user1_id = ${req.params.id} OR mt.user2_id = ${req.params.id}
      `),
    ]);

    res.json({
      user,
      stats: {
        matches: Number(matchCount[0].n),
        messages: Number((messageCount as any[])[0]?.n ?? 0),
      },
    });
  });

  // ─── SUSPEND / WARN USER (enhanced) ───────────────────────────────────────
  app.post("/api/admin/users/:id/warn", isAuthenticated, requireAdmin, async (req, res) => {
    const { reason } = z.object({ reason: z.string().min(1) }).parse(req.body);
    const adminId = getUserId(req);
    const [adminUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, adminId));
    const targetId = req.params.id;
    const existing = await db.select().from(matches).where(
      or(and(eq(matches.user1Id, adminId), eq(matches.user2Id, targetId)),
         and(eq(matches.user1Id, targetId), eq(matches.user2Id, adminId)))
    );
    let matchId: string;
    if (existing.length > 0) {
      matchId = existing[0].id;
    } else {
      matchId = randomUUID();
      await db.insert(matches).values({ id: matchId, user1Id: adminId, user2Id: targetId });
    }
    await db.execute(sql`INSERT INTO messages (id, match_id, sender_id, text, created_at) VALUES (${randomUUID()}, ${matchId}, ${adminId}, ${`⚠️ Warning: ${reason}`}, NOW())`);
    await writeAuditLog(adminId, adminUser?.email ?? "", "warn_user", "user", targetId, reason);
    res.json({ ok: true });
  });

  app.post("/api/admin/users/:id/suspend", isAuthenticated, requireAdmin, async (req, res) => {
    const { reason, days } = z.object({ reason: z.string().min(1), days: z.number().min(1).max(365).default(7) }).parse(req.body);
    const adminId = getUserId(req);
    const [adminUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, adminId));
    const targetId = req.params.id;
    await db.update(users).set({
      profileVisible: false,
      verificationStatus: "rejected",
      updatedAt: new Date(),
    }).where(eq(users.id, targetId));
    await writeAuditLog(adminId, adminUser?.email ?? "", "suspend_user", "user", targetId, `${days} days: ${reason}`);
    res.json({ ok: true });
  });

  // ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
  app.post("/api/admin/notifications/send", isAuthenticated, requireAdmin, async (req, res) => {
    const { title, body, segment } = z.object({
      title: z.string().min(1),
      body: z.string().min(1),
      segment: z.enum(["all", "premium", "free"]).default("all"),
    }).parse(req.body);
    const adminId = getUserId(req);
    const [adminUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, adminId));
    await writeAuditLog(adminId, adminUser?.email ?? "", "notification_send", "notification", "", `${segment}: ${title}`);
    res.json({ ok: true, sent: true, note: "Push notification infrastructure not yet connected" });
  });

  // ─── FEEDBACK ──────────────────────────────────────────────────────────────
  app.get("/api/admin/feedback", isAuthenticated, requireAdmin, async (_req, res) => {
    res.json({ feedback: [], note: "Feedback collection not yet integrated" });
  });

  // ─── PASSKEY RESET (phone user recovery) ───────────────────────────────────
  app.delete("/api/admin/users/:id/passkeys", isAuthenticated, requireAdmin, async (req, res) => {
    const adminId = getUserId(req);
    const [adminUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, adminId));
    const targetId = req.params.id;
    const [target] = await db.select({ id: users.id, phone: users.phone }).from(users).where(eq(users.id, targetId));
    if (!target) return res.status(404).json({ message: "User not found" });
    if (!target.phone) return res.status(400).json({ message: "This user did not sign up with a phone number" });
    await db.delete(passkeys).where(eq(passkeys.userId, targetId));
    await writeAuditLog(adminId, adminUser?.email ?? "", "reset_passkeys", "user", targetId, "Passkeys cleared for phone recovery — identity verified by admin");
    res.json({ ok: true });
  });

  // ─── TEAM MANAGEMENT (super_admin only) ───────────────────────────────────

  const VALID_ADMIN_ROLES = ["moderator", "admin", "super_admin"] as const;
  type AdminRole = typeof VALID_ADMIN_ROLES[number];

  // List all team members (users with role != 'user')
  app.get("/api/admin/team", isAuthenticated, requireAdmin, async (_req, res) => {
    const team = await db.select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
    }).from(users).where(
      or(
        eq(users.isAdmin, true),
        sql`${users.role} IN ('moderator', 'admin', 'super_admin')`
      )
    ).orderBy(desc(users.createdAt));
    res.json({ team });
  });

  // Invite (assign role to existing user by email) — super_admin only
  app.post("/api/admin/team/invite", isAuthenticated, requireSuperAdmin, async (req, res) => {
    const adminId = getUserId(req);
    const { email, role } = z.object({
      email: z.string().email(),
      role: z.enum(VALID_ADMIN_ROLES),
    }).parse(req.body);

    const [target] = await db.select({ id: users.id, email: users.email, fullName: users.fullName })
      .from(users).where(eq(users.email, email));
    if (!target) return res.status(404).json({ error: "No user found with that email" });

    await db.update(users).set({ role, isAdmin: true }).where(eq(users.id, target.id));

    const [adminUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, adminId));
    await writeAuditLog(adminId, adminUser?.email ?? "", `team:invite`, "user", target.id, `Assigned role '${role}' to ${email}`);

    // Notify the user by email so they know their credentials and where to log in
    const displayName = target.fullName ?? email.split("@")[0];
    sendRoleAssignedEmail(target.email ?? email, displayName, role).catch(() => {});

    res.json({ ok: true });
  });

  // Change role of existing team member — super_admin only
  app.patch("/api/admin/team/:userId/role", isAuthenticated, requireSuperAdmin, async (req, res) => {
    const adminId = getUserId(req);
    const targetId = req.params.userId;
    const { role } = z.object({ role: z.enum(VALID_ADMIN_ROLES) }).parse(req.body);

    const [target] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, targetId));
    if (!target) return res.status(404).json({ error: "User not found" });

    await db.update(users).set({ role, isAdmin: true }).where(eq(users.id, targetId));

    const [adminUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, adminId));
    await writeAuditLog(adminId, adminUser?.email ?? "", `team:role_change`, "user", targetId, `Role changed to '${role}' for ${target.email}`);

    res.json({ ok: true });
  });

  // Revoke admin access — super_admin only
  app.delete("/api/admin/team/:userId", isAuthenticated, requireSuperAdmin, async (req, res) => {
    const adminId = getUserId(req);
    const targetId = req.params.userId;
    if (targetId === adminId) return res.status(400).json({ error: "Cannot revoke your own access" });

    const [target] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, targetId));
    if (!target) return res.status(404).json({ error: "User not found" });

    await db.update(users).set({ role: "user", isAdmin: false }).where(eq(users.id, targetId));

    const [adminUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, adminId));
    await writeAuditLog(adminId, adminUser?.email ?? "", `team:revoke`, "user", targetId, `Revoked admin access from ${target.email}`);

    res.json({ ok: true });
  });
}
