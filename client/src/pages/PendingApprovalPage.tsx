import { Clock, Camera, CheckCircle, LogOut } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import type { PhotoSlot } from "@shared/schema";

interface Props { user: User }

export default function PendingApprovalPage({ user }: Props) {
  const slots = (user as any).photoSlots as PhotoSlot[] ?? [];
  const pendingSlots = slots.filter(s => s.status === "pending");
  const rejectedSlots = slots.filter(s => s.status === "rejected");

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: "linear-gradient(160deg, #0d0618 0%, #1a0a2e 60%, #0d0618 100%)" }}>
      <div className="w-full max-w-sm text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "linear-gradient(135deg, #c9a84c22, #7b3fa022)", border: "2px solid #c9a84c44" }}>
          <Clock className="w-10 h-10" style={{ color: "#c9a84c" }} />
        </div>

        <h1 className="text-3xl font-serif font-bold mb-3" style={{ color: "#fdf8f0" }}>
          Under Review
        </h1>
        <p className="text-base mb-8" style={{ color: "#fdf8f0aa" }}>
          Your profile photos are being reviewed by our team. This usually takes less than 24 hours.
          You'll receive an email once your profile is approved.
        </p>

        {pendingSlots.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#c9a84c" }}>
              Pending Review
            </p>
            <div className="grid grid-cols-3 gap-2">
              {pendingSlots.map((slot, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden"
                  style={{ border: "2px solid #c9a84c44" }}>
                  <img
                    src={slot.url}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover opacity-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Clock className="w-6 h-6" style={{ color: "#c9a84c" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {rejectedSlots.length > 0 && (
          <div className="mb-6 p-4 rounded-xl text-left" style={{ background: "#d4608a15", border: "1px solid #d4608a44" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#d4608a" }}>
              Photos Rejected
            </p>
            {rejectedSlots.map((slot, i) => (
              <div key={i} className="text-sm mb-1" style={{ color: "#fdf8f0aa" }}>
                {slot.reason ? `Reason: ${slot.reason}` : "Did not meet our photo guidelines."}
              </div>
            ))}
            <p className="text-sm mt-3" style={{ color: "#fdf8f0aa" }}>
              Please edit your profile and upload new photos to replace the rejected ones.
            </p>
          </div>
        )}

        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#ffffff08" }}>
            <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#c9a84c" }} />
            <p className="text-sm text-left" style={{ color: "#fdf8f0cc" }}>
              Profile complete — all details submitted
            </p>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#ffffff08" }}>
            <Camera className="w-5 h-5 flex-shrink-0" style={{ color: "#7b3fa0" }} />
            <p className="text-sm text-left" style={{ color: "#fdf8f0cc" }}>
              Photos submitted for moderation
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {rejectedSlots.length > 0 && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("gustilk:go-edit-profile"))}
              className="w-full py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: "linear-gradient(135deg, #c9a84c, #7b3fa0)", color: "#fdf8f0" }}
              data-testid="button-edit-profile"
            >
              Edit Profile & Re-upload Photos
            </button>
          )}

          <button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="w-full py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-70 flex items-center justify-center gap-2"
            style={{ background: "transparent", border: "1px solid #ffffff22", color: "#fdf8f0aa" }}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
