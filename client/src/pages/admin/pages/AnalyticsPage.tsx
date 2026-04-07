import { useQuery, useMutation } from "@tanstack/react-query";
import { BarChart2, Users, Heart, MessageSquare, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface AnalyticsData {
  users: {
    total: number; premium: number; verified: number; banned: number;
    male: number; female: number; sheikh: number; pir: number; murid: number;
    todaySignups: number; weekSignups: number; monthSignups: number;
  };
  engagement: { totalMatches: number; totalMessages: number; totalEvents: number };
  dailySignups: { day: string; count: number }[];
  cachedAt: string;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.14)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-cream/50 text-xs w-12 text-right">{value.toLocaleString()}</span>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-cream/70 text-sm">{label}</span>
      </div>
      <span className="text-cream text-sm font-semibold">{value.toLocaleString()}</span>
    </div>
  );
}

export default function AnalyticsPage({ user }: { user: User }) {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    queryFn: async () => (await fetch("/api/admin/analytics", { credentials: "include" })).json(),
    staleTime: 60 * 60 * 1000,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/admin/analytics/refresh")).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({ title: "Analytics refreshed" });
    },
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-cream/40 text-sm">Loading analytics…</div>;
  if (!data) return null;

  const { users: u, engagement: e, dailySignups } = data;
  const maxDaily = Math.max(...dailySignups.map(d => d.count), 1);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-serif text-xl text-gold font-bold">Analytics</h1>
          <p className="text-cream/40 text-xs mt-0.5">
            Cached · Last updated {data.cachedAt ? new Date(data.cachedAt).toLocaleTimeString() : "—"}
          </p>
        </div>
        <button onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}
          data-testid="button-refresh-analytics"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{ background: "rgba(255,215,0,0.12)", color: "#FFD700", border: "1px solid rgba(255,215,0,0.2)" }}>
          <RefreshCw size={12} className={refreshMutation.isPending ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Signups summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Today", value: u.todaySignups, color: "#10b981" },
          { label: "This Week", value: u.weekSignups, color: "#3b82f6" },
          { label: "This Month", value: u.monthSignups, color: "#8b5cf6" },
        ].map(item => (
          <div key={item.label} className="rounded-xl p-4 text-center"
            style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value.toLocaleString()}</div>
            <div className="text-cream/50 text-xs mt-1">Signups {item.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* User breakdown */}
        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,215,0,0.1)" }}>
          <h3 className="text-cream text-sm font-semibold mb-3 flex items-center gap-2"><Users size={14} color="#3b82f6" /> Users</h3>
          <StatRow label="Total" value={u.total} color="#3b82f6" />
          <StatRow label="Premium" value={u.premium} color="#FFD700" />
          <StatRow label="Verified" value={u.verified} color="#10b981" />
          <StatRow label="Banned" value={u.banned} color="#ef4444" />
        </div>

        {/* Engagement */}
        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,215,0,0.1)" }}>
          <h3 className="text-cream text-sm font-semibold mb-3 flex items-center gap-2"><Heart size={14} color="#FFD700" /> Engagement</h3>
          <StatRow label="Total Matches" value={e.totalMatches} color="#FFD700" />
          <StatRow label="Total Messages" value={e.totalMessages} color="#06b6d4" />
          <StatRow label="Total Events" value={e.totalEvents} color="#f97316" />
          <StatRow label="Match Rate" value={u.total > 0 ? Math.round((e.totalMatches / u.total) * 100) : 0} color="#8b5cf6" />
        </div>

        {/* Gender ratio */}
        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,215,0,0.1)" }}>
          <h3 className="text-cream text-sm font-semibold mb-3">Gender Ratio</h3>
          <div className="mb-2">
            <div className="flex justify-between text-xs text-cream/50 mb-1"><span>Male</span><span>{u.male.toLocaleString()}</span></div>
            <Bar value={u.male} max={u.total} color="#3b82f6" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-cream/50 mb-1"><span>Female</span><span>{u.female.toLocaleString()}</span></div>
            <Bar value={u.female} max={u.total} color="#FFD700" />
          </div>
        </div>

        {/* Caste breakdown */}
        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,215,0,0.1)" }}>
          <h3 className="text-cream text-sm font-semibold mb-3">Caste Breakdown</h3>
          {[
            { label: "Sheikh", value: u.sheikh, color: "#FFD700" },
            { label: "Pir", value: u.pir, color: "#8b5cf6" },
            { label: "Mirid", value: u.murid, color: "#10b981" },
          ].map(item => (
            <div key={item.label} className="mb-2">
              <div className="flex justify-between text-xs text-cream/50 mb-1"><span>{item.label}</span><span>{item.value.toLocaleString()}</span></div>
              <Bar value={item.value} max={u.total} color={item.color} />
            </div>
          ))}
        </div>
      </div>

      {/* Daily signups chart */}
      {dailySignups.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,215,0,0.1)" }}>
          <h3 className="text-cream text-sm font-semibold mb-4">Daily Signups (Last 30 Days)</h3>
          <div className="flex items-end gap-1 h-24">
            {dailySignups.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${d.day}: ${d.count}`}>
                <div className="w-full rounded-t"
                  style={{ height: `${Math.max(4, Math.round((d.count / maxDaily) * 80))}px`, background: "rgba(255,215,0,0.6)" }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-cream/30 mt-2">
            <span>{dailySignups[0]?.day?.split("T")[0]}</span>
            <span>{dailySignups[dailySignups.length - 1]?.day?.split("T")[0]}</span>
          </div>
        </div>
      )}
    </div>
  );
}
