import { useState } from "react";
import { Heart, Shield, Users, Eye, EyeOff, Phone, Mail, ArrowLeft, Globe } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { LANGUAGE_LIST } from "@/i18n";
import i18n from "@/i18n";

function triggerLangPicker() {
  window.dispatchEvent(new Event("gustilk:pick-language"));
}

type Screen = "home" | "email" | "phone";

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

      <div className="relative z-10 text-center pb-5">
        <p className="text-cream/20 text-xs">© 2026 Gûstîlk · Built with love for the Yezidi community</p>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="text-center mb-5">
      <div className="relative inline-flex items-center justify-center mb-1" style={{ perspective: "600px" }}>
        <img
          src="/logo-transparent.png"
          alt="Gûstîlk"
          className="relative logo-flip"
          style={{
            width: "min(80px, 26vw)",
            height: "auto",
            objectFit: "contain",
            filter: "drop-shadow(0 4px 24px rgba(201,168,76,0.5))",
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

function GoldInput({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="block text-cream/60 text-xs font-semibold mb-1.5 uppercase tracking-wider">{label}</label>
      <input
        {...props}
        className="w-full px-4 py-3 rounded-xl text-sm text-cream placeholder-cream/25 outline-none"
        style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }}
        onFocus={e => (e.currentTarget.style.borderColor = "#c9a84c")}
        onBlur={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.25)")}
      />
    </div>
  );
}

function SubmitButton({ loading, loadingText, disabled, children }: { loading: boolean; loadingText?: string; disabled?: boolean; children: string }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      data-testid="button-submit"
      className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-60"
      style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 8px 32px rgba(201,168,76,0.4)" }}
    >
      {loading ? (loadingText ?? "Please wait…") : children}
    </button>
  );
}

function EmailScreen({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordMismatch = mode === "register" && confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit = mode === "login" || (password.length > 0 && password === confirmPassword);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      await apiRequest("POST", endpoint, { email, password });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (err: any) {
      const msg = await err.message?.match(/\d+: (.+)/)?.[1] || err.message;
      toast({ title: t("auth.errorTitle"), description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full animate-slide-up">
      <button onClick={onBack} data-testid="button-back" className="flex items-center gap-2 text-cream/50 text-sm mb-6">
        <ArrowLeft size={16} /> {t("common.back")}
      </button>
      <Logo />

      <div className="flex rounded-xl p-1 mb-6" style={{ background: "rgba(255,255,255,0.05)" }}>
        {(["login", "register"] as const).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setConfirmPassword(""); }}
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
      </div>

      <form onSubmit={submit} className="space-y-4">
        <GoldInput label={t("auth.email")} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" data-testid="input-email" required />

        <div>
          <label className="block text-cream/60 text-xs font-semibold mb-1.5 uppercase tracking-wider">{t("auth.password")}</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === "register" ? t("auth.pwPlaceholderRegister") : t("auth.pwPlaceholderLogin")}
              data-testid="input-password"
              required
              className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-cream placeholder-cream/25 outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }}
              onFocus={e => (e.currentTarget.style.borderColor = "#c9a84c")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.25)")}
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
      </form>
    </div>
  );
}

function PhoneScreen({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/send-otp", { phone });
      setStep("otp");
      toast({ title: t("auth.codeSentTitle"), description: t("auth.codeSentDesc", { phone }) });
    } catch (err: any) {
      const msg = err.message?.match(/\d+: (.+)/)?.[1] || err.message;
      toast({ title: t("auth.errorTitle"), description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/verify-otp", { phone, code });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (err: any) {
      const msg = err.message?.match(/\d+: (.+)/)?.[1] || err.message;
      toast({ title: t("auth.errorTitle"), description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full animate-slide-up">
      <button onClick={() => step === "otp" ? setStep("phone") : onBack()} data-testid="button-back" className="flex items-center gap-2 text-cream/50 text-sm mb-6">
        <ArrowLeft size={16} /> {t("common.back")}
      </button>
      <Logo />

      {step === "phone" ? (
        <form onSubmit={sendOtp} className="space-y-4">
          <GoldInput
            label={t("auth.phone")}
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+49 123 456 7890"
            data-testid="input-phone"
            required
          />
          <p className="text-cream/35 text-xs text-center">{t("auth.otpHint")}</p>
          <SubmitButton loading={loading} loadingText={t("auth.pleaseWait")}>{t("auth.sendCode")}</SubmitButton>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <p className="text-cream/60 text-sm text-center mb-2">
            {t("auth.otpEnterCode")} <span className="text-gold font-semibold">{phone}</span>
          </p>
          <GoldInput
            label={t("auth.otpCode")}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            data-testid="input-otp"
            required
          />
          <SubmitButton loading={loading} loadingText={t("auth.pleaseWait")}>{t("auth.verifyAndContinue")}</SubmitButton>
          <button
            type="button"
            onClick={() => { setCode(""); sendOtp(new Event("") as any); }}
            data-testid="button-resend"
            className="w-full text-cream/40 text-sm text-center"
          >
            {t("auth.resendCode")}
          </button>
        </form>
      )}
    </div>
  );
}
