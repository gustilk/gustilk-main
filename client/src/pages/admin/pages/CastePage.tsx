import { Hash } from "lucide-react";
import type { User } from "@shared/schema";

const CASTES = [
  { name: "Sheikh", description: "Religious leaders and their descendants. Highest spiritual authority in the Yezidi hierarchy.", color: "#c8000e", count: "—" },
  { name: "Pir", description: "Spiritual guides who serve as intermediaries. Middle tier of the religious hierarchy.", color: "#8b5cf6", count: "—" },
  { name: "Mirid", description: "The largest caste, comprising the majority of Yezidi community members.", color: "#10b981", count: "—" },
];

const RULES = [
  "Sheikh may only marry within their own caste",
  "Pir may only marry within their own caste",
  "Mirid may marry within their own caste",
  "Interfaith marriages are not currently supported",
  "Minimum age: 18 years old",
];

export default function CastePage({ user }: { user: User }) {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">Caste Management</h1>
        <p className="text-cream/40 text-xs mt-0.5">Manage caste structure and marriage compatibility rules</p>
      </div>

      {/* Castes */}
      <div className="space-y-3 mb-5">
        {CASTES.map(c => (
          <div key={c.name} data-testid={`caste-${c.name.toLowerCase()}`}
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${c.color}22` }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${c.color}18` }}>
                <Hash size={14} color={c.color} />
              </div>
              <span className="text-cream font-semibold text-sm">{c.name}</span>
            </div>
            <p className="text-cream/50 text-xs">{c.description}</p>
          </div>
        ))}
      </div>

      {/* Compatibility rules */}
      <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,0,14,0.15)" }}>
        <h3 className="text-cream text-sm font-semibold mb-3">Marriage Compatibility Rules</h3>
        <div className="space-y-2">
          {RULES.map((rule, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#c8000e" }} />
              <span className="text-cream/60 text-xs">{rule}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 text-cream/30 text-xs" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          Caste matching rules are enforced in the discovery algorithm. To change rules, update the matching logic in the backend.
        </div>
      </div>
    </div>
  );
}
