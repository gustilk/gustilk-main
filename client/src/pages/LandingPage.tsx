import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Heart, Shield, Users, Eye, EyeOff, Phone, Mail, ArrowLeft, Globe, ChevronDown, Search, X, Fingerprint } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { LANGUAGE_LIST } from "@/i18n";
import i18n from "@/i18n";
import { COUNTRY_LIST, PINNED_COUNTRY_ISOS } from "@shared/countries";
import newLogo from "@assets/IMG_1901_transparent.png";

function triggerLangPicker() {
  window.dispatchEvent(new Event("gustilk:pick-language"));
}

type Screen = "home" | "email" | "phone";

// ── Password strength ─────────────────────────────────────────────────────────
const COMMON_PASSWORDS_FE = new Set([
  "password","password1","password12","password123","password1234",
  "123456","1234567","12345678","123456789","1234567890",
  "qwerty","qwerty123","qwerty1","qwertyuiop",
  "abc123","abc1234","iloveyou","admin","admin123","welcome","welcome1",
  "monkey","dragon","master","master123","hello","hello123",
  "shadow","sunshine","princess","football","charlie","donald",
  "letmein","696969","superman","batman","trustno1","pass123",
  "111111","000000","987654321","666666","121212","654321",
]);

interface PwStrength { level: 0|1|2|3; label: string; tips: string[]; color: string; }

function getPasswordStrength(pw: string): PwStrength {
  if (!pw) return { level: 0, label: "", tips: [], color: "" };
  if (COMMON_PASSWORDS_FE.has(pw.toLowerCase())) {
    return { level: 0, label: "Too common", tips: ["Choose something more unique"], color: "#ef4444" };
  }
  const tips: string[] = [];
  if (pw.length < 8) tips.push("needs 8+ characters");
  if (!/[0-9]/.test(pw)) tips.push("add a number");
  if (!/[!@#$%^&*()\-_+=[\]{};:'"\\|,.<>/?]/.test(pw)) tips.push("add a special character like !@#$");
  if (!/[A-Z]/.test(pw)) tips.push("add an uppercase letter");
  const level = (pw.length < 8 ? 0 : tips.length === 0 ? 3 : tips.length === 1 ? 2 : 1) as 0|1|2|3;
  const labels = ["Too weak", "Weak", "Fair", "Strong"];
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
  return { level, label: labels[level], tips, color: colors[level] };
}

export default function LandingPage() {
  const [screen, setScreen] = useState<Screen>("home");
  const currentLang = LANGUAGE_LIST.find(l => l.code === i18n.language) ?? LANGUAGE_LIST[0];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "#0d0618" }}>

      <button
        onClick={triggerLangPicker}
        data-testid="button-change-language"
        className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
        style={{
          background: "rgba(201,168,76,0.1)",
          border: "1px solid rgba(201,168,76,0.25)",
          color: "rgba(201,168,76,0.8)",
        }}
      >
        <Globe size={13} />
        {currentLang.flag.startsWith("/") ? (
          <img src={currentLang.flag} alt="" className="rounded-sm object-cover" style={{ width: "18px", height: "13px" }} />
        ) : (
          currentLang.flag
        )} {currentLang.native}
      </button>

      <div className="relative z-10 flex flex-col items-center justify-start flex-1 px-6 pt-12 pb-6 max-w-sm mx-auto w-full">
        {screen === "home" && <HomeScreen onEmail={() => setScreen("email")} onPhone={() => setScreen("phone")} />}
        {screen === "email" && <EmailScreen onBack={() => setScreen("home")} />}
        {screen === "phone" && <PhoneScreen onBack={() => setScreen("home")} />}
      </div>

      <div className="relative z-10 text-center pb-5 px-4 space-y-1.5">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/privacy" data-testid="link-footer-privacy" className="text-cream/25 text-xs hover:text-cream/50 transition-colors">Privacy Policy</Link>
          <span className="text-cream/15 text-xs">·</span>
          <Link href="/terms" data-testid="link-footer-terms" className="text-cream/25 text-xs hover:text-cream/50 transition-colors">Terms</Link>
          <span className="text-cream/15 text-xs">·</span>
          <Link href="/refund" data-testid="link-footer-refund" className="text-cream/25 text-xs hover:text-cream/50 transition-colors">Refunds</Link>
          <span className="text-cream/15 text-xs">·</span>
          <Link href="/guidelines" data-testid="link-footer-guidelines" className="text-cream/25 text-xs hover:text-cream/50 transition-colors">Guidelines</Link>
        </div>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/cookie-policy" data-testid="link-footer-cookie-policy" className="text-cream/20 text-xs hover:text-cream/45 transition-colors">Cookie Policy</Link>
          <span className="text-cream/12 text-xs">·</span>
          <Link href="/gdpr" data-testid="link-footer-gdpr" className="text-cream/20 text-xs hover:text-cream/45 transition-colors">GDPR Notice</Link>
          <span className="text-cream/12 text-xs">·</span>
          <Link href="/safety-tips" data-testid="link-footer-safety-tips" className="text-cream/20 text-xs hover:text-cream/45 transition-colors">Safety Tips</Link>
        </div>
        <p className="text-cream/15 text-xs">© 2026 Gûstîlk · Built with love for the Yezidi community</p>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="text-center mb-5">
      <div className="inline-flex items-center justify-center mb-2">
        <img
          src={newLogo}
          alt="Gûstîlk"
          style={{
            width: "min(100px, 30vw)",
            height: "auto",
            objectFit: "contain",
          }}
        />
      </div>

      <h1 className="font-serif text-5xl font-bold text-gold tracking-wide">Gûstîlk</h1>
      <p className="text-cream/30 text-xs tracking-[0.3em] uppercase mt-1">Yezidi · Community</p>
    </div>
  );
}


