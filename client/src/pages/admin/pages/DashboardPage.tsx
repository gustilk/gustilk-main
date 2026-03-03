import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Users, Crown, Shield, Ban, Heart, MessageSquare, Calendar, TrendingUp, UserCheck, Flag, Clock } from "lucide-react";
import type { User } from "@shared/schema";

interface Stats {
  totalUsers: number; premiumUsers: number; verifiedUsers: number;
  bannedUsers: number; totalMatches: number; totalMessages: number;
  totalEvents: number; newThisWeek: number;
}

function StatCard({ icon: Icon, label, value, color, sub, onClick }: {
  icon: any; label: string; value?: number; color: string; sub?: string; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} data-testid={`stat-card-${label.toLowerCase().replace(/ /g, "-")}`}
      className={`rounded-2xl p-4 flex flex-col gap-2 ${onClick ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}22` }}>
          <Icon size={18} color={color} />
        </div>
        <span className="text-2xl font-bold text-cream">{value?.toLocaleString() ?? "—"}</span>
      </div>
      <div>
        <div className="text-cream/70 text-sm font-medium">{label}</div>
        {sub && <div className="text-cream/30 text-xs mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function DashboardPage({ user }: { user: User }) {
  const [, setLocation] = useLocation();

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => (await fetch("/api/admin/stats", { credentials: "include" })).json(),
  });

  const { data: verifyData } = useQuery<{ users: any[] }>({
    queryKey: ["/api/admin/verifications"],
    queryFn: async () => (await fetch("/api/admin/verifications", { credentials: "include" })).json(),
  });

  const { data: reportsData } = useQuery<{ reports: any[] }>({
    queryKey: ["/api/admin/reports"],
    queryFn: async () => (await fetch("/api/admin/reports", { credentials: "include" })).json(),
  });

  const pendingVerifications = verifyData?.users?.length ?? 0;
  const openReports = reportsData?.reports?.filter((r: any) => r.status !== "resolved").length ?? 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-gold font-bold">Dashboard</h1>
        <p className="text-cream/50 text-sm mt-1">Community overview and key metrics</p>
      </div>

      {/* Alerts */}
      {(pendingVerifications > 0 || openReports > 0) && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pendingVerifications > 0 && (
            <button onClick={() => setLocation("/admin/approvals")} data-testid="alert-pending-verifications"
              className="flex items-center gap-3 p-3 rounded-xl text-left w-full"
              style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}>
              <Clock size={18} color="#fbbf24" />
              <div>
                <div className="text-yellow-400 text-sm font-semibold">{pendingVerifications} Pending Approvals</div>
                <div className="text-cream/50 text-xs">Tap to review</div>
              </div>
            </button>
          )}
          {openReports > 0 && (
            <button onClick={() => setLocation("/admin/reports")} data-testid="alert-open-reports"
              className="flex items-center gap-3 p-3 rounded-xl text-left w-full"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <Flag size={18} color="#ef4444" />
              <div>
                <div className="text-red-400 text-sm font-semibold">{openReports} Open Reports</div>
                <div className="text-cream/50 text-xs">Tap to review</div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="Total Users" value={stats?.totalUsers} color="#3b82f6" onClick={() => setLocation("/admin/users")} />
        <StatCard icon={TrendingUp} label="New This Week" value={stats?.newThisWeek} color="#10b981" sub="Last 7 days" />
        <StatCard icon={Crown} label="Premium" value={stats?.premiumUsers} color="#c9a84c" onClick={() => setLocation("/admin/payments")} />
        <StatCard icon={Shield} label="Verified" value={stats?.verifiedUsers} color="#8b5cf6" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Ban} label="Banned" value={stats?.bannedUsers} color="#ef4444" />
        <StatCard icon={Heart} label="Matches" value={stats?.totalMatches} color="#d4608a" />
        <StatCard icon={MessageSquare} label="Messages" value={stats?.totalMessages} color="#06b6d4" />
        <StatCard icon={Calendar} label="Events" value={stats?.totalEvents} color="#f97316" onClick={() => setLocation("/admin/events")} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Review Approvals", sub: `${pendingVerifications} pending`, path: "/admin/approvals", color: "#fbbf24", icon: UserCheck },
          { label: "Handle Reports", sub: `${openReports} open`, path: "/admin/reports", color: "#ef4444", icon: Flag },
          { label: "View Analytics", sub: "Charts & trends", path: "/admin/analytics", color: "#3b82f6", icon: TrendingUp },
        ].map(item => (
          <button key={item.path} onClick={() => setLocation(item.path)} data-testid={`quick-action-${item.label.toLowerCase().replace(/ /g, "-")}`}
            className="flex items-center gap-3 p-4 rounded-2xl text-left w-full hover:opacity-90 transition-opacity"
            style={{ background: `${item.color}11`, border: `1px solid ${item.color}33` }}>
            <item.icon size={20} color={item.color} />
            <div>
              <div className="text-cream text-sm font-semibold">{item.label}</div>
              <div className="text-cream/40 text-xs">{item.sub}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
