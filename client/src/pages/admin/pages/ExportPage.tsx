import { Download, Users, Heart, Flag } from "lucide-react";
import type { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const EXPORTS = [
  { type: "users", label: "User Data", description: "All user profiles, status, and metadata", icon: Users, color: "#3b82f6" },
  { type: "matches", label: "Match Data", description: "All matches between users", icon: Heart, color: "#d4608a" },
  { type: "reports", label: "Report Data", description: "All flagged content and user reports", icon: Flag, color: "#ef4444" },
];

export default function ExportPage({ user }: { user: User }) {
  const { toast } = useToast();

  const handleExport = async (type: string) => {
    const res = await fetch(`/api/admin/export/${type}`, { credentials: "include" });
    if (!res.ok) {
      toast({ title: "Export failed", description: "Could not export data. Please try again.", variant: "destructive" });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">Data Export</h1>
        <p className="text-cream/40 text-xs mt-0.5">Download CSV reports for analysis</p>
      </div>

      <div className="space-y-3">
        {EXPORTS.map(exp => (
          <div key={exp.type} data-testid={`export-card-${exp.type}`}
            className="flex items-center gap-4 p-4 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${exp.color}18` }}>
              <exp.icon size={18} color={exp.color} />
            </div>
            <div className="flex-1">
              <div className="text-cream text-sm font-semibold">{exp.label}</div>
              <div className="text-cream/40 text-xs">{exp.description}</div>
            </div>
            <button onClick={() => handleExport(exp.type)} data-testid={`button-export-${exp.type}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: `${exp.color}18`, color: exp.color, border: `1px solid ${exp.color}33` }}>
              <Download size={12} /> Export
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-2xl text-cream/40 text-xs" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        All exports are in CSV format. Exports are logged in the audit trail. Handle exported data according to your privacy policy and GDPR obligations.
      </div>
    </div>
  );
}
