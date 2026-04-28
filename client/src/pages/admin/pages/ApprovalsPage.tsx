import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, XCircle, Ban, Shield, X, ChevronLeft, ChevronRight, RotateCcw, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import type { PhotoSlot } from "@shared/schema";
import ConfirmDialog from "../components/ConfirmDialog";

const REJECT_REASONS = [
  "Inappropriate photos",
  "Fake profile",
  "Underage",
  "Incomplete profile",
  "Duplicate account",
  "Violates community guidelines",
];

function Lightbox({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.95)" }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.1)" }}
        data-testid="button-lightbox-close"
      >
        <X size={18} color="white" />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length); }}
            className="absolute left-4 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.1)" }}
            data-testid="button-lightbox-prev"
          >
            <ChevronLeft size={22} color="white" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % images.length); }}
            className="absolute right-4 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.1)" }}
            data-testid="button-lightbox-next"
          >
            <ChevronRight size={22} color="white" />
          </button>
        </>
      )}

      <img
        src={images[idx]}
        alt=""
        onClick={e => e.stopPropagation()}
        className="max-w-[90vw] max-h-[88vh] object-contain rounded-2xl"
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.8)" }}
      />

      {images.length > 1 && (
        <div className="absolute bottom-5 flex gap-1.5">
          {images.map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full transition-all"
              style={{ background: i === idx ? "white" : "rgba(255,255,255,0.3)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ApprovalsPage({ user: adminUser }: { user: User }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [pending, setPending] = useState<null | {
    title: string; description: string;
    variant: "danger" | "warning" | "success";
    label: string; onConfirm: () => void;
  }>(null);

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
      setPending(null);
    },
  });

  const users = data?.users ?? [];

  if (isLoading) return <div className="flex items-center justify-center h-64 text-cream/40 text-sm">Loading…</div>;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
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
        <div className="space-y-6">
          {users.map(u => {
            const slots = ((u as any).photoSlots as PhotoSlot[] | null) ?? [];
            const profilePhotos = slots.filter(s => s.url).map(s => s.url as string);
            const selfieUrl = (u as any).verificationSelfie as string | undefined;
            const allPhotos = [...profilePhotos, ...(selfieUrl ? [selfieUrl] : [])];
            const casteLabel = ({ sheikh: "Sheikh", pir: "Pir", murid: "Mirid" }[u.caste ?? ""] ?? u.caste ?? "");
            const timeAgo = u.createdAt ? formatDistanceToNow(new Date(u.createdAt), { addSuffix: true }) : "";
            const name = u.fullName ?? u.firstName ?? "this user";
            const appCount = ((u as any).applicationCount as number | null) ?? 1;
            const appHistory = ((u as any).applicationHistory as Array<{ action: string; reason?: string; date: string }> | null) ?? [];
            const isReapplication = appCount > 1;

            return (
              <div key={u.id} data-testid={`approval-card-${u.id}`}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: isReapplication ? "1px solid rgba(251,191,36,0.4)" : "1px solid rgba(201,168,76,0.2)",
                }}>

                {/* ── Reapplication Banner ── */}
                {isReapplication && (
                  <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(251,191,36,0.15)", background: "rgba(251,191,36,0.05)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <RotateCcw size={13} color="#fbbf24" />
                      <span className="text-yellow-400 text-xs font-bold">Reapplication #{appCount}</span>
                      <span className="text-cream/30 text-xs">— This user has applied {appCount} times</span>
                    </div>
                    {appHistory.length > 0 && (
                      <div className="space-y-1.5 mt-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-cream/30 mb-1">Previous Decisions</p>
                        {appHistory.map((h, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs rounded-lg px-2.5 py-1.5"
                            style={{
                              background: h.action === "approved" ? "rgba(16,185,129,0.08)" : h.action === "banned" ? "rgba(239,68,68,0.08)" : "rgba(212,96,138,0.08)",
                              border: h.action === "approved" ? "1px solid rgba(16,185,129,0.2)" : h.action === "banned" ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(212,96,138,0.2)",
                            }}>
                            <span className="font-bold flex-shrink-0 capitalize"
                              style={{ color: h.action === "approved" ? "#10b981" : h.action === "banned" ? "#ef4444" : "#d4608a" }}>
                              {h.action}
                            </span>
                            {h.reason && <span className="text-cream/50">— {h.reason}</span>}
                            <span className="ml-auto text-cream/25 flex-shrink-0 flex items-center gap-1">
                              <Clock size={9} />
                              {formatDistanceToNow(new Date(h.date), { addSuffix: true })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Profile Header ── */}
                <div className="p-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-start gap-4">
                    <div
                      className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-xl font-bold text-gold"
                      style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)" }}
                    >
                      {profilePhotos[0]
                        ? <img src={profilePhotos[0]} alt="" className="w-full h-full object-cover" />
                        : (u.fullName ?? "?").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-cream text-base">{u.fullName ?? u.firstName ?? "Member"}</span>
                        {casteLabel && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}>{casteLabel}</span>
                        )}
                        {u.gender && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(212,96,138,0.12)", color: "#d4608a" }}>{u.gender}</span>
                        )}
                      </div>
                      <p className="text-cream/50 text-xs">{[u.age && `${u.age} yrs`, u.city, u.country].filter(Boolean).join(" · ")}</p>
                      {u.occupation && <p className="text-cream/35 text-xs mt-0.5">{u.occupation}</p>}
                      <p className="text-cream/25 text-[10px] mt-1">Registered {timeAgo}</p>
                    </div>
                  </div>
                  {u.bio && (
                    <p className="text-cream/55 text-sm mt-3 leading-relaxed">{u.bio}</p>
                  )}
                </div>

                {/* ── Profile Photos ── */}
                {profilePhotos.length > 0 && (
                  <div className="p-4 pb-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <p className="text-cream/30 text-[10px] font-semibold uppercase tracking-wider mb-2">Profile Photos</p>
                    <div className="grid grid-cols-3 gap-2">
                      {profilePhotos.map((url, i) => (
                        <div
                          key={i}
                          className="relative rounded-xl overflow-hidden cursor-pointer"
                          style={{ aspectRatio: "3/4" }}
                          onClick={() => setLightbox({ images: allPhotos, index: i })}
                          data-testid={`photo-${u.id}-${i}`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                          <div className="absolute inset-0 rounded-xl" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Identity Selfie ── */}
                {selfieUrl ? (
                  <div className="p-4 pb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={12} color="#c9a84c" />
                      <p className="text-cream/30 text-[10px] font-semibold uppercase tracking-wider">Identity Selfie</p>
                    </div>
                    <div
                      className="relative rounded-xl overflow-hidden cursor-pointer"
                      style={{ maxWidth: 220 }}
                      onClick={() => setLightbox({ images: allPhotos, index: allPhotos.length - 1 })}
                      data-testid={`selfie-${u.id}`}
                    >
                      <img src={selfieUrl} alt="Selfie" className="w-full object-cover rounded-xl hover:scale-105 transition-transform duration-200" style={{ maxHeight: 260 }} />
                      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 text-[10px] font-bold text-white/80 uppercase tracking-wider"
                        style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
                        Identity Selfie
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 pt-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)" }}>
                      <Shield size={12} color="#fbbf24" />
                      <p className="text-yellow-400/70 text-xs">No identity selfie submitted</p>
                    </div>
                  </div>
                )}

                {/* ── Rejection reason ── */}
                <div className="px-4 pt-4 space-y-2">
                  <p className="text-cream/30 text-[10px] font-semibold uppercase tracking-wider">Rejection Reason (for Reject / Ban)</p>
                  <select
                    value=""
                    onChange={e => { if (e.target.value) setReasons(r => ({ ...r, [u.id]: e.target.value })); }}
                    data-testid={`select-reject-reason-${u.id}`}
                    className="w-full px-3 py-2 rounded-xl text-xs text-cream/70 outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <option value="">Quick-fill from presets…</option>
                    {REJECT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input
                    type="text"
                    value={reasons[u.id] ?? ""}
                    onChange={e => setReasons(r => ({ ...r, [u.id]: e.target.value }))}
                    placeholder="Type a custom reason or edit the preset above…"
                    maxLength={300}
                    data-testid={`input-custom-reason-${u.id}`}
                    className="w-full px-3 py-2 rounded-xl text-xs text-cream placeholder-cream/25 outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>

                {/* ── Action buttons ── */}
                <div className="flex gap-2 p-4">
                  <button
                    onClick={() => setPending({
                      title: `Approve ${name}?`,
                      description: "Their profile will be approved and they will gain full access to the platform.",
                      variant: "success",
                      label: "Approve",
                      onConfirm: () => actionMutation.mutate({ userId: u.id, action: "approve" }),
                    })}
                    disabled={actionMutation.isPending}
                    data-testid={`button-approve-${u.id}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button
                    onClick={() => setPending({
                      title: `Reject ${name}?`,
                      description: reasons[u.id]
                        ? `Reason: "${reasons[u.id]}". They will be notified of the rejection.`
                        : "They will be notified their profile was not approved.",
                      variant: "warning",
                      label: "Reject",
                      onConfirm: () => actionMutation.mutate({ userId: u.id, action: "reject", reason: reasons[u.id] }),
                    })}
                    disabled={actionMutation.isPending}
                    data-testid={`button-reject-${u.id}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                    <XCircle size={14} /> Reject
                  </button>
                  <button
                    onClick={() => setPending({
                      title: `Ban ${name}?`,
                      description: "They will be permanently banned and lose all access to the platform.",
                      variant: "danger",
                      label: "Ban",
                      onConfirm: () => actionMutation.mutate({ userId: u.id, action: "ban", reason: reasons[u.id] }),
                    })}
                    disabled={actionMutation.isPending}
                    data-testid={`button-ban-${u.id}`}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(239,68,68,0.06)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <Ban size={14} /> Ban
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      <ConfirmDialog
        open={!!pending}
        title={pending?.title ?? ""}
        description={pending?.description ?? ""}
        variant={pending?.variant ?? "danger"}
        confirmLabel={pending?.label ?? "Confirm"}
        isPending={actionMutation.isPending}
        onConfirm={() => pending?.onConfirm()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
