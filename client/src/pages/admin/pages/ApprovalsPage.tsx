import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, XCircle, Ban, Eye, X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
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

interface LightboxState {
  slots: PhotoSlot[];
  index: number;
  userName: string;
}

function PhotoLightbox({ state, onClose }: { state: LightboxState; onClose: () => void }) {
  const [idx, setIdx] = useState(state.index);
  const slot = state.slots[idx];
  const total = state.slots.length;

  function prev() { setIdx(i => (i - 1 + total) % total); }
  function next() { setIdx(i => (i + 1) % total); }

  const statusColor: Record<string, string> = {
    pending:  "#f59e0b",
    approved: "#10b981",
    rejected: "#ef4444",
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={onClose}
      data-testid="lightbox-backdrop"
    >
      <div
        className="relative flex flex-col items-center"
        style={{ maxWidth: "90vw", maxHeight: "90vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          data-testid="button-lightbox-close"
          className="absolute -top-10 right-0 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <X size={16} />
        </button>

        {/* Counter + name */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-white/60 text-sm font-medium">{state.userName}</span>
          <span className="text-white/30 text-xs">·</span>
          <span className="text-white/40 text-xs">Photo {idx + 1} of {total}</span>
          {slot?.status && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
              style={{
                background: `${statusColor[slot.status] ?? "#888"}22`,
                color: statusColor[slot.status] ?? "#888",
                border: `1px solid ${statusColor[slot.status] ?? "#888"}44`,
              }}
            >
              {slot.status === "pending" ? "⚠ Pending" : slot.status}
            </span>
          )}
        </div>

        {/* Main image */}
        <div className="relative rounded-2xl overflow-hidden" style={{ maxWidth: "80vw", maxHeight: "70vh" }}>
          <img
            src={slot?.url}
            alt={`Photo ${idx + 1}`}
            className="block object-contain rounded-2xl"
            style={{ maxWidth: "80vw", maxHeight: "70vh", minWidth: 200, minHeight: 200 }}
            data-testid="lightbox-image"
          />
          {slot?.status === "pending" && (
            <div
              className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold"
              style={{ background: "rgba(245,158,11,0.9)", color: "#fff" }}
            >
              Needs Review
            </div>
          )}
          {slot?.reason && (
            <div
              className="absolute bottom-0 left-0 right-0 px-3 py-2 text-[11px] text-white/80"
              style={{ background: "rgba(239,68,68,0.85)" }}
            >
              Rejected: {slot.reason}
            </div>
          )}
        </div>

        {/* Navigation */}
        {total > 1 && (
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={prev}
              data-testid="button-lightbox-prev"
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <ChevronLeft size={18} />
            </button>

            {/* Dot indicators */}
            <div className="flex gap-2">
              {state.slots.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  data-testid={`button-lightbox-dot-${i}`}
                  className="transition-all"
                  style={{
                    width: i === idx ? 20 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: i === idx
                      ? (statusColor[s.status ?? ""] ?? "#c9a84c")
                      : "rgba(255,255,255,0.2)",
                  }}
                />
              ))}
            </div>

            <button
              onClick={next}
              data-testid="button-lightbox-next"
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Thumbnail strip */}
        {total > 1 && (
          <div className="flex gap-2 mt-3">
            {state.slots.map((s, i) => s.url ? (
              <button
                key={i}
                onClick={() => setIdx(i)}
                data-testid={`button-lightbox-thumb-${i}`}
                className="relative flex-shrink-0 rounded-lg overflow-hidden transition-all"
                style={{
                  width: 52,
                  height: 52,
                  outline: i === idx ? `2px solid ${statusColor[s.status ?? ""] ?? "#c9a84c"}` : "2px solid transparent",
                  outlineOffset: 2,
                  opacity: i === idx ? 1 : 0.5,
                }}
              >
                <img src={s.url} alt="" className="w-full h-full object-cover" />
                {s.status === "pending" && (
                  <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-yellow-500" />
                )}
              </button>
            ) : null)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApprovalsPage({ user: adminUser }: { user: User }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

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
      {lightbox && (
        <PhotoLightbox state={lightbox} onClose={() => setLightbox(null)} />
      )}

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
            const pendingCount = slots.filter(s => s.status === "pending").length;

            return (
              <div key={u.id} data-testid={`approval-card-${u.id}`}
                className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}>

                {/* Header */}
                <div className="flex items-center gap-3 p-4 pb-3">
                  <div
                    className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-lg font-bold text-gold cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)" }}
                    onClick={() => slots.length > 0 && setLightbox({ slots, index: 0, userName: u.fullName ?? u.firstName ?? "Member" })}
                  >
                    {u.photos && u.photos.length > 0
                      ? <img src={u.photos[0]} alt="" className="w-full h-full object-cover" />
                      : (u.fullName ?? "M").charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-cream text-sm">{u.fullName ?? u.firstName ?? "Member"}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}>{casteLabel}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(212,96,138,0.12)", color: "#d4608a" }}>{u.gender}</span>
                      {pendingCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                          {pendingCount} photo{pendingCount > 1 ? "s" : ""} pending
                        </span>
                      )}
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
                        <button
                          key={i}
                          data-testid={`button-photo-thumb-${u.id}-${i}`}
                          className="relative group rounded-xl overflow-hidden flex-shrink-0 focus:outline-none"
                          style={{ width: 80, height: 80 }}
                          onClick={() => setLightbox({ slots, index: i, userName: u.fullName ?? u.firstName ?? "Member" })}
                        >
                          <img src={slot.url} alt="" className="w-full h-full object-cover" />

                          {/* Hover overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: "rgba(0,0,0,0.5)" }}>
                            <ZoomIn size={18} color="white" />
                          </div>

                          {/* Status badge */}
                          {slot.status === "pending" && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-[9px] font-bold text-white shadow">!</div>
                          )}
                          {slot.status === "approved" && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                              <CheckCircle size={11} color="white" />
                            </div>
                          )}
                          {slot.status === "rejected" && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow">
                              <XCircle size={11} color="white" />
                            </div>
                          )}
                        </button>
                      ) : null)}
                    </div>
                    <p className="text-cream/30 text-[10px] mt-1.5 flex items-center gap-1">
                      <ZoomIn size={10} /> Click any photo to view full size
                    </p>
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
