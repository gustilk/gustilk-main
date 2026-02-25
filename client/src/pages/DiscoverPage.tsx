import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SlidersHorizontal, X, Heart, RefreshCw } from "lucide-react";
import MatchModal from "@/components/MatchModal";
import type { SafeUser } from "@shared/schema";

interface Props { user: SafeUser }

export default function DiscoverPage({ user }: Props) {
  const [showFilters, setShowFilters] = useState(false);
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(60);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchData, setMatchData] = useState<{ user: SafeUser; matchId: string } | null>(null);
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);

  const { data, isLoading, refetch } = useQuery<{ profiles: SafeUser[] }>({
    queryKey: ["/api/discover", minAge, maxAge],
    queryFn: async () => {
      const res = await fetch(`/api/discover?minAge=${minAge}&maxAge=${maxAge}`, { credentials: "include" });
      return res.json();
    },
  });

  const profiles = data?.profiles ?? [];
  const current = profiles[currentIndex];

  const likeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/like/${userId}`);
      return res.json();
    },
    onSuccess: (result, userId) => {
      const liked = profiles.find(p => p.id === userId);
      if (result.matched && liked) {
        setMatchData({ user: liked, matchId: result.matchId });
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      }
      advanceCard("right");
    },
  });

  const dislikeMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/dislike/${userId}`);
    },
    onSuccess: () => advanceCard("left"),
  });

  const advanceCard = (dir: "left" | "right") => {
    setSwipeDir(dir);
    setTimeout(() => {
      setSwipeDir(null);
      setCurrentIndex(i => i + 1);
    }, 350);
  };

  const handleRefresh = () => {
    setCurrentIndex(0);
    refetch();
  };

  const casteLabel = (c: string) => ({ sheikh: "Sheikh", pir: "Pir", murid: "Murid" }[c] ?? c);

  return (
    <div className="flex flex-col min-h-screen pb-20" style={{ background: "#0d0618" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <h1 className="font-serif text-2xl text-gold">Gûstîlk</h1>
        <button
          onClick={() => setShowFilters(f => !f)}
          data-testid="button-filters"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all"
          style={{ border: "1.5px solid rgba(201,168,76,0.25)", background: "rgba(255,255,255,0.05)", color: "rgba(253,248,240,0.6)" }}
        >
          <SlidersHorizontal size={14} />
          Filters
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div
          className="mx-5 mb-4 p-4 rounded-2xl animate-slide-up"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,168,76,0.2)" }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-cream/50 uppercase tracking-wider mb-2 font-semibold">Min Age: {minAge}</div>
              <input type="range" min={18} max={60} value={minAge}
                onChange={e => setMinAge(Number(e.target.value))}
                className="w-full accent-[#c9a84c]" data-testid="filter-min-age" />
            </div>
            <div>
              <div className="text-xs text-cream/50 uppercase tracking-wider mb-2 font-semibold">Max Age: {maxAge}</div>
              <input type="range" min={18} max={80} value={maxAge}
                onChange={e => setMaxAge(Number(e.target.value))}
                className="w-full accent-[#c9a84c]" data-testid="filter-max-age" />
            </div>
          </div>
          <button
            onClick={handleRefresh}
            data-testid="button-apply-filters"
            className="w-full mt-3 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
          >
            Apply Filters
          </button>
        </div>
      )}

      {/* Card Area */}
      <div className="flex-1 px-5 pb-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-cream/40 text-sm">Finding profiles…</p>
          </div>
        ) : !current ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4 text-center px-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ border: "2px solid rgba(201,168,76,0.3)" }}
            >
              <Heart size={32} color="rgba(201,168,76,0.5)" />
            </div>
            <h3 className="font-serif text-xl text-gold">No more profiles</h3>
            <p className="text-cream/40 text-sm">You've seen everyone in your caste for now. Check back soon!</p>
            <button
              onClick={handleRefresh}
              data-testid="button-refresh"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold mt-2"
              style={{ border: "1.5px solid rgba(201,168,76,0.4)", color: "#c9a84c" }}
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>
        ) : (
          <>
            <div
              className="relative rounded-3xl overflow-hidden transition-all duration-300"
              style={{
                border: "1.5px solid rgba(201,168,76,0.2)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(74,30,107,0.3)",
                transform: swipeDir === "left" ? "translateX(-120%) rotate(-15deg)" : swipeDir === "right" ? "translateX(120%) rotate(15deg)" : "none",
                opacity: swipeDir ? 0 : 1,
              }}
              data-testid={`card-profile-${current.id}`}
            >
              {/* Photo */}
              <div
                className="h-96 relative flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #2d0f4a, #4a1e6b, #7b3fa0)" }}
              >
                {current.photos && current.photos.length > 0 ? (
                  <img src={current.photos[0]} alt={current.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-serif text-gold"
                    style={{ background: "rgba(201,168,76,0.12)", border: "2px solid rgba(201,168,76,0.25)" }}
                  >
                    {current.fullName.charAt(0)}
                  </div>
                )}
                <div
                  className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: "rgba(201,168,76,0.9)", color: "#1a0a2e" }}
                  data-testid={`badge-caste-${current.id}`}
                >
                  {casteLabel(current.caste)}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-40" style={{ background: "linear-gradient(to top, rgba(13,6,24,0.97), transparent)" }} />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h2 className="font-serif text-2xl text-white font-bold" data-testid={`text-name-${current.id}`}>
                    {current.fullName}, {current.age}
                  </h2>
                  <p className="text-white/60 text-sm mt-0.5">{current.city}, {current.country}</p>
                  {current.bio && (
                    <p className="text-white/40 text-xs mt-1.5 line-clamp-2 leading-relaxed">{current.bio}</p>
                  )}
                </div>
              </div>

              {/* Info strip */}
              <div className="p-4" style={{ background: "rgba(13,6,24,0.95)" }}>
                <div className="flex flex-wrap gap-2">
                  {current.occupation && (
                    <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.2)" }}>
                      {current.occupation}
                    </span>
                  )}
                  {(current.languages ?? []).slice(0, 3).map(lang => (
                    <span key={lang} className="px-2.5 py-1 rounded-full text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(253,248,240,0.5)" }}>
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-center text-cream/25 text-xs mt-3">
              {profiles.length - currentIndex - 1} more profile{profiles.length - currentIndex - 1 !== 1 ? "s" : ""} to discover
            </p>

            {/* Action Buttons */}
            <div className="flex justify-center gap-10 mt-5">
              <button
                onClick={() => dislikeMutation.mutate(current.id)}
                disabled={dislikeMutation.isPending || likeMutation.isPending}
                data-testid="button-dislike"
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all"
                style={{ background: "rgba(255,255,255,0.07)", border: "2px solid rgba(255,255,255,0.1)" }}
              >
                <X size={24} color="rgba(253,248,240,0.6)" />
              </button>
              <button
                onClick={() => likeMutation.mutate(current.id)}
                disabled={likeMutation.isPending || dislikeMutation.isPending}
                data-testid="button-like"
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all"
                style={{ background: "linear-gradient(135deg, #7b3fa0, #d4608a)", boxShadow: "0 8px 24px rgba(212,96,138,0.4)" }}
              >
                <Heart size={26} fill="white" color="white" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Match Modal */}
      {matchData && (
        <MatchModal
          matchedUser={matchData.user}
          matchId={matchData.matchId}
          onClose={() => setMatchData(null)}
        />
      )}
    </div>
  );
}
