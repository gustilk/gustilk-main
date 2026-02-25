import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check } from "lucide-react";
import type { User } from "@shared/schema";

interface Props { user: User }

const LANGUAGES = [
  "Kurdish", "Arabic", "English", "German", "Swedish", "French",
  "Turkish", "Armenian", "Russian", "Dutch", "Spanish", "Georgian",
];

export default function EditProfilePage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState({
    fullName: user.fullName ?? user.firstName ?? "",
    city: user.city ?? "",
    country: user.country ?? "Germany",
    age: user.age ?? 22,
    bio: user.bio ?? "",
    occupation: user.occupation ?? "",
    languages: user.languages ?? [],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/profile", { ...form, age: Number(form.age) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile updated" });
      setLocation("/profile");
    },
    onError: (e: Error) => {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    },
  });

  const toggleLang = (lang: string) => {
    setForm(f => ({
      ...f,
      languages: f.languages.includes(lang) ? f.languages.filter(l => l !== lang) : [...f.languages, lang]
    }));
  };

  const inp = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <div className="flex flex-col min-h-screen pb-8" style={{ background: "#0d0618" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 pt-12 pb-4"
        style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}
      >
        <button onClick={() => setLocation("/profile")} data-testid="button-back" className="text-cream/60">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-serif text-xl text-gold">Edit Profile</h1>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          data-testid="button-save"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
        >
          <Check size={14} />
          {saveMutation.isPending ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="px-5 py-6 space-y-5 overflow-y-auto">
        <FieldGroup label="Full Name">
          <GoldInput value={form.fullName} onChange={inp("fullName")} placeholder="Your full name" data-testid="input-fullName" />
        </FieldGroup>

        <FieldGroup label="Bio">
          <textarea
            value={form.bio}
            onChange={inp("bio")}
            placeholder="Tell others about yourself…"
            rows={4}
            data-testid="input-bio"
            className="w-full px-4 py-3 rounded-xl text-sm text-cream placeholder-cream/25 outline-none resize-none leading-relaxed"
            style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }}
            onFocus={e => (e.target.style.borderColor = "#c9a84c")}
            onBlur={e => (e.target.style.borderColor = "rgba(201,168,76,0.25)")}
          />
        </FieldGroup>

        <FieldGroup label="Occupation">
          <GoldInput value={form.occupation} onChange={inp("occupation")} placeholder="e.g. Teacher" data-testid="input-occupation" />
        </FieldGroup>

        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="Age">
            <GoldInput type="number" value={String(form.age)} onChange={inp("age")} placeholder="25" data-testid="input-age" />
          </FieldGroup>
          <FieldGroup label="City">
            <GoldInput value={form.city} onChange={inp("city")} placeholder="Your city" data-testid="input-city" />
          </FieldGroup>
        </div>

        <FieldGroup label="Country">
          <div
            data-testid="display-country"
            className="w-full px-4 py-3 rounded-xl text-sm flex items-center justify-between"
            style={{ background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(201,168,76,0.12)", color: "rgba(253,248,240,0.5)" }}
          >
            <span>{user.country ?? "—"}</span>
            <span className="text-xs" style={{ color: "rgba(201,168,76,0.5)" }}>Locked</span>
          </div>
          <p className="text-xs mt-1.5" style={{ color: "rgba(253,248,240,0.3)" }}>Country cannot be changed after signup</p>
        </FieldGroup>

        <FieldGroup label="Languages I speak">
          <div className="flex flex-wrap gap-2 mt-1">
            {LANGUAGES.map(lang => (
              <button
                key={lang}
                onClick={() => toggleLang(lang)}
                data-testid={`lang-chip-${lang}`}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={form.languages.includes(lang)
                  ? { background: "#c9a84c", color: "#1a0a2e" }
                  : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(201,168,76,0.25)", color: "rgba(253,248,240,0.7)" }
                }
              >
                {lang}
              </button>
            ))}
          </div>
        </FieldGroup>
      </div>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-cream/50 uppercase tracking-wider mb-2 font-semibold">{label}</div>
      {children}
    </div>
  );
}

function GoldInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-4 py-3 rounded-xl text-sm text-cream placeholder-cream/25 outline-none"
      style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }}
      onFocus={e => (e.target.style.borderColor = "#c9a84c")}
      onBlur={e => (e.target.style.borderColor = "rgba(201,168,76,0.25)")}
    />
  );
}
