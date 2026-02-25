import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Camera, Upload, CheckCircle, ArrowRight, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SafeUser } from "@shared/schema";

interface Props { user: SafeUser }

export default function VerificationPage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"intro" | "capture" | "preview" | "done">("intro");
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/profile", {
        verificationSelfie: selfieData ?? "pending",
        verificationStatus: "pending",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setStep("done");
    },
    onError: () => {
      toast({ title: "Submission failed. Please try again.", variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setSelfieData(ev.target?.result as string);
      setStep("preview");
    };
    reader.readAsDataURL(file);
  };

  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center" style={{ background: "#0d0618" }}>
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
          style={{ background: "rgba(16,185,129,0.15)", border: "2px solid rgba(16,185,129,0.4)" }}
        >
          <CheckCircle size={44} color="#10b981" />
        </div>
        <h2 className="font-serif text-3xl text-gold mb-2">Submitted!</h2>
        <p className="text-cream/60 text-sm mb-2">Your selfie has been received.</p>
        <p className="text-cream/40 text-sm mb-8">Our team will review it within 24–48 hours. You'll be notified once verified.</p>
        <button
          onClick={() => setLocation("/discover")}
          data-testid="button-continue"
          className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm"
          style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
        >
          Continue to App
          <ArrowRight size={17} />
        </button>
      </div>
    );
  }

  if (step === "preview" && selfieData) {
    return (
      <div className="flex flex-col min-h-screen px-5" style={{ background: "#0d0618" }}>
        <div className="pt-14 pb-6 text-center">
          <h2 className="font-serif text-2xl text-gold mb-1">Looks good?</h2>
          <p className="text-cream/50 text-sm">Make sure your face is clearly visible</p>
        </div>
        <div className="flex-1 flex flex-col items-center gap-6">
          <div
            className="w-64 h-64 rounded-full overflow-hidden"
            style={{ border: "3px solid rgba(201,168,76,0.5)", boxShadow: "0 0 40px rgba(201,168,76,0.2)" }}
          >
            <img src={selfieData} alt="Selfie preview" className="w-full h-full object-cover" />
          </div>
          <div className="w-full space-y-3">
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              data-testid="button-submit-selfie"
              className="w-full py-4 rounded-xl font-bold text-sm disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
            >
              {submitMutation.isPending ? "Submitting…" : "Submit for Verification"}
            </button>
            <button
              onClick={() => { setSelfieData(null); setStep("capture"); }}
              data-testid="button-retake"
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(253,248,240,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Retake
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  if (step === "capture") {
    return (
      <div className="flex flex-col min-h-screen px-5" style={{ background: "#0d0618" }}>
        <div className="pt-14 pb-6 text-center">
          <h2 className="font-serif text-2xl text-gold mb-1">Take a Selfie</h2>
          <p className="text-cream/50 text-sm">Position your face within the oval and take a clear photo</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div
            className="w-64 h-64 rounded-full flex items-center justify-center"
            style={{ border: "2px dashed rgba(201,168,76,0.4)", background: "rgba(255,255,255,0.03)" }}
          >
            <div className="text-center">
              <Camera size={48} color="rgba(201,168,76,0.4)" className="mx-auto mb-2" />
              <p className="text-cream/30 text-sm">Your face here</p>
            </div>
          </div>
          <div className="w-full space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-take-selfie"
              className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #7b3fa0, #d4608a)", color: "white" }}
            >
              <Camera size={18} />
              Take Selfie / Upload Photo
            </button>
          </div>
          <p className="text-cream/30 text-xs text-center px-4">
            Your photo is only used for identity verification and will not be shown on your profile.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-5" style={{ background: "#0d0618" }}>
      <div className="pt-14 pb-2 text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(201,168,76,0.1)", border: "2px solid rgba(201,168,76,0.3)" }}
        >
          <Shield size={36} color="#c9a84c" />
        </div>
        <h1 className="font-serif text-3xl text-gold mb-2">Verify Your Identity</h1>
        <p className="text-cream/55 text-sm leading-relaxed">
          To keep Gûstîlk safe and authentic, all members must verify their identity with a selfie.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {[
          { num: "1", title: "Take a clear selfie", desc: "Face must be clearly visible, good lighting" },
          { num: "2", title: "Review & submit", desc: "Make sure the photo is not blurry" },
          { num: "3", title: "Wait for approval", desc: "Our team reviews within 24–48 hours" },
        ].map(step => (
          <div key={step.num} className="flex items-start gap-4 px-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
              style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)" }}
            >
              {step.num}
            </div>
            <div>
              <p className="text-cream text-sm font-semibold">{step.title}</p>
              <p className="text-cream/40 text-xs">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pb-10 pt-8 space-y-3">
        <button
          onClick={() => setStep("capture")}
          data-testid="button-start-verification"
          className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
        >
          <Camera size={18} />
          Start Verification
        </button>
        <button
          onClick={() => setLocation("/discover")}
          data-testid="button-skip-verification"
          className="w-full py-3 rounded-xl text-sm font-semibold"
          style={{ color: "rgba(253,248,240,0.35)" }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
