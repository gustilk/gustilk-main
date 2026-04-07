import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { User, PromoCode } from "@shared/schema";

export default function PromoCodesPage({ user }: { user: User }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", description: "", discountPercent: 100, maxUses: 0, expiresAt: "" });

  const { data, isLoading } = useQuery<{ codes: PromoCode[] }>({
    queryKey: ["/api/admin/promo-codes"],
    queryFn: async () => (await fetch("/api/admin/promo-codes", { credentials: "include" })).json(),
  });

  const createMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/admin/promo-codes", {
      ...form,
      code: form.code.toUpperCase(),
      discountPercent: Number(form.discountPercent),
      maxUses: Number(form.maxUses),
      expiresAt: form.expiresAt || undefined,
    })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      setForm({ code: "", description: "", discountPercent: 100, maxUses: 0, expiresAt: "" });
      setShowForm(false);
      toast({ title: "Promo code created" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      (await apiRequest("PATCH", `/api/admin/promo-codes/${id}`, { active })).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/admin/promo-codes/${id}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      toast({ title: "Promo code deleted" });
    },
  });

  const codes = data?.codes ?? [];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-serif text-xl text-gold font-bold">Promo Codes</h1>
          <p className="text-cream/40 text-xs mt-0.5">Grant free or discounted premium access</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} data-testid="button-create-promo"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
          style={{ background: "rgba(200,0,14,0.15)", color: "#c8000e", border: "1px solid rgba(200,0,14,0.25)" }}>
          <Plus size={13} /> Create Code
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,0,14,0.2)" }}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-cream/50 text-xs mb-1 block">Code</label>
              <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="WELCOME50" data-testid="input-promo-code"
                className="w-full px-3 py-2 rounded-xl text-sm text-cream placeholder-cream/30 outline-none uppercase"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
            <div>
              <label className="text-cream/50 text-xs mb-1 block">Discount %</label>
              <input type="number" min={1} max={100} value={form.discountPercent}
                onChange={e => setForm(f => ({ ...f, discountPercent: Number(e.target.value) }))}
                data-testid="input-promo-discount"
                className="w-full px-3 py-2 rounded-xl text-sm text-cream outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
          </div>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description…" data-testid="input-promo-description"
            className="w-full px-3 py-2 rounded-xl text-sm text-cream placeholder-cream/30 outline-none mb-3"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-cream/50 text-xs mb-1 block">Max Uses (0 = unlimited)</label>
              <input type="number" min={0} value={form.maxUses}
                onChange={e => setForm(f => ({ ...f, maxUses: Number(e.target.value) }))}
                data-testid="input-promo-max-uses"
                className="w-full px-3 py-2 rounded-xl text-sm text-cream outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
            <div>
              <label className="text-cream/50 text-xs mb-1 block">Expires At (optional)</label>
              <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                data-testid="input-promo-expires"
                className="w-full px-3 py-2 rounded-xl text-sm text-cream outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
          </div>
          <button onClick={() => form.code.trim() && createMutation.mutate()} disabled={createMutation.isPending}
            data-testid="button-submit-promo"
            className="w-full py-2.5 rounded-xl text-xs font-bold"
            style={{ background: "rgba(200,0,14,0.2)", color: "#c8000e" }}>
            Create Promo Code
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-cream/40 text-sm">Loading…</div>
      ) : codes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <Tag size={32} color="rgba(200,0,14,0.3)" />
          <p className="text-cream/40 text-sm">No promo codes yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {codes.map(code => (
            <div key={code.id} data-testid={`promo-code-${code.id}`}
              className="flex items-center gap-3 p-3.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", opacity: code.active ? 1 : 0.5 }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-cream font-bold font-mono text-sm">{code.code}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: "rgba(200,0,14,0.15)", color: "#c8000e" }}>
                    {code.discountPercent}% off
                  </span>
                  {!code.active && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: "rgba(107,114,128,0.2)", color: "#6b7280" }}>Inactive</span>
                  )}
                </div>
                {code.description && <div className="text-cream/50 text-xs mt-0.5">{code.description}</div>}
                <div className="text-cream/30 text-[10px] mt-0.5">
                  Used {code.usedCount ?? 0}{code.maxUses ? `/${code.maxUses}` : ""} times
                  {code.expiresAt && ` · Expires ${format(new Date(code.expiresAt), "PP")}`}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => toggleMutation.mutate({ id: code.id, active: !code.active })}
                  data-testid={`button-toggle-promo-${code.id}`}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.06)", color: code.active ? "#10b981" : "#6b7280" }}>
                  {code.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                </button>
                <button onClick={() => { if (confirm("Delete this promo code?")) deleteMutation.mutate(code.id); }}
                  data-testid={`button-delete-promo-${code.id}`}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
