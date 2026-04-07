import { Database } from "lucide-react";
import type { User } from "@shared/schema";

export default function BackupsPage({ user }: { user: User }) {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">Database Backups</h1>
        <p className="text-cream/40 text-xs mt-0.5">Backup status and restore options</p>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(16,185,129,0.15)" }}>
        <div className="flex items-center gap-3 mb-3">
          <Database size={18} color="#10b981" />
          <span className="text-green-400 text-sm font-semibold">Neon Automatic Backups</span>
        </div>
        <p className="text-cream/50 text-sm">
          Your database is hosted on Neon PostgreSQL, which provides automatic continuous backups with point-in-time recovery.
        </p>
        <div className="mt-3 space-y-2">
          {[
            { label: "Backup Frequency", value: "Continuous" },
            { label: "Retention Period", value: "7 days" },
            { label: "Recovery Type", value: "Point-in-time" },
            { label: "Backup Status", value: "Active" },
          ].map(item => (
            <div key={item.label} className="flex justify-between text-xs py-1.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
              <span className="text-cream/50">{item.label}</span>
              <span className="text-cream font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-2xl text-cream/40 text-xs" style={{ background: "rgba(255,255,255,0.02)" }}>
        To restore to a specific point in time, contact Neon support or use the Neon dashboard. Manual backup triggers are not available through the app.
      </div>
    </div>
  );
}
