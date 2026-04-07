import { Globe } from "lucide-react";
import type { User } from "@shared/schema";

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧", status: "Complete", pct: 100 },
  { code: "ar", name: "Arabic", flag: "🇸🇦", status: "Complete", pct: 100 },
  { code: "de", name: "German", flag: "🇩🇪", status: "Complete", pct: 100 },
  { code: "hy", name: "Armenian", flag: "🇦🇲", status: "Complete", pct: 100 },
  { code: "ru", name: "Russian", flag: "🇷🇺", status: "Complete", pct: 100 },
  { code: "ku", name: "Kurdish", flag: "🏴", status: "AI-assisted", pct: 80 },
];

export default function TranslationsPage({ user }: { user: User }) {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">Translations</h1>
        <p className="text-cream/40 text-xs mt-0.5">Manage app language and translation coverage</p>
      </div>

      <div className="space-y-2 mb-5">
        {LANGUAGES.map(lang => (
          <div key={lang.code} data-testid={`lang-${lang.code}`}
            className="flex items-center gap-3 p-4 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="text-2xl">{lang.flag}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-cream text-sm font-medium">{lang.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    background: lang.pct === 100 ? "rgba(16,185,129,0.15)" : "rgba(251,191,36,0.15)",
                    color: lang.pct === 100 ? "#10b981" : "#fbbf24",
                  }}>
                  {lang.status}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.14)" }}>
                <div className="h-full rounded-full" style={{ width: `${lang.pct}%`, background: lang.pct === 100 ? "#10b981" : "#fbbf24" }} />
              </div>
            </div>
            <span className="text-cream/40 text-xs">{lang.pct}%</span>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl text-cream/40 text-xs" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.12)" }}>
        Translation strings are managed in code. The AI support assistant responds in all 6 languages. Kurdish support in the UI is partially implemented via AI.
      </div>
    </div>
  );
}
