import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Crown, Ban, Shield, AlertTriangle, MessageSquare, Trash2, CheckCircle, XCircle, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import type { User } from "@shared/schema";
import ConfirmDialog from "../components/ConfirmDialog";

export default function UserDetailPage({ user: adminUser, userId }: { user: User; userId: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [warnReason, setWarnReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showWarn, setShowWarn] = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [lightboxUrls, setLightboxUrls] = useState<string[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [pending, setPending] = useState<null | {
    title: string; description: string;
    variant: "danger" | "warning" | "success";
    label: string; onConfirm: () => void;
  }>(null);

  const { data, isLoading } = useQuery<{ user: User; stats: { matches: number; messages: number } }>({
    queryKey: ["/api/admin/users", userId],
    queryFn: async () => (await fetch(`/api/admin/users/${userId}`, { credentials: "include" })).json(),
  });

  const updateMutation = useMutation({
    mutationFn: async (patch: any) => (await apiRequest("PATCH", `/api/admin/users/${userId}`, patch)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "User updated" });
      setPending(null);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ action, reason }: { action: "approve" | "reject" | "ban"; reason?: string }) =>
      (await apiRequest("POST", `/api/admin/verify/${userId}`, { action, reason })).json(),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      const label = action === "approve" ? "✓ Approved" : action === "reject" ? "Rejected" : "Banned";
      toast({ title: label });
      setPending(null);
      if (action === "approve" || action === "reject") {
        setLocation("/admin/approvals");
      }
    },
  });

  const warnMutation = useMutation({
    mutationFn: async (reason: string) => (await apiRequest("POST", `/api/admin/users/${userId}/warn`, { reason })).json(),
    onSuccess: () => { toast({ title: "Warning sent" }); setShowWarn(false); setWarnReason(""); },
  });

  const suspendMutation = useMutation({
    mutationFn: async (reason: string) => (await apiRequest("POST", `/api/admin/users/${userId}/suspend`, { reason, days: 7 })).json(),
    onSuccess: () => { toast({ title: "User suspended for 7 days" }); setShowSuspend(false); setSuspendReason(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => (await apiRequest("DELETE", `/api/admin/users/${userId}`)).json(),
    onSuccess: () => { toast({ title: "User deleted" }); setPending(null); setLocation("/admin/users"); },
    onError: (err: Error) => { toast({ title: "Delete failed", description: err.message, variant: "destructive" }); setPending(null); },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-cream/40 text-sm">Loading…</div>;
  }

  const u = data?.user;
  if (!u) {
    return <div className="flex items-center justify-center h-64 text-cream/40 text-sm">User not found</div>;
  }

  const isPending = u.verificationStatus === "pending";
  const isBanned = u.verificationStatus === "banned";
  const statusColor = isBanned ? "#ef4444" : u.isVerified ? "#10b981" : isPending ? "#fbbf24" : "#6b7280";
  const statusLabel = isBanned ? "Banned" : u.isVerified ? "Verified" : isPending ? "Pending Approval" : "Unverified";
  const casteLabels = { sheikh: "Sheikh", pir: "Pir", murid: "Mirid" } as const;
  const casteLabel =
    u.caste && u.caste in casteLabels ? casteLabels[u.caste as keyof typeof casteLabels] : (u.caste ?? "—");
  const name = u.fullName ?? u.firstName ?? "this user";

  const backPath = isPending ? "/admin/approvals" : "/admin/users";
  const backLabel = isPending ? "Back to Approvals" : "Back to Users";

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <button onClick={() => setLocation(backPath)} data-testid="button-back"
        className="flex items-center gap-2 text-cream/50 text-sm mb-4 hover:text-cream/80 transition-colors">
        <ArrowLeft size={14} /> {backLabel}
      </button>

      {/* Pending approval banner */}
      {isPending && (
        <div className="mb-4 p-4 rounded-2xl flex items-start gap-3"
          style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)" }}>
          <AlertTriangle size={16} color="#fbbf24" className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-yellow-400 text-sm font-semibold">Awaiting Approval</div>
            <div className="text-cream/50 text-xs mt-0.5">Review this profile and approve or reject below.</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPending({
                title: `Approve ${name}?`,
                description: "Their profile will be approved and they will gain full access to the platform.",
                variant: "success",
                label: "Approve",
                onConfirm: () => verifyMutation.mutate({ action: "approve" }),
              })}
              disabled={verifyMutation.isPending}
              data-testid="button-banner-approve"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: "rgba(16,185,129,0.2)", color: "#10b981", border: "1px solid rgba(16,185,129,0.35)" }}>
              <CheckCircle size={12} /> Approve
            </button>
            <button onClick={() => setShowReject(!showReject)}
              disabled={verifyMutation.isPending}
              data-testid="button-banner-reject"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
              <XCircle size={12} /> Reject
            </button>
          </div>
        </div>
      )}

      {/* Reject reason input (shown when reject clicked from banner) */}
      {showReject && isPending && (
        <div className="mb-4 p-3 rounded-xl flex gap-2" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="Rejection reason (sent to user)…"
            data-testid="input-reject-reason"
            className="flex-1 px-3 py-2 rounded-lg text-xs text-cream placeholder-cream/30 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(239,68,68,0.2)" }} />
          <button
            onClick={() => setPending({
              title: `Reject ${name}?`,
              description: rejectReason
                ? `Reason: "${rejectReason}". They will be notified.`
                : "They will be notified their profile was not approved.",
              variant: "warning",
              label: "Reject",
              onConfirm: () => verifyMutation.mutate({ action: "reject", reason: rejectReason }),
            })}
            disabled={verifyMutation.isPending}
            data-testid="button-confirm-reject"
            className="px-3 py-2 rounded-lg text-xs font-bold"
            style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444" }}>
            Confirm
          </button>
        </div>
      )}

      {/* Profile header */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-xl font-bold text-gold"
            style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)" }}>
            {u.mainPhotoUrl
              ? <img src={u.mainPhotoUrl} alt="" className="w-full h-full object-cover" />
              : (u.fullName ?? "U").charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-serif text-lg text-gold font-bold">{u.fullName ?? u.firstName ?? "Member"}</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${statusColor}22`, color: statusColor }}>
                {statusLabel}
              </span>
              {u.isPremium && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}>Premium</span>
              )}
            </div>
            <div className="text-cream/50 text-sm mt-1">{u.email} · {u.phone ?? "No phone"}</div>
            <div className="text-cream/40 text-xs mt-1">
              {casteLabel} · {u.gender} · {u.age} yrs · {u.city}, {u.country}
            </div>
            {u.occupation && <div className="text-cream/30 text-xs mt-0.5">{u.occupation}</div>}
            {u.createdAt && (
              <div className="text-cream/30 text-xs mt-1">
                Joined {format(new Date(u.createdAt), "PPP")} ({formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })})
              </div>
            )}
          </div>
        </div>
        {u.bio && (
          <div className="mt-3 pt-3 border-t text-cream/60 text-sm" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            {u.bio}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: "Matches", value: data?.stats?.matches },
          { label: "Messages", value: data?.stats?.messages },
        ].map(item => (
          <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-cream text-lg font-bold">{item.value ?? 0}</div>
            <div className="text-cream/40 text-xs">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Photos */}
      {(() => {
        const slots: { url: string; status: string }[] = ((u.photoSlots ?? []) as any[]).filter(s => s?.url);
        // Fall back to photos array if no slots
        const fallback = (u.photos ?? []).filter(Boolean).map((url: string) => ({ url, status: "approved" }));
        const displaySlots = slots.length > 0 ? slots : fallback;
        if (!displaySlots.length) return null;

        const allUrls = displaySlots.map(s => s.url);

        const badgeStyle: Record<string, { bg: string; color: string; border: string; label: string }> = {
          pending:  { bg: "rgba(251,191,36,0.92)",  color: "#1a0a2e", border: "none", label: "Pending" },
          approved: { bg: "rgba(16,185,129,0.88)",  color: "#fff",    border: "none", label: "Approved" },
          rejected: { bg: "rgba(239,68,68,0.9)",    color: "#fff",    border: "none", label: "Rejected" },
        };

        return (
          <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.1)" }}>
            <h3 className="text-cream text-sm font-semibold mb-3">Photos ({displaySlots.length})</h3>
            <div className="grid grid-cols-3 gap-2">
              {displaySlots.map((slot, i) => {
                const badge = badgeStyle[slot.status];
                const isMain = slot.url === u.mainPhotoUrl;
                return (
                  <button
                    key={i}
                    onClick={() => { setLightboxUrls(allUrls); setLightboxIdx(i); }}
                    data-testid={`photo-thumb-${i}`}
                    className="relative aspect-[3/4] rounded-xl overflow-hidden group cursor-zoom-in"
                    style={{
                      border: slot.status === "pending"
                        ? "2px solid rgba(251,191,36,0.7)"
                        : slot.status === "rejected"
                        ? "2px solid rgba(239,68,68,0.5)"
                        : "1px solid rgba(16,185,129,0.3)",
                    }}
                  >
                    <img src={slot.url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />

                    {/* Status badge — top-left */}
                    {badge && (
                      <div
                        className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
                        style={{ background: badge.bg, color: badge.color }}
                        data-testid={`badge-photo-${i}-${slot.status}`}
                      >
                        {badge.label}
                      </div>
                    )}

                    {/* NEW badge — top-right (post-approval upload on an already-approved account) */}
                    {u.verificationStatus === "approved" && slot.status === "pending" && (
                      <div
                        className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest"
                        style={{ background: "#ef4444", color: "#fff", boxShadow: "0 1px 6px rgba(0,0,0,0.55)" }}
                        data-testid={`badge-photo-${i}-new`}
                      >
                        NEW
                      </div>
                    )}

                    {/* Main photo star — top-right (only when not NEW) */}
                    {isMain && !(u.verificationStatus === "approved" && slot.status === "pending") && (
                      <div
                        className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: "rgba(201,168,76,0.9)", color: "#1a0a2e" }}
                        data-testid={`badge-photo-${i}-main`}
                      >
                        ★ Main
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-semibold transition-opacity">View</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-3 pt-3 flex-wrap" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { color: "#fbbf24", label: "Pending approval" },
                { color: "#10b981", label: "Approved" },
                { color: "#ef4444", label: "Rejected" },
                { color: "#ef4444", label: "NEW = uploaded after account approval", pill: true },
              ].map(({ color, label, pill }) => (
                <div key={label} className="flex items-center gap-1.5">
                  {pill
                    ? <span className="px-1.5 py-px rounded text-[8px] font-black" style={{ background: color, color: "#fff" }}>NEW</span>
                    : <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  }
                  <span className="text-cream/40 text-[10px]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Identity selfie */}
      {u.verificationSelfie && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.1)" }}>
          <h3 className="text-cream text-sm font-semibold mb-3">Identity Selfie</h3>
          <button
            onClick={() => { setLightboxUrls([u.verificationSelfie!]); setLightboxIdx(0); }}
            data-testid="selfie-thumb"
            className="relative max-w-xs rounded-xl overflow-hidden group cursor-zoom-in"
            style={{ border: "1px solid rgba(201,168,76,0.2)" }}
          >
            <img src={u.verificationSelfie} alt="Identity selfie" className="w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-semibold transition-opacity">View Full</span>
            </div>
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrls.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(13,6,24,0.95)" }}
          onClick={() => setLightboxUrls([])}
        >
          <button
            onClick={e => { e.stopPropagation(); setLightboxUrls([]); }}
            data-testid="button-lightbox-close"
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <X size={18} className="text-cream" />
          </button>

          {lightboxUrls.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i - 1 + lightboxUrls.length) % lightboxUrls.length); }}
                data-testid="button-lightbox-prev"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <ChevronLeft size={22} className="text-cream" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i + 1) % lightboxUrls.length); }}
                data-testid="button-lightbox-next"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <ChevronRight size={22} className="text-cream" />
              </button>
            </>
          )}

          <img
            src={lightboxUrls[lightboxIdx]}
            alt=""
            onClick={e => e.stopPropagation()}
            className="max-h-[92vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
            data-testid="lightbox-image"
          />

          {lightboxUrls.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
              {lightboxUrls.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setLightboxIdx(i); }}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{ background: i === lightboxIdx ? "#c9a84c" : "rgba(255,255,255,0.3)" }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Moderation Actions */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.1)" }}>
        <h3 className="text-cream text-sm font-semibold mb-3">Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => updateMutation.mutate({ isPremium: !u.isPremium })}
            data-testid="button-toggle-premium"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.2)" }}>
            <Crown size={13} /> {u.isPremium ? "Remove Premium" : "Grant Premium"}
          </button>
          <button onClick={() => setShowWarn(!showWarn)}
            data-testid="button-warn-user"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
            <AlertTriangle size={13} /> Warn User
          </button>
          <button onClick={() => setShowSuspend(!showSuspend)}
            data-testid="button-suspend-user"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(249,115,22,0.1)", color: "#f97316", border: "1px solid rgba(249,115,22,0.2)" }}>
            <Shield size={13} /> Suspend 7 Days
          </button>
          <button
            onClick={() => setPending({
              title: isBanned ? `Unban ${name}?` : `Ban ${name}?`,
              description: isBanned
                ? "This will restore their access to the platform."
                : "They will immediately lose all access and cannot log in.",
              variant: "danger",
              label: isBanned ? "Unban" : "Ban",
              onConfirm: () => updateMutation.mutate({ isBanned: !isBanned }),
            })}
            data-testid="button-ban-user"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
            <Ban size={13} /> {isBanned ? "Unban" : "Ban"}
          </button>
          {!u.isAdmin && (
            <button
              onClick={() => setPending({
                title: `Delete ${name}'s account?`,
                description: "This action is permanent and cannot be undone. All their data, matches, and messages will be erased.",
                variant: "danger",
                label: "Delete Permanently",
                onConfirm: () => deleteMutation.mutate(),
              })}
              data-testid="button-delete-user"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold col-span-2"
              style={{ background: "rgba(239,68,68,0.06)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.15)" }}>
              <Trash2 size={13} /> Delete Account
            </button>
          )}
        </div>

        {showWarn && (
          <div className="mt-3 flex gap-2">
            <input value={warnReason} onChange={e => setWarnReason(e.target.value)}
              placeholder="Warning reason…" data-testid="input-warn-reason"
              className="flex-1 px-3 py-2 rounded-lg text-xs text-cream placeholder-cream/30 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(251,191,36,0.2)" }} />
            <button onClick={() => warnReason.trim() && warnMutation.mutate(warnReason)}
              data-testid="button-send-warn"
              className="px-3 py-2 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>
              Send
            </button>
          </div>
        )}

        {showSuspend && (
          <div className="mt-3 flex gap-2">
            <input value={suspendReason} onChange={e => setSuspendReason(e.target.value)}
              placeholder="Suspension reason…" data-testid="input-suspend-reason"
              className="flex-1 px-3 py-2 rounded-lg text-xs text-cream placeholder-cream/30 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(249,115,22,0.2)" }} />
            <button onClick={() => suspendReason.trim() && suspendMutation.mutate(suspendReason)}
              data-testid="button-confirm-suspend"
              className="px-3 py-2 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}>
              Suspend
            </button>
          </div>
        )}
      </div>

      {/* Bottom approve/reject for pending users */}
      {isPending && (
        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.12)" }}>
          <h3 className="text-cream text-sm font-semibold mb-3">Approval Decision</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setPending({
                title: `Approve ${name}?`,
                description: "Their profile will be approved and they will gain full access to the platform.",
                variant: "success",
                label: "Approve Profile",
                onConfirm: () => verifyMutation.mutate({ action: "approve" }),
              })}
              disabled={verifyMutation.isPending}
              data-testid="button-approve"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
              style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
              <CheckCircle size={15} /> Approve Profile
            </button>
            <button onClick={() => setShowReject(!showReject)}
              disabled={verifyMutation.isPending}
              data-testid="button-reject"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
              <XCircle size={15} /> Reject Profile
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        title={pending?.title ?? ""}
        description={pending?.description ?? ""}
        variant={pending?.variant ?? "danger"}
        confirmLabel={pending?.label ?? "Confirm"}
        isPending={updateMutation.isPending || verifyMutation.isPending || deleteMutation.isPending}
        onConfirm={() => pending?.onConfirm()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
