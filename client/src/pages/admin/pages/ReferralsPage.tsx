import { Share2 } from "lucide-react";
import type { User } from "@shared/schema";

export default function ReferralsPage({ user }: { user: User }) {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">Referral Program</h1>
        <p className="text-cream/40 text-xs mt-0.5">Track who invited who and rewards given</p>
      </div>
      <div className="rounded-2xl p-8 text-center" style={{ background: "rgba(255,255,255,0.10)", border: "1px dashed rgba(255,215,0,0.2)" }}>
        <Share2 size={32} color="rgba(255,215,0,0.4)" className="mx-auto mb-3" />
        <div className="text-cream/50 text-sm font-medium">Referral Tracking Not Yet Active</div>
        <div className="text-cream/30 text-xs mt-2 max-w-xs mx-auto">
          Enable referral tracking by adding a referral code field to user profiles and tracking invitation sources.
        </div>
      </div>
    </div>
  );
}
