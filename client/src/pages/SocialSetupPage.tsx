import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, MapPin, Loader2, AlertTriangle } from "lucide-react";
import type { User } from "@shared/schema";

const COUNTRIES = ["USA", "Canada", "Australia", "Germany", "Holland", "Sweden", "Belgium", "France", "Turkey", "Iraq", "Armenia", "Georgia", "Russia", "UK"];
const CASTES = [{ value: "sheikh", label: "Sheikh" }, { value: "pir", label: "Pir" }, { value: "murid", label: "Murid" }];

const AGREEMENT_SECTIONS = [
  {
    title: "1. Respect the Yezidi Faith",
    body: "Members must respect and honour the Yezidi religion, its sacred traditions, figures, and practices. Any mockery, disrespect, or misrepresentation is strictly forbidden and may result in immediate account removal.",
  },
  {
    title: "2. Honour the Community",
    body: "Treat every member with dignity and respect. Harassment, discrimination, abusive language, or any behaviour that brings shame to the community will not be tolerated.",
  },
  {
    title: "3. Be Honest",
    body: "You must represent yourself truthfully. Fake photos, false names, or misleading information is a serious violation. Gûstîlk is built on trust.",
  },
  {
    title: "4. Caste Integrity",
    body: "You must register under your true caste — Sheikh, Pir, or Murid. Misrepresenting your caste is a grave dishonour and will result in account deletion.",
  },
  {
    title: "5. No Harmful Content",
    body: "Sharing explicit, offensive, or inappropriate content is prohibited — including photos, messages, or media that conflicts with Yezidi values.",
  },
  {
    title: "6. Serious Intentions",
    body: "Gûstîlk is for genuine connection with the intention of marriage. It must not be used for casual encounters or purposes conflicting with community values.",
  },
  {
    title: "7. Privacy & Safety",
    body: "Do not share another member's personal information without consent. Report any behaviour that makes you or others feel unsafe.",
  },
];

// Map ipapi.co country_name values to our app's country list
const COUNTRY_NAME_MAP: Record<string, string> = {
  "United States":        "USA",
  "United States of America": "USA",
  "Netherlands":          "Holland",
  "United Kingdom":       "UK",
  "Great Britain":        "UK",
  "Germany":              "Germany",
  "Canada":               "Canada",
  "Australia":            "Australia",
  "Sweden":               "Sweden",
  "Belgium":              "Belgium",
  "France":               "France",
  "Turkey":               "Turkey",
  "Türkiye":              "Turkey",
  "Iraq":                 "Iraq",
  "Armenia":              "Armenia",
  "Georgia":              "Georgia",
  "Russia":               "Russia",
  "Russian Federation":   "Russia",
};

function mapCountry(apiName: string): string | null {
  if (COUNTRY_NAME_MAP[apiName]) return COUNTRY_NAME_MAP[apiName];
  // Direct match against our list
  const direct = COUNTRIES.find(c => c.toLowerCase() === apiName.toLowerCase());
  return direct ?? null;
}

interface Props { user: User }

type GeoState = "loading" | "detected" | "unsupported" | "error";

