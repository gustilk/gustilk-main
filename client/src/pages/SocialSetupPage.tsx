import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import logoImg from "@assets/Untitled_design_1772022829778.png";
import { MapPin, Loader2, AlertTriangle, Camera, ImagePlus, X, ChevronRight, Shield, LogOut } from "lucide-react";
import type { User } from "@shared/schema";

const COUNTRIES = ["USA", "Canada", "Australia", "Germany", "Holland", "Sweden", "Belgium", "France", "Turkey", "Iraq", "Armenia", "Georgia", "Russia", "UK"];

const AGREEMENT_SECTIONS = [
  { title: "1. Respect the Yezidi Faith", body: "Members must respect and honour the Yezidi religion, its sacred traditions, figures, and practices. Any mockery, disrespect, or misrepresentation is strictly forbidden and may result in immediate account removal." },
  { title: "2. Honour the Community", body: "Treat every member with dignity and respect. Harassment, discrimination, abusive language, or any behaviour that brings shame to the community will not be tolerated." },
  { title: "3. Be Honest", body: "You must represent yourself truthfully. Fake photos, false names, or misleading information is a serious violation. Gûstîlk is built on trust." },
  { title: "4. Caste Integrity", body: "You must register under your true caste — Sheikh, Pir, or Murid. Misrepresenting your caste is a grave dishonour and will result in account deletion." },
  { title: "5. No Harmful Content", body: "Sharing explicit, offensive, or inappropriate content is prohibited — including photos, messages, or media that conflicts with Yezidi values." },
  { title: "6. Serious Intentions", body: "Gûstîlk is for genuine connection with the intention of marriage. It must not be used for casual encounters or purposes conflicting with community values." },
  { title: "7. Privacy & Safety", body: "Do not share another member's personal information without consent. Report any behaviour that makes you or others feel unsafe." },
];

const COUNTRY_NAME_MAP: Record<string, string> = {
  "United States": "USA", "United States of America": "USA",
  "Netherlands": "Holland", "United Kingdom": "UK", "Great Britain": "UK",
  "Germany": "Germany", "Canada": "Canada", "Australia": "Australia",
  "Sweden": "Sweden", "Belgium": "Belgium", "France": "France",
  "Turkey": "Turkey", "Türkiye": "Turkey", "Iraq": "Iraq",
  "Armenia": "Armenia", "Georgia": "Georgia", "Russia": "Russia", "Russian Federation": "Russia",
};

function mapCountry(apiName: string): string | null {
  if (COUNTRY_NAME_MAP[apiName]) return COUNTRY_NAME_MAP[apiName];
  return COUNTRIES.find(c => c.toLowerCase() === apiName.toLowerCase()) ?? null;
}

