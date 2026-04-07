import { Star } from "lucide-react";
import type { User } from "@shared/schema";

export default function AppStorePage({ user }: { user: User }) {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">App Store Reviews</h1>
        <p className="text-cream/40 text-xs mt-0.5">Monitor App Store and Google Play ratings</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { store: "App Store", platform: "iOS", icon: "🍎", rating: "—" },
          { store: "Google Play", platform: "Android", icon: "🤖", rating: "—" },
        ].map(s => (
          <div key={s.store} data-testid={`store-${s.platform.toLowerCase()}`}
            className="rounded-2xl p-5 text-center" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-3xl mb-2">{s.icon}</div>
            <div className="text-cream text-sm font-semibold">{s.store}</div>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[1,2,3,4,5].map(i => <Star key={i} size={14} color="rgba(244,196,48,0.3)" fill="rgba(244,196,48,0.3)" />)}
            </div>
            <div className="text-cream/40 text-xs mt-1">Not yet listed</div>
          </div>
        ))}
      </div>
      <div className="p-4 rounded-2xl text-cream/40 text-xs" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,0,0,0.05)" }}>
        App Store review monitoring will be available once the app is published to the App Store and Google Play.
      </div>
    </div>
  );
}
