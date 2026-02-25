import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";
import type { User } from "@shared/schema";

const COUNTRIES = ["USA", "Canada", "Australia", "Germany", "Holland", "Sweden", "Belgium", "France", "Turkey", "Iraq", "Armenia", "Georgia", "Russia", "UK"];
const CASTES = [{ value: "sheikh", label: "Sheikh" }, { value: "pir", label: "Pir" }, { value: "murid", label: "Murid" }];
const GUIDELINES = [
  "Respect the Yezidi caste system and cultural traditions",
  "Use authentic photos and honest information",
  "No harassment, offensive content, or misrepresentation",
];

interface Props { user: User }

export default function SocialSetupPage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [data, setData] = useState({
    caste: "murid",
    gender: "female",
    country: "Germany",
    city: "",
    age: 22,
  });
  const [agreed, setAgreed] = useState(false);

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

  const canSubmit = data.city.trim() && agreed && Number(data.age) >= 18;

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
          <h1 className="font-serif text-3xl text-gold mb-1">Almost there, {(user.fullName ?? user.firstName ?? "there").split(" ")[0]}!</h1>
          <p className="text-cream/50 text-sm">A few details to complete your profile</p>
        </div>

        <div className="space-y-4">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Country</Label>
              <GoldSelect value={data.country} onChange={e => setData(d => ({ ...d, country: e.target.value }))} data-testid="select-country">
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </GoldSelect>
            </div>
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
          </div>

          <div>
            <Label>City</Label>
            <input
              type="text"
              placeholder="e.g. Stuttgart"
              value={data.city}
              onChange={e => setData(d => ({ ...d, city: e.target.value }))}
              data-testid="input-city"
              className="w-full px-4 py-3 rounded-xl text-sm text-cream placeholder-cream/25 outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }}
            />
          </div>

          <div className="rounded-2xl p-4 space-y-2"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.15)" }}>
            {GUIDELINES.map((g, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-gold text-xs mt-0.5 flex-shrink-0">✦</span>
                <p className="text-cream/50 text-xs leading-relaxed">{g}</p>
              </div>
            ))}
          </div>

          <label className="flex items-start gap-3 cursor-pointer" data-testid="checkbox-guidelines">
            <div
              onClick={() => setAgreed(a => !a)}
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
              style={agreed
                ? { background: "#c9a84c" }
                : { border: "1.5px solid rgba(201,168,76,0.4)", background: "rgba(255,255,255,0.05)" }
              }
            >
              {agreed && <span className="text-ink text-xs font-bold">✓</span>}
            </div>
            <span className="text-cream/55 text-xs leading-relaxed">
              I agree to follow the community guidelines based on Yezidi faith and cultural values
            </span>
          </label>

          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            data-testid="button-complete-setup"
            className="w-full py-4 rounded-xl font-bold text-sm disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 6px 20px rgba(201,168,76,0.3)" }}
          >
            {mutation.isPending ? "Saving…" : "Complete Profile & Continue"}
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
