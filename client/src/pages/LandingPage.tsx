import { useState } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronUp } from "lucide-react";

type Tab = "login" | "register";

const COUNTRIES = ["USA", "Canada", "Australia", "Germany", "Holland", "Sweden", "Belgium", "France", "Turkey", "Iraq", "Armenia", "Georgia", "Russia", "UK"];
const CASTES = [
  { value: "sheikh", label: "Sheikh" },
  { value: "pir", label: "Pir" },
  { value: "murid", label: "Murid" },
];
const LANGUAGES = ["Kurdish", "Arabic", "English", "German", "Swedish", "French", "Turkish", "Armenian", "Russian"];

const GUIDELINES = [
  "Respect the Yezidi caste system and cultural traditions",
  "Use authentic photos and honest information",
  "No harassment, offensive content, or misrepresentation",
  "Violations result in suspension or permanent deletion",
];

export default function LandingPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [regData, setRegData] = useState({
    email: "", password: "", fullName: "", caste: "sheikh", gender: "female",
    country: "Germany", city: "", age: 22, bio: "", occupation: "", languages: [] as string[],
  });
  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/login", loginData);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.error) {
        toast({ title: "Login failed", description: data.error, variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (e: Error) => {
      toast({ title: "Login failed", description: e.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!agreedToGuidelines) {
        toast({ title: "Please accept the community guidelines", variant: "destructive" });
        return;
      }
      const res = await apiRequest("POST", "/api/auth/register", { ...regData, age: Number(regData.age) });
      return res.json();
    },
    onSuccess: (data) => {
      if (!data) return;
      if (data.error) {
        toast({ title: "Registration failed", description: data.error, variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (e: Error) => {
      toast({ title: "Registration failed", description: e.message, variant: "destructive" });
    },
  });

  const toggleLang = (lang: string) => {
    setRegData(d => ({
      ...d,
      languages: d.languages.includes(lang) ? d.languages.filter(l => l !== lang) : [...d.languages, lang]
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-ink relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 60% 50% at 20% 10%, rgba(74,30,107,0.8) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(212,96,138,0.25) 0%, transparent 60%)"
        }} />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div style={{ filter: "drop-shadow(0 0 18px rgba(201,168,76,0.5))" }}>
            <svg viewBox="0 0 60 60" className="w-16 h-16 mx-auto" fill="none">
              <circle cx="30" cy="30" r="28" stroke="#c9a84c" strokeWidth="1.5" opacity="0.3"/>
              <path d="M 15 30 Q 22 18 30 16 Q 38 18 45 30 Q 38 44 30 46 Q 22 44 15 30 Z" fill="rgba(201,168,76,0.2)" stroke="#c9a84c" strokeWidth="1.5"/>
              <circle cx="30" cy="30" r="6" fill="#c9a84c"/>
            </svg>
          </div>
          <h1 className="font-serif text-4xl font-bold text-gold mb-1">Gûstîlk</h1>
          <p className="text-cream/40 text-sm">Find your partner within the community</p>
        </div>

        <div className="flex rounded-xl p-1 mb-6" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
          {(["login", "register"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              data-testid={`tab-${t}`}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all capitalize"
              style={tab === t ? { background: "#c9a84c", color: "#1a0a2e" } : { color: "rgba(253,248,240,0.5)" }}
            >
              {t === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {tab === "login" && (
          <div className="space-y-4">
            <GoldInput
              label="Email" type="email" placeholder="your@email.com"
              value={loginData.email} onChange={e => setLoginData(d => ({ ...d, email: e.target.value }))}
              data-testid="input-email"
            />
            <GoldInput
              label="Password" type="password" placeholder="••••••••"
              value={loginData.password} onChange={e => setLoginData(d => ({ ...d, password: e.target.value }))}
              data-testid="input-password"
            />
            <div className="pt-1 text-xs text-cream/40 text-center">
              Demo: demo@gustilk.com / demo1234
            </div>
            <GoldButton
              onClick={() => loginMutation.mutate()}
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? "Signing in…" : "Sign In"}
            </GoldButton>
          </div>
        )}

        {tab === "register" && (
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            <GoldInput
              label="Full Name" placeholder="Your full name"
              value={regData.fullName} onChange={e => setRegData(d => ({ ...d, fullName: e.target.value }))}
              data-testid="input-fullName"
            />
            <GoldInput
              label="Email" type="email" placeholder="your@email.com"
              value={regData.email} onChange={e => setRegData(d => ({ ...d, email: e.target.value }))}
              data-testid="input-reg-email"
            />
            <GoldInput
              label="Password (min 6 chars)" type="password" placeholder="••••••••"
              value={regData.password} onChange={e => setRegData(d => ({ ...d, password: e.target.value }))}
              data-testid="input-reg-password"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-cream/50 uppercase tracking-wider mb-1.5 font-semibold">Caste</div>
                <GoldSelect value={regData.caste} onChange={e => setRegData(d => ({ ...d, caste: e.target.value }))} data-testid="select-caste">
                  {CASTES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </GoldSelect>
              </div>
              <div>
                <div className="text-xs text-cream/50 uppercase tracking-wider mb-1.5 font-semibold">Gender</div>
                <GoldSelect value={regData.gender} onChange={e => setRegData(d => ({ ...d, gender: e.target.value }))} data-testid="select-gender">
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </GoldSelect>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-cream/50 uppercase tracking-wider mb-1.5 font-semibold">Country</div>
                <GoldSelect value={regData.country} onChange={e => setRegData(d => ({ ...d, country: e.target.value }))} data-testid="select-country">
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </GoldSelect>
              </div>
              <GoldInput
                label="Age" type="number" placeholder="22"
                value={String(regData.age)} onChange={e => setRegData(d => ({ ...d, age: parseInt(e.target.value) || 18 }))}
                data-testid="input-age"
              />
            </div>
            <GoldInput
              label="City" placeholder="e.g. Stuttgart"
              value={regData.city} onChange={e => setRegData(d => ({ ...d, city: e.target.value }))}
              data-testid="input-city"
            />
            <GoldInput
              label="Occupation (optional)" placeholder="e.g. Teacher"
              value={regData.occupation} onChange={e => setRegData(d => ({ ...d, occupation: e.target.value }))}
              data-testid="input-occupation"
            />
            <div>
              <div className="text-xs text-cream/50 uppercase tracking-wider mb-2 font-semibold">Languages</div>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    onClick={() => toggleLang(lang)}
                    data-testid={`lang-chip-${lang}`}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={regData.languages.includes(lang)
                      ? { background: "#c9a84c", color: "#1a0a2e" }
                      : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(201,168,76,0.25)", color: "rgba(253,248,240,0.7)" }
                    }
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(201,168,76,0.2)", background: "rgba(255,255,255,0.03)" }}
            >
              <button
                onClick={() => setShowGuidelines(s => !s)}
                className="w-full flex items-center justify-between px-4 py-3"
                data-testid="button-toggle-guidelines"
              >
                <span className="text-xs font-semibold text-cream/60 uppercase tracking-wider">Community Guidelines</span>
                {showGuidelines ? <ChevronUp size={14} color="rgba(201,168,76,0.6)" /> : <ChevronDown size={14} color="rgba(201,168,76,0.6)" />}
              </button>
              {showGuidelines && (
                <div className="px-4 pb-3 space-y-2">
                  {GUIDELINES.map((g, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-gold text-xs mt-0.5 flex-shrink-0">✦</span>
                      <p className="text-cream/55 text-xs leading-relaxed">{g}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer" data-testid="checkbox-guidelines">
              <div
                onClick={() => setAgreedToGuidelines(a => !a)}
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                style={agreedToGuidelines
                  ? { background: "#c9a84c" }
                  : { border: "1.5px solid rgba(201,168,76,0.4)", background: "rgba(255,255,255,0.05)" }
                }
              >
                {agreedToGuidelines && <span className="text-ink text-xs font-bold">✓</span>}
              </div>
              <span className="text-cream/55 text-xs leading-relaxed">
                I agree to follow the community guidelines based on Yezidi faith and cultural values
              </span>
            </label>

            <GoldButton
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending || !agreedToGuidelines}
              data-testid="button-register"
            >
              {registerMutation.isPending ? "Creating account…" : "Create Account"}
            </GoldButton>
          </div>
        )}
      </div>
    </div>
  );
}

function GoldInput({ label, ...props }: { label?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <div className="text-xs text-cream/50 uppercase tracking-wider mb-1.5 font-semibold">{label}</div>}
      <input
        {...props}
        className="w-full px-4 py-3 rounded-xl text-sm text-cream placeholder-cream/25 outline-none transition-all"
        style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }}
        onFocus={e => (e.target.style.borderColor = "#c9a84c")}
        onBlur={e => (e.target.style.borderColor = "rgba(201,168,76,0.25)")}
      />
    </div>
  );
}

function GoldSelect({ children, ...props }: { children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full px-3 py-3 rounded-xl text-sm text-cream outline-none appearance-none"
      style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }}
    >
      {children}
    </select>
  );
}

function GoldButton({ children, ...props }: { children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-full py-3.5 rounded-xl font-bold text-sm transition-all mt-1 disabled:opacity-60"
      style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 6px 20px rgba(201,168,76,0.3)" }}
    >
      {children}
    </button>
  );
}
