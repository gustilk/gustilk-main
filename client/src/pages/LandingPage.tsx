import { Heart, Shield, Users } from "lucide-react";

const FEATURES = [
  {
    icon: <Heart size={22} color="#c9a84c" />,
    title: "Caste-Respectful Matching",
    desc: "Meet people within your own caste — Sheikh, Pir, or Murid — honoring Yezidi tradition.",
  },
  {
    icon: <Shield size={22} color="#c9a84c" />,
    title: "Verified & Safe",
    desc: "Every profile is manually reviewed. Photo verification keeps the community authentic.",
  },
  {
    icon: <Users size={22} color="#c9a84c" />,
    title: "Community Events",
    desc: "Discover cultural gatherings, meetups, and online events near you and worldwide.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-ink relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 70% 60% at 15% 5%, rgba(74,30,107,0.9) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 85% 85%, rgba(212,96,138,0.3) 0%, transparent 60%)"
      }} />

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 py-12 text-center max-w-sm mx-auto w-full">
        <div className="mb-8 animate-slide-up">
          <div className="mb-5" style={{ filter: "drop-shadow(0 0 24px rgba(201,168,76,0.6))" }}>
            <svg viewBox="0 0 80 80" className="w-24 h-24 mx-auto" fill="none">
              <circle cx="40" cy="40" r="37" stroke="#c9a84c" strokeWidth="1.5" opacity="0.25"/>
              <circle cx="40" cy="40" r="30" stroke="#c9a84c" strokeWidth="1" opacity="0.15"/>
              <path d="M 20 40 Q 28 24 40 21 Q 52 24 60 40 Q 52 58 40 62 Q 28 58 20 40 Z"
                fill="rgba(201,168,76,0.15)" stroke="#c9a84c" strokeWidth="1.5"/>
              <circle cx="40" cy="40" r="9" fill="#c9a84c"/>
              <circle cx="40" cy="40" r="5" fill="#1a0a2e"/>
            </svg>
          </div>
          <h1 className="font-serif text-5xl font-bold text-gold mb-2 tracking-wide">Gûstîlk</h1>
          <p className="text-gold/60 text-sm tracking-[0.2em] uppercase mb-4">ر&#1740;ندان&#x200C;ێ كۆمه&#1740;&#x200C;گه</p>
          <p className="text-cream/55 text-base leading-relaxed">
            The exclusive dating app for the Yezidi community — connecting hearts across the diaspora with culture and respect.
          </p>
        </div>

        <div className="w-full mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <a
            href="/api/login"
            data-testid="button-signin"
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-base transition-all"
            style={{
              background: "linear-gradient(135deg, #c9a84c, #e8c97a)",
              color: "#1a0a2e",
              boxShadow: "0 8px 32px rgba(201,168,76,0.4)",
            }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
            Continue with Replit
          </a>
          <p className="text-cream/25 text-xs mt-3 text-center">
            Sign in with Google, Apple, GitHub or X — all through Replit
          </p>
        </div>

        <div className="w-full space-y-3 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-start gap-4 text-left p-4 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(201,168,76,0.1)" }}>
                {f.icon}
              </div>
              <div>
                <div className="text-cream/90 text-sm font-semibold mb-0.5">{f.title}</div>
                <div className="text-cream/40 text-xs leading-relaxed">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 text-center pb-6">
        <p className="text-cream/20 text-xs">© 2026 Gûstîlk · Built with love for the Yezidi community</p>
      </div>
    </div>
  );
}
