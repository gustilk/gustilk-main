import { useState } from "react";
import { Heart, Shield, Users, Eye, EyeOff, Phone, Mail, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const FEATURES = [
  {
    icon: <Heart size={20} color="#c9a84c" />,
    title: "Caste-Respectful Matching",
    desc: "Sheikh, Pir, or Murid — honouring Yezidi tradition.",
  },
  {
    icon: <Shield size={20} color="#c9a84c" />,
    title: "Verified & Safe",
    desc: "Every profile is manually reviewed for authenticity.",
  },
  {
    icon: <Users size={20} color="#c9a84c" />,
    title: "Community Events",
    desc: "Cultural gatherings and meetups near you and worldwide.",
  },
];

type Screen = "home" | "email" | "phone";

export default function LandingPage() {
  const [screen, setScreen] = useState<Screen>("home");

  return (
    <div className="min-h-screen flex flex-col bg-ink relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 70% 60% at 15% 5%, rgba(74,30,107,0.9) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 85% 85%, rgba(212,96,138,0.3) 0%, transparent 60%)"
      }} />

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 py-10 max-w-sm mx-auto w-full">
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
    <div className="text-center mb-8">
      <div className="mb-4" style={{ filter: "drop-shadow(0 0 24px rgba(201,168,76,0.6))" }}>
        <svg viewBox="0 0 80 80" className="w-20 h-20 mx-auto" fill="none">
          <circle cx="40" cy="40" r="37" stroke="#c9a84c" strokeWidth="1.5" opacity="0.25"/>
          <circle cx="40" cy="40" r="30" stroke="#c9a84c" strokeWidth="1" opacity="0.15"/>
          <path d="M 20 40 Q 28 24 40 21 Q 52 24 60 40 Q 52 58 40 62 Q 28 58 20 40 Z"
            fill="rgba(201,168,76,0.15)" stroke="#c9a84c" strokeWidth="1.5"/>
          <circle cx="40" cy="40" r="9" fill="#c9a84c"/>
          <circle cx="40" cy="40" r="5" fill="#1a0a2e"/>
        </svg>
      </div>
      <h1 className="font-serif text-5xl font-bold text-gold tracking-wide">Gûstîlk</h1>
    </div>
  );
}

function HomeScreen({ onEmail, onPhone }: { onEmail: () => void; onPhone: () => void }) {
  return (
    <div className="w-full animate-slide-up">
      <Logo />

      <p className="text-cream/50 text-sm text-center mb-8 leading-relaxed">
        The exclusive dating app for the Yezidi community — connecting hearts across the diaspora.
      </p>

      <div className="space-y-3 mb-8">
        <button
          onClick={onEmail}
          data-testid="button-email-auth"
          className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-base transition-all"
          style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 8px 32px rgba(201,168,76,0.4)" }}
        >
          <Mail size={20} />
          Continue with Email
        </button>

        <button
          onClick={onPhone}
          data-testid="button-phone-auth"
          className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-base transition-all"
          style={{ background: "rgba(255,255,255,0.07)", color: "#fdf8f0", border: "1.5px solid rgba(201,168,76,0.3)" }}
        >
          <Phone size={20} />
          Continue with Phone
        </button>
      </div>

      <div className="space-y-2.5">
        {FEATURES.map((f, i) => (
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

function SubmitButton({ loading, children }: { loading: boolean; children: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      data-testid="button-submit"
      className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-60"
      style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 8px 32px rgba(201,168,76,0.4)" }}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}

function EmailScreen({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      await apiRequest("POST", endpoint, { email, password });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (err: any) {
      const msg = await err.message?.match(/\d+: (.+)/)?.[1] || err.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full animate-slide-up">
      <button onClick={onBack} data-testid="button-back" className="flex items-center gap-2 text-cream/50 text-sm mb-6">
        <ArrowLeft size={16} /> Back
      </button>
      <Logo />

      <div className="flex rounded-xl p-1 mb-6" style={{ background: "rgba(255,255,255,0.05)" }}>
        {(["login", "register"] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            data-testid={`tab-${m}`}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={mode === m
              ? { background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }
              : { color: "rgba(253,248,240,0.4)" }
            }
          >
            {m === "login" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <GoldInput label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" data-testid="input-email" required />

        <div>
          <label className="block text-cream/60 text-xs font-semibold mb-1.5 uppercase tracking-wider">Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === "register" ? "At least 6 characters" : "Your password"}
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

        <SubmitButton loading={loading}>{mode === "login" ? "Sign In" : "Create Account"}</SubmitButton>
      </form>
    </div>
  );
}

function PhoneScreen({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
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
      toast({ title: "Code sent", description: `A 6-digit code was sent to ${phone}` });
    } catch (err: any) {
      const msg = err.message?.match(/\d+: (.+)/)?.[1] || err.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
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
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full animate-slide-up">
      <button onClick={() => step === "otp" ? setStep("phone") : onBack()} data-testid="button-back" className="flex items-center gap-2 text-cream/50 text-sm mb-6">
        <ArrowLeft size={16} /> Back
      </button>
      <Logo />

      {step === "phone" ? (
        <form onSubmit={sendOtp} className="space-y-4">
          <GoldInput
            label="Phone number"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+49 123 456 7890"
            data-testid="input-phone"
            required
          />
          <p className="text-cream/35 text-xs text-center">Include your country code (e.g. +49 for Germany)</p>
          <SubmitButton loading={loading}>Send Verification Code</SubmitButton>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <p className="text-cream/60 text-sm text-center mb-2">
            Enter the 6-digit code sent to <span className="text-gold font-semibold">{phone}</span>
          </p>
          <GoldInput
            label="Verification code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            data-testid="input-otp"
            required
          />
          <SubmitButton loading={loading}>Verify & Continue</SubmitButton>
          <button
            type="button"
            onClick={() => { setCode(""); sendOtp(new Event("") as any); }}
            data-testid="button-resend"
            className="w-full text-cream/40 text-sm text-center"
          >
            Resend code
          </button>
        </form>
      )}
    </div>
  );
}
