import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings, Save } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

export default function AppSettingsPage({ user }: { user: User }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery<{ settings: Record<string, string> }>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => (await fetch("/api/admin/settings", { credentials: "include" })).json(),
  });

  useEffect(() => {
    if (data?.settings) { setSettings(data.settings); setDirty(false); }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => (await apiRequest("PUT", "/api/admin/settings", settings)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      setDirty(false);
      toast({ title: "Settings saved" });
    },
  });

  const set = (key: string, val: string) => {
    setSettings(s => ({ ...s, [key]: val }));
    setDirty(true);
  };

  const FieldRow = ({ label, k, type = "text", hint }: { label: string; k: string; type?: string; hint?: string }) => (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div>
        <div className="text-cream text-sm">{label}</div>
        {hint && <div className="text-cream/40 text-xs">{hint}</div>}
      </div>
      {type === "toggle" ? (
        <button onClick={() => set(k, settings[k] === "true" ? "false" : "true")}
          data-testid={`toggle-setting-${k}`}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{
            background: settings[k] === "true" ? "rgba(16,185,129,0.15)" : "rgba(107,114,128,0.15)",
            color: settings[k] === "true" ? "#10b981" : "#6b7280",
          }}>
          {settings[k] === "true" ? "ON" : "OFF"}
        </button>
      ) : (
        <input type={type} value={settings[k] ?? ""} onChange={e => set(k, e.target.value)}
          data-testid={`input-setting-${k}`}
          className="px-3 py-1.5 rounded-lg text-sm text-cream outline-none text-right"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", width: "120px" }} />
      )}
    </div>
  );

  if (isLoading) return <div className="flex items-center justify-center h-32 text-cream/40 text-sm">Loading…</div>;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-serif text-xl text-gold font-bold">App Settings</h1>
          <p className="text-cream/40 text-xs mt-0.5">Global configuration for Gûstîlk</p>
        </div>
        {dirty && (
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
            data-testid="button-save-settings"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(200,0,14,0.2)", color: "#c8000e", border: "1px solid rgba(200,0,14,0.3)" }}>
            <Save size={12} /> Save Changes
          </button>
        )}
      </div>

      {/* Sections */}
      {[
        {
          title: "Age Policy",
          fields: [
            { label: "Minimum Age", k: "minAge", type: "number", hint: "Default: 18" },
            { label: "Maximum Age", k: "maxAge", type: "number", hint: "Default: 80" },
          ],
        },
        {
          title: "Maintenance",
          fields: [
            { label: "Maintenance Mode", k: "maintenanceMode", type: "toggle", hint: "Hides app for regular users" },
          ],
        },
        {
          title: "Caste Access",
          fields: [
            { label: "Allow Sheikh", k: "allowSheikh", type: "toggle" },
            { label: "Allow Pir", k: "allowPir", type: "toggle" },
            { label: "Allow Mirid", k: "allowMurid", type: "toggle" },
          ],
        },
        {
          title: "Pricing",
          fields: [
            { label: "Monthly Premium Price (USD)", k: "premiumMonthlyPrice", type: "number", hint: "Default: $9.99" },
            { label: "Yearly Premium Price (USD)", k: "premiumYearlyPrice", type: "number", hint: "Default: $79.99" },
          ],
        },
      ].map(section => (
        <div key={section.title} className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,0,14,0.1)" }}>
          <h3 className="text-cream/60 text-xs font-bold uppercase tracking-wide mb-2">{section.title}</h3>
          {section.fields.map(f => (
            <FieldRow key={f.k} label={f.label} k={f.k} type={f.type as any} hint={f.hint} />
          ))}
        </div>
      ))}

      {/* Community Guidelines */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,0,14,0.1)" }}>
        <h3 className="text-cream/60 text-xs font-bold uppercase tracking-wide mb-3">Community Guidelines</h3>
        <textarea value={settings.guidelines ?? ""} onChange={e => set("guidelines", e.target.value)}
          rows={5} data-testid="textarea-guidelines"
          className="w-full px-3 py-2 rounded-xl text-sm text-cream placeholder-cream/30 outline-none resize-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
      </div>

      {dirty && (
        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
          data-testid="button-save-settings-bottom"
          className="w-full py-3 rounded-xl text-sm font-bold"
          style={{ background: "rgba(200,0,14,0.2)", color: "#c8000e", border: "1px solid rgba(200,0,14,0.3)" }}>
          <Save size={14} className="inline mr-2" /> Save All Changes
        </button>
      )}
    </div>
  );
}
