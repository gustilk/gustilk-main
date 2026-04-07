import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";

export default function DuplicatesPage({ user }: { user: User }) {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<{ duplicates: any[] }>({
    queryKey: ["/api/admin/duplicates"],
    queryFn: async () => (await fetch("/api/admin/duplicates", { credentials: "include" })).json(),
  });

  const dupes = data?.duplicates ?? [];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">Duplicate Detection</h1>
        <p className="text-cream/40 text-xs mt-0.5">Accounts that may be duplicates based on matching attributes</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-cream/40 text-sm">Loading…</div>
      ) : dupes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <Copy size={36} color="rgba(107,114,128,0.4)" />
          <p className="text-cream/40 text-sm">No duplicate accounts detected</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dupes.map((dupe, idx) => (
            <div key={idx} data-testid={`duplicate-pair-${idx}`}
              className="rounded-2xl p-4" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(251,191,36,0.15)" }}>
              <div className="text-yellow-400 text-xs font-semibold mb-3">Possible Duplicate Pair</div>
              <div className="grid grid-cols-2 gap-4">
                {[{ id: dupe.id1, email: dupe.email1, name: dupe.name1 }, { id: dupe.id2, email: dupe.email2, name: dupe.name2 }].map((u, i) => (
                  <div key={i} className="p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.04)" }}>
                    <div className="text-cream text-sm font-medium">{u.name ?? "Member"}</div>
                    <div className="text-cream/40 text-xs">{u.email}</div>
                    <div className="text-cream/30 text-[10px] mt-1">Age: {dupe.age} · {dupe.city}</div>
                    <button onClick={() => setLocation(`/admin/users/${u.id}`)}
                      data-testid={`button-view-duplicate-${u.id}`}
                      className="mt-2 px-3 py-1 rounded-lg text-[10px] font-semibold"
                      style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>
                      View Profile
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
