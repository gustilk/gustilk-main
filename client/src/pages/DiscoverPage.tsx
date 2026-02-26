import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SlidersHorizontal, X, Heart, RefreshCw, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import logoImg from "@assets/logo-gustilk.png";
import MatchModal from "@/components/MatchModal";
import ProtectedPhoto from "@/components/ProtectedPhoto";
import { Slider } from "@/components/ui/slider";
import type { SafeUser } from "@shared/schema";

interface Props { user: SafeUser }

export default function DiscoverPage({ user }: Props) {
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(false);
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(60);
  const [pendingMin, setPendingMin] = useState(18);
  const [pendingMax, setPendingMax] = useState(60);
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
    setMinAge(pendingMin);
    setMaxAge(pendingMax);
    setCurrentIndex(0);
    setShowFilters(false);
  };

  const casteLabel = (c: string) => ({ sheikh: "Sheikh", pir: "Pir", murid: "Mirid" }[c] ?? c);

  return (
    <div className="flex flex-col min-h-screen pb-20" style={{ background: "#0d0618" }}>
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <div className="flex items-center gap-2.5">
          <img src={logoImg} alt="" className="flex-shrink-0" style={{ width: "48px", height: "48px", objectFit: "contain", filter: "drop-shadow(0 1px 6px rgba(201,168,76,0.6))", mixBlendMode: "screen" as React.CSSProperties["mixBlendMode"] }} />
          <h1 className="font-serif text-2xl text-gold">Gûstîlk</h1>
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          data-testid="button-filters"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all"
          style={{ border: "1.5px solid rgba(201,168,76,0.25)", background: "rgba(255,255,255,0.05)", color: "rgba(253,248,240,0.6)" }}
        >
          <SlidersHorizontal size={14} />
          {t("discover.filters")}
        </button>
      </div>

      {showFilters && (
        <div
          className="mx-5 mb-4 p-4 rounded-2xl animate-slide-up"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,168,76,0.2)" }}
        >
          <div>
            <div className="flex justify-between text-xs text-cream/50 uppercase tracking-wider mb-3 font-semibold">
              <span>{t("discover.minAge")}: {pendingMin}</span>
              <span>{t("discover.maxAge")}: {pendingMax}</span>
            </div>
            <Slider
              min={18}
              max={80}
              step={1}
              value={[pendingMin, pendingMax]}
              onValueChange={([min, max]) => { setPendingMin(min); setPendingMax(max); }}
              data-testid="filter-age-range"
              className="[&_[role=slider]]:bg-[#c9a84c] [&_[role=slider]]:border-[#c9a84c] [&_.relative]:bg-white/10 [&_[data-orientation=horizontal]]:h-1.5 [&_.absolute]:bg-[#c9a84c]"
            />
            <div className="flex justify-between text-xs text-cream/30 mt-1.5">
              <span>18</span>
              <span>80</span>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            data-testid="button-apply-filters"
            className="w-full mt-3 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
          >
            {t("discover.applyFilters")}
          </button>
        </div>
      )}

      <div className="flex-1 px-5 pb-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-cream/40 text-sm">{t("discover.finding")}</p>
          </div>
        ) : !current ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4 text-center px-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ border: "2px solid rgba(201,168,76,0.3)" }}
            >
              <Heart size={32} color="rgba(201,168,76,0.5)" />
            </div>
            <h3 className="font-serif text-xl text-gold">{t("discover.noMore")}</h3>
            <p className="text-cream/40 text-sm">{t("discover.noMoreSub")}</p>
            <button
              onClick={handleRefresh}
              data-testid="button-refresh"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold mt-2"
              style={{ border: "1.5px solid rgba(201,168,76,0.4)", color: "#c9a84c" }}
            >
              <RefreshCw size={15} />
              {t("discover.refresh")}
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
              <div
                className="relative flex items-center justify-center"
                style={{ height: "min(420px, 52vh)", background: "linear-gradient(135deg, #2d0f4a, #4a1e6b, #7b3fa0)" }}
              >
                {current.photos && current.photos.length > 0 ? (
                  <ProtectedPhoto src={current.photos[0]} alt={current.fullName ?? ""} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-28 h-28 rounded-full flex items-center justify-center text-5xl font-serif text-gold"
                    style={{ background: "rgba(201,168,76,0.12)", border: "2px solid rgba(201,168,76,0.25)" }}
                  >
                    {(current.fullName ?? current.firstName ?? "M").charAt(0)}
                  </div>
                )}

                <div
                  className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: "rgba(201,168,76,0.9)", color: "#1a0a2e" }}
                  data-testid={`badge-caste-${current.id}`}
                >
                  {casteLabel(current.caste ?? "murid")}
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-52" style={{ background: "linear-gradient(to top, rgba(13,6,24,0.98), transparent)" }} />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h2 className="font-serif text-2xl text-white font-bold leading-tight" data-testid={`text-name-${current.id}`}>
                    {current.fullName ?? current.firstName ?? "Member"}, {(() => {
                    if ((current as any).dateOfBirth) {
                      const dob = new Date((current as any).dateOfBirth);
                      const today = new Date();
                      let a = today.getFullYear() - dob.getFullYear();
                      const m = today.getMonth() - dob.getMonth();
                      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--;
                      return a;
                    }
                    return current.age;
                  })()}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <MapPin size={13} color="rgba(201,168,76,0.8)" />
                    <p className="text-white/60 text-sm">{current.city}{current.state ? `, ${current.state}` : ""}, {current.country}</p>
                  </div>
                  {current.bio && (
                    <p className="text-white/50 text-xs mt-2 line-clamp-2 leading-relaxed">{current.bio}</p>
                  )}
                  {(current.languages ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {(current.languages ?? []).slice(0, 3).map(lang => (
                        <span
                          key={lang}
                          className="px-2 py-0.5 rounded-full text-[11px]"
                          style={{ background: "rgba(201,168,76,0.15)", color: "rgba(201,168,76,0.9)", border: "1px solid rgba(201,168,76,0.2)" }}
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-center text-cream/25 text-xs mt-3">
              {profiles.length - currentIndex - 1} more profile{profiles.length - currentIndex - 1 !== 1 ? "s" : ""} to discover
            </p>

            <div className="flex justify-center gap-10 mt-5">
              <button
                onClick={() => dislikeMutation.mutate(current.id)}
                disabled={dislikeMutation.isPending || likeMutation.isPending}
                data-testid="button-dislike"
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all"
                style={{ background: "rgba(255,255,255,0.07)", border: "2px solid rgba(255,255,255,0.12)" }}
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

      {matchData && (
        <MatchModal
          matchedUser={matchData.user}
          currentUser={user}
          matchId={matchData.matchId}
          onClose={() => setMatchData(null)}
        />
      )}
    </div>
  );
}
