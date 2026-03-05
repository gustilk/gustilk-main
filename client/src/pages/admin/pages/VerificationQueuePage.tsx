import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, XCircle, Ban, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { User } from "@shared/schema";
import type { PhotoSlot } from "@shared/schema";
import ConfirmDialog from "../components/ConfirmDialog";

export default function VerificationQueuePage({ user: adminUser }: { user: User }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<null | {
    title: string; description: string;
    variant: "danger" | "warning" | "success";
    label: string; onConfirm: () => void;
  }>(null);

  const { data, isLoading } = useQuery<{ users: User[] }>({
    queryKey: ["/api/admin/verifications"],
    queryFn: async () => (await fetch("/api/admin/verifications", { credentials: "include" })).json(),
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ userId, action, reason }: { userId: string; action: "approve" | "reject" | "ban"; reason?: string }) =>
      (await apiRequest("POST", `/api/admin/verify/${userId}`, { action, reason })).json(),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: action === "approve" ? "✓ Approved" : action === "ban" ? "Banned" : "Rejected" });
      setPending(null);
    },
  });

  const photoMutation = useMutation({
    mutationFn: async ({ userId, slotIdx, action, reason }: { userId: string; slotIdx: number; action: "approve" | "reject"; reason?: string }) =>
      (await apiRequest("POST", `/api/admin/photos/${userId}/${action}/${slotIdx}`, reason ? { reason } : undefined)).json(),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      toast({ title: action === "approve" ? "Photo approved" : "Photo rejected" });
      setPending(null);
    },
  });

  const users = data?.users ?? [];

  if (isLoading) return <div className="flex items-center justify-center h-64 text-cream/40 text-sm">Loading…</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">ID Verification Queue</h1>
        <p className="text-cream/40 text-xs mt-0.5">{users.length} pending verification{users.length !== 1 ? "s" : ""}</p>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <CheckCircle size={36} color="rgba(16,185,129,0.4)" />
          <p className="text-cream/40 text-sm">No pending verifications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map(u => {
            const slots = ((u as any).photoSlots as PhotoSlot[] | null) ?? [];
            const selfie = (u as any).verificationSelfie as string | null;
            const casteLabel = ({ sheikh: "Sheikh", pir: "Pir", murid: "Mirid" }[u.caste ?? ""] ?? u.caste ?? "");
            const name = u.fullName ?? u.firstName ?? "this user";

            return (
              <div key={u.id} data-testid={`verification-card-${u.id}`}
                className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}>

                {/* Header */}
                <div className="flex items-center gap-3 p-4 pb-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-base font-bold text-gold"
                    style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)" }}>
                    {u.photos?.[0] ? <img src={u.photos[0]} alt="" className="w-full h-full object-cover" /> : (u.fullName ?? "M").charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-cream text-sm">{u.fullName ?? u.firstName}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}>{casteLabel}</span>
                    </div>
                    <p className="text-cream/40 text-xs">{u.city}, {u.country} · {u.age} yrs</p>
                  </div>
                  <button onClick={() => setLocation(`/admin/users/${u.id}`)} data-testid={`button-view-${u.id}`}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold"
                    style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.2)" }}>
                    <Eye size={11} /> View
                  </button>
                </div>

                {/* Bio */}
                {u.bio && <div className="px-4 pb-2 text-cream/50 text-xs">{u.bio}</div>}

                {/* Photos */}
                {slots.length > 0 && (
                  <div className="px-4 pb-3">
                    <div className="text-cream/40 text-[10px] mb-2 font-semibold uppercase tracking-wide">Photos</div>
                    <div className="flex gap-2 flex-wrap">
                      {slots.map((slot, idx) => slot.url ? (
                        <div key={idx} className="flex flex-col gap-1.5">
                          <img src={slot.url} alt="" className="w-20 h-20 rounded-xl object-cover" />
                          <div className="flex gap-1">
                            <button
                              onClick={() => setPending({
                                title: "Approve this photo?",
                                description: `This photo from ${name} will be marked as approved.`,
                                variant: "success",
                                label: "Approve",
                                onConfirm: () => photoMutation.mutate({ userId: u.id, slotIdx: idx, action: "approve" }),
                              })}
                              data-testid={`button-approve-photo-${u.id}-${idx}`}
                              className="flex-1 py-1 rounded text-[9px] font-bold" style={{ background: "rgba(16,185,129,0.2)", color: "#10b981" }}>✓</button>
                            <button
                              onClick={() => setPending({
                                title: "Reject this photo?",
                                description: `This photo from ${name} will be rejected as inappropriate.`,
                                variant: "danger",
                                label: "Reject",
                                onConfirm: () => photoMutation.mutate({ userId: u.id, slotIdx: idx, action: "reject", reason: "Inappropriate" }),
                              })}
                              data-testid={`button-reject-photo-${u.id}-${idx}`}
                              className="flex-1 py-1 rounded text-[9px] font-bold" style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444" }}>✕</button>
                          </div>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                )}

                {/* Selfie */}
                {selfie && (
                  <div className="px-4 pb-3">
                    <div className="text-cream/40 text-[10px] mb-2 font-semibold uppercase tracking-wide">Verification Selfie</div>
                    <img src={selfie} alt="selfie" className="w-28 h-28 rounded-xl object-cover" />
                  </div>
                )}

                {/* Rejection reason */}
                <div className="px-4 pb-3">
                  <textarea value={reasons[u.id] ?? ""} onChange={e => setReasons(r => ({ ...r, [u.id]: e.target.value }))}
                    placeholder="Rejection reason (shown to user)…"
                    data-testid={`textarea-reject-reason-${u.id}`}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl text-xs text-cream/70 placeholder-cream/25 outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>

                {/* Actions */}
                <div className="flex gap-2 px-4 pb-4">
                  <button
                    onClick={() => setPending({
                      title: `Verify ${name}?`,
                      description: "Their identity will be verified and they will receive the verified badge.",
                      variant: "success",
                      label: "Verify & Approve",
                      onConfirm: () => verifyMutation.mutate({ userId: u.id, action: "approve" }),
                    })}
                    disabled={verifyMutation.isPending}
                    data-testid={`button-verify-approve-${u.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
                    <CheckCircle size={13} /> Approve
                  </button>
                  <button
                    onClick={() => setPending({
                      title: `Reject ${name}?`,
                      description: reasons[u.id]
                        ? `Reason: "${reasons[u.id]}". They will be notified.`
                        : "Their verification will be rejected and they will be notified.",
                      variant: "warning",
                      label: "Reject",
                      onConfirm: () => verifyMutation.mutate({ userId: u.id, action: "reject", reason: reasons[u.id] }),
                    })}
                    disabled={verifyMutation.isPending}
                    data-testid={`button-verify-reject-${u.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                    <XCircle size={13} /> Reject
                  </button>
                  <button
                    onClick={() => setPending({
                      title: `Ban ${name}?`,
                      description: "They will be permanently banned and immediately lose all access.",
                      variant: "danger",
                      label: "Ban",
                      onConfirm: () => verifyMutation.mutate({ userId: u.id, action: "ban", reason: reasons[u.id] }),
                    })}
                    disabled={verifyMutation.isPending}
                    data-testid={`button-verify-ban-${u.id}`}
                    className="px-4 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(239,68,68,0.06)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <Ban size={13} /> Ban
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        title={pending?.title ?? ""}
        description={pending?.description ?? ""}
        variant={pending?.variant ?? "danger"}
        confirmLabel={pending?.label ?? "Confirm"}
        isPending={verifyMutation.isPending || photoMutation.isPending}
        onConfirm={() => pending?.onConfirm()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
