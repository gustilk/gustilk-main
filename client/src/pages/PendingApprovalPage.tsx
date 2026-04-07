import { useState, useRef } from "react";
import { Clock, Camera, XCircle, Ban, Shield, ArrowRight, LogOut, RotateCcw, CheckCircle, Edit } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";

interface Props { user: User }

export default function PendingApprovalPage({ user }: Props) {
  const status = user.verificationStatus ?? "pending";
  const reason = (user as any).rejectionReason as string | undefined;
  const appCount = (user as any).applicationCount as number ?? 1;

  const [, setLocation] = useLocation();
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [selfieError, setSelfieError] = useState<string | null>(null);
  const [reapplyStep, setReapplyStep] = useState<"idle" | "selfie" | "ready">("idle");
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => { queryClient.clear(); window.location.href = "/"; },
  });

  const reapplyMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/profile/reapply", selfieData ? { selfie: selfieData } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const handleSelfieFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setSelfieError("Please select an image file."); return; }
    setSelfieError(null);
    const reader = new FileReader();
    reader.onload = ev => {
      setSelfieData(ev.target?.result as string);
      setReapplyStep("ready");
    };
    reader.readAsDataURL(file);
  };

  // ── BANNED ───────────────────────────────────────────────────────────────
  if (status === "banned") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
        style={{ background: "linear-gradient(160deg, #0d0002 0%, #1a0005 60%, #0d0002 100%)" }}>
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(239,68,68,0.12)", border: "2px solid rgba(239,68,68,0.35)" }}>
            <Ban className="w-10 h-10" color="#ef4444" />
          </div>
          <h1 className="text-3xl font-serif font-bold mb-3 text-cream">Account Suspended</h1>
          <p className="text-cream/55 text-sm leading-relaxed mb-4">
            Your account has been permanently suspended from Gûstîlk.
          </p>
          {reason && (
            <div className="mb-6 p-4 rounded-2xl text-left"
              style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-1">Reason</p>
              <p className="text-cream/70 text-sm">{reason}</p>
            </div>
          )}
          <p className="text-cream/35 text-xs mb-8">
            If you believe this was a mistake, please contact us at support@gustilk.com
          </p>
          <button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
            className="w-full py-3 rounded-full text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(253,248,240,0.5)" }}
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  // ── REJECTED ─────────────────────────────────────────────────────────────
  if (status === "rejected") {
    return (
      <div className="min-h-screen flex flex-col px-6 py-12"
        style={{ background: "linear-gradient(160deg, #0d0002 0%, #1a0005 60%, #0d0002 100%)" }}>
        <div className="w-full max-w-sm mx-auto">
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(224,48,80,0.1)", border: "2px solid rgba(224,48,80,0.35)" }}>
              <XCircle className="w-10 h-10" color="#e03050" />
            </div>
            <h1 className="text-3xl font-serif font-bold mb-2 text-cream">
              {appCount > 1 ? "Application Not Approved" : "Profile Not Approved"}
            </h1>
            <p className="text-cream/55 text-sm">
              {appCount > 1 ? `This was application #${appCount}.` : "We were unable to approve your profile at this time."}
            </p>
          </div>

          {reason ? (
            <div className="mb-5 p-4 rounded-2xl"
              style={{ background: "rgba(224,48,80,0.08)", border: "1px solid rgba(224,48,80,0.3)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "#e03050" }}>Reason</p>
              <p className="text-cream/75 text-sm leading-relaxed">{reason}</p>
            </div>
          ) : (
            <div className="mb-5 p-4 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-cream/50 text-sm">No specific reason was given. Please review our community guidelines and reapply.</p>
            </div>
          )}

          <p className="text-cream/50 text-sm font-semibold mb-3">What you can do:</p>
          <div className="space-y-2 mb-6">
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
              <Edit size={15} color="#c8000e" className="flex-shrink-0 mt-0.5" />
              <p className="text-cream/65 text-xs leading-relaxed">Update your profile photos to clearer, guideline-compliant images</p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
              <Camera size={15} color="#9b0010" className="flex-shrink-0 mt-0.5" />
              <p className="text-cream/65 text-xs leading-relaxed">Retake your identity selfie — ensure your face is clearly visible in good lighting</p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
              <Shield size={15} color="#e03050" className="flex-shrink-0 mt-0.5" />
              <p className="text-cream/65 text-xs leading-relaxed">Make sure your profile accurately represents you and follows our community guidelines</p>
            </div>
          </div>

          {/* Selfie section */}
          {reapplyStep === "idle" && (
            <div className="space-y-3 mb-4">
              <button
                onClick={() => setReapplyStep("selfie")}
                data-testid="button-retake-selfie"
                className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: "rgba(123,63,160,0.15)", border: "1px solid rgba(123,63,160,0.4)", color: "#c8000e" }}
              >
                <Camera size={16} /> Retake Identity Selfie
              </button>
              <button
                onClick={() => setLocation("/profile/edit")}
                data-testid="button-edit-profile"
                className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: "rgba(200,0,14,0.1)", border: "1px solid rgba(200,0,14,0.25)", color: "#c8000e" }}
              >
                <Edit size={16} /> Edit Profile & Photos
              </button>
            </div>
          )}

          {reapplyStep === "selfie" && (
            <div className="mb-4 p-4 rounded-2xl" style={{ background: "rgba(123,63,160,0.08)", border: "1px solid rgba(123,63,160,0.3)" }}>
              <p className="text-cream/70 text-sm font-semibold mb-3 text-center">Take a new selfie</p>
              <p className="text-cream/40 text-xs text-center mb-3">Face clearly visible, good lighting, no sunglasses</p>
              {selfieError && <p className="text-sm text-center mb-2" style={{ color: "#e03050" }}>{selfieError}</p>}
              <button
                onClick={() => selfieInputRef.current?.click()}
                data-testid="button-take-selfie"
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #9b0010, #e03050)", color: "white" }}
              >
                <Camera size={16} /> Take / Upload Selfie
              </button>
              <button onClick={() => setReapplyStep("idle")} className="w-full mt-2 py-2 text-xs text-center" style={{ color: "rgba(253,248,240,0.3)" }}>
                Cancel
              </button>
              <input ref={selfieInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleSelfieFile} />
            </div>
          )}

          {reapplyStep === "ready" && selfieData && (
            <div className="mb-4 p-4 rounded-2xl" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <div className="flex items-center gap-3 mb-3">
                <img src={selfieData} alt="New selfie" className="w-14 h-14 rounded-full object-cover" style={{ border: "2px solid rgba(16,185,129,0.4)" }} />
                <div>
                  <p className="text-sm font-semibold text-green-400">New selfie ready</p>
                  <button onClick={() => { setSelfieData(null); setReapplyStep("selfie"); }} className="text-xs text-cream/40 underline mt-0.5">Retake</button>
                </div>
              </div>
            </div>
          )}

          {/* Submit for re-review */}
          <button
            onClick={() => reapplyMutation.mutate()}
            disabled={reapplyMutation.isPending}
            data-testid="button-reapply"
            className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 mb-3 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #c8000e, #e83535)", color: "#1a0005" }}
          >
            {reapplyMutation.isPending ? "Submitting…" : (
              <><RotateCcw size={16} /> Submit for Re-review</>
            )}
          </button>
          {reapplyMutation.isError && (
            <p className="text-xs text-center mb-3" style={{ color: "#e03050" }}>
              {(reapplyMutation.error as any)?.message ?? "Submission failed. Please try again."}
            </p>
          )}

          <button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
            className="w-full py-3 rounded-full text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(253,248,240,0.4)" }}
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  // ── PENDING (default) ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: "linear-gradient(160deg, #0d0002 0%, #1a0005 60%, #0d0002 100%)" }}>
      <div className="w-full max-w-sm text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "linear-gradient(135deg, #c8000e22, #9b001022)", border: "2px solid #c8000e44" }}>
          <Clock className="w-10 h-10" style={{ color: "#c8000e" }} />
        </div>
        <h1 className="text-3xl font-serif font-bold mb-3 text-cream">Under Review</h1>
        {appCount > 1 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-xs font-bold"
            style={{ background: "rgba(200,0,14,0.12)", border: "1px solid rgba(200,0,14,0.3)", color: "#c8000e" }}>
            Reapplication #{appCount}
          </div>
        )}
        <p className="text-base mb-8 text-cream/60">
          Your profile is being reviewed by our team. This usually takes less than 24 hours.
          You'll be notified once a decision is made.
        </p>
        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-gold" />
            <p className="text-sm text-left text-cream/70">Profile submitted for review</p>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            <Shield className="w-5 h-5 flex-shrink-0" style={{ color: "#9b0010" }} />
            <p className="text-sm text-left text-cream/70">Identity selfie submitted</p>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            <Clock className="w-5 h-5 flex-shrink-0 text-gold" />
            <p className="text-sm text-left text-cream/70">Awaiting admin decision</p>
          </div>
        </div>
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
          className="w-full py-3 rounded-full text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(253,248,240,0.45)" }}
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}
