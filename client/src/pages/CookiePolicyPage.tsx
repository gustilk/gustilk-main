import { useLocation } from "wouter";
import { ChevronLeft, Cookie } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function CookiePolicyPage() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const sections = t("cookiePolicyPage.sections", { returnObjects: true }) as { num: string; title: string; body: string }[];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0d0002" }}>
      <div className="flex items-center gap-3 px-5 pt-12 pb-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(200,0,14,0.12)" }}>
        <button
          onClick={() => window.history.back()}
          data-testid="button-back-cookie-policy"
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ChevronLeft size={18} color="rgba(253,248,240,0.7)" />
        </button>
        <div className="flex items-center gap-2">
          <Cookie size={18} color="#c8000e" />
          <h1 className="font-serif text-xl text-gold">{t("cookiePolicyPage.pageTitle")}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 pb-16 space-y-4 max-w-2xl w-full mx-auto">
        <div className="rounded-2xl p-4" style={{ background: "rgba(200,0,14,0.06)", border: "1px solid rgba(200,0,14,0.15)" }}>
          <p className="text-gold text-sm font-semibold">{t("cookiePolicyPage.subtitle")}</p>
          <p className="text-cream/40 text-xs mt-1">{t("cookiePolicyPage.effective")}</p>
        </div>

        {Array.isArray(sections) && sections.map((s) => (
          <div key={s.num} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,0,14,0.1)" }}>
            <p className="text-gold text-sm font-semibold mb-1.5">{s.num}. {s.title}</p>
            <p className="text-cream/60 text-sm leading-relaxed">{s.body}</p>
          </div>
        ))}

        <p className="text-center text-xs pb-4" style={{ color: "rgba(253,248,240,0.2)" }}>
          © 2026 Gûstîlk · www.gustilk.com
        </p>
      </div>
    </div>
  );
}
