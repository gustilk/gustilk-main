import { useState, useEffect } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronUp } from "lucide-react";

type MainTab = "login" | "register";

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

const SOCIAL_PROVIDERS = [
  {
    id: "google",
    name: "Google",
    color: "#fff",
    bg: "#4285F4",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: "facebook",
    name: "Facebook",
    color: "#fff",
    bg: "#1877F2",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#fff">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    id: "instagram",
    name: "Instagram",
    color: "#fff",
    bg: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#fff">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
  },
  {
    id: "snapchat",
    name: "Snapchat",
    color: "#000",
    bg: "#FFFC00",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#000">
        <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.304-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/>
      </svg>
    ),
  },
];

export default function LandingPage() {
  const [tab, setTab] = useState<MainTab>("login");
  const { toast } = useToast();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#social-error") {
      toast({ title: "Sign-in failed", description: "Could not complete social login. Please try again.", variant: "destructive" });
    } else if (hash.startsWith("#no-")) {
      const provider = hash.replace("#no-", "");
      toast({ title: `${provider.charAt(0).toUpperCase() + provider.slice(1)} not yet configured`, description: "This sign-in method is coming soon.", variant: "destructive" });
    }
    if (hash) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const [loginData, setLoginData] = useState({ identifier: "", password: "" });
  const [regData, setRegData] = useState({
    email: "", password: "", fullName: "", caste: "sheikh", gender: "female",
    country: "Germany", city: "", age: 22, bio: "", occupation: "", languages: [] as string[],
  });
  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);

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
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 60% 50% at 20% 10%, rgba(74,30,107,0.8) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(212,96,138,0.25) 0%, transparent 60%)"
      }} />

      <div className="relative z-10 w-full max-w-sm py-8 animate-slide-up">
        <div className="text-center mb-7">
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

        <div className="space-y-3 mb-5">
          {SOCIAL_PROVIDERS.map(p => (
            <a
              key={p.id}
              href={`/api/auth/${p.id}`}
              data-testid={`button-social-${p.id}`}
              className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: typeof p.bg === "string" && p.bg.startsWith("linear") ? p.bg : p.bg,
                color: p.color,
                boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
              }}
            >
              <span className="flex-shrink-0">{p.icon}</span>
              <span className="flex-1">Continue with {p.name}</span>
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px" style={{ background: "rgba(201,168,76,0.2)" }} />
          <span className="text-cream/30 text-xs">or use email</span>
          <div className="flex-1 h-px" style={{ background: "rgba(201,168,76,0.2)" }} />
        </div>

        <div className="flex rounded-xl p-1 mb-5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
          {(["login", "register"] as MainTab[]).map(t => (
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
              label="Email or Phone" placeholder="your@email.com"
              value={loginData.identifier} onChange={e => setLoginData(d => ({ ...d, identifier: e.target.value }))}
              data-testid="input-identifier"
            />
            <GoldInput
              label="Password" type="password" placeholder="••••••••"
              value={loginData.password} onChange={e => setLoginData(d => ({ ...d, password: e.target.value }))}
              data-testid="input-password"
            />
            <div className="text-xs text-cream/30 text-center">Demo: demo@gustilk.com / demo1234</div>
            <GoldButton onClick={() => loginMutation.mutate()} disabled={loginMutation.isPending} data-testid="button-login">
              {loginMutation.isPending ? "Signing in…" : "Sign In"}
            </GoldButton>
          </div>
        )}

        {tab === "register" && (
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
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

            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.2)", background: "rgba(255,255,255,0.03)" }}>
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
