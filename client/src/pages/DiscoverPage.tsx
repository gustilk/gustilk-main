import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SlidersHorizontal, X, Heart, RefreshCw, MapPin, Shield, Undo2 } from "lucide-react";
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

const UNDO_DURATION = 5500;

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
  const [swipeAnim, setSwipeAnim] = useState<"like" | "dislike" | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [undoProgress, setUndoProgress] = useState(100);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [fading, setFading] = useState(false);

  const undoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const undoStartRef = useRef<number>(0);
  const lastVisitedId = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<{ profiles: SafeUser[] }>({
    queryKey: ["/api/discover", minAge, maxAge],
    queryFn: async () => {
      const res = await fetch(`/api/discover?minAge=${minAge}&maxAge=${maxAge}`, { credentials: "include" });
      return res.json();
    },
  });

  const profiles = (data?.profiles ?? []).filter(p => p.id !== user.id);
  const current = profiles[currentIndex];

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
      if (remaining <= 0) { clearUndoTimer(); setUndoState(null); }
    }, 50);
  }, [clearUndoTimer]);

  useEffect(() => () => clearUndoTimer(), [clearUndoTimer]);

  const advanceProfile = (dir: "like" | "dislike", profile?: SafeUser, matchId?: string) => {
    setSwipeAnim(dir);
    setFading(true);
    setTimeout(() => {
      setSwipeAnim(null);
      setFading(false);
      setCurrentIndex(i => i + 1);
      setPhotoIdx(0);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      if (profile) startUndo(profile, dir, matchId);
    }, 420);
  };

  const undoMutation = useMutation({
    mutationFn: async ({ action, profileId }: { action: "like" | "dislike"; profileId: string }) => {
      await apiRequest("DELETE", action === "like" ? `/api/like/${profileId}` : `/api/dislike/${profileId}`);
    },
    onSuccess: (_, { action }) => {
      clearUndoTimer();
      setUndoState(null);
      setUndoProgress(100);
      if (action === "like") queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      setFading(true);
      setTimeout(() => {
        setFading(false);
        setCurrentIndex(i => Math.max(0, i - 1));
        setPhotoIdx(0);
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      }, 200);
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/like/${userId}`);
      return res.json();
    },
    onSuccess: (result, userId) => {
      const liked = profiles.find(p => p.id === userId);
      queryClient.invalidateQueries({ queryKey: ["/api/discover"] });
      if (result.matched && liked) {
        setMatchData({ user: liked, matchId: result.matchId });
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      }
      advanceProfile("like", liked, result.matched ? result.matchId : undefined);
    },
  });

  const dislikeMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/dislike/${userId}`);
    },
    onSuccess: (_, userId) => {
      const passed = profiles.find(p => p.id === userId);
      queryClient.invalidateQueries({ queryKey: ["/api/discover"] });
      advanceProfile("dislike", passed);
    },
  });

  const handleUndo = () => {
    if (!undoState || undoMutation.isPending) return;
    undoMutation.mutate({ action: undoState.action, profileId: undoState.profile.id });
  };

  const handleRefresh = () => {
    setMinAge(pendingMin);
    setMaxAge(pendingMax);
    setCurrentIndex(0);
    setShowFilters(false);
  };

  const casteLabel = (c: string) => ({ sheikh: "Sheikh", pir: "Pir", murid: "Mirid" }[c] ?? c);

  const age = current ? (() => {
    if ((current as any).dateOfBirth) {
      const dob = new Date((current as any).dateOfBirth);
      const today = new Date();
      let a = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--;
      return a;
    }
    return current.age;
  })() : null;

  const isPending = likeMutation.isPending || dislikeMutation.isPending;

  return (
    <div className="flex flex-col h-screen" style={{ background: "#0d0618" }}>

      {/* Lottie overlay */}
      {swipeAnim && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <LottieAnimation
            src={swipeAnim === "like" ? "/lottie/filling-heart.json" : "/lottie/cute-broken-heart.json"}
            loop={false} autoplay style={{ width: 220, height: 220 }}
          />
        </div>
      )}

      {/* ── Fixed header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-12 pb-3"
        style={{ background: "#0d0618", zIndex: 10 }}>
        <h1 className="font-serif text-3xl font-bold text-gold">Gûstîlk</h1>
        <button
          onClick={() => setShowFilters(f => !f)}
          data-testid="button-filters"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold"
          style={{ border: "1.5px solid rgba(201,168,76,0.25)", background: "rgba(255,255,255,0.05)", color: "rgba(253,248,240,0.6)" }}
        >
          <SlidersHorizontal size={14} />
          {t("discover.filters")}
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="flex-shrink-0 mx-5 mb-3 p-4 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,168,76,0.2)" }}>
          <div className="flex justify-between text-xs text-cream/50 uppercase tracking-wider mb-3 font-semibold">
            <span>{t("discover.minAge")}: {pendingMin}</span>
            <span>{t("discover.maxAge")}: {pendingMax}</span>
          </div>
          <Slider min={18} max={80} step={1} value={[pendingMin, pendingMax]}
            onValueChange={([min, max]) => { setPendingMin(min); setPendingMax(max); }}
            data-testid="filter-age-range"
            className="[&_[role=slider]]:bg-[#c9a84c] [&_[role=slider]]:border-[#c9a84c] [&_.relative]:bg-white/10 [&_[data-orientation=horizontal]]:h-1.5 [&_.absolute]:bg-[#c9a84c]"
          />
          <div className="flex justify-between text-xs text-cream/30 mt-1.5 mb-3">
            <span>18</span><span>80</span>
          </div>
          <button onClick={handleRefresh} data-testid="button-apply-filters"
            className="w-full py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}>
            {t("discover.applyFilters")}
          </button>
        </div>
      )}

      {/* ── Scrollable profile content ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto"
        style={{ opacity: fading ? 0 : 1, transition: "opacity 0.25s ease" }}>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-cream/40 text-sm">{t("discover.finding")}</p>
          </div>
        ) : !current ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ border: "2px solid rgba(201,168,76,0.3)" }}>
              <Heart size={32} color="rgba(201,168,76,0.5)" />
            </div>
            <h3 className="font-serif text-xl text-gold">{t("discover.noMore")}</h3>
            <p className="text-cream/40 text-sm">{t("discover.noMoreSub")}</p>
            <button onClick={handleRefresh} data-testid="button-refresh"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold mt-2"
              style={{ border: "1.5px solid rgba(201,168,76,0.4)", color: "#c9a84c" }}>
              <RefreshCw size={15} />{t("discover.refresh")}
            </button>
          </div>
        ) : (
          <div data-testid={`card-profile-${current.id}`}>

            {/* ── Photo section ── */}
            {(() => {
              const photos = current.photos ?? [];
              const photo = photos[photoIdx] ?? photos[0] ?? null;
              return (
                <div className="relative" style={{ height: "65vh" }}>
                  {photo ? (
                    <ProtectedPhoto src={photo} alt={current.fullName ?? ""}
                      className="w-full h-full object-cover"
                      blurred={current.gender === "female" && !!current.photosBlurred} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #2d0f4a, #4a1e6b, #7b3fa0)" }}>
                      <span className="font-serif text-8xl text-gold/20">
                        {(current.fullName ?? current.firstName ?? "M").charAt(0)}
                      </span>
                    </div>
                  )}

                  {/* Progress bars */}
                  {photos.length > 1 && (
                    <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
                      {photos.map((_, i) => (
                        <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.25)" }}>
                          <div className="h-full rounded-full"
                            style={{ background: i <= photoIdx ? "rgba(255,255,255,0.9)" : "transparent", width: i <= photoIdx ? "100%" : "0%", transition: "width 0.15s" }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tap zones */}
                  {photos.length > 1 && (
                    <>
                      <button className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
                        onClick={() => setPhotoIdx(i => Math.max(0, i - 1))} />
                      <button className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
                        onClick={() => setPhotoIdx(i => Math.min(photos.length - 1, i + 1))} />
                    </>
                  )}

                  {/* Caste badge */}
                  {current.caste && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold z-20"
                      style={{ background: "rgba(201,168,76,0.9)", color: "#1a0a2e" }}
                      data-testid={`badge-caste-${current.id}`}>
                      {casteLabel(current.caste)}
                    </div>
                  )}

                  {/* Photo count */}
                  {photos.length > 1 && (
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs z-20"
                      style={{ background: "rgba(13,6,24,0.65)", color: "rgba(255,255,255,0.6)" }}>
                      {photoIdx + 1}/{photos.length}
                    </div>
                  )}

                  {/* Bottom gradient */}
                  <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
                    style={{ background: "linear-gradient(to top, rgba(13,6,24,1), transparent)" }} />
                </div>
              );
            })()}

            {/* ── Profile info ── */}
            <div className="px-5 pt-5 pb-40 space-y-4">

              {/* Name + active status */}
              <div>
                <h2 className="font-serif text-3xl text-white font-bold leading-tight"
                  data-testid={`text-name-${current.id}`}>
                  {current.fullName ?? current.firstName ?? "Member"}{age ? `, ${age}` : ""}
                </h2>
                <div className="flex items-center flex-wrap gap-2 mt-2">
                  {current.isVerified && (
                    <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: "rgba(59,130,246,0.85)", color: "white" }}>
                      <Shield size={9} /> Verified
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-sm"
                    style={{ color: "rgba(253,248,240,0.55)" }}>
                    <MapPin size={13} color="rgba(201,168,76,0.8)" />
                    {current.city}{current.state ? `, ${current.state}` : ""}, {current.country}
                  </span>
                </div>
                {getActiveLabel(current.activitySeenAt) && (
                  <div className="flex items-center gap-1.5 mt-2" data-testid={`status-active-${current.id}`}>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"
                      style={{ boxShadow: "0 0 6px #34d399" }} />
                    <span className="text-emerald-400 text-xs font-medium">
                      {getActiveLabel(current.activitySeenAt)}
                    </span>
                  </div>
                )}
              </div>

              {/* About */}
              {current.bio && (
                <div className="rounded-2xl p-4"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <h3 className="text-white font-semibold text-sm mb-2">About</h3>
                  <p className="text-cream/75 text-sm leading-relaxed">{current.bio}</p>
                </div>
              )}

              {/* Info chips */}
              {(() => {
                const chips = [
                  current.caste && `${casteLabel(current.caste)} · Yezidi`,
                  age && `${age} years old`,
                  current.gender && current.gender.charAt(0).toUpperCase() + current.gender.slice(1),
                ].filter(Boolean) as string[];
                if (!chips.length) return null;
                return (
                  <div className="flex flex-wrap gap-2">
                    {chips.map(c => (
                      <span key={c} className="px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(253,248,240,0.8)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {c}
                      </span>
                    ))}
                  </div>
                );
              })()}

              {/* Languages */}
              {(current.languages ?? []).length > 0 && (
                <div className="rounded-2xl p-4"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <h3 className="text-white font-semibold text-sm mb-2.5">Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {(current.languages ?? []).map((lang: string) => (
                      <span key={lang} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                        style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.22)" }}>
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Interests */}
              {((current as any).interests ?? []).length > 0 && (
                <div className="rounded-2xl p-4"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <h3 className="text-white font-semibold text-sm mb-2.5">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {((current as any).interests ?? []).map((it: string) => (
                      <span key={it} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                        style={{ background: "rgba(123,63,160,0.18)", color: "#d4608a", border: "1px solid rgba(212,96,138,0.25)" }}>
                        {it}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Profiles remaining */}
              <p className="text-center text-cream/20 text-xs pt-2">
                {profiles.length - currentIndex - 1} more profile{profiles.length - currentIndex - 1 !== 1 ? "s" : ""} to discover
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky Like / Pass bar ── */}
      {current && (
        <div className="fixed left-0 right-0 z-40 flex flex-col items-center gap-3 pb-20 pt-4"
          style={{
            bottom: 0,
            background: "linear-gradient(to top, #0d0618 60%, rgba(13,6,24,0.85) 85%, transparent 100%)",
          }}>

          {/* Undo pill */}
          <div style={{
            opacity: undoState ? 1 : 0,
            transform: undoState ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 0.25s ease, transform 0.25s ease",
            pointerEvents: undoState ? "auto" : "none",
          }}>
            <button onClick={handleUndo} disabled={undoMutation.isPending}
              data-testid="button-undo"
              className="relative flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold overflow-hidden"
              style={{ background: "rgba(13,6,24,0.95)", border: "1.5px solid rgba(201,168,76,0.6)", color: "#c9a84c" }}>
              <span className="absolute inset-0 rounded-full"
                style={{ background: "rgba(201,168,76,0.1)", transformOrigin: "left center", transform: `scaleX(${undoProgress / 100})`, transition: "transform 0.05s linear" }} />
              <Undo2 size={14} />
              <span className="relative z-10">
                {t("discover.undo")}{undoState ? ` — ${undoState.profile.fullName ?? undoState.profile.firstName ?? ""}` : ""}
              </span>
            </button>
          </div>

          {/* Pass / Like */}
          <div className="flex items-center gap-10">
            <button
              onClick={() => dislikeMutation.mutate(current.id)}
              disabled={isPending}
              data-testid="button-dislike"
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.14)" }}>
              <X size={26} color="rgba(253,248,240,0.7)" />
            </button>
            <button
              onClick={() => likeMutation.mutate(current.id)}
              disabled={isPending}
              data-testid="button-like"
              className="w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7b3fa0, #d4608a)", boxShadow: "0 8px 28px rgba(212,96,138,0.45)" }}>
              <Heart size={30} fill="white" color="white" />
            </button>
          </div>
        </div>
      )}

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
