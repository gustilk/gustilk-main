import newLogo from "@assets/IMG_1819_1777576571349_transparent.png";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

import { MapPin, Loader2, AlertTriangle, Camera, ImagePlus, X, ChevronRight, Shield, LogOut, CheckCircle2, ScrollText, ChevronDown } from "lucide-react";
import type { User } from "@shared/schema";
import { PhotoCropModal, compressImage } from "@/components/PhotoCropModal";

import { COUNTRY_STATES } from "@/lib/countryStates";
import { pickPhoto, pickSelfie } from "@/lib/camera";
import { Capacitor } from "@capacitor/core";

const COUNTRIES = ["USA", "Canada", "Australia", "Germany", "Holland", "Sweden", "Belgium", "France", "Turkey", "Iraq", "Armenia", "Georgia", "Russia", "UK"];


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

type GeoState = "loading" | "detected" | "unsupported" | "error";

interface Props { user: User }

export default function SocialSetupPage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3 | "recovery">(1);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySaving, setRecoverySaving] = useState(false);
  const [recoveryDone, setRecoveryDone] = useState(false);

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
      queryClient.setQueryData(["/api/auth/me"], null);
    },
  });

  // Step 1 state
  const [data, setData] = useState({ caste: "murid", gender: "female", country: "", state: "", city: "", dateOfBirth: "" });
  const [agreedGuidelines, setAgreedGuidelines] = useState(false);
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(true);
  const [agreedTruthful, setAgreedTruthful] = useState(false);
  const [geoState, setGeoState] = useState<GeoState>("loading");
  const [detectedCountryName, setDetectedCountryName] = useState("");

  // Step 2.5 / Step 3 privacy state (for female users only)
  const [privacyData, setPrivacyData] = useState({ photosBlurred: false });

  // Step 2 state
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<{ imgSrc: string; index: number | "selfie" } | null>(null);
  const [selfieChecking, setSelfieChecking] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selfieInputRef = useRef<HTMLInputElement>(null);
  const photoInputRefs = [
    useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
  ];

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
      const dob = new Date(data.dateOfBirth);
      const today = new Date();
      let calculatedAge = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) calculatedAge--;
      const isFemale = data.gender === "female";
      const payload = {
        ...data,
        age: calculatedAge,
        photos: photos.filter(Boolean) as string[],
        verificationSelfie: selfie!,
        verificationStatus: "pending" as const,
        profileVisible: true,
        ...(isFemale ? {
          photosBlurred: privacyData.photosBlurred,
        } : {
          photosBlurred: false,
        }),
      };
      const res = await apiRequest("PUT", "/api/profile", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      if (user.phone && !user.email) {
        setStep("recovery");
      } else {
        setLocation("/discover");
      }
    },
    onError: (err: Error) => {
      try {
        const jsonStart = err.message.indexOf("{");
        if (jsonStart !== -1) {
          const parsed = JSON.parse(err.message.slice(jsonStart));
          setSaveError(parsed.error || t("setup.couldNotSave"));
        } else {
          setSaveError(err.message || t("setup.couldNotSave"));
        }
      } catch {
        setSaveError(err.message || t("setup.couldNotSave"));
      }
    },
  });

  const openCrop = (file: File, index: number | "selfie") => {
    const reader = new FileReader();
    reader.onload = e => {
      if (e.target?.result) setCropTarget({ imgSrc: e.target.result as string, index });
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoChange = (index: number, file: File | null) => {
    if (!file) return;
    openCrop(file, index);
  };

  const handleSelfieChange = (file: File | null) => {
    if (!file) return;
    openCrop(file, "selfie");
  };

  const handleCropConfirm = async (base64: string) => {
    if (!cropTarget) return;
    setCropTarget(null);
    if (cropTarget.index === "selfie") {
      setSelfieChecking(true);
      try {
        const res = await apiRequest("POST", "/api/check-face", { image: base64 });
        const result = await res.json() as { faceDetected: boolean; reason?: string };
        if (!result.faceDetected) {
          toast({
            title: t("setup.faceCheckTitle"),
            description: t("setup.faceCheckDesc"),
            variant: "destructive",
          });
          setSelfie(null);
          if (selfieInputRef.current) selfieInputRef.current.value = "";
        } else {
          setSelfie(base64);
        }
      } catch {
        toast({
          title: t("setup.faceCheckTitle"),
          description: t("setup.faceCheckDesc"),
          variant: "destructive",
        });
        setSelfie(null);
        if (selfieInputRef.current) selfieInputRef.current.value = "";
      } finally {
        setSelfieChecking(false);
      }
    } else {
      setPhotos(prev => { const next = [...prev]; next[cropTarget.index as number] = base64; return next; });
    }
  };

  const isAtLeast18 = (dob: string) => {
    if (!dob) return false;
    const d = new Date(dob);
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 18);
    return d <= cutoff;
  };
  const maxDobDate = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().split("T")[0]; })();
  const countryHasStates = !!COUNTRY_STATES[data.country];
  const isFemale = data.gender === "female";
  const totalSteps = isFemale ? 3 : 2;
  const step1Valid = data.country && (!countryHasStates || data.state) && data.city.trim() && agreedGuidelines && agreedTruthful && isAtLeast18(data.dateOfBirth);
  const step2Valid = photos.filter(Boolean).length >= 1 && selfie;
  const canSubmit = step2Valid && !cropTarget && !selfieChecking;

  return (
    <>
    {cropTarget && (
      <PhotoCropModal
        imgSrc={cropTarget.imgSrc}
        outputSize={cropTarget.index === "selfie" ? 500 : 800}
        onConfirm={handleCropConfirm}
        onCancel={() => setCropTarget(null)}
      />
    )}
    {showGuidelinesModal && (
      <CommunityGuidelinesModal
        onAgree={() => setAgreedGuidelines(true)}
        onClose={() => setShowGuidelinesModal(false)}
      />
    )}
    <div className="min-h-screen flex items-center justify-center px-5 py-8" style={{ background: "#0d0618" }}>
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
          {step !== "recovery" && (
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={step === s
                    ? { background: "#c9a84c", color: "#1a0a2e" }
                    : (step as number) > s
                      ? { background: "rgba(201,168,76,0.3)", color: "#c9a84c" }
                      : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.1)" }
                  }>
                  {(step as number) > s ? "✓" : s}
                </div>
                {s < totalSteps && <div className="w-8 h-px" style={{ background: (step as number) > s ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.1)" }} />}
              </div>
            ))}
          </div>
          )}
        </div>

        {/* ── STEP 1: Profile details ── */}
        {step === 1 && (
          <>
            <div className="text-center mb-7">
              <img src={newLogo} alt="Gûstîlk" className="mx-auto mb-4" style={{ width: "140px", height: "140px", objectFit: "contain", filter: "none" }} />
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
                        style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}>{t("setup.detected")}</span>
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
                    <GoldSelect value={data.country} onChange={e => setData(d => ({ ...d, country: e.target.value, state: "" }))} data-testid="select-country">
                      <option value="" disabled>{t("setup.selectCountry")}</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </GoldSelect>
                  </>
                )}
              </div>

              {countryHasStates && (
                <div>
                  <Label>{t("setup.stateProvince")}</Label>
                  <GoldSelect
                    value={data.state}
                    onChange={e => setData(d => ({ ...d, state: e.target.value }))}
                    data-testid="select-state"
                  >
                    <option value="" disabled>{t("setup.selectState")}</option>
                    {COUNTRY_STATES[data.country].map(s => <option key={s} value={s}>{s}</option>)}
                  </GoldSelect>
                </div>
              )}

              <div>
                <Label>Date of Birth</Label>
                <input
                  type="date"
                  value={data.dateOfBirth}
                  max={maxDobDate}
                  min="1930-01-01"
                  onChange={e => setData(d => ({ ...d, dateOfBirth: e.target.value }))}
                  data-testid="input-date-of-birth"
                  className="w-full px-3 py-3 rounded-xl text-sm text-cream outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: `1.5px solid ${data.dateOfBirth && !isAtLeast18(data.dateOfBirth) ? "rgba(212,96,138,0.6)" : "rgba(201,168,76,0.25)"}`, colorScheme: "dark" }}
                />
                {data.dateOfBirth && !isAtLeast18(data.dateOfBirth) && (
                  <p className="text-xs mt-1" style={{ color: "#d4608a" }}>{t("setup.minAge18")}</p>
                )}
              </div>

              <div>
                <Label>{t("setup.city")}</Label>
                <input type="text" placeholder={t("setup.yourCity")} value={data.city}
                  onChange={e => setData(d => ({ ...d, city: e.target.value }))}
                  data-testid="input-city"
                  className="w-full px-3 py-3 rounded-xl text-sm text-cream placeholder-cream/25 outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }} />
              </div>

              <button
                type="button"
                onClick={() => setShowGuidelinesModal(true)}
                data-testid="button-open-guidelines"
                className="w-full rounded-2xl px-4 py-4 flex items-center gap-3 transition-all active:scale-98"
                style={agreedGuidelines
                  ? { background: "rgba(201,168,76,0.1)", border: "1.5px solid rgba(201,168,76,0.5)" }
                  : { background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)" }
                }
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: agreedGuidelines ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.06)" }}>
                  {agreedGuidelines
                    ? <CheckCircle2 size={20} color="#c9a84c" />
                    : <ScrollText size={20} color="rgba(201,168,76,0.5)" />
                  }
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold" style={{ color: agreedGuidelines ? "#c9a84c" : "rgba(253,248,240,0.7)" }}>
                    {t("agreement.guidelinesButtonTitle")}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: agreedGuidelines ? "rgba(201,168,76,0.6)" : "rgba(253,248,240,0.3)" }}>
                    {agreedGuidelines ? t("agreement.guidelinesButtonAgreed") : t("agreement.guidelinesButtonRequired")}
                  </p>
                </div>
                <ChevronDown size={16} color="rgba(201,168,76,0.4)" />
              </button>

              <div className="space-y-3">
                <Checkbox checked={agreedTruthful} onChange={setAgreedTruthful} testId="checkbox-truthful">
                  {t("agreement.truthfulCheckbox")}
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

        {/* ── STEP 2 (Female only): Privacy settings ── */}
        {step === 2 && isFemale && (
          <>
            <div className="text-center mb-7">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(201,168,76,0.12)", border: "2px solid rgba(201,168,76,0.3)" }}>
                <Shield size={28} color="#c9a84c" />
              </div>
              <h1 className="font-serif text-2xl text-gold mb-1">Your Privacy</h1>
              <p className="text-cream/50 text-sm">Choose how your profile appears to others. You can change these anytime in Settings.</p>
            </div>

            <div className="space-y-4">
              {/* Photo blur */}
              <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(201,168,76,0.2)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: "rgba(253,248,240,0.9)" }}>Blur Photos Until Matched</p>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(253,248,240,0.45)" }}>
                      {privacyData.photosBlurred
                        ? "On — your photos appear blurred to others until you both like each other (match). Matched users always see your photos clearly."
                        : "Off — your photos are visible to everyone who views your profile."}
                    </p>
                  </div>
                  <button
                    data-testid="toggle-setup-photos-blurred"
                    onClick={() => setPrivacyData(d => ({ ...d, photosBlurred: !d.photosBlurred }))}
                    className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none mt-0.5"
                    style={{ background: privacyData.photosBlurred ? "#c9a84c" : "rgba(255,255,255,0.12)" }}
                    aria-checked={privacyData.photosBlurred}
                    role="switch"
                  >
                    <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200"
                      style={{ background: "white", transform: privacyData.photosBlurred ? "translateX(20px)" : "translateX(0)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                  </button>
                </div>
              </div>

              <div className="rounded-xl px-4 py-3 flex items-start gap-3"
                style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}>
                <Shield size={14} color="#c9a84c" className="flex-shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed" style={{ color: "rgba(253,248,240,0.5)" }}>
                  These settings can be changed anytime from your Privacy Settings in the app.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  data-testid="button-back-privacy-setup"
                  className="px-5 py-4 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  data-testid="button-next-privacy"
                  className="flex-1 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 6px 20px rgba(201,168,76,0.3)" }}
                >
                  {t("setup.continueToPhotos")}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── RECOVERY EMAIL (phone users only, after profile saved) ── */}
        {step === "recovery" && (
          <>
            <div className="text-center mb-7">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(201,168,76,0.12)", border: "2px solid rgba(201,168,76,0.3)" }}>
                {recoveryDone
                  ? <CheckCircle2 size={28} color="#10b981" />
                  : <CheckCircle2 size={28} color="#c9a84c" />}
              </div>
              <h1 className="font-serif text-2xl text-gold mb-1">{t("setup.recoveryEmailTitle")}</h1>
              <p className="text-cream/50 text-sm">{t("setup.recoveryEmailSubtitle")}</p>
            </div>

            {recoveryDone ? (
              <div className="text-center space-y-4">
                <div className="rounded-2xl p-4" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
                  <p className="text-green-400 text-sm font-semibold">{t("settings.recoveryEmailSaved")}</p>
                </div>
                <button
                  onClick={() => setLocation("/discover")}
                  className="w-full py-4 rounded-xl font-bold text-sm"
                  style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 6px 20px rgba(201,168,76,0.3)" }}>
                  {t("setup.continueToApp")}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder={t("settings.emailAddress")}
                  value={recoveryEmail}
                  onChange={e => setRecoveryEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm text-cream placeholder-cream/25 outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }}
                />
                <button
                  onClick={async () => {
                    if (!recoveryEmail.trim()) { setLocation("/discover"); return; }
                    setRecoverySaving(true);
                    try {
                      await apiRequest("PATCH", "/api/auth/add-recovery-email", { email: recoveryEmail.trim() });
                      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                      setRecoveryDone(true);
                    } catch {
                      setLocation("/discover");
                    } finally {
                      setRecoverySaving(false);
                    }
                  }}
                  disabled={recoverySaving}
                  className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 6px 20px rgba(201,168,76,0.3)" }}>
                  {recoverySaving ? <Loader2 size={15} className="animate-spin" /> : t("settings.saveRecoveryEmail")}
                </button>
                <button
                  onClick={() => setLocation("/discover")}
                  className="w-full py-3 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {t("setup.skipForNow")}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── STEP 2 (Male) / STEP 3 (Female): Photos + Selfie ── */}
        {((step === 2 && !isFemale) || (step === 3 && isFemale)) && (
          <>
            <div className="text-center mb-7">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(201,168,76,0.12)", border: "2px solid rgba(201,168,76,0.3)" }}>
                <Camera size={28} color="#c9a84c" />
              </div>
              <h1 className="font-serif text-2xl text-gold mb-1">{t("setup.step2Title")}</h1>
              <p className="text-cream/50 text-sm">{t("setup.step2Subtitle")}</p>
            </div>

            <div className="space-y-6">
              {/* Profile photos */}
              <div>
                <Label>{t("setup.profilePhotosLabel")} <span className="text-gold normal-case font-normal">{t("setup.photosRequired")}</span></Label>
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
                        onClick={async () => {
                          if (Capacitor.isNativePlatform()) {
                            const result = await pickPhoto("prompt");
                            if (result) setCropTarget({ imgSrc: result.dataUrl, index: idx });
                          } else {
                            photoInputRefs[idx].current?.click();
                          }
                        }}
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
                <p className="text-cream/30 text-xs mt-2 pl-0.5">At least 1 photo required · up to 3</p>
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
                    {t("setup.selfieAdminNote")}
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

                {selfieChecking ? (
                  <div className="w-full h-36 rounded-2xl flex flex-col items-center justify-center gap-3"
                    style={{ background: "rgba(201,168,76,0.06)", border: "2px solid rgba(201,168,76,0.25)" }}>
                    <Loader2 size={28} color="#c9a84c" className="animate-spin" />
                    <span className="text-cream/60 text-sm font-medium">{t("setup.faceChecking")}</span>
                  </div>
                ) : selfie ? (
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
                      <span className="text-xs text-cream/80">{t("setup.adminOnly")}</span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      if (Capacitor.isNativePlatform()) {
                        const result = await pickSelfie();
                        if (result) setCropTarget({ imgSrc: result.dataUrl, index: "selfie" });
                      } else {
                        selfieInputRef.current?.click();
                      }
                    }}
                    data-testid="button-take-selfie"
                    className="w-full py-10 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "2px dashed rgba(201,168,76,0.3)" }}
                  >
                    <Camera size={32} color="rgba(201,168,76,0.5)" />
                    <span className="text-cream/40 text-sm">{t("setup.takeSelfie")}</span>
                    <span className="text-cream/25 text-xs">{t("setup.selfieVisible")}</span>
                  </button>
                )}
              </div>

              {/* Progress summary */}
              <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.12)" }}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${photos.filter(Boolean).length >= 2 ? "bg-green-400" : "bg-cream/20"}`} />
                  <span className="text-cream/50 text-xs">{photos.filter(Boolean).length}/2 photos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selfie ? "bg-green-400" : selfieChecking ? "bg-gold/60" : "bg-cream/20"}`} />
                  <span className="text-cream/50 text-xs">{selfieChecking ? t("setup.faceChecking") : selfie ? t("setup.selfieReady") : t("setup.selfieRequiredStatus")}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(isFemale ? 2 : 1)}
                  data-testid="button-back-step"
                  className="px-5 py-4 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  {t("common.back")}
                </button>
                {saveError && (
                  <p className="w-full text-xs text-center font-medium mb-1" style={{ color: "#d4608a" }}>{saveError}</p>
                )}
                <button
                  onClick={() => { setSaveError(null); mutation.mutate(); }}
                  disabled={!canSubmit || mutation.isPending}
                  data-testid="button-complete-setup"
                  className="flex-1 py-4 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 6px 20px rgba(201,168,76,0.3)" }}
                >
                  {mutation.isPending
                    ? <><Loader2 size={15} className="animate-spin" /> {t("setup.saving")}</>
                    : t("setup.completeProfile")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}

function CommunityGuidelinesModal({ onAgree, onClose }: { onAgree: () => void; onClose: () => void }) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
    if (atBottom) setHasScrolledToBottom(true);
  };

  const sections = t("agreement.sections", { returnObjects: true }) as Array<{ title: string; body: string }>;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0d0618" }}>
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(74,30,107,0.7) 0%, transparent 70%)",
      }} />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex-shrink-0 px-5 pt-12 pb-6 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(201,168,76,0.12)", border: "2px solid rgba(201,168,76,0.3)" }}>
            <ScrollText size={26} color="#c9a84c" />
          </div>
          <h1 className="font-serif text-2xl font-bold" style={{ color: "#c9a84c" }}>{t("agreement.guidelinesTitle")}</h1>
          <p className="text-cream/40 text-sm mt-1">{t("agreement.readCarefully")}</p>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 pb-4 space-y-5"
        >
          {Array.isArray(sections) && sections.map((s, i) => (
            <div key={i} className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.12)" }}>
              <p className="font-serif font-semibold mb-2" style={{ color: "#c9a84c" }}>{s.title}</p>
              <p className="text-cream/60 text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}

          <div className="rounded-2xl p-4"
            style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
            <p className="text-cream/50 text-sm leading-relaxed italic">
              {t("agreement.footerWarning")}
            </p>
            <p className="text-sm mt-3 font-medium" style={{ color: "#c9a84c" }}>
              {t("agreement.footerHonour")}
            </p>
          </div>

          {!hasScrolledToBottom && (
            <div className="flex flex-col items-center gap-1 py-2 opacity-50">
              <ChevronDown size={18} color="#c9a84c" className="animate-bounce" />
              <span className="text-xs text-cream/40">{t("agreement.scrollToContinue")}</span>
            </div>
          )}

          <div className="h-4" />
        </div>

        <div className="flex-shrink-0 px-5 pb-10 pt-4 space-y-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(13,6,24,0.95)" }}>
          <button
            onClick={() => { onAgree(); onClose(); }}
            disabled={!hasScrolledToBottom}
            data-testid="button-agree-guidelines"
            className="w-full py-4 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: hasScrolledToBottom ? "0 6px 20px rgba(201,168,76,0.35)" : "none" }}
          >
            {hasScrolledToBottom ? t("agreement.agreeButton") : t("agreement.readFirst")}
          </button>
        </div>
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