export default function SocialSetupPage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [data, setData] = useState({
    caste: "murid",
    gender: "female",
    country: "",
    city: "",
    age: 22,
  });
  const [agreedGuidelines, setAgreedGuidelines] = useState(false);
  const [agreedTruthful, setAgreedTruthful] = useState(false);
  const [geoState, setGeoState] = useState<GeoState>("loading");
  const [detectedCountryName, setDetectedCountryName] = useState("");

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
          setData(d => ({
            ...d,
            country: mapped,
            city: json.city ? json.city : d.city,
          }));
          setDetectedCountryName(json.country_name ?? mapped);
          setGeoState("detected");
        } else {
          // Country not in our supported list — let them pick manually
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
      const res = await apiRequest("PUT", "/api/profile", { ...data, age: Number(data.age) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/discover");
    },
    onError: () => {
      toast({ title: "Failed to save profile", variant: "destructive" });
    },
  });

  const canSubmit = data.country && data.city.trim() && agreedGuidelines && agreedTruthful && Number(data.age) >= 18;

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-8" style={{ background: "#0d0618" }}>
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 60% 50% at 20% 10%, rgba(74,30,107,0.8) 0%, transparent 70%)",
      }} />
      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(201,168,76,0.12)", border: "2px solid rgba(201,168,76,0.3)" }}>
            <Sparkles size={30} color="#c9a84c" />
          </div>
          <h1 className="font-serif text-3xl text-gold mb-1">
            Almost there, {(user.fullName ?? user.firstName ?? "there").split(" ")[0]}!
          </h1>
          <p className="text-cream/50 text-sm">A few details to complete your profile</p>
        </div>

        <div className="space-y-4">
          {/* Caste + Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Caste</Label>
              <GoldSelect value={data.caste} onChange={e => setData(d => ({ ...d, caste: e.target.value }))} data-testid="select-caste">
                {CASTES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </GoldSelect>
            </div>
            <div>
              <Label>Gender</Label>
              <GoldSelect value={data.gender} onChange={e => setData(d => ({ ...d, gender: e.target.value }))} data-testid="select-gender">
                <option value="female">Female</option>
                <option value="male">Male</option>
              </GoldSelect>
            </div>
          </div>

          {/* Country — auto-detected & locked */}
          <div>
            <Label>Country</Label>
            {geoState === "loading" && (
              <div className="w-full px-4 py-3 rounded-xl flex items-center gap-3"
                style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(201,168,76,0.2)" }}>
                <Loader2 size={16} className="animate-spin text-gold" />
                <span className="text-cream/40 text-sm">Detecting your location…</span>
              </div>
            )}

            {geoState === "detected" && (
              <>
                <div
                  data-testid="display-country"
                  className="w-full px-4 py-3 rounded-xl flex items-center gap-3"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(201,168,76,0.3)" }}
                >
                  <MapPin size={15} color="#c9a84c" />
                  <span className="text-cream text-sm flex-1">{data.country}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}>
                    Detected
                  </span>
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
                      ? "Your country isn't on our supported list — please select the closest one."
                      : "Couldn't detect your location — please select your country."}
                  </span>
                </div>
                <GoldSelect
                  value={data.country}
                  onChange={e => setData(d => ({ ...d, country: e.target.value }))}
                  data-testid="select-country"
                >
                  <option value="" disabled>Select country…</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </GoldSelect>
              </>
            )}
          </div>

          {/* Age + City */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Age</Label>
              <input
                type="number"
                value={data.age}
                onChange={e => setData(d => ({ ...d, age: parseInt(e.target.value) || 18 }))}
                data-testid="input-age"
                className="w-full px-3 py-3 rounded-xl text-sm text-cream outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }}
              />
            </div>
            <div>
              <Label>City</Label>
              <input
                type="text"
                placeholder="Your city"
                value={data.city}
                onChange={e => setData(d => ({ ...d, city: e.target.value }))}
                data-testid="input-city"
                className="w-full px-3 py-3 rounded-xl text-sm text-cream placeholder-cream/25 outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }}
              />
            </div>
          </div>

          {/* Community Agreement */}
          <div className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(201,168,76,0.2)" }}>
            <div className="px-4 py-3" style={{ background: "rgba(201,168,76,0.07)", borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
              <p className="text-gold font-serif text-sm font-semibold">Gûstîlk — Community Agreement</p>
              <p className="text-cream/40 text-xs mt-0.5">Gûstîlk is a sacred space. By joining, you agree to uphold the values, traditions, and honour of the Yezidi faith.</p>
            </div>
            <div className="p-4 space-y-3 max-h-52 overflow-y-auto"
              style={{ background: "rgba(255,255,255,0.02)" }}
              data-testid="agreement-scroll">
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

          {/* Confirmation checkboxes */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer" data-testid="checkbox-guidelines">
              <div
                onClick={() => setAgreedGuidelines(a => !a)}
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                style={agreedGuidelines
                  ? { background: "#c9a84c" }
                  : { border: "1.5px solid rgba(201,168,76,0.4)", background: "rgba(255,255,255,0.05)" }
                }
              >
                {agreedGuidelines && <span className="text-ink text-xs font-bold">✓</span>}
              </div>
              <span className="text-cream/55 text-xs leading-relaxed">
                I have read and agree to the Community Guidelines
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer" data-testid="checkbox-truthful">
              <div
                onClick={() => setAgreedTruthful(a => !a)}
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                style={agreedTruthful
                  ? { background: "#c9a84c" }
                  : { border: "1.5px solid rgba(201,168,76,0.4)", background: "rgba(255,255,255,0.05)" }
                }
              >
                {agreedTruthful && <span className="text-ink text-xs font-bold">✓</span>}
              </div>
              <span className="text-cream/55 text-xs leading-relaxed">
                I confirm that all information I provide is truthful and honest
              </span>
            </label>
          </div>

          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending || geoState === "loading"}
            data-testid="button-complete-setup"
            className="w-full py-4 rounded-xl font-bold text-sm disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 6px 20px rgba(201,168,76,0.3)" }}
          >
            {mutation.isPending ? "Saving…" : geoState === "loading" ? "Detecting location…" : "Complete Profile & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-cream/50 uppercase tracking-wider mb-1.5 font-semibold">{children}</div>;
}

function GoldSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select {...props}
      className="w-full px-3 py-3 rounded-xl text-sm text-cream outline-none appearance-none"
      style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }}
    >
      {children}
    </select>
  );
}
