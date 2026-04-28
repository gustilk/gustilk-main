import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Camera, CheckCircle, ArrowRight, Shield, RotateCcw, Sun, AlertCircle } from "lucide-react";
import type { SafeUser } from "@shared/schema";

interface Props { user: SafeUser }

function calcBrightness(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) return 128;
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  let total = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4 * 8) {
    total += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    count++;
  }
  return count > 0 ? total / count : 128;
}

export default function VerificationPage({ user }: Props) {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"intro" | "camera" | "preview" | "checking" | "done">("intro");
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [brightnessWarn, setBrightnessWarn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setBrightnessWarn(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch {
      setCameraError("Camera not available. Please allow camera access and try again.");
    }
  }, []);

  useEffect(() => {
    if (step === "camera") startCamera();
    if (step !== "camera") stopStream();
  }, [step, startCamera, stopStream]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const size = Math.min(video.videoWidth || 640, video.videoHeight || 640);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ox = (video.videoWidth - size) / 2;
    const oy = (video.videoHeight - size) / 2;
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, ox, oy, size, size, -size, 0, size, size);
    ctx.restore();

    const brightness = calcBrightness(canvas);
    if (brightness < 35) {
      setBrightnessWarn(true);
      return;
    }
    setBrightnessWarn(false);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    stopStream();
    setSelfieData(dataUrl);
    setStep("preview");
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selfieData) throw new Error("No selfie captured.");

      setStep("checking");

      const checkRes = await apiRequest("POST", "/api/check-face", { image: selfieData });
      const checkData = await checkRes.json();
      if (!checkData.faceDetected) {
        throw new Error(
          checkData.reason ??
          "No clear face detected. Please face the camera directly in good lighting and try again."
        );
      }

      const res = await apiRequest("PUT", "/api/profile", {
        verificationSelfie: selfieData,
        verificationStatus: "pending",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Submission failed. Please try again.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setStep("done");
    },
    onError: (err: any) => {
      setSubmitError(err.message ?? "Submission failed. Please try again.");
      setStep("preview");
    },
  });

  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center" style={{ background: "#0d0618" }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
          style={{ background: "rgba(16,185,129,0.15)", border: "2px solid rgba(16,185,129,0.4)" }}>
          <CheckCircle size={44} color="#10b981" />
        </div>
        <h2 className="font-serif text-3xl text-gold mb-2">Submitted!</h2>
        <p className="text-cream/60 text-sm mb-2">Your selfie has been received.</p>
        <p className="text-cream/40 text-sm mb-8">Our team will review it within 24–48 hours. You'll be notified once verified.</p>
        <button onClick={() => setLocation("/discover")} data-testid="button-continue"
          className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm"
          style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}>
          Continue to App <ArrowRight size={17} />
        </button>
      </div>
    );
  }

  if (step === "checking") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-5" style={{ background: "#0d0618" }}>
        <div className="w-14 h-14 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-cream/60 text-sm">Checking your selfie…</p>
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
          <div className="w-64 h-64 rounded-full overflow-hidden"
            style={{ border: "3px solid rgba(201,168,76,0.5)", boxShadow: "0 0 40px rgba(201,168,76,0.2)" }}>
            <img src={selfieData} alt="Selfie preview" className="w-full h-full object-cover" />
          </div>

          {submitError && (
            <div className="w-full rounded-2xl px-4 py-3 flex items-start gap-3"
              style={{ background: "rgba(212,96,138,0.12)", border: "1px solid rgba(212,96,138,0.3)" }}>
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" color="#d4608a" />
              <p className="text-sm" style={{ color: "#d4608a" }}>{submitError}</p>
            </div>
          )}

          <div className="w-full space-y-3">
            <button onClick={() => { setSubmitError(null); submitMutation.mutate(); }}
              disabled={submitMutation.isPending}
              data-testid="button-submit-selfie"
              className="w-full py-4 rounded-xl font-bold text-sm disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}>
              {submitMutation.isPending ? "Checking & submitting…" : "Submit for Verification"}
            </button>
            <button onClick={() => { setSelfieData(null); setSubmitError(null); setStep("camera"); }}
              data-testid="button-retake"
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(253,248,240,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <RotateCcw size={15} /> Retake
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "camera") {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: "#0d0618" }}>
        <div className="pt-12 pb-4 text-center px-5">
          <h2 className="font-serif text-2xl text-gold mb-1">Take a Selfie</h2>
          <p className="text-cream/50 text-sm">Centre your face in the oval and tap Capture</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative px-5 gap-4">
          <div className="relative w-72 h-72">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              data-testid="camera-preview"
              className="w-full h-full object-cover rounded-full"
              style={{
                transform: "scaleX(-1)",
                border: "3px solid rgba(201,168,76,0.5)",
                background: "#1a0a2e",
                boxShadow: "0 0 40px rgba(201,168,76,0.15)",
              }}
            />
            <div className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: "2px dashed rgba(201,168,76,0.4)" }} />
          </div>

          {cameraError && (
            <div className="w-full rounded-2xl px-4 py-3 flex items-start gap-3"
              style={{ background: "rgba(212,96,138,0.12)", border: "1px solid rgba(212,96,138,0.3)" }}>
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" color="#d4608a" />
              <p className="text-sm" style={{ color: "#d4608a" }}>{cameraError}</p>
            </div>
          )}

          {brightnessWarn && (
            <div className="w-full rounded-2xl px-4 py-3 flex items-start gap-3"
              style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)" }}>
              <Sun size={18} className="flex-shrink-0 mt-0.5" color="#c9a84c" />
              <p className="text-sm text-gold">Too dark — move to a brighter area and try again.</p>
            </div>
          )}

          <div className="w-full space-y-3">
            <button onClick={capturePhoto} data-testid="button-capture"
              className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #7b3fa0, #d4608a)", color: "white" }}>
              <Camera size={18} /> Capture Photo
            </button>
          </div>

          <p className="text-cream/25 text-xs text-center px-4">
            Your selfie is only used for identity verification and will not be shown on your profile.
          </p>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-5" style={{ background: "#0d0618" }}>
      <div className="pt-14 pb-2 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(201,168,76,0.1)", border: "2px solid rgba(201,168,76,0.3)" }}>
          <Shield size={36} color="#c9a84c" />
        </div>
        <h1 className="font-serif text-3xl text-gold mb-2">Verify Your Identity</h1>
        <p className="text-cream/55 text-sm leading-relaxed">
          To keep Gûstîlk safe and authentic, all members must verify their identity with a selfie.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {[
          { num: "1", title: "Take a clear selfie", desc: "Face forward, good lighting, no sunglasses" },
          { num: "2", title: "Face check", desc: "We verify a face is visible before submitting" },
          { num: "3", title: "Wait for approval", desc: "Our team reviews within 24–48 hours" },
        ].map(s => (
          <div key={s.num} className="flex items-start gap-4 px-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
              style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)" }}>
              {s.num}
            </div>
            <div>
              <p className="text-cream text-sm font-semibold">{s.title}</p>
              <p className="text-cream/40 text-xs">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pb-10 pt-8 space-y-3">
        <button onClick={() => setStep("camera")} data-testid="button-start-verification"
          className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}>
          <Camera size={18} /> Start Verification
        </button>
        <button onClick={() => setLocation("/discover")} data-testid="button-skip-verification"
          className="w-full py-3 rounded-xl text-sm font-semibold"
          style={{ color: "rgba(253,248,240,0.35)" }}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
