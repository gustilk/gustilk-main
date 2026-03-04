import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, XCircle, Ban, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { User } from "@shared/schema";
import type { PhotoSlot } from "@shared/schema";

const REJECT_REASONS = [
  "Inappropriate photos",
  "Fake profile",
  "Underage",
  "Incomplete profile",
  "Duplicate account",
  "Violates community guidelines",
];

export default function ApprovalsPage({ user: adminUser }: { user: User }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery<{ users: User[] }>({
    queryKey: ["/api/admin/verifications"],
    queryFn: async () => (await fetch("/api/admin/verifications", { credentials: "include" })).json(),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ userId, action, reason }: { userId: string; action: "approve" | "reject" | "ban"; reason?: string }) =>
      (await apiRequest("POST", `/api/admin/verify/${userId}`, { action, reason })).json(),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: action === "approve" ? "✓ Approved" : action === "reject" ? "Rejected" : "Banned" });
    },
  });

  const users = data?.users ?? [];

  if (isLoading) return <div className="flex items-center justify-center h-64 text-cream/40 text-sm">Loading…</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">Approval Queue</h1>
        <p className="text-cream/40 text-xs mt-0.5">{users.length} pending approval{users.length !== 1 ? "s" : ""}</p>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <CheckCircle size={40} color="rgba(16,185,129,0.4)" />
          <p className="text-cream/40 text-sm">All caught up — no pending approvals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map(u => {
            const slots = ((u as any).photoSlots as PhotoSlot[] | null) ?? [];
            const casteLabel = ({ sheikh: "Sheikh", pir: "Pir", murid: "Mirid" }[u.caste ?? ""] ?? u.caste ?? "");
            const timeAgo = u.createdAt ? formatDistanceToNow(new Date(u.createdAt), { addSuffix: true }) : "";

            return (
              <div key={u.id} data-testid={`approval-card-${u.id}`}
                className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}>
                {/* Header */}
                <div className="flex items-center gap-3 p-4 pb-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-lg font-bold text-gold"
                    style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)" }}>
                    {u.photos && u.photos.length > 0
                      ? <img src={u.photos[0]} alt="" className="w-full h-full object-cover" />
                      : (u.fullName ?? "M").charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-cream text-sm">{u.fullName ?? u.firstName ?? "Member"}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}>{casteLabel}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(212,96,138,0.12)", color: "#d4608a" }}>{u.gender}</span>
                    </div>
                    <p className="text-cream/40 text-xs mt-0.5">{u.city}, {u.country} · {u.age} yrs · Registered {timeAgo}</p>
                    {u.occupation && <p className="text-cream/30 text-xs">{u.occupation}</p>}
                  </div>
                  <button onClick={() => setLocation(`/admin/users/${u.id}`)} data-testid={`button-view-approval-${u.id}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold"
                    style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.2)" }}>
                    <Eye size={11} /> View
                  </button>
                </div>

                {/* Bio */}
                {u.bio && (
                  <div className="px-4 pb-3 text-cream/50 text-xs">{u.bio}</div>
                )}

                {/* Photos */}
                {slots.length > 0 && (
                  <div className="px-4 pb-3">
                    <div className="flex gap-2 flex-wrap">
                      {slots.map((slot, i) => slot.url ? (
                        <div key={i} className="relative">
                          <img src={slot.url} alt="" className="w-20 h-20 rounded-xl object-cover" />
                          {slot.status === "pending" && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-[8px] font-bold text-white">!</div>
                          )}
                        </div>
                      ) : null)}
                    </div>
                  </div>
                )}

                {/* Rejection reason */}
                <div className="px-4 pb-3">
                  <select value={reasons[u.id] ?? ""} onChange={e => setReasons(r => ({ ...r, [u.id]: e.target.value }))}
                    data-testid={`select-reject-reason-${u.id}`}
                    className="w-full px-3 py-2 rounded-xl text-xs text-cream/70 outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <option value="">Select rejection reason (optional)…</option>
                    {REJECT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 px-4 pb-4">
                  <button onClick={() => actionMutation.mutate({ userId: u.id, action: "approve" })}
                    disabled={actionMutation.isPending}
                    data-testid={`button-approve-${u.id}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
                    <CheckCircle size={13} /> Approve
                  </button>
                  <button onClick={() => actionMutation.mutate({ userId: u.id, action: "reject", reason: reasons[u.id] })}
                    disabled={actionMutation.isPending}
                    data-testid={`button-reject-${u.id}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                    <XCircle size={13} /> Reject
                  </button>
                  <button onClick={() => { if (confirm("Ban this user?")) actionMutation.mutate({ userId: u.id, action: "ban", reason: reasons[u.id] }); }}
                    disabled={actionMutation.isPending}
                    data-testid={`button-ban-${u.id}`}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(239,68,68,0.06)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <Ban size={13} /> Ban
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
