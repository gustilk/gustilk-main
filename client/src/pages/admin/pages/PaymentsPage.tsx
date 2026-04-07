import { useQuery } from "@tanstack/react-query";
import { CreditCard, Crown, TrendingUp } from "lucide-react";
import type { User } from "@shared/schema";

interface Stats {
  totalUsers: number; premiumUsers: number;
}

export default function PaymentsPage({ user }: { user: User }) {
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => (await fetch("/api/admin/stats", { credentials: "include" })).json(),
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">Payments & Revenue</h1>
        <p className="text-cream/40 text-xs mt-0.5">Subscription and revenue overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {[
          { label: "Active Subscribers", value: stats?.premiumUsers ?? 0, icon: Crown, color: "#F4C430" },
          { label: "Subscription Rate", value: stats ? `${Math.round((stats.premiumUsers / Math.max(stats.totalUsers, 1)) * 100)}%` : "—", icon: TrendingUp, color: "#10b981" },
          { label: "Total Users", value: stats?.totalUsers ?? 0, icon: CreditCard, color: "#3b82f6" },
        ].map(item => (
          <div key={item.label} className="rounded-2xl p-4" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${item.color}18` }}>
                <item.icon size={15} color={item.color} />
              </div>
            </div>
            <div className="text-cream text-xl font-bold">{typeof item.value === "number" ? item.value.toLocaleString() : item.value}</div>
            <div className="text-cream/50 text-xs mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(0,0,0,0.04)", border: "1px dashed rgba(244,196,48,0.2)" }}>
        <CreditCard size={32} color="rgba(244,196,48,0.4)" className="mx-auto mb-3" />
        <div className="text-cream/50 text-sm font-medium">Payment Processor Not Connected</div>
        <div className="text-cream/30 text-xs mt-1">
          Connect Stripe to see real-time revenue, transaction history, and refund management.
        </div>
      </div>
    </div>
  );
}
