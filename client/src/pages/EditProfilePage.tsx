import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, XCircle } from "lucide-react";
import type { User } from "@shared/schema";
import { COUNTRY_STATES } from "@/lib/countryStates";

interface Props { user: User }

const LANGUAGES = [
  "Arabic", "English", "German",
  "Armenian", "Russian", "Spanish", "Kurdish",
];

export default function EditProfilePage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: user.fullName ?? user.firstName ?? "",
    city: user.city ?? "",
    state: user.state ?? "",
    country: user.country ?? "Germany",
    age: user.age ?? 22,
    bio: user.bio ?? "",
    occupation: user.occupation ?? "",
    languages: user.languages ?? [],
    interests: ((user as any).interests as string[] | undefined) ?? [],
    moviesAndTv: ((user as any).moviesAndTv as string[] | undefined) ?? [],
  });
  const [movieInput, setMovieInput] = useState("");
  const countryHasStates = !!COUNTRY_STATES[form.country];

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
      setSaveError(e.message || "Save failed. Please try again.");
    },
  });

  const PRESET_INTERESTS = ["Travel", "Music", "Cooking", "Sports", "Reading", "Photography", "Hiking", "Gaming", "Art", "Fitness", "Nature", "Dancing"];

  const toggleLang = (lang: string) => {
    setForm(f => ({
      ...f,
      languages: f.languages.includes(lang) ? f.languages.filter(l => l !== lang) : [...f.languages, lang]
    }));
  };

  const toggleInterest = (interest: string) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter(i => i !== interest)
        : f.interests.length < 10 ? [...f.interests, interest] : f.interests,
    }));
  };

  const addMovie = () => {
    const val = movieInput.trim();
    if (!val || form.moviesAndTv.includes(val) || form.moviesAndTv.length >= 10) return;
    setForm(f => ({ ...f, moviesAndTv: [...f.moviesAndTv, val] }));
    setMovieInput("");
  };

  const removeMovie = (title: string) => {
    setForm(f => ({ ...f, moviesAndTv: f.moviesAndTv.filter(m => m !== title) }));
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

      {/* Rejection notice — photo re-upload mode */}
      {user.verificationStatus === "rejected" && (
        <div className="flex items-start gap-3 px-4 py-3 mx-4 mt-4 rounded-2xl"
          style={{ background: "rgba(212,96,138,0.08)", border: "1px solid rgba(212,96,138,0.3)" }}>
          <XCircle size={16} style={{ color: "#d4608a", flexShrink: 0, marginTop: 1 }} />
          <div className="flex-1">
            <p className="text-xs font-semibold mb-0.5" style={{ color: "#d4608a" }}>Re-upload mode</p>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(253,248,240,0.55)" }}>
              Update your photos here, then return to submit your profile for re-review.
            </p>
          </div>
          <button onClick={() => setLocation("/")} data-testid="button-back-to-review"
            className="text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0"
            style={{ background: "rgba(212,96,138,0.15)", color: "#d4608a" }}>
            ← Back
          </button>
        </div>
      )}

      {/* Profile Completeness Bar */}
      {(() => {
        const checks = [
          { label: "Name",       done: !!form.fullName.trim(),         pts: 15 },
          { label: "Photo",      done: (user.photos ?? []).length > 0,  pts: 25 },
          { label: "Bio",        done: !!form.bio.trim(),               pts: 15 },
          { label: "Caste",      done: !!user.caste,                    pts: 10 },
          { label: "City",       done: !!form.city.trim(),              pts: 10 },
          { label: "Age",        done: Number(form.age) > 0,            pts: 5  },
          { label: "Occupation", done: !!form.occupation.trim(),        pts: 10 },
          { label: "Languages",  done: form.languages.length > 0,       pts: 10 },
        ];
        const pct = checks.reduce((s, c) => s + (c.done ? c.pts : 0), 0);
        const missing = checks.filter(c => !c.done);
        const color = pct < 40 ? "#d4608a" : pct < 75 ? "#c9a84c" : "#34d399";
        return (
          <div className="px-5 pt-4 pb-1" data-testid="profile-completeness">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-cream/50 font-medium">Profile completeness</span>
              <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
              />
            </div>
            {missing.length > 0 && pct < 100 && (
              <p className="text-[11px] text-cream/30 mt-1.5">
                Add: {missing.map(c => c.label).join(", ")}
              </p>
            )}
          </div>
        );
      })()}

      {saveError && (
        <div className="px-5 pt-3">
          <p className="text-xs font-medium text-center py-2 px-4 rounded-xl" style={{ color: "#d4608a", background: "rgba(212,96,138,0.1)", border: "1px solid rgba(212,96,138,0.25)" }}>{saveError}</p>
        </div>
      )}
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

        {countryHasStates && (
          <FieldGroup label="State / Province">
            <select
              value={form.state}
              onChange={inp("state")}
              data-testid="select-state"
              className="w-full px-4 py-3 rounded-xl text-sm text-cream outline-none appearance-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }}
            >
              <option value="">Select state…</option>
              {COUNTRY_STATES[form.country].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FieldGroup>
        )}

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

        <FieldGroup label="Interests (up to 10)">
          <div className="flex flex-wrap gap-2 mt-1">
            {PRESET_INTERESTS.map(interest => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={form.interests.includes(interest)
                  ? { background: "#c9a84c", color: "#1a0a2e" }
                  : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(201,168,76,0.25)", color: "rgba(253,248,240,0.7)" }
                }
              >
                {interest}
              </button>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup label="Favourite Movies & TV Shows (up to 10)">
          <div className="flex gap-2 mb-2">
            <input
              value={movieInput}
              onChange={e => setMovieInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addMovie(); } }}
              placeholder="e.g. Inception, Breaking Bad…"
              className="flex-1 px-3 py-2.5 rounded-xl text-sm text-cream placeholder-cream/25 outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }}
            />
            <button
              onClick={addMovie}
              className="px-3 py-2.5 rounded-xl text-sm font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
            >
              Add
            </button>
          </div>
          {form.moviesAndTv.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.moviesAndTv.map(title => (
                <span key={title} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(123,63,160,0.18)", color: "#d4608a", border: "1px solid rgba(212,96,138,0.25)" }}>
                  {title}
                  <button onClick={() => removeMovie(title)} className="ml-0.5 opacity-70">×</button>
                </span>
              ))}
            </div>
          )}
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
