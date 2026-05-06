import newLogo from "@assets/IMG_1901_transparent.png";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SlidersHorizontal, X, Heart, RefreshCw, MapPin, Info, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import MatchModal from "@/components/MatchModal";
import ProtectedPhoto from "@/components/ProtectedPhoto";
import LottieAnimation from "@/components/LottieAnimation";
import { Slider } from "@/components/ui/slider";
import type { SafeUser } from "@shared/schema";

function getActiveLabel(ts: Date | string | null | undefined): string | null {
  if (!ts) return null;
  const hours = (Date.now() - new Date(ts).getTime()) / 3_600_000;
  if (hours < 24) return "Active today";
  if (hours < 72) return "Active recently";
  return null;
}

interface UndoState {
  profile: SafeUser;
  action: "like" | "dislike";
  matchId?: string;
}

const UNDO_DURATION = 5500; // ms

interface Props { user: SafeUser }

export default function DiscoverPage({ user }: Props) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [showFilters, setShowFilters] = useState(false);
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(60);
  const [pendingMin, setPendingMin] = useState(18);
  const [pendingMax, setPendingMax] = useState(60);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const stored = sessionStorage.getItem("discover_return_index");
    if (stored) { sessionStorage.removeItem("discover_return_index"); return parseInt(stored, 10); }
    return 0;
  });
  const [matchData, setMatchData] = useState<{ user: SafeUser; matchId: string } | null>(null);
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const [swipeAnim, setSwipeAnim] = useState<"like" | "dislike" | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [undoProgress, setUndoProgress] = useState(100);
  const [returningFrom, setReturningFrom] = useState<"left" | "right" | null>(null);
  const [cardPhotoIdx, setCardPhotoIdx] = useState(0);
  const undoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const undoStartRef = useRef<number>(0);
  const lastVisitedId = useRef<string | null>(null);

  const { data, isLoading, refetch } = useQuery<{ profiles: SafeUser[] }>({
    queryKey: ["/api/discover", minAge, maxAge],
    queryFn: async () => {
      const res = await fetch(`/api/discover?minAge=${minAge}&maxAge=${maxAge}`, { credentials: "include" });
      return res.json();
    },
  });

  const profiles = (data?.profiles ?? []).filter(p => p.id !== user.id);
  const current = profiles[currentIndex];

  // Record a visit when a new profile is shown
  useEffect(() => {
    if (current && current.id !== lastVisitedId.current) {
      lastVisitedId.current = current.id;
      apiRequest("POST", `/api/users/${current.id}/visit`).catch(() => {});
    }
  }, [current?.id]);

  const clearUndoTimer = useCallback(() => {
    if (undoTimerRef.current !== null) {
      clearInterval(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }, []);

  const startUndo = useCallback((profile: SafeUser, action: "like" | "dislike", matchId?: string) => {
    clearUndoTimer();
    setUndoState({ profile, action, matchId });
    setUndoProgress(100);
    undoStartRef.current = Date.now();

    undoTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - undoStartRef.current;
      const remaining = Math.max(0, 100 - (elapsed / UNDO_DURATION) * 100);
      setUndoProgress(remaining);
      if (remaining <= 0) {
        clearUndoTimer();
        setUndoState(null);
      }
    }, 50);
  }, [clearUndoTimer]);

  const undoMutation = useMutation({
    mutationFn: async ({ action, profileId }: { action: "like" | "dislike"; profileId: string }) => {
      const endpoint = action === "like" ? `/api/like/${profileId}` : `/api/dislike/${profileId}`;
      await apiRequest("DELETE", endpoint);
    },
    onSuccess: (_, { action }) => {
      clearUndoTimer();
      const profileToReturn = undoState?.profile;
      const dir = action === "like" ? "right" : "left";
      setUndoState(null);
      setUndoProgress(100);

      if (profileToReturn) {
        // Invalidate match queries if it was a like (in case a match was created)
        if (action === "like") {
          queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
        }
        // Step 1: place card off-screen instantly (no transition)
        setReturningFrom(dir);
        // Step 2: on next frame, clear returningFrom — CSS transition will animate it to center
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setReturningFrom(null);
            setCurrentIndex(i => Math.max(0, i - 1));
          });
        });
      }
    },
  });

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
      advanceCard("right", liked, result.matched ? result.matchId : undefined);
    },
  });

  const dislikeMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/dislike/${userId}`);
    },
    onSuccess: (_, userId) => {
      const passed = profiles.find(p => p.id === userId);
      advanceCard("left", passed);
    },
  });

  const advanceCard = (dir: "left" | "right", profile?: SafeUser, matchId?: string) => {
    setSwipeDir(dir);
    setSwipeAnim(dir === "right" ? "like" : "dislike");
    setTimeout(() => {
      setSwipeDir(null);
      setSwipeAnim(null);
      setCurrentIndex(i => i + 1);
      setCardPhotoIdx(0);
      if (profile) {
        startUndo(profile, dir === "right" ? "like" : "dislike", matchId);
      }
    }, 500);
  };

  const handleUndo = () => {
    if (!undoState || undoMutation.isPending) return;
    undoMutation.mutate({ action: undoState.action, profileId: undoState.profile.id });
  };

  // Cleanup undo timer on unmount
  useEffect(() => () => clearUndoTimer(), [clearUndoTimer]);

  const handleRefresh = () => {
    setMinAge(pendingMin);
    setMaxAge(pendingMax);
    setCurrentIndex(0);
    setShowFilters(false);
  };

  const casteLabel = (c: string) => ({ sheikh: "Sheikh", pir: "Pir", murid: "Mirid" }[c] ?? c);

  // Card transform: returning animation takes priority over swipe exit
  const cardTransform = (() => {
    if (returningFrom === "left") return "translateX(-120%) rotate(-15deg)";
    if (returningFrom === "right") return "translateX(120%) rotate(15deg)";
    if (swipeDir === "left") return "translateX(-120%) rotate(-15deg)";
    if (swipeDir === "right") return "translateX(120%) rotate(15deg)";
    return "none";
  })();

  return (
    <div className="flex flex-col min-h-screen pb-20" style={{ background: "#060612" }}>
      {/* Like / dislike Lottie overlay */}
      {swipeAnim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <LottieAnimation
            src={swipeAnim === "like" ? "/lottie/filling-heart.json" : "/lottie/cute-broken-heart.json"}
            loop={false}
            autoplay
            style={{ width: 220, height: 220 }}
          />
        </div>
      )}

      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <div className="flex items-center gap-2.5">
          <img src={newLogo} alt="" className="flex-shrink-0" style={{ width: "64px", height: "64px", objectFit: "contain" }} />
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
              className="relative rounded-3xl overflow-hidden"
              style={{
                border: "1.5px solid rgba(201,168,76,0.2)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(74,30,107,0.3)",
                transform: cardTransform,
                opacity: swipeDir ? 0 : 1,
                transition: returningFrom ? "none" : "transform 0.3s ease, opacity 0.3s ease",
              }}
              data-testid={`card-profile-${current.id}`}
            >
              {/* ── Photo area ── */}
              {(() => {
                const photos = current.photos ?? [];
                const photo = photos[cardPhotoIdx] ?? photos[0] ?? null;
                const totalPhotos = photos.length;
                const age = (() => {
                  if ((current as any).dateOfBirth) {
                    const dob = new Date((current as any).dateOfBirth);
                    const today = new Date();
                    let a = today.getFullYear() - dob.getFullYear();
                    const m = today.getMonth() - dob.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--;
                    return a;
                  }
                  return current.age;
                })();
                return (
                  <div className="relative" style={{ height: "min(520px, 68vh)", background: "linear-gradient(135deg, #2d0f4a, #4a1e6b, #7b3fa0)" }}>
                    {photo ? (
                      <ProtectedPhoto
                        src={photo}
                        alt={current.fullName ?? ""}
                        className="w-full h-full object-cover"
                        blurred={current.gender === "female" && !!current.photosBlurred}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-28 h-28 rounded-full flex items-center justify-center text-5xl font-serif text-gold"
                          style={{ background: "rgba(201,168,76,0.12)", border: "2px solid rgba(201,168,76,0.25)" }}>
                          {(current.fullName ?? current.firstName ?? "M").charAt(0)}
                        </div>
                      </div>
                    )}

                    {/* Photo progress bars */}
                    {totalPhotos > 1 && (
                      <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
                        {photos.map((_, i) => (
                          <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.25)" }}>
                            <div className="h-full rounded-full transition-all duration-200"
                              style={{ background: i <= cardPhotoIdx ? "rgba(255,255,255,0.9)" : "transparent", width: i <= cardPhotoIdx ? "100%" : "0%" }} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Left tap zone — prev photo */}
                    <button
                      className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
                      onClick={() => setCardPhotoIdx(i => Math.max(0, i - 1))}
                    />
                    {/* Right tap zone — next photo */}
                    <button
                      className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
                      onClick={() => setCardPhotoIdx(i => Math.min(totalPhotos - 1, i + 1))}
                    />

                    {/* View full profile — centre tap zone */}
                    <button
                      onClick={() => {
                        sessionStorage.setItem("profile_back_to", "/discover");
                        sessionStorage.setItem("discover_return_index", String(currentIndex));
                        setLocation(`/profile/${current.id}`);
                      }}
                      data-testid={`button-view-profile-${current.id}`}
                      className="absolute top-10 right-3 w-9 h-9 rounded-full flex items-center justify-center z-20 transition-all active:scale-95"
                      style={{ background: "rgba(13,6,24,0.75)", border: "1.5px solid rgba(201,168,76,0.4)", backdropFilter: "blur(4px)" }}
                    >
                      <Info size={17} color="#c9a84c" />
                    </button>

                    {/* Caste badge */}
                    <div className="absolute top-10 left-3 px-2.5 py-1 rounded-full text-xs font-bold z-20"
                      style={{ background: "rgba(201,168,76,0.9)", color: "#1a0a2e" }}
                      data-testid={`badge-caste-${current.id}`}>
                      {casteLabel(current.caste ?? "murid")}
                    </div>

                    {/* Gradient + info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 h-56 pointer-events-none"
                      style={{ background: "linear-gradient(to top, rgba(13,6,24,1), rgba(13,6,24,0.7) 50%, transparent)" }} />
                    <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pointer-events-none">
                      <div className="flex items-end justify-between gap-2">
                        <div className="flex-1">
                          <h2 className="font-serif text-2xl text-white font-bold leading-tight" data-testid={`text-name-${current.id}`}>
                            {current.fullName ?? current.firstName ?? "Member"}{age ? `, ${age}` : ""}
                          </h2>
                          <div className="flex items-center gap-1.5 mt-1">
                            <MapPin size={12} color="rgba(201,168,76,0.8)" />
                            <p className="text-white/60 text-sm">{current.city}{current.state ? `, ${current.state}` : ""}, {current.country}</p>
                          </div>
                          {getActiveLabel(current.activitySeenAt) && (
                            <div className="flex items-center gap-1.5 mt-1" data-testid={`status-active-${current.id}`}>
                              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" style={{ boxShadow: "0 0 6px #34d399" }} />
                              <span className="text-emerald-400 text-xs font-medium">{getActiveLabel(current.activitySeenAt)}</span>
                            </div>
                          )}
                        </div>
                        {totalPhotos > 1 && (
                          <span className="text-white/40 text-xs flex-shrink-0 mb-1">{cardPhotoIdx + 1}/{totalPhotos}</span>
                        )}
                      </div>
                      {current.bio && (
                        <p className="text-white/55 text-xs mt-2 line-clamp-2 leading-relaxed">{current.bio}</p>
                      )}
                      {((current.languages ?? []).length > 0 || (current as any).interests?.length > 0) && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {(current.languages ?? []).slice(0, 2).map((lang: string) => (
                            <span key={lang} className="px-2 py-0.5 rounded-full text-[11px]"
                              style={{ background: "rgba(201,168,76,0.15)", color: "rgba(201,168,76,0.9)", border: "1px solid rgba(201,168,76,0.2)" }}>
                              {lang}
                            </span>
                          ))}
                          {((current as any).interests ?? []).slice(0, 2).map((it: string) => (
                            <span key={it} className="px-2 py-0.5 rounded-full text-[11px]"
                              style={{ background: "rgba(123,63,160,0.2)", color: "rgba(212,96,138,0.9)", border: "1px solid rgba(212,96,138,0.2)" }}>
                              {it}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <p className="text-center text-cream/25 text-xs mt-3">
              {profiles.length - currentIndex - 1} more profile{profiles.length - currentIndex - 1 !== 1 ? "s" : ""} to discover
            </p>

            {/* Undo pill */}
            <div
              className="flex items-center justify-center mt-4"
              style={{
                opacity: undoState ? 1 : 0,
                transform: undoState ? "translateY(0)" : "translateY(8px)",
                transition: "opacity 0.25s ease, transform 0.25s ease",
                pointerEvents: undoState ? "auto" : "none",
              }}
            >
              <button
                onClick={handleUndo}
                disabled={undoMutation.isPending}
                data-testid="button-undo"
                className="relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold overflow-hidden"
                style={{
                  background: "rgba(13,6,24,0.9)",
                  border: "1.5px solid rgba(201,168,76,0.6)",
                  color: "#c9a84c",
                  backdropFilter: "blur(8px)",
                }}
              >
                {/* Progress bar background */}
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "rgba(201,168,76,0.12)",
                    transformOrigin: "left center",
                    transform: `scaleX(${undoProgress / 100})`,
                    transition: "transform 0.05s linear",
                  }}
                />
                <Undo2 size={15} />
                <span className="relative z-10">
                  {t("discover.undo")}
                  {undoState ? ` — ${undoState.profile.fullName ?? undoState.profile.firstName ?? ""}` : ""}
                </span>
              </button>
            </div>

            <div className="flex justify-center gap-10 mt-4">
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
