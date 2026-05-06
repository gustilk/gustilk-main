import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface Section { title: string; body: string; }

export default function GuidelinesPage() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  const agreementSections = t("agreement.sections", { returnObjects: true }) as Section[];
  const section8 = { title: t("settings.guidelinesSection8Title"), body: t("settings.guidelinesSection8Body") };
  const sectionContact = { title: t("settings.guidelinesContactTitle"), body: t("settings.guidelinesContactBody") };
  const allSections = [...(Array.isArray(agreementSections) ? agreementSections : []), section8, sectionContact];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#060612" }}>
      <div className="flex items-center gap-3 px-5 pt-12 pb-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
        <button
          onClick={() => setLocation("/")}
          data-testid="button-back-policy"
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ArrowLeft size={18} color="rgba(253,248,240,0.7)" />
        </button>
        <h1 className="font-serif text-xl text-gold">{t("settings.guidelinesPageTitle")}</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-16 space-y-4 max-w-lg mx-auto w-full">
        <p className="text-cream/30 text-xs mb-1">{t("settings.guidelinesLastUpdated")}</p>
        <p className="text-cream/50 text-sm leading-relaxed">{t("settings.guidelinesIntro")}</p>
        {allSections.map((s, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.1)" }}>
            <p className="text-gold text-sm font-semibold mb-1.5">{s.title}</p>
            <p className="text-cream/60 text-sm leading-relaxed whitespace-pre-line">{s.body}</p>
          </div>
        ))}
        <p className="text-cream/20 text-xs text-center pt-4">© 2026 Gûstîlk · support@gustilk.com</p>
      </div>
    </div>
  );
}
