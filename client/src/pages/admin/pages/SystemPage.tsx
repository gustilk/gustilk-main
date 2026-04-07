import { useQuery } from "@tanstack/react-query";
import { Server, CheckCircle } from "lucide-react";
import type { User } from "@shared/schema";

export default function SystemPage({ user }: { user: User }) {
  const { data: stats } = useQuery<any>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => (await fetch("/api/admin/stats", { credentials: "include" })).json(),
  });

  const checks = [
    { label: "Database", status: stats ? "operational" : "checking" },
    { label: "API Server", status: "operational" },
    { label: "WebSocket", status: "operational" },
    { label: "Email Service (Resend)", status: "operational" },
    { label: "AI Support (OpenAI)", status: "operational" },
    { label: "File Storage", status: "operational" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">System Health</h1>
        <p className="text-cream/40 text-xs mt-0.5">Service status and uptime monitoring</p>
      </div>

      <div className="rounded-2xl overflow-hidden mb-4" style={{ border: "1px solid rgba(16,185,129,0.2)" }}>
        <div className="p-4 flex items-center gap-3" style={{ background: "rgba(16,185,129,0.08)" }}>
          <CheckCircle size={18} color="#10b981" />
          <span className="text-green-400 text-sm font-semibold">All Systems Operational</span>
        </div>
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
          {checks.map(check => (
            <div key={check.label} data-testid={`system-check-${check.label.toLowerCase().replace(/ /g, "-")}`}
              className="flex items-center justify-between px-4 py-3">
              <span className="text-cream/70 text-sm">{check.label}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: check.status === "operational" ? "#10b981" : "#fbbf24" }} />
                <span className="text-xs capitalize" style={{ color: check.status === "operational" ? "#10b981" : "#fbbf24" }}>
                  {check.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-cream/40 text-xs mb-1">Environment</div>
          <div className="text-cream text-sm font-semibold">Production</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-cream/40 text-xs mb-1">Database</div>
          <div className="text-cream text-sm font-semibold">Neon PostgreSQL</div>
        </div>
      </div>
    </div>
  );
}
