import { useState, useRef, useEffect } from "react";
import { Heart, Shield, Users, Eye, EyeOff, Phone, Mail, ArrowLeft, Globe, ChevronDown, Search, X, Fingerprint } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { LANGUAGE_LIST } from "@/i18n";
import i18n from "@/i18n";
import { COUNTRY_LIST, PINNED_COUNTRY_ISOS } from "@shared/countries";

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
          src="/gustilk-logo.svg"
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
  const [mode, setMode] = useState<"login" | "register">("login");
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

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordMismatch = mode === "register" && confirmPassword.length > 0 && password !== confirmPassword;
  const namesValid = mode === "login" || firstName.trim().length > 0;
  const canSubmit = emailValid && namesValid && (mode === "login" || (password.length > 0 && password === confirmPassword));

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
      await apiRequest("POST", endpoint, {
        email: email.trim(),
        password,
        ...(mode === "register" ? { firstName: firstName.trim(), lastName: lastName.trim() } : {}),
      });
      localStorage.setItem("gustilk_email", email.trim());
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (err: any) {
      const raw: string = err.message?.match(/\d+: (.+)/)?.[1] || err.message || "Something went wrong";
      let msg: string;
      try { msg = JSON.parse(raw).message || raw; } catch { msg = raw; }
      const lower = msg.toLowerCase();
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
            onClick={() => { setMode(m); setConfirmPassword(""); setFirstName(""); setLastName(""); }}
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
              />
            </div>
          </div>
        )}

        <div>
          <GoldInput
            label={t("auth.email")}
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setEmailError(null); }}
            placeholder="you@example.com"
            data-testid="input-email"
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
              value={password}
              onChange={e => { setPassword(e.target.value); setPasswordError(null); }}
              placeholder={mode === "register" ? t("auth.pwPlaceholderRegister") : t("auth.pwPlaceholderLogin")}
              data-testid="input-password"
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
  const savedIso = localStorage.getItem("gustilk_country_iso");
  const savedPhone = localStorage.getItem("gustilk_phone") ?? "";
  const [country, setCountry] = useState(
    () => COUNTRY_LIST.find(c => c.iso === savedIso) ?? COUNTRY_LIST[0]
  );
  const [localNumber, setLocalNumber] = useState(savedPhone);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
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
    </div>
  );
}
