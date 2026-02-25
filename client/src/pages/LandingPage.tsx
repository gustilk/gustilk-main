import { useState, useRef } from "react";
import { Heart, Shield, Users, Eye, EyeOff, Phone, Mail, ArrowLeft, Globe, ChevronDown, Search, X } from "lucide-react";
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

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordMismatch = mode === "register" && confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit = emailValid && (mode === "login" || (password.length > 0 && password === confirmPassword));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (!emailValid) {
      toast({ title: t("auth.errorTitle"), description: t("auth.invalidEmail"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      await apiRequest("POST", endpoint, { email: email.trim(), password });
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
        <div>
          <GoldInput
            label={t("auth.email")}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            data-testid="input-email"
            error={email.length > 3 && !emailValid}
            required
          />
          {email.length > 3 && !emailValid && (
            <p className="text-xs mt-1.5 font-medium" style={{ color: "#d4608a" }}>{t("auth.invalidEmail")}</p>
          )}
        </div>

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

const PINNED_CODES = ["IQ", "DE", "SE", "AM", "RU", "SY", "TR", "GE"];

const COUNTRY_CODES: { iso: string; name: string; dial: string; flag: string }[] = [
  { iso: "IQ", name: "Iraq", dial: "+964", flag: "🇮🇶" },
  { iso: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { iso: "SE", name: "Sweden", dial: "+46", flag: "🇸🇪" },
  { iso: "AM", name: "Armenia", dial: "+374", flag: "🇦🇲" },
  { iso: "RU", name: "Russia", dial: "+7", flag: "🇷🇺" },
  { iso: "SY", name: "Syria", dial: "+963", flag: "🇸🇾" },
  { iso: "TR", name: "Turkey", dial: "+90", flag: "🇹🇷" },
  { iso: "GE", name: "Georgia", dial: "+995", flag: "🇬🇪" },
  { iso: "AF", name: "Afghanistan", dial: "+93", flag: "🇦🇫" },
  { iso: "AL", name: "Albania", dial: "+355", flag: "🇦🇱" },
  { iso: "DZ", name: "Algeria", dial: "+213", flag: "🇩🇿" },
  { iso: "AO", name: "Angola", dial: "+244", flag: "🇦🇴" },
  { iso: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷" },
  { iso: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { iso: "AT", name: "Austria", dial: "+43", flag: "🇦🇹" },
  { iso: "AZ", name: "Azerbaijan", dial: "+994", flag: "🇦🇿" },
  { iso: "BH", name: "Bahrain", dial: "+973", flag: "🇧🇭" },
  { iso: "BD", name: "Bangladesh", dial: "+880", flag: "🇧🇩" },
  { iso: "BY", name: "Belarus", dial: "+375", flag: "🇧🇾" },
  { iso: "BE", name: "Belgium", dial: "+32", flag: "🇧🇪" },
  { iso: "BO", name: "Bolivia", dial: "+591", flag: "🇧🇴" },
  { iso: "BA", name: "Bosnia", dial: "+387", flag: "🇧🇦" },
  { iso: "BR", name: "Brazil", dial: "+55", flag: "🇧🇷" },
  { iso: "BN", name: "Brunei", dial: "+673", flag: "🇧🇳" },
  { iso: "BG", name: "Bulgaria", dial: "+359", flag: "🇧🇬" },
  { iso: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { iso: "CL", name: "Chile", dial: "+56", flag: "🇨🇱" },
  { iso: "CN", name: "China", dial: "+86", flag: "🇨🇳" },
  { iso: "CO", name: "Colombia", dial: "+57", flag: "🇨🇴" },
  { iso: "HR", name: "Croatia", dial: "+385", flag: "🇭🇷" },
  { iso: "CY", name: "Cyprus", dial: "+357", flag: "🇨🇾" },
  { iso: "CZ", name: "Czechia", dial: "+420", flag: "🇨🇿" },
  { iso: "DK", name: "Denmark", dial: "+45", flag: "🇩🇰" },
  { iso: "EC", name: "Ecuador", dial: "+593", flag: "🇪🇨" },
  { iso: "EG", name: "Egypt", dial: "+20", flag: "🇪🇬" },
  { iso: "EE", name: "Estonia", dial: "+372", flag: "🇪🇪" },
  { iso: "ET", name: "Ethiopia", dial: "+251", flag: "🇪🇹" },
  { iso: "FI", name: "Finland", dial: "+358", flag: "🇫🇮" },
  { iso: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { iso: "GH", name: "Ghana", dial: "+233", flag: "🇬🇭" },
  { iso: "GR", name: "Greece", dial: "+30", flag: "🇬🇷" },
  { iso: "HK", name: "Hong Kong", dial: "+852", flag: "🇭🇰" },
  { iso: "HU", name: "Hungary", dial: "+36", flag: "🇭🇺" },
  { iso: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { iso: "ID", name: "Indonesia", dial: "+62", flag: "🇮🇩" },
  { iso: "IE", name: "Ireland", dial: "+353", flag: "🇮🇪" },
  { iso: "IL", name: "Israel", dial: "+972", flag: "🇮🇱" },
  { iso: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
  { iso: "JP", name: "Japan", dial: "+81", flag: "🇯🇵" },
  { iso: "JO", name: "Jordan", dial: "+962", flag: "🇯🇴" },
  { iso: "KZ", name: "Kazakhstan", dial: "+7", flag: "🇰🇿" },
  { iso: "KE", name: "Kenya", dial: "+254", flag: "🇰🇪" },
  { iso: "KW", name: "Kuwait", dial: "+965", flag: "🇰🇼" },
  { iso: "KG", name: "Kyrgyzstan", dial: "+996", flag: "🇰🇬" },
  { iso: "LB", name: "Lebanon", dial: "+961", flag: "🇱🇧" },
  { iso: "LY", name: "Libya", dial: "+218", flag: "🇱🇾" },
  { iso: "LT", name: "Lithuania", dial: "+370", flag: "🇱🇹" },
  { iso: "LU", name: "Luxembourg", dial: "+352", flag: "🇱🇺" },
  { iso: "MY", name: "Malaysia", dial: "+60", flag: "🇲🇾" },
  { iso: "MV", name: "Maldives", dial: "+960", flag: "🇲🇻" },
  { iso: "MT", name: "Malta", dial: "+356", flag: "🇲🇹" },
  { iso: "MX", name: "Mexico", dial: "+52", flag: "🇲🇽" },
  { iso: "MD", name: "Moldova", dial: "+373", flag: "🇲🇩" },
  { iso: "MA", name: "Morocco", dial: "+212", flag: "🇲🇦" },
  { iso: "MM", name: "Myanmar", dial: "+95", flag: "🇲🇲" },
  { iso: "NL", name: "Netherlands", dial: "+31", flag: "🇳🇱" },
  { iso: "NZ", name: "New Zealand", dial: "+64", flag: "🇳🇿" },
  { iso: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬" },
  { iso: "NO", name: "Norway", dial: "+47", flag: "🇳🇴" },
  { iso: "OM", name: "Oman", dial: "+968", flag: "🇴🇲" },
  { iso: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰" },
  { iso: "PS", name: "Palestine", dial: "+970", flag: "🇵🇸" },
  { iso: "PE", name: "Peru", dial: "+51", flag: "🇵🇪" },
  { iso: "PH", name: "Philippines", dial: "+63", flag: "🇵🇭" },
  { iso: "PL", name: "Poland", dial: "+48", flag: "🇵🇱" },
  { iso: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { iso: "QA", name: "Qatar", dial: "+974", flag: "🇶🇦" },
  { iso: "RO", name: "Romania", dial: "+40", flag: "🇷🇴" },
  { iso: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦" },
  { iso: "SN", name: "Senegal", dial: "+221", flag: "🇸🇳" },
  { iso: "RS", name: "Serbia", dial: "+381", flag: "🇷🇸" },
  { iso: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬" },
  { iso: "SK", name: "Slovakia", dial: "+421", flag: "🇸🇰" },
  { iso: "SI", name: "Slovenia", dial: "+386", flag: "🇸🇮" },
  { iso: "SO", name: "Somalia", dial: "+252", flag: "🇸🇴" },
  { iso: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦" },
  { iso: "KR", name: "South Korea", dial: "+82", flag: "🇰🇷" },
  { iso: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
  { iso: "LK", name: "Sri Lanka", dial: "+94", flag: "🇱🇰" },
  { iso: "SD", name: "Sudan", dial: "+249", flag: "🇸🇩" },
  { iso: "CH", name: "Switzerland", dial: "+41", flag: "🇨🇭" },
  { iso: "TW", name: "Taiwan", dial: "+886", flag: "🇹🇼" },
  { iso: "TJ", name: "Tajikistan", dial: "+992", flag: "🇹🇯" },
  { iso: "TZ", name: "Tanzania", dial: "+255", flag: "🇹🇿" },
  { iso: "TH", name: "Thailand", dial: "+66", flag: "🇹🇭" },
  { iso: "TN", name: "Tunisia", dial: "+216", flag: "🇹🇳" },
  { iso: "TM", name: "Turkmenistan", dial: "+993", flag: "🇹🇲" },
  { iso: "UG", name: "Uganda", dial: "+256", flag: "🇺🇬" },
  { iso: "UA", name: "Ukraine", dial: "+380", flag: "🇺🇦" },
  { iso: "AE", name: "UAE", dial: "+971", flag: "🇦🇪" },
  { iso: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { iso: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { iso: "UZ", name: "Uzbekistan", dial: "+998", flag: "🇺🇿" },
  { iso: "VE", name: "Venezuela", dial: "+58", flag: "🇻🇪" },
  { iso: "VN", name: "Vietnam", dial: "+84", flag: "🇻🇳" },
  { iso: "YE", name: "Yemen", dial: "+967", flag: "🇾🇪" },
  { iso: "ZM", name: "Zambia", dial: "+260", flag: "🇿🇲" },
  { iso: "ZW", name: "Zimbabwe", dial: "+263", flag: "🇿🇼" },
];

function CountryPicker({
  selected,
  onSelect,
  onClose,
}: {
  selected: typeof COUNTRY_CODES[0];
  onSelect: (c: typeof COUNTRY_CODES[0]) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const pinned = COUNTRY_CODES.filter(c => PINNED_CODES.includes(c.iso));
  const rest = COUNTRY_CODES.filter(c => !PINNED_CODES.includes(c.iso)).sort((a, b) => a.name.localeCompare(b.name));
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
  const { toast } = useToast();
  const { t } = useTranslation();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [country, setCountry] = useState(COUNTRY_CODES[0]); // Iraq default
  const [localNumber, setLocalNumber] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const fullPhone = country.dial + localNumber.replace(/^0+/, "");

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!localNumber.trim()) return;
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/send-otp", { phone: fullPhone });
      setStep("otp");
      toast({ title: t("auth.codeSentTitle"), description: t("auth.codeSentDesc", { phone: fullPhone }) });
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
      await apiRequest("POST", "/api/auth/verify-otp", { phone: fullPhone, code });
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
      {pickerOpen && (
        <CountryPicker
          selected={country}
          onSelect={setCountry}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <button onClick={() => step === "otp" ? setStep("phone") : onBack()} data-testid="button-back" className="flex items-center gap-2 text-cream/50 text-sm mb-6">
        <ArrowLeft size={16} /> {t("common.back")}
      </button>
      <Logo />

      {step === "phone" ? (
        <form onSubmit={sendOtp} className="space-y-4">
          <div>
            <label className="block text-cream/60 text-xs font-semibold mb-1.5 uppercase tracking-wider">{t("auth.phone")}</label>
            <div className="flex gap-2">
              {/* Country code selector button */}
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
              {/* Phone number input (local number without country code) */}
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
          <SubmitButton loading={loading} loadingText={t("auth.pleaseWait")}>{t("auth.sendCode")}</SubmitButton>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <p className="text-cream/60 text-sm text-center mb-2">
            {t("auth.otpEnterCode")} <span className="text-gold font-semibold">{fullPhone}</span>
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
