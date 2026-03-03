import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Ban, Plus, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { User, Blacklist } from "@shared/schema";

export default function BlacklistPage({ user }: { user: User }) {
  const { toast } = useToast();
  const [type, setType] = useState<"email" | "phone" | "ip">("email");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery<{ blacklist: Blacklist[] }>({
    queryKey: ["/api/admin/blacklist"],
    queryFn: async () => (await fetch("/api/admin/blacklist", { credentials: "include" })).json(),
  });

  const addMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/admin/blacklist", { type, value: value.trim(), reason: reason.trim() })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blacklist"] });
      setValue(""); setReason(""); setShowForm(false);
      toast({ title: "Added to blacklist" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/admin/blacklist/${id}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blacklist"] });
      toast({ title: "Removed from blacklist" });
    },
  });

  const entries = data?.blacklist ?? [];
  const typeColor = { email: "#3b82f6", phone: "#10b981", ip: "#f97316" };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-serif text-xl text-gold font-bold">Blacklist</h1>
          <p className="text-cream/40 text-xs mt-0.5">Block emails, phones, and IPs from banned users</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} data-testid="button-add-blacklist"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
          style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
          <Plus size={13} /> Add Entry
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <div className="flex gap-2 mb-3">
            {(["email", "phone", "ip"] as const).map(t => (
              <button key={t} onClick={() => setType(t)} data-testid={`button-type-${t}`}
                className="px-3 py-1.5 rounded-lg text-xs font-medium uppercase"
                style={{
                  background: type === t ? `${typeColor[t]}22` : "rgba(255,255,255,0.06)",
                  color: type === t ? typeColor[t] : "rgba(253,248,240,0.5)",
                }}>
                {t}
              </button>
            ))}
          </div>
          <input value={value} onChange={e => setValue(e.target.value)}
            placeholder={`Enter ${type}…`} data-testid="input-blacklist-value"
            className="w-full px-3 py-2 rounded-xl text-sm text-cream placeholder-cream/30 outline-none mb-2"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <input value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Reason (optional)…" data-testid="input-blacklist-reason"
            className="w-full px-3 py-2 rounded-xl text-sm text-cream placeholder-cream/30 outline-none mb-3"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <button onClick={() => value.trim() && addMutation.mutate()} disabled={addMutation.isPending}
            data-testid="button-submit-blacklist"
            className="w-full py-2.5 rounded-xl text-xs font-bold"
            style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444" }}>
            Add to Blacklist
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-cream/40 text-sm">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <Ban size={32} color="rgba(239,68,68,0.3)" />
          <p className="text-cream/40 text-sm">Blacklist is empty</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => (
            <div key={entry.id} data-testid={`blacklist-entry-${entry.id}`}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                style={{ background: `${typeColor[entry.type as keyof typeof typeColor] ?? "#6b7280"}22`, color: typeColor[entry.type as keyof typeof typeColor] ?? "#6b7280" }}>
                {entry.type}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-cream text-sm font-medium truncate">{entry.value}</div>
                {entry.reason && <div className="text-cream/40 text-xs truncate">{entry.reason}</div>}
                {entry.createdAt && <div className="text-cream/25 text-[10px]">{formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}</div>}
              </div>
              <button onClick={() => deleteMutation.mutate(entry.id)} data-testid={`button-remove-blacklist-${entry.id}`}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80"
                style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
