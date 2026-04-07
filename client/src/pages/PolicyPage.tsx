import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

interface Section { title: string; body: string; }

interface Props {
  titleKey: string;
  introKey: string;
  sectionsKey: string;
  backTo?: string;
}

export default function PolicyPage({ titleKey, introKey, sectionsKey, backTo = "/" }: Props) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  const sections = t(sectionsKey, { returnObjects: true }) as Section[];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#E30613" }}>
      <div className="flex items-center gap-3 px-5 pt-12 pb-4" style={{ borderBottom: "1px solid rgba(255,215,0,0.12)" }}>
        <button
          onClick={() => setLocation(backTo)}
          data-testid="button-back-policy"
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.12)" }}
        >
          <ArrowLeft size={18} color="rgba(255,255,255,0.7)" />
        </button>
        <h1 className="font-serif text-xl text-gold">{t(titleKey)}</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-16 space-y-4 max-w-lg mx-auto w-full">
        <p className="text-cream/50 text-sm leading-relaxed">{t(introKey)}</p>
        {Array.isArray(sections) && sections.map((s, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,215,0,0.1)" }}>
            <p className="text-gold text-sm font-semibold mb-1.5">{s.title}</p>
            <p className="text-cream/60 text-sm leading-relaxed">{s.body}</p>
          </div>
        ))}
        <p className="text-cream/20 text-xs text-center pt-4">© 2026 Gûstîlk · support@gustilk.com</p>
      </div>
    </div>
  );
}
