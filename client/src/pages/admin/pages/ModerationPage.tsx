import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import type { PhotoSlot } from "@shared/schema";
import ConfirmDialog from "../components/ConfirmDialog";

export default function ModerationPage({ user }: { user: User }) {
  const { toast } = useToast();
  const [pending, setPending] = useState<null | {
    title: string; description: string;
    variant: "danger" | "warning" | "success";
    label: string; onConfirm: () => void;
  }>(null);

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
      setPending(null);
    },
  });

  const users = data?.users ?? [];
  const pendingUsers = users.filter(u => {
    const slots = ((u as any).photoSlots as PhotoSlot[] | null) ?? [];
    return slots.some(s => s.status === "pending");
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">Content Moderation</h1>
        <p className="text-cream/40 text-xs mt-0.5">{pendingUsers.length} users with pending photos</p>
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
            const pending_slots = slots.filter(s => s.status === "pending");
            const name = u.fullName ?? u.firstName ?? "this user";
            return (
              <div key={u.id} data-testid={`moderation-card-${u.id}`}
                className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.12)" }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-gold"
                    style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)" }}>
                    {(u.fullName ?? "M").charAt(0)}
                  </div>
                  <div>
                    <div className="text-cream text-sm font-medium">{u.fullName ?? u.firstName ?? "Member"}</div>
                    <div className="text-cream/40 text-xs">{u.email} · {pending_slots.length} pending photo{pending_slots.length !== 1 ? "s" : ""}</div>
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {slots.map((slot, idx) => slot.url && slot.status === "pending" ? (
                    <div key={idx} className="flex flex-col gap-2">
                      <div className="relative">
                        <img src={slot.url} alt="" className="w-24 h-24 rounded-xl object-cover" />
                        {(u as any).verificationStatus === "approved" && (
                          <div
                            className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-widest"
                            style={{ background: "#ef4444", color: "#fff", boxShadow: "0 1px 5px rgba(0,0,0,0.55)", letterSpacing: "0.08em" }}
                            data-testid={`badge-new-photo-${u.id}-${idx}`}
                          >
                            NEW
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setPending({
                            title: "Approve this photo?",
                            description: `This photo from ${name} will be approved and shown on their profile.`,
                            variant: "success",
                            label: "Approve",
                            onConfirm: () => photoMutation.mutate({ userId: u.id, slotIdx: idx, action: "approve" }),
                          })}
                          data-testid={`button-approve-photo-${u.id}-${idx}`}
                          className="flex-1 py-1 rounded-lg text-[10px] font-semibold"
                          style={{ background: "rgba(16,185,129,0.2)", color: "#10b981" }}>
                          ✓ OK
                        </button>
                        <button
                          onClick={() => setPending({
                            title: "Reject this photo?",
                            description: `This photo from ${name} will be removed as it violates community guidelines.`,
                            variant: "danger",
                            label: "Reject",
                            onConfirm: () => photoMutation.mutate({ userId: u.id, slotIdx: idx, action: "reject", reason: "Inappropriate" }),
                          })}
                          data-testid={`button-reject-photo-${u.id}-${idx}`}
                          className="flex-1 py-1 rounded-lg text-[10px] font-semibold"
                          style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444" }}>
                          <X size={10} className="inline" /> No
                        </button>
                      </div>
                    </div>
                  ) : null)}
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
        isPending={photoMutation.isPending}
        onConfirm={() => pending?.onConfirm()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