async function compressImage(file: File, maxPx = 900, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round((height / width) * maxPx); width = maxPx; }
        else { width = Math.round((width / height) * maxPx); height = maxPx; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

type GeoState = "loading" | "detected" | "unsupported" | "error";

interface Props { user: User }

export default function SocialSetupPage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);

  const CASTES = [
    { value: "sheikh", label: t("setup.sheikh") },
    { value: "pir", label: t("setup.pir") },
    { value: "murid", label: t("setup.murid") },
  ];

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.reload();
    },
  });

  // Step 1 state
  const [data, setData] = useState({ caste: "murid", gender: "female", country: "", city: "", age: 22 });
  const [agreedGuidelines, setAgreedGuidelines] = useState(false);
  const [agreedTruthful, setAgreedTruthful] = useState(false);
  const [geoState, setGeoState] = useState<GeoState>("loading");
  const [detectedCountryName, setDetectedCountryName] = useState("");

  // Step 2 state
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  const selfieInputRef = useRef<HTMLInputElement>(null);
  const photoInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      try {
        const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error("geo failed");
        const json = await res.json();
        if (cancelled) return;
        const mapped = mapCountry(json.country_name ?? "");
        if (mapped) {
          setData(d => ({ ...d, country: mapped, city: json.city ? json.city : d.city }));
          setDetectedCountryName(json.country_name ?? mapped);
          setGeoState("detected");
        } else {
          setGeoState("unsupported");
        }
      } catch {
        if (!cancelled) setGeoState("error");
      }
    }
    detect();
    return () => { cancelled = true; };
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...data,
        age: Number(data.age),
        photos: photos.filter(Boolean) as string[],
        verificationSelfie: selfie!,
        verificationStatus: "pending" as const,
      };
      const res = await apiRequest("PUT", "/api/profile", payload);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/discover");
    },
    onError: (err: Error) => {
      toast({ title: "Could not save profile", description: err.message, variant: "destructive" });
    },
  });

  const handlePhotoChange = async (index: number, file: File | null) => {
    if (!file) return;
    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      setPhotos(prev => { const next = [...prev]; next[index] = compressed; return next; });
    } catch {
      toast({ title: "Could not process image", variant: "destructive" });
    } finally {
      setCompressing(false);
    }
  };

  const handleSelfieChange = async (file: File | null) => {
    if (!file) return;
    setCompressing(true);
    try {
      const compressed = await compressImage(file, 600, 0.82);
      setSelfie(compressed);
    } catch {
      toast({ title: "Could not process selfie", variant: "destructive" });
    } finally {
      setCompressing(false);
    }
  };

  const step1Valid = data.country && data.city.trim() && agreedGuidelines && agreedTruthful && Number(data.age) >= 18;
  const step2Valid = photos.filter(Boolean).length === 3 && selfie;
  const canSubmit = step2Valid && !compressing;

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-8" style={{ background: "#0d0618" }}>
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 60% 50% at 20% 10%, rgba(74,30,107,0.8) 0%, transparent 70%)",
      }} />
      <div className="relative z-10 w-full max-w-sm animate-slide-up">

        {/* App name */}
        <div className="text-center mb-5">
          <span className="font-serif text-2xl font-bold" style={{ color: "#c9a84c" }}>Gûstîlk</span>
        </div>

        {/* Top bar — back button + step indicator */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-signout-setup"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(253,248,240,0.6)",
            }}
          >
            <LogOut size={13} />
            {logoutMutation.isPending ? t("setup.signingOut") : t("setup.signOut")}
          </button>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={step === s
                    ? { background: "#c9a84c", color: "#1a0a2e" }
                    : step > s
                      ? { background: "rgba(201,168,76,0.3)", color: "#c9a84c" }
                      : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.1)" }
                  }>
                  {step > s ? "✓" : s}
                </div>
                {s < 2 && <div className="w-8 h-px" style={{ background: step > s ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.1)" }} />}
              </div>
            ))}
          </div>
        </div>

        {/* ── STEP 1: Profile details ── */}
        {step === 1 && (
          <>
            <div className="text-center mb-7">
              <div className="overflow-hidden mx-auto mb-4" style={{ width: "96px", height: "96px" }}>
                <img src={logoImg} alt="Gûstîlk" style={{ width: "200px", height: "200px", objectFit: "contain", position: "relative", top: "50%", left: "50%", transform: "translate(-50%, -46%)", filter: "drop-shadow(0 4px 16px rgba(201,168,76,0.5))" }} />
              </div>
              <h1 className="font-serif text-3xl text-gold mb-1">
                {(() => {
                  const name = (user.fullName ?? user.firstName ?? "").split(" ")[0];
                  return name ? t("setup.welcomeGreeting", { name }) : t("setup.almostThere");
                })()}
              </h1>
              <p className="text-cream/50 text-sm">{t("setup.step1Subtitle")}</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("setup.caste")}</Label>
                  <GoldSelect value={data.caste} onChange={e => setData(d => ({ ...d, caste: e.target.value }))} data-testid="select-caste">
                    {CASTES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </GoldSelect>
                </div>
                <div>
                  <Label>{t("setup.gender")}</Label>
                  <GoldSelect value={data.gender} onChange={e => setData(d => ({ ...d, gender: e.target.value }))} data-testid="select-gender">
                    <option value="female">{t("setup.female")}</option>
                    <option value="male">{t("setup.male")}</option>
                  </GoldSelect>
                </div>
              </div>

              <div>
                <Label>{t("setup.country")}</Label>
                {geoState === "loading" && (
                  <div className="w-full px-4 py-3 rounded-xl flex items-center gap-3"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(201,168,76,0.2)" }}>
                    <Loader2 size={16} className="animate-spin text-gold" />
                    <span className="text-cream/40 text-sm">{t("setup.detectingLocation")}</span>
                  </div>
                )}
                {geoState === "detected" && (
                  <>
                    <div data-testid="display-country" className="w-full px-4 py-3 rounded-xl flex items-center gap-3"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(201,168,76,0.3)" }}>
                      <MapPin size={15} color="#c9a84c" />
                      <span className="text-cream text-sm flex-1">{data.country}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}>Detected</span>
                    </div>
                    {detectedCountryName !== data.country && (
                      <p className="text-cream/30 text-xs mt-1 pl-1">{detectedCountryName}</p>
                    )}
                  </>
                )}
                {(geoState === "error" || geoState === "unsupported") && (
                  <>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <AlertTriangle size={13} color="#f59e0b" />
                      <span className="text-xs" style={{ color: "#f59e0b" }}>
                        {geoState === "unsupported"
                          ? t("setup.countryNotSupported")
                          : t("setup.locationError")}
                      </span>
                    </div>
                    <GoldSelect value={data.country} onChange={e => setData(d => ({ ...d, country: e.target.value }))} data-testid="select-country">
                      <option value="" disabled>Select country…</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </GoldSelect>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("setup.age")}</Label>
                  <input type="number" value={data.age}
                    onChange={e => setData(d => ({ ...d, age: parseInt(e.target.value) || 18 }))}
                    data-testid="input-age"
                    className="w-full px-3 py-3 rounded-xl text-sm text-cream outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }} />
                </div>
                <div>
                  <Label>{t("setup.city")}</Label>
                  <input type="text" placeholder={t("setup.yourCity")} value={data.city}
                    onChange={e => setData(d => ({ ...d, city: e.target.value }))}
                    data-testid="input-city"
                    className="w-full px-3 py-3 rounded-xl text-sm text-cream placeholder-cream/25 outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }} />
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.2)" }}>
                <div className="px-4 py-3" style={{ background: "rgba(201,168,76,0.07)", borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
                  <p className="text-gold font-serif text-sm font-semibold">Gûstîlk — Community Agreement</p>
                  <p className="text-cream/40 text-xs mt-0.5">Gûstîlk is a sacred space. By joining, you agree to uphold the values, traditions, and honour of the Yezidi faith.</p>
                </div>
                <div className="p-4 space-y-3 max-h-52 overflow-y-auto" style={{ background: "rgba(255,255,255,0.02)" }} data-testid="agreement-scroll">
                  {AGREEMENT_SECTIONS.map((s, i) => (
                    <div key={i}>
                      <p className="text-gold/80 text-xs font-semibold mb-0.5">{s.title}</p>
                      <p className="text-cream/45 text-xs leading-relaxed">{s.body}</p>
                    </div>
                  ))}
                  <div className="pt-1" style={{ borderTop: "1px solid rgba(201,168,76,0.12)" }}>
                    <p className="text-cream/40 text-xs leading-relaxed italic">
                      Depending on severity of violations: a warning, temporary suspension, permanent ban, or deletion of your account. The admin team has full authority to enforce these guidelines.
                    </p>
                    <p className="text-gold/60 text-xs mt-2 font-medium">
                      By using Gûstîlk, you honour not just these rules — but the entire Yezidi community.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Checkbox checked={agreedGuidelines} onChange={setAgreedGuidelines} testId="checkbox-guidelines">
                  I have read and agree to the Community Guidelines
                </Checkbox>
                <Checkbox checked={agreedTruthful} onChange={setAgreedTruthful} testId="checkbox-truthful">
                  I confirm that all information I provide is truthful and honest
                </Checkbox>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!step1Valid || geoState === "loading"}
                data-testid="button-next-step"
                className="w-full py-4 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 6px 20px rgba(201,168,76,0.3)" }}
              >
                {geoState === "loading" ? t("setup.detectingLocation") : t("setup.continueToPhotos")}
                <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: Photos + Selfie ── */}
        {step === 2 && (
          <>
            <div className="text-center mb-7">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(201,168,76,0.12)", border: "2px solid rgba(201,168,76,0.3)" }}>
                <Camera size={28} color="#c9a84c" />
              </div>
              <h1 className="font-serif text-2xl text-gold mb-1">Photos & Verification</h1>
              <p className="text-cream/50 text-sm">Step 2 of 2 — Upload your photos</p>
            </div>

            <div className="space-y-6">
              {/* Profile photos */}
              <div>
                <Label>Profile Photos <span className="text-gold normal-case font-normal">(3 required)</span></Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="relative">
                      <input
                        ref={photoInputRefs[idx]}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        data-testid={`input-photo-${idx}`}
                        onChange={e => handlePhotoChange(idx, e.target.files?.[0] ?? null)}
                      />
                      <button
                        type="button"
                        onClick={() => photoInputRefs[idx].current?.click()}
                        data-testid={`button-upload-photo-${idx}`}
                        className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center transition-all relative overflow-hidden"
                        style={photo
                          ? { border: "2px solid rgba(201,168,76,0.5)" }
                          : { background: "rgba(255,255,255,0.04)", border: "2px dashed rgba(201,168,76,0.25)" }}
                      >
                        {photo ? (
                          <img src={photo} className="w-full h-full object-cover rounded-2xl" alt={`Photo ${idx + 1}`} />
                        ) : (
                          <>
                            <ImagePlus size={22} color="rgba(201,168,76,0.4)" />
                            <span className="text-cream/30 text-xs mt-1">Photo {idx + 1}</span>
                          </>
                        )}
                      </button>
                      {photo && (
                        <button
                          type="button"
                          onClick={() => setPhotos(prev => { const next = [...prev]; next[idx] = null; return next; })}
                          data-testid={`button-remove-photo-${idx}`}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: "#d4608a" }}
                        >
                          <X size={11} color="white" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-cream/30 text-xs mt-2 pl-0.5">Choose clear, recent photos of yourself</p>
              </div>

              {/* Verification selfie */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Label>Verification Selfie</Label>
                  <Shield size={12} color="#c9a84c" className="-mt-1" />
                </div>
                <div className="rounded-2xl p-3 mb-3 flex items-start gap-2"
                  style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.18)" }}>
                  <Shield size={14} color="#c9a84c" className="flex-shrink-0 mt-0.5" />
                  <p className="text-cream/50 text-xs leading-relaxed">
                    A clear selfie of your face is required for admin review to verify community membership. It will not be shown to other users.
                  </p>
                </div>

                <input
                  ref={selfieInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  data-testid="input-selfie"
                  onChange={e => handleSelfieChange(e.target.files?.[0] ?? null)}
                />

                {selfie ? (
                  <div className="relative">
                    <img src={selfie} className="w-full h-48 object-cover rounded-2xl"
                      style={{ border: "2px solid rgba(201,168,76,0.4)" }} alt="Verification selfie" />
                    <button
                      type="button"
                      onClick={() => setSelfie(null)}
                      data-testid="button-remove-selfie"
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.6)" }}
                    >
                      <X size={14} color="white" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg flex items-center gap-1.5"
                      style={{ background: "rgba(0,0,0,0.6)" }}>
                      <Shield size={11} color="#c9a84c" />
                      <span className="text-xs text-cream/80">Admin only</span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => selfieInputRef.current?.click()}
                    data-testid="button-take-selfie"
                    className="w-full py-10 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "2px dashed rgba(201,168,76,0.3)" }}
                  >
                    <Camera size={32} color="rgba(201,168,76,0.5)" />
                    <span className="text-cream/40 text-sm">Take selfie or upload photo</span>
                    <span className="text-cream/25 text-xs">Face must be clearly visible</span>
                  </button>
                )}
              </div>

              {/* Progress summary */}
              <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.12)" }}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${photos.filter(Boolean).length === 3 ? "bg-green-400" : "bg-cream/20"}`} />
                  <span className="text-cream/50 text-xs">{photos.filter(Boolean).length}/3 photos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selfie ? "bg-green-400" : "bg-cream/20"}`} />
                  <span className="text-cream/50 text-xs">Selfie {selfie ? "ready" : "required"}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  data-testid="button-back-step"
                  className="px-5 py-4 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  Back
                </button>
                <button
                  onClick={() => mutation.mutate()}
                  disabled={!canSubmit || mutation.isPending}
                  data-testid="button-complete-setup"
                  className="flex-1 py-4 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 6px 20px rgba(201,168,76,0.3)" }}
                >
                  {compressing
                    ? <><Loader2 size={15} className="animate-spin" /> Processing…</>
                    : mutation.isPending
                      ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                      : t("setup.completeProfile")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-cream/50 uppercase tracking-wider mb-1.5 font-semibold">{children}</div>;
}

function Checkbox({ checked, onChange, testId, children }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer" data-testid={testId}>
      <div
        onClick={() => onChange(!checked)}
        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
        style={checked
          ? { background: "#c9a84c" }
          : { border: "1.5px solid rgba(201,168,76,0.4)", background: "rgba(255,255,255,0.05)" }
        }
      >
        {checked && <span className="text-ink text-xs font-bold">✓</span>}
      </div>
      <span className="text-cream/55 text-xs leading-relaxed">{children}</span>
    </label>
  );
}

function GoldSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select {...props}
      className="w-full px-3 py-3 rounded-xl text-sm text-cream outline-none appearance-none"
      style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }}>
      {children}
    </select>
  );
}
