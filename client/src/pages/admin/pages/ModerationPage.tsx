import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, X, ChevronDown, AlertCircle, ZoomIn, CheckCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import type { PhotoSlot } from "@shared/schema";
import ConfirmDialog from "../components/ConfirmDialog";

const PRESET_REASONS = [
  "Photo does not clearly show your face",
  "Photo is blurry or low quality",
  "Photo contains inappropriate content",
  "Photo contains nudity or explicit content",
  "Photo contains offensive or hateful content",
  "Photo is not a real photo of you",
] as const;

interface RejectTarget {
  userId: string;
  slotIdx: number;
  userName: string;
}

interface LightboxState {
  url: string;
  slotIdx: number;
  userId: string;
  userName: string;
  userEmail: string;
  isNew: boolean;
}

export default function ModerationPage({ user }: { user: User }) {
  const { toast } = useToast();

  const [approvePending, setApprovePending] = useState<null | { userId: string; slotIdx: number; userName: string }>(null);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  const { data, isLoading } = useQuery<{ users: User[] }>({
    queryKey: ["/api/admin/pending-photos"],
    queryFn: async () => (await fetch("/api/admin/pending-photos", { credentials: "include" })).json(),
  });

  const photoMutation = useMutation({
    mutationFn: async ({ userId, slotIdx, action, reason }: { userId: string; slotIdx: number; action: "approve" | "reject"; reason?: string }) =>
      (await apiRequest("POST", `/api/admin/photos/${userId}/${action}/${slotIdx}`, reason ? { reason } : undefined)).json(),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-photos"] });
      toast({ title: action === "approve" ? "Photo approved" : "Photo rejected" });
      setApprovePending(null);
      setLightbox(null);
      closeRejectPanel();
    },
  });

  function openRejectPanel(userId: string, slotIdx: number, userName: string) {
    setRejectTarget({ userId, slotIdx, userName });
    setSelectedReason("");
    setCustomReason("");
  }

  function closeRejectPanel() {
    setRejectTarget(null);
    setSelectedReason("");
    setCustomReason("");
  }

  function confirmReject() {
    if (!rejectTarget) return;
    const reason = selectedReason === "custom" ? customReason.trim() : selectedReason;
    if (!reason) return;
    photoMutation.mutate({ userId: rejectTarget.userId, slotIdx: rejectTarget.slotIdx, action: "reject", reason });
  }

  const closeLightbox = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeLightbox(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, closeLightbox]);

  const effectiveReason = selectedReason === "custom" ? customReason.trim() : selectedReason;
  const canSubmitReject = effectiveReason.length > 0;

  const users = data?.users ?? [];
  const pendingUsers = users.filter(u => {
    const slots = ((u as any).photoSlots as PhotoSlot[] | null) ?? [];
    return slots.some(s => s.status === "pending");
  });

  return (
    <>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="mb-5">
          <h1 className="font-serif text-xl text-gold font-bold">Photo Approvals</h1>
          <p className="text-cream/40 text-xs mt-0.5">{pendingUsers.length} user{pendingUsers.length !== 1 ? "s" : ""} with pending photos</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-cream/40 text-sm">Loading…</div>
        ) : pendingUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <CheckCircle size={36} color="rgba(16,185,129,0.4)" />
            <p className="text-cream/40 text-sm">No photos pending review</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map(u => {
              const slots = ((u as any).photoSlots as PhotoSlot[] | null) ?? [];
              const pendingSlots = slots.filter(s => s.status === "pending");
              const name = u.fullName ?? u.firstName ?? "this user";
              const isBeingRejected = rejectTarget?.userId === u.id;
              const isNew = (u as any).verificationStatus === "approved";

              return (
                <div key={u.id} data-testid={`moderation-card-${u.id}`}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.10)", border: isBeingRejected ? "1px solid rgba(239,68,68,0.35)" : "1px solid rgba(255,215,0,0.12)" }}>

                  {/* User header */}
                  <div className="flex items-center gap-3 p-4 pb-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-gold flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #2d0f4a, #A0000A)" }}>
                      {(u.fullName ?? "M").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-cream text-sm font-medium truncate">{u.fullName ?? u.firstName ?? "Member"}</div>
                      <div className="text-cream/40 text-xs truncate">{u.email} · {pendingSlots.length} pending photo{pendingSlots.length !== 1 ? "s" : ""}</div>
                    </div>
                  </div>

                  {/* Photos */}
                  <div className="flex gap-3 flex-wrap px-4 pb-4">
                    {slots.map((slot, idx) => slot.url && slot.status === "pending" ? (
                      <div key={idx} className="flex flex-col gap-2">
                        <div className="relative group">
                          {/* Clickable photo thumbnail */}
                          <button
                            type="button"
                            onClick={() => setLightbox({ url: slot.url!, slotIdx: idx, userId: u.id, userName: name, userEmail: u.email ?? "", isNew })}
                            data-testid={`button-photo-preview-${u.id}-${idx}`}
                            className="block w-24 h-24 rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-gold/50"
                            style={{ cursor: "zoom-in" }}
                            aria-label={`View photo ${idx + 1} of ${name} full size`}
                          >
                            <img src={slot.url} alt="" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                            {/* Zoom hint on hover */}
                            <div className="absolute inset-0 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                              style={{ background: "rgba(0,0,0,0.45)" }}>
                              <ZoomIn size={20} color="#fff" />
                            </div>
                          </button>

                          {isNew && (
                            <div
                              className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md text-[9px] font-black pointer-events-none"
                              style={{ background: "#ef4444", color: "#fff", boxShadow: "0 1px 5px rgba(0,0,0,0.55)" }}
                              data-testid={`badge-new-photo-${u.id}-${idx}`}
                            >
                              NEW
                            </div>
                          )}
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={() => setApprovePending({ userId: u.id, slotIdx: idx, userName: name })}
                            data-testid={`button-approve-photo-${u.id}-${idx}`}
                            className="flex-1 py-1 rounded-lg text-[10px] font-semibold"
                            style={{ background: "rgba(16,185,129,0.2)", color: "#10b981" }}>
                            ✓ OK
                          </button>
                          <button
                            onClick={() => openRejectPanel(u.id, idx, name)}
                            data-testid={`button-reject-photo-${u.id}-${idx}`}
                            className="flex-1 py-1 rounded-lg text-[10px] font-semibold"
                            style={{
                              background: rejectTarget?.userId === u.id && rejectTarget?.slotIdx === idx
                                ? "rgba(239,68,68,0.35)"
                                : "rgba(239,68,68,0.15)",
                              color: "#ef4444",
                            }}>
                            <X size={10} className="inline" /> No
                          </button>
                        </div>
                      </div>
                    ) : null)}
                  </div>

                  {/* Inline reject reason panel */}
                  {isBeingRejected && (
                    <div className="mx-4 mb-4 rounded-xl p-4" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)" }}>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle size={13} color="#ef4444" />
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#ef4444" }}>
                          Reason for rejection
                        </span>
                        <span className="text-cream/30 text-[10px]">— photo slot {rejectTarget!.slotIdx + 1} of {name}</span>
                      </div>

                      <div className="relative mb-2">
                        <select
                          value={selectedReason}
                          onChange={e => { setSelectedReason(e.target.value); setCustomReason(""); }}
                          data-testid="select-reject-reason"
                          className="w-full px-3 py-2.5 pr-8 rounded-xl text-xs outline-none appearance-none"
                          style={{
                            background: "rgba(255,255,255,0.07)",
                            border: "1px solid rgba(239,68,68,0.3)",
                            color: selectedReason ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                          }}
                        >
                          <option value="" disabled>Select a rejection reason…</option>
                          {PRESET_REASONS.map(r => (
                            <option key={r} value={r} style={{ background: "#1a0b2e", color: "#FFFFFF" }}>{r}</option>
                          ))}
                          <option value="custom" style={{ background: "#1a0b2e", color: "#FFD700" }}>✏️ Custom reason…</option>
                        </select>
                        <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" color="rgba(239,68,68,0.6)" />
                      </div>

                      {selectedReason === "custom" && (
                        <textarea
                          value={customReason}
                          onChange={e => setCustomReason(e.target.value)}
                          placeholder="Type the specific rejection reason (shown to the user)…"
                          maxLength={300}
                          rows={2}
                          data-testid="input-custom-reject-reason"
                          className="w-full px-3 py-2.5 rounded-xl text-xs text-cream/80 placeholder-cream/25 outline-none resize-none mb-2"
                          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(239,68,68,0.3)" }}
                        />
                      )}

                      {effectiveReason && (
                        <p className="text-[10px] mb-3 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "rgba(239,68,68,0.8)", border: "1px solid rgba(239,68,68,0.15)" }}>
                          <span className="font-semibold">Shown to user:</span> {effectiveReason}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={confirmReject}
                          disabled={!canSubmitReject || photoMutation.isPending}
                          data-testid="button-confirm-reject-reason"
                          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                          style={{ background: canSubmitReject ? "#ef4444" : "rgba(239,68,68,0.3)", color: "#fff" }}
                        >
                          {photoMutation.isPending ? "Rejecting…" : "Confirm Reject"}
                        </button>
                        <button
                          onClick={closeRejectPanel}
                          data-testid="button-cancel-reject"
                          className="px-4 py-2 rounded-xl text-xs font-semibold"
                          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Approve confirm dialog */}
        <ConfirmDialog
          open={!!approvePending}
          title="Approve this photo?"
          description={`This photo from ${approvePending?.userName ?? "this user"} will be approved and shown on their profile.`}
          variant="success"
          confirmLabel="Approve"
          isPending={photoMutation.isPending}
          onConfirm={() => approvePending && photoMutation.mutate({ userId: approvePending.userId, slotIdx: approvePending.slotIdx, action: "approve" })}
          onCancel={() => setApprovePending(null)}
        />
      </div>

      {/* ── Full-screen lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "rgba(5,2,12,0.96)" }}
          data-testid="lightbox-overlay"
        >
          {/* Top bar */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,215,0,0.12)", background: "rgba(13,6,24,0.7)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-gold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #2d0f4a, #A0000A)" }}>
              {lightbox.userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-cream text-sm font-semibold truncate">{lightbox.userName}</div>
              <div className="text-cream/40 text-[11px] truncate">{lightbox.userEmail} · Photo slot {lightbox.slotIdx + 1}</div>
            </div>
            {lightbox.isNew && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex-shrink-0"
                style={{ background: "#ef4444", color: "#fff" }}>
                NEW
              </span>
            )}
            <button
              onClick={closeLightbox}
              data-testid="button-lightbox-close"
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ background: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.6)" }}
              aria-label="Close photo viewer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Image area — clicking backdrop closes */}
          <div
            className="flex-1 flex items-center justify-center p-4 min-h-0 cursor-pointer"
            onClick={closeLightbox}
            data-testid="lightbox-backdrop"
          >
            <img
              src={lightbox.url}
              alt={`Photo by ${lightbox.userName}`}
              onClick={e => e.stopPropagation()}
              className="max-w-full max-h-full object-contain rounded-2xl select-none cursor-default"
              style={{ boxShadow: "0 8px 60px rgba(0,0,0,0.8)" }}
              data-testid="lightbox-image"
            />
          </div>

          {/* Bottom action bar */}
          <div className="flex items-center justify-center gap-3 px-4 py-4 flex-shrink-0"
            style={{ borderTop: "1px solid rgba(255,215,0,0.10)", background: "rgba(13,6,24,0.7)" }}>

            <button
              onClick={closeLightbox}
              data-testid="button-lightbox-dismiss"
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}
            >
              Close
            </button>

            <button
              onClick={() => {
                const { userId, slotIdx, userName } = lightbox;
                closeLightbox();
                setTimeout(() => openRejectPanel(userId, slotIdx, userName), 80);
              }}
              data-testid="button-lightbox-reject"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: "rgba(239,68,68,0.18)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <X size={13} className="inline mr-1.5 mb-0.5" />Reject
            </button>

            <button
              onClick={() => {
                photoMutation.mutate({ userId: lightbox.userId, slotIdx: lightbox.slotIdx, action: "approve" });
              }}
              disabled={photoMutation.isPending}
              data-testid="button-lightbox-approve"
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
              style={{ background: "rgba(16,185,129,0.2)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
            >
              <CheckCheck size={13} className="inline mr-1.5 mb-0.5" />
              {photoMutation.isPending ? "Approving…" : "Approve"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