function HomeScreen({ onEmail, onPhone }: { onEmail: () => void; onPhone: () => void }) {
  const { t } = useTranslation();
  const features = [
    { icon: <Heart size={20} color="#c9a84c" />, title: t("landing.feature1Title"), desc: t("landing.feature1Desc") },
    { icon: <Shield size={20} color="#c9a84c" />, title: t("landing.feature2Title"), desc: t("landing.feature2Desc") },
    { icon: <Users size={20} color="#c9a84c" />, title: t("landing.feature3Title"), desc: t("landing.feature3Desc") },
  ];

  return (
    <div className="w-full animate-slide-up">
      <Logo />

      <p className="text-cream/50 text-sm text-center mb-8 leading-relaxed">
        {t("auth.tagline")}
      </p>

      <div className="space-y-3 mb-8">
        <button
          onClick={onEmail}
          data-testid="button-email-auth"
          className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-base transition-all"
          style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 8px 32px rgba(201,168,76,0.4)" }}
        >
          <Mail size={20} />
          {t("auth.continueEmail")}
        </button>

        <button
          onClick={onPhone}
          data-testid="button-phone-auth"
          className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-base transition-all"
          style={{ background: "rgba(255,255,255,0.07)", color: "#fdf8f0", border: "1.5px solid rgba(201,168,76,0.3)" }}
        >
          <Phone size={20} />
          {t("auth.continuePhone")}
        </button>
      </div>


      <div className="space-y-2.5">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-3 text-left p-3.5 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.12)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(201,168,76,0.1)" }}>
              {f.icon}
            </div>
            <div>
              <div className="text-cream/90 text-sm font-semibold mb-0.5">{f.title}</div>
              <div className="text-cream/40 text-xs leading-relaxed">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoldInput({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: boolean }) {
  const normalBorder = error ? "rgba(212,96,138,0.7)" : "rgba(201,168,76,0.25)";
  const focusBorder = error ? "rgba(212,96,138,0.9)" : "#c9a84c";
  return (
    <div>
      <label className="block text-cream/60 text-xs font-semibold mb-1.5 uppercase tracking-wider">{label}</label>
      <input
        {...props}
        className="w-full px-4 py-3 rounded-xl text-sm text-cream placeholder-cream/25 outline-none"
        style={{ background: "rgba(255,255,255,0.07)", border: `1.5px solid ${normalBorder}` }}
        onFocus={e => (e.currentTarget.style.borderColor = focusBorder)}
        onBlur={e => (e.currentTarget.style.borderColor = normalBorder)}
      />
    </div>
  );
}

function SubmitButton({ loading, loadingText, disabled, onClick, "data-testid": testId, children }: { loading: boolean; loadingText?: string; disabled?: boolean; onClick?: () => void; "data-testid"?: string; children: string }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      data-testid={testId ?? "button-submit"}
      onClick={onClick}
      className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-60"
      style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 8px 32px rgba(201,168,76,0.4)" }}
    >
      {loading ? (loadingText ?? "Please wait…") : children}
    </button>
  );
}

function EmailScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"login" | "register" | "activate">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(() => localStorage.getItem("gustilk_email") ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [forgotState, setForgotState] = useState<"hidden" | "form" | "sending" | "sent" | "error">("hidden");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [ageStatus, setAgeStatus] = useState<"unchecked" | "confirmed" | "blocked">("unchecked");

  // Activation screen state
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordMismatch = mode === "register" && confirmPassword.length > 0 && password !== confirmPassword;
  const namesValid = mode === "login" || firstName.trim().length > 0;
  const pwStrength = mode === "register" ? getPasswordStrength(password) : null;
  const pwBlocked = mode === "register" && password.length > 0 && (pwStrength?.level ?? 1) === 0;
  const canSubmit = emailValid && namesValid && (mode === "login" || (password.length > 0 && password === confirmPassword && !pwBlocked));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (!emailValid) {
      setEmailError(t("auth.invalidEmail"));
      return;
    }
    setPasswordError(null);
    setEmailError(null);
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const rawRes = await apiRequest("POST", endpoint, {
        email: email.trim(),
        password,
        ...(mode === "register" ? { firstName: firstName.trim(), lastName: lastName.trim() } : {}),
      });
      const res = await rawRes.json();
      localStorage.setItem("gustilk_email", email.trim());
      if (res?.pending) {
        // Registration succeeded — show email activation screen
        setPendingEmail(email.trim());
        setOtpDigits(["", "", "", "", "", ""]);
        setActivationError(null);
        setMode("activate");
        setLoading(false);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/discover");
    } catch (err: any) {
      const raw: string = err.message?.match(/\d+: (.+)/)?.[1] || err.message || "Something went wrong";
      let msg: string;
      try { msg = JSON.parse(raw).message || raw; } catch { msg = raw; }
      const lower = msg.toLowerCase();
      if (lower.includes("verify your email") || lower.includes("activation")) {
        // Account exists but not activated — go to activation screen
        setPendingEmail(email.trim());
        setOtpDigits(["", "", "", "", "", ""]);
        setActivationError(null);
        setMode("activate");
        setLoading(false);
        return;
      }
      if (lower.includes("password") || lower.includes("credentials") || lower.includes("invalid") || lower.includes("incorrect")) {
        setPasswordError(msg);
      } else if (lower.includes("email") || lower.includes("user") || lower.includes("not found") || lower.includes("exist")) {
        setEmailError(msg);
      } else {
        setPasswordError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function activateAccount(e: React.FormEvent) {
    e.preventDefault();
    const code = otpDigits.join("");
    if (code.length < 6) return;
    setActivationError(null);
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/activate", { email: pendingEmail, code });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/discover");
    } catch (err: any) {
      const raw: string = err.message?.match(/\d+: (.+)/)?.[1] || err.message || "Something went wrong";
      let msg: string;
      try { msg = JSON.parse(raw).message || raw; } catch { msg = raw; }
      setActivationError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setResendState("sending");
    try {
      await fetch("/api/auth/resend-activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });
      setResendState("sent");
      setTimeout(() => setResendState("idle"), 30000);
    } catch {
      setResendState("idle");
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = forgotEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setForgotError("Please enter a valid email address.");
      return;
    }
    setForgotState("sending");
    setForgotError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setForgotError(data.error ?? "Something went wrong. Please try again.");
        setForgotState("error");
      } else {
        setForgotState("sent");
      }
    } catch {
      setForgotError("Network error — please check your connection and try again.");
      setForgotState("error");
    }
  }

  return (
    <div className="w-full animate-slide-up">
      <button onClick={onBack} data-testid="button-back" className="flex items-center gap-2 text-cream/50 text-sm mb-6">
        <ArrowLeft size={16} /> {t("common.back")}
      </button>
      <Logo />

      {/* ── Email activation screen ─────────────────────────────────────────── */}
      {mode === "activate" && (
        <div className="animate-slide-up" data-testid="section-activate">
          <div className="rounded-2xl p-5 text-center mb-6" style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.2)" }}>
            <div className="text-3xl mb-2">✉️</div>
            <h2 className="font-serif text-lg text-gold mb-1.5" data-testid="text-activate-title">Check your inbox</h2>
            <p className="text-cream/55 text-sm leading-relaxed">
              We sent a 6-digit code to{" "}
              <span className="font-semibold text-cream/80" data-testid="text-pending-email">{pendingEmail}</span>
            </p>
          </div>

          <form onSubmit={activateAccount} className="space-y-5">
            {/* 6-digit OTP boxes */}
            <div>
              <label className="block text-cream/60 text-xs font-semibold mb-3 uppercase tracking-wider text-center">
                Activation code
              </label>
              <div className="flex gap-2 justify-center">
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    data-testid={`input-otp-${i}`}
                    className="w-12 h-14 text-center text-2xl font-bold rounded-xl outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: `2px solid ${digit ? "rgba(201,168,76,0.6)" : "rgba(201,168,76,0.2)"}`,
                      color: "#fdf8f0",
                      caretColor: "#c9a84c",
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#c9a84c")}
                    onBlur={e => (e.currentTarget.style.borderColor = digit ? "rgba(201,168,76,0.6)" : "rgba(201,168,76,0.2)")}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, "").slice(-1);
                      const next = [...otpDigits];
                      next[i] = val;
                      setOtpDigits(next);
                      setActivationError(null);
                      if (val && i < 5) otpRefs.current[i + 1]?.focus();
                    }}
                    onKeyDown={e => {
                      if (e.key === "Backspace" && !digit && i > 0) {
                        otpRefs.current[i - 1]?.focus();
                      }
                    }}
                    onPaste={e => {
                      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                      if (pasted.length > 0) {
                        const next = Array.from({ length: 6 }, (_, j) => pasted[j] ?? "");
                        setOtpDigits(next);
                        setActivationError(null);
                        e.preventDefault();
                        otpRefs.current[Math.min(pasted.length, 5)]?.focus();
                      }
                    }}
                  />
                ))}
              </div>
              {activationError && (
                <p className="text-xs mt-3 text-center font-medium" style={{ color: "#d4608a" }} data-testid="text-activation-error">
                  {activationError}
                </p>
              )}
            </div>

            <SubmitButton
              loading={loading}
              loadingText="Verifying…"
              disabled={otpDigits.join("").length < 6}
              data-testid="button-activate"
            >
              Verify &amp; continue
            </SubmitButton>
          </form>

          {/* Resend code */}
          <div className="mt-5 text-center space-y-2">
            {resendState === "sent" ? (
              <p className="text-xs font-medium" style={{ color: "#22c55e" }} data-testid="text-resend-sent">
                New code sent — check your inbox
              </p>
            ) : (
              <button
                type="button"
                onClick={resendCode}
                disabled={resendState === "sending"}
                data-testid="button-resend-code"
                className="text-xs font-medium disabled:opacity-50"
                style={{ color: "rgba(201,168,76,0.6)" }}
              >
                {resendState === "sending" ? "Sending…" : "Didn't get it? Resend code"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode("register")}
              data-testid="button-back-to-register"
              className="block w-full text-xs"
              style={{ color: "rgba(253,248,240,0.3)" }}
            >
              ← Back to sign up
            </button>
          </div>
        </div>
      )}

      {mode !== "activate" && <div className="flex rounded-xl p-1 mb-6" style={{ background: "rgba(255,255,255,0.05)" }}>
        {(["login", "register"] as const).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setConfirmPassword(""); setFirstName(""); setLastName(""); if (m === "register") setAgeStatus("unchecked"); }}
            data-testid={`tab-${m}`}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={mode === m
              ? { background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }
              : { color: "rgba(253,248,240,0.4)" }
            }
          >
            {m === "login" ? t("auth.signIn") : t("auth.signUp")}
          </button>
        ))}
      </div>}

      {mode !== "activate" && mode === "register" && ageStatus === "unchecked" && (
        <div className="animate-slide-up space-y-5">
          <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.2)" }}>
            <div className="text-3xl mb-3">🔞</div>
            <h2 className="font-serif text-lg text-gold mb-2" data-testid="text-age-gate-title">{t("ageGate.title")}</h2>
            <p className="text-cream/55 text-sm leading-relaxed">{t("ageGate.body")}</p>
          </div>
          <button
            type="button"
            onClick={() => setAgeStatus("confirmed")}
            data-testid="button-age-yes"
            className="w-full py-3.5 rounded-2xl font-bold text-base"
            style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
          >
            {t("ageGate.confirmYes")}
          </button>
          <button
            type="button"
            onClick={() => setAgeStatus("blocked")}
            data-testid="button-age-no"
            className="w-full py-3.5 rounded-2xl font-semibold text-sm"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(253,248,240,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {t("ageGate.confirmNo")}
          </button>
        </div>
      )}

      {mode !== "activate" && mode === "register" && ageStatus === "blocked" && (
        <div className="animate-slide-up space-y-4">
          <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="text-3xl mb-3">🚫</div>
            <h2 className="font-serif text-lg mb-2" style={{ color: "#ef4444" }} data-testid="text-age-blocked-title">{t("ageGate.blockedTitle")}</h2>
            <p className="text-cream/50 text-sm leading-relaxed">{t("ageGate.blockedBody")}</p>
          </div>
          <button
            type="button"
            onClick={() => { setAgeStatus("unchecked"); setMode("login"); }}
            data-testid="button-age-blocked-back"
            className="w-full py-3 rounded-2xl text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(253,248,240,0.5)" }}
          >
            {t("ageGate.blockedBack")}
          </button>
        </div>
      )}

      {mode !== "activate" && (mode === "login" || ageStatus === "confirmed") && <form onSubmit={submit} className="space-y-4">
        {mode === "register" && (
          <div className="flex gap-3">
            <div className="flex-1">
              <GoldInput
                label={t("auth.firstName")}
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder={t("auth.firstName")}
                data-testid="input-first-name"
                autoComplete="given-name"
                required
              />
            </div>
            <div className="flex-1">
              <GoldInput
                label={t("auth.lastName")}
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder={t("auth.lastName")}
                data-testid="input-last-name"
                autoComplete="family-name"
              />
            </div>
          </div>
        )}

        <div>
          <GoldInput
            label={t("auth.email")}
            type="email"
            name="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setEmailError(null); }}
            placeholder="you@example.com"
            data-testid="input-email"
            autoComplete="email"
            error={!!(emailError || (email.length > 3 && !emailValid))}
            required
          />
          {email.length > 3 && !emailValid && !emailError && (
            <p className="text-xs mt-1.5 font-medium" style={{ color: "#d4608a" }}>{t("auth.invalidEmail")}</p>
          )}
          {emailError && (
            <p className="text-xs mt-1.5 font-medium" style={{ color: "#d4608a" }}>{emailError}</p>
          )}
        </div>

        <div>
          <label className="block text-cream/60 text-xs font-semibold mb-1.5 uppercase tracking-wider">{t("auth.password")}</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              name="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setPasswordError(null); }}
              placeholder={mode === "register" ? t("auth.pwPlaceholderRegister") : t("auth.pwPlaceholderLogin")}
              data-testid="input-password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              required
              className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-cream placeholder-cream/25 outline-none"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: `1.5px solid ${passwordError ? "rgba(212,96,138,0.7)" : "rgba(201,168,76,0.25)"}`,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = passwordError ? "rgba(212,96,138,0.9)" : "#c9a84c")}
              onBlur={e => (e.currentTarget.style.borderColor = passwordError ? "rgba(212,96,138,0.7)" : "rgba(201,168,76,0.25)")}
            />
            <button
              type="button"
              onClick={() => setShowPw(p => !p)}
              data-testid="button-toggle-password"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {passwordError && (
            <p className="text-xs mt-1.5 font-medium" style={{ color: "#d4608a" }}>{passwordError}</p>
          )}

          {/* ── Password strength indicator (register only) ── */}
          {mode === "register" && password.length > 0 && (
            <div className="mt-2.5">
              <div className="flex gap-1.5 mb-1.5">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    data-testid={`bar-pw-strength-${i}`}
                    className="h-1.5 flex-1 rounded-full transition-all duration-300"
                    style={{
                      background: i < pwStrength!.level ? pwStrength!.color : "rgba(255,255,255,0.1)",
                    }}
                  />
                ))}
                {pwStrength!.label && (
                  <span
                    data-testid="text-pw-strength-label"
                    className="text-xs font-semibold leading-none self-center ml-1 whitespace-nowrap"
                    style={{ color: pwStrength!.color }}
                  >
                    {pwStrength!.label}
                  </span>
                )}
              </div>
              {pwStrength!.tips.length > 0 && (
                <ul data-testid="list-pw-tips" className="space-y-0.5">
                  {pwStrength!.tips.map(tip => (
                    <li key={tip} className="text-xs" style={{ color: "rgba(253,248,240,0.4)" }}>
                      • {tip}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {mode === "register" && (
          <div>
            <label className="block text-cream/60 text-xs font-semibold mb-1.5 uppercase tracking-wider">{t("auth.confirmPassword")}</label>
            <div className="relative">
              <input
                type={showConfirmPw ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={t("auth.pwPlaceholderConfirm")}
                data-testid="input-confirm-password"
                autoComplete="new-password"
                required
                className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-cream placeholder-cream/25 outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: `1.5px solid ${passwordMismatch ? "rgba(212,96,138,0.7)" : "rgba(201,168,76,0.25)"}`,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = passwordMismatch ? "rgba(212,96,138,0.7)" : "#c9a84c")}
                onBlur={e => (e.currentTarget.style.borderColor = passwordMismatch ? "rgba(212,96,138,0.7)" : "rgba(201,168,76,0.25)")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPw(p => !p)}
                data-testid="button-toggle-confirm-password"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40"
              >
                {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordMismatch && (
              <p className="text-xs mt-1.5 font-medium" style={{ color: "#d4608a" }}>{t("auth.passwordMismatch")}</p>
            )}
          </div>
        )}

        <SubmitButton loading={loading} loadingText={t("auth.pleaseWait")} disabled={!canSubmit}>
          {mode === "login" ? t("auth.signIn") : t("auth.signUp")}
        </SubmitButton>
      </form>}

      {mode === "login" && (
        <div className="mt-5 text-center">
          {forgotState === "hidden" && (
            <button
              onClick={() => { setForgotState("form"); setForgotEmail(email.trim()); setForgotError(null); }}
              data-testid="button-forgot-password"
              className="text-xs font-medium"
              style={{ color: "rgba(201,168,76,0.6)" }}
            >
              Forgot password?
            </button>
          )}
          {(forgotState === "form" || forgotState === "sending" || forgotState === "error") && (
            <div className="rounded-xl px-4 py-3 text-left" style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.2)" }}>
              <p className="text-xs font-semibold text-gold mb-2">Sign in with a magic link</p>
              <p className="text-xs mb-3" style={{ color: "rgba(253,248,240,0.5)" }}>
                We'll email you a one-click sign-in link that expires in 15 minutes.
              </p>
              <form onSubmit={sendMagicLink} className="space-y-2">
                <input
                  type="email"
                  name="email"
                  placeholder="Your email address"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  data-testid="input-forgot-email"
                  autoComplete="email"
                  className="w-full px-3 py-2 rounded-lg text-sm text-cream placeholder-cream/30 outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(201,168,76,0.25)" }}
                  disabled={forgotState === "sending"}
                  autoFocus
                />
                {forgotError && (
                  <p className="text-xs" style={{ color: "#ef4444" }} data-testid="text-forgot-error">{forgotError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={forgotState === "sending"}
                    data-testid="button-send-magic-link"
                    className="flex-1 py-2 rounded-lg text-xs font-bold disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg,#c9a84c,#e8c97a)", color: "#1a0a2e" }}
                  >
                    {forgotState === "sending" ? "Sending…" : "Send magic link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotState("hidden")}
                    className="px-3 py-2 rounded-lg text-xs"
                    style={{ color: "rgba(253,248,240,0.35)" }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          {forgotState === "sent" && (
            <div className="rounded-xl px-4 py-3 text-left" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "#10b981" }} data-testid="text-magic-link-sent">Magic link sent!</p>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(253,248,240,0.55)" }}>
                Check your inbox at <span className="font-semibold text-cream/80">{forgotEmail}</span>. Click the link in the email to sign in instantly.
              </p>
              <button
                onClick={() => setForgotState("hidden")}
                className="text-xs mt-2"
                style={{ color: "rgba(253,248,240,0.3)" }}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function CountryPicker({
  selected,
  onSelect,
  onClose,
}: {
  selected: typeof COUNTRY_LIST[0];
  onSelect: (c: typeof COUNTRY_LIST[0]) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const pinned = COUNTRY_LIST.filter(c => PINNED_COUNTRY_ISOS.includes(c.iso));
  const rest = COUNTRY_LIST.filter(c => !PINNED_COUNTRY_ISOS.includes(c.iso)).sort((a, b) => a.name.localeCompare(b.name));
  const all = [...pinned, ...rest];

  const filtered = query.trim()
    ? all.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.dial.includes(query))
    : all;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-t-2xl flex flex-col"
        style={{ background: "#120920", border: "1px solid rgba(201,168,76,0.2)", maxHeight: "80vh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-gold font-semibold text-sm">{t("auth.countryCode")}</p>
          <button onClick={onClose} className="text-cream/40 hover:text-cream/70"><X size={18} /></button>
        </div>
        <div className="px-4 py-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/30" />
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t("auth.searchCountry")}
              data-testid="input-country-search"
              className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm text-cream placeholder-cream/25 outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(201,168,76,0.2)" }}
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-2 pb-4">
          {filtered.length === 0 ? (
            <p className="text-cream/30 text-sm text-center py-6">No results</p>
          ) : filtered.map(c => (
            <button
              key={c.iso}
              onClick={() => { onSelect(c); onClose(); }}
              data-testid={`country-option-${c.iso}`}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
              style={selected.iso === c.iso ? { background: "rgba(201,168,76,0.12)" } : {}}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={e => (e.currentTarget.style.background = selected.iso === c.iso ? "rgba(201,168,76,0.12)" : "")}
            >
              <span className="text-xl leading-none">{c.flag}</span>
              <span className="flex-1 text-cream text-sm">{c.name}</span>
              <span className="text-cream/40 text-sm font-mono">{c.dial}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PhoneScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const savedIso = localStorage.getItem("gustilk_country_iso");
  const savedPhone = localStorage.getItem("gustilk_phone") ?? "";
  const [country, setCountry] = useState(
    () => COUNTRY_LIST.find(c => c.iso === savedIso) ?? COUNTRY_LIST[0]
  );
  const [localNumber, setLocalNumber] = useState(savedPhone);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [showLostDeviceMsg, setShowLostDeviceMsg] = useState(false);

  useEffect(() => {
    if (savedIso) return;
    fetch("/api/geo/detect")
      .then(r => r.json())
      .then(({ countryCode }: { countryCode: string | null }) => {
        if (!countryCode) return;
        const match = COUNTRY_LIST.find(c => c.iso === countryCode);
        if (match) setCountry(match);
      })
      .catch(() => {});
  }, []);

  const fullPhone = country.dial + localNumber.replace(/^0+/, "");

  async function handleBiometric(e: React.FormEvent) {
    e.preventDefault();
    if (!localNumber.trim()) return;
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/passkey/options", { phone: fullPhone });
      const { type, options } = await res.json();

      if (type === "register") {
        const { startRegistration } = await import("@simplewebauthn/browser");
        const attResp = await startRegistration({ optionsJSON: options });
        await apiRequest("POST", "/api/auth/passkey/register-verify", attResp);
      } else {
        const { startAuthentication } = await import("@simplewebauthn/browser");
        const assertResp = await startAuthentication({ optionsJSON: options });
        await apiRequest("POST", "/api/auth/passkey/auth-verify", assertResp);
      }

      localStorage.setItem("gustilk_phone", localNumber);
      localStorage.setItem("gustilk_country_iso", country.iso);
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/discover");
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.message?.includes("NotAllowedError")) {
        setBiometricError(t("auth.biometricCancelled"));
        return;
      }
      const raw: string = err.message?.match(/\d+: (.+)/)?.[1] || err.message || "Something went wrong";
      let msg: string;
      try { msg = JSON.parse(raw).message || raw; } catch { msg = raw; }
      setBiometricError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full animate-slide-up">
      {pickerOpen && (
        <CountryPicker
          selected={country}
          onSelect={setCountry}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <button onClick={onBack} data-testid="button-back" className="flex items-center gap-2 text-cream/50 text-sm mb-6">
        <ArrowLeft size={16} /> {t("common.back")}
      </button>
      <Logo />

      <form onSubmit={handleBiometric} className="space-y-4">
        <div>
          <label className="block text-cream/60 text-xs font-semibold mb-1.5 uppercase tracking-wider">{t("auth.phone")}</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              data-testid="button-country-picker"
              className="flex items-center gap-1.5 px-3 py-3 rounded-xl text-sm font-medium shrink-0 transition-all"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1.5px solid rgba(201,168,76,0.25)",
                color: "#fdf8f0",
                minWidth: "96px",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "#c9a84c")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.25)")}
            >
              <span className="text-lg leading-none">{country.flag}</span>
              <span className="text-cream/70 font-mono text-xs">{country.dial}</span>
              <ChevronDown size={12} className="text-cream/30 ml-auto" />
            </button>
            <input
              type="tel"
              value={localNumber}
              onChange={e => setLocalNumber(e.target.value.replace(/[^\d\s\-()]/g, ""))}
              placeholder="123 456 7890"
              data-testid="input-phone"
              required
              className="flex-1 px-4 py-3 rounded-xl text-sm text-cream placeholder-cream/25 outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }}
              onFocus={e => (e.currentTarget.style.borderColor = "#c9a84c")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.25)")}
            />
          </div>
          <p className="text-cream/30 text-xs mt-1.5 text-center">
            {country.flag} {country.name} · {country.dial}
          </p>
        </div>

        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}>
          <Fingerprint size={18} className="text-gold shrink-0 mt-0.5" />
          <p className="text-cream/50 text-xs leading-relaxed">{t("auth.biometricInfo")}</p>
        </div>

        {biometricError && (
          <p className="text-xs text-center font-medium" style={{ color: "#d4608a" }}>{biometricError}</p>
        )}
        <SubmitButton loading={loading} loadingText={t("auth.pleaseWait")} data-testid="button-biometric-submit" onClick={() => setBiometricError(null)}>
          {t("auth.biometricCta")}
        </SubmitButton>
      </form>

      <div className="mt-5 text-center">
        {!showLostDeviceMsg ? (
          <button
            onClick={() => setShowLostDeviceMsg(true)}
            data-testid="button-lost-device"
            className="text-xs font-medium"
            style={{ color: "rgba(201,168,76,0.6)" }}
          >
            Lost access to your device?
          </button>
        ) : (
          <div className="rounded-xl px-4 py-3 text-left" style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.2)" }}>
            <p className="text-xs font-semibold text-gold mb-1">Account recovery</p>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(253,248,240,0.55)" }}>
              Email us at{" "}
              <a
                href="mailto:support@gustilk.com"
                data-testid="link-support-email-device"
                className="font-semibold underline"
                style={{ color: "#c9a84c" }}
              >
                support@gustilk.com
              </a>{" "}
              with the subject line <span className="font-semibold text-cream/70">"Recover my account"</span>. We'll verify your identity and help you register a new passkey within 24 hours.
            </p>
            <button
              onClick={() => setShowLostDeviceMsg(false)}
              className="text-xs mt-2"
              style={{ color: "rgba(253,248,240,0.3)" }}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
