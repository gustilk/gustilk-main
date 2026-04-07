import { useState, useEffect } from "react";
import { Cookie, X, ChevronDown, ChevronUp } from "lucide-react";
import { useLocation } from "wouter";

const CONSENT_KEY = "gustilk_cookie_consent";
const PREFS_KEY = "gustilk_cookie_prefs";

export type CookieConsent = {
  essential: true;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
  timestamp: number;
};

export function getCookieConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveConsent(prefs: Omit<CookieConsent, "essential" | "timestamp">) {
  const consent: CookieConsent = {
    essential: true,
    analytics: prefs.analytics,
    functional: prefs.functional,
    marketing: prefs.marketing,
    timestamp: Date.now(),
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  return consent;
}

const LEGAL_ROUTES = ["/cookie-policy", "/gdpr", "/safety-tips", "/privacy", "/terms", "/refund", "/guidelines"];

export default function CookieConsentBanner() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState({ analytics: false, functional: true, marketing: false });

  useEffect(() => {
    if (LEGAL_ROUTES.includes(location)) return;
    const existing = getCookieConsent();
    if (!existing) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [location]);

  if (!visible) return null;

  const acceptAll = () => {
    saveConsent({ analytics: true, functional: true, marketing: true });
    setVisible(false);
  };

  const acceptSelected = () => {
    saveConsent(prefs);
    setVisible(false);
  };

  const rejectNonEssential = () => {
    saveConsent({ analytics: false, functional: false, marketing: false });
    setVisible(false);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[1000] px-4 pb-4 pt-3"
      style={{ background: "linear-gradient(to top, rgba(13,6,24,0.98) 60%, transparent)" }}
      data-testid="cookie-consent-banner"
    >
      <div
        className="max-w-lg mx-auto rounded-2xl p-4"
        style={{
          background: "#130820",
          border: "1px solid rgba(255,215,0,0.3)",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,215,0,0.08)",
        }}
      >
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,215,0,0.12)" }}>
            <Cookie size={15} color="#FFD700" />
          </div>
          <div className="flex-1">
            <p className="text-cream text-sm font-semibold">We use cookies</p>
            <p className="text-cream/45 text-xs mt-0.5 leading-relaxed">
              Gûstîlk uses cookies to improve your experience, analyse performance, and show relevant content.
              Essential cookies are always active.{" "}
              <a href="/cookie-policy" className="underline" style={{ color: "rgba(255,215,0,0.7)" }}>
                Cookie Policy
              </a>
            </p>
          </div>
        </div>

        {/* Expandable preferences */}
        {expanded && (
          <div className="mb-3 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.14)" }}>
            {[
              {
                key: "essential" as const,
                label: "Essential",
                desc: "Required for the app to work. Cannot be disabled.",
                locked: true,
                checked: true,
              },
              {
                key: "analytics" as const,
                label: "Analytics",
                desc: "Help us understand how the app is used.",
                locked: false,
                checked: prefs.analytics,
              },
              {
                key: "functional" as const,
                label: "Functional",
                desc: "Remember your preferences and settings.",
                locked: false,
                checked: prefs.functional,
              },
              {
                key: "marketing" as const,
                label: "Marketing",
                desc: "Personalised ads and campaign measurement.",
                locked: false,
                checked: prefs.marketing,
              },
            ].map((item, i, arr) => (
              <div key={item.key}>
                <div className="flex items-center gap-3 px-3 py-2.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="flex-1">
                    <p className="text-cream text-xs font-semibold">{item.label}</p>
                    <p className="text-cream/40 text-[10px] mt-0.5">{item.desc}</p>
                  </div>
                  {item.locked ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>Always on</span>
                  ) : (
                    <button
                      onClick={() => setPrefs(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))}
                      data-testid={`cookie-toggle-${item.key}`}
                      className="relative w-9 h-5 rounded-full flex-shrink-0 transition-all"
                      style={{
                        background: item.checked ? "rgba(255,215,0,0.8)" : "rgba(255,255,255,0.1)",
                        border: "1px solid rgba(255,255,255,0.18)",
                      }}
                    >
                      <span
                        className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                        style={{
                          background: item.checked ? "#500004" : "rgba(255,255,255,0.4)",
                          left: item.checked ? "calc(100% - 18px)" : "2px",
                        }}
                      />
                    </button>
                  )}
                </div>
                {i < arr.length - 1 && <div style={{ height: 1, background: "rgba(255,255,255,0.12)" }} />}
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={acceptAll}
              data-testid="button-accept-all-cookies"
              className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-opacity"
              style={{
                background: "linear-gradient(135deg, #FFD700, #CC9900)",
                color: "#500004",
              }}
            >
              Accept All
            </button>
            <button
              onClick={rejectNonEssential}
              data-testid="button-reject-cookies"
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-opacity"
              style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Essential Only
            </button>
            <button
              onClick={() => setExpanded(e => !e)}
              data-testid="button-cookie-preferences"
              className="w-10 py-2.5 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.14)" }}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>
          {expanded && (
            <button
              onClick={acceptSelected}
              data-testid="button-save-cookie-preferences"
              className="w-full py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(255,215,0,0.12)", color: "#FFD700", border: "1px solid rgba(255,215,0,0.25)" }}
            >
              Save My Preferences
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
