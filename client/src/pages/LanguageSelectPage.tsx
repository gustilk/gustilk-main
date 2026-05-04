import newLogo from "@assets/IMG_1611_transparent.png";
import { useState } from "react";
import { LANGUAGE_LIST, LangCode, setLanguage } from "@/i18n";


interface Props {
  onSelect: () => void;
}

export default function LanguageSelectPage({ onSelect }: Props) {
  const [hovered, setHovered] = useState<LangCode | null>(null);
  const [selected, setSelected] = useState<LangCode | null>(null);

  function handlePick(code: LangCode) {
    setSelected(code);
    setLanguage(code);
    setTimeout(onSelect, 180);
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12"
      style={{ background: "linear-gradient(160deg, #0d0618 0%, #1a0a2e 60%, #0d0618 100%)" }}
    >
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="absolute inset-0" style={{
            background: "radial-gradient(circle, rgba(201,168,76,0.25) 0%, transparent 65%)",
            filter: "blur(16px)",
            transform: "scale(1.3)",
          }} />
          <img
            src={newLogo}
            alt="Gûstîlk"
            className="relative"
            style={{
              width: "180px",
              height: "180px",
              objectFit: "contain",
              filter: "none",

            }}
          />
        </div>

        <h1
          className="font-serif text-3xl font-bold text-center mb-2"
          style={{ color: "#c9a84c" }}
        >
          Gûstîlk
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: "rgba(253,248,240,0.45)" }}>
          Choose your language · اختر لغتك · Zimanê xwe hilbijêre
        </p>

        <div className="w-full grid grid-cols-2 gap-2.5">
          {LANGUAGE_LIST.map(({ code, native, flag }) => {
            const isActive = selected === code || hovered === code;
            return (
              <button
                key={code}
                data-testid={`button-lang-${code}`}
                onClick={() => handlePick(code)}
                onMouseEnter={() => setHovered(code)}
                onMouseLeave={() => setHovered(null)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-150"
                style={{
                  background: isActive
                    ? "rgba(201,168,76,0.15)"
                    : "rgba(255,255,255,0.04)",
                  border: isActive
                    ? "1px solid rgba(201,168,76,0.45)"
                    : "1px solid rgba(255,255,255,0.07)",
                  transform: isActive ? "scale(1.02)" : "scale(1)",
                }}
              >
                {flag.startsWith("/") || flag.startsWith("http") ? (
                  <img src={flag} alt="" className="flex-shrink-0 rounded-sm object-cover" style={{ width: "28px", height: "20px" }} />
                ) : (
                  <span className="text-2xl flex-shrink-0">{flag}</span>
                )}
                <span
                  className="text-sm font-medium truncate"
                  style={{ color: isActive ? "#c9a84c" : "rgba(253,248,240,0.75)" }}
                >
                  {native}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-8 text-xs text-center" style={{ color: "rgba(253,248,240,0.25)" }}>
          You can change this later in your profile settings.
        </p>
      </div>
    </div>
  );
}
