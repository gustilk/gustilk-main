import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SlidersHorizontal, X, Heart, RotateCcw, Undo2, MessageCircle, Send, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [country, setCountry] = useState("");
  const [pendingCountry, setPendingCountry] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchData, setMatchData] = useState<{ user: SafeUser; matchId: string } | null>(null);
  const [swipeAnim, setSwipeAnim] = useState<"like" | "dislike" | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [undoProgress, setUndoProgress] = useState(100);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [photoSlideDir, setPhotoSlideDir] = useState<1 | -1>(1);
  const [fading, setFading] = useState(false);
  const [replyTo, setReplyTo] = useState<{ topic: string; label: string } | null>(null);
  const [replyText, setReplyText] = useState("");

  const undoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const undoStartRef = useRef<number>(0);
  const lastVisitedId = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const photoTouchRef = useRef<{ startX: number; startY: number; isHoriz: boolean | null }>({ startX: 0, startY: 0, isHoriz: null });

  const { data, isLoading } = useQuery<{ profiles: SafeUser[] }>({
    queryKey: ["/api/discover", minAge, maxAge, country],
    queryFn: async () => {
      const params = new URLSearchParams({ minAge: String(minAge), maxAge: String(maxAge) });
      if (country) params.set("country", country);
      const res = await fetch(`/api/discover?${params}`, { credentials: "include" });
      return res.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const profiles = (data?.profiles ?? []).filter(p => p.id !== user.id);
  const current = profiles[currentIndex];

  const prevProfileCount = useRef(0);
  useEffect(() => {
    const newCount = profiles.length;
    if (newCount > prevProfileCount.current && currentIndex >= prevProfileCount.current && prevProfileCount.current > 0) {
      setCurrentIndex(prevProfileCount.current);
    }
    prevProfileCount.current = newCount;
  }, [profiles.length]);

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
    mutationFn: async ({ userId, comment }: { userId: string; comment?: string }) => {
      const res = await apiRequest("POST", `/api/like/${userId}`, comment ? { comment } : undefined);
      return res.json();
    },
    onSuccess: (result, { userId }) => {
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
    mutationFn: async ({ userId }: { userId: string }) => {
      await apiRequest("POST", `/api/dislike/${userId}`);
    },
    onSuccess: (_, { userId }) => {
      const passed = profiles.find(p => p.id === userId);
      queryClient.invalidateQueries({ queryKey: ["/api/discover"] });
      advanceProfile("dislike", passed);
    },
  });

  const handleUndo = () => {
    if (!undoState || undoMutation.isPending) return;
    undoMutation.mutate({ action: undoState.action, profileId: undoState.profile.id });
  };

  const handleApplyFilters = () => {
    setMinAge(pendingMin);
    setMaxAge(pendingMax);
    setCountry(pendingCountry);
    setCurrentIndex(0);
    setShowFilters(false);
    queryClient.invalidateQueries({ queryKey: ["/api/discover"] });
  };

  const resetMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/dislikes"),
    onSuccess: () => {
      setCurrentIndex(0);
      setPhotoIdx(0);
      queryClient.invalidateQueries({ queryKey: ["/api/discover"] });
    },
  });

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
    <div className="relative overflow-hidden" style={{ background: "#0d0618", height: "100dvh" }}>

      {/* Lottie overlay */}
      {swipeAnim && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <LottieAnimation
            src={swipeAnim === "like" ? "/lottie/filling-heart.json" : "/lottie/cute-broken-heart.json"}
            loop={false} autoplay style={{ width: 220, height: 220 }}
          />
        </div>
      )}

      {/* ── Fixed solid header ── */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-5 pb-3"
        style={{
          background: "#0d0618",
          paddingTop: "calc(12px + env(safe-area-inset-top))",
          height: "calc(56px + env(safe-area-inset-top))",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
        <h1 className="font-serif text-2xl font-bold" style={{ color: "#c9a84c" }}>
          Gûstîlk
        </h1>
        <button
          onClick={() => setShowFilters(f => !f)}
          data-testid="button-filters"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1.5px solid rgba(255,255,255,0.15)",
            color: "rgba(253,248,240,0.85)",
          }}
        >
          <SlidersHorizontal size={14} />
          {t("discover.filters")}
        </button>
      </div>

      {/* Filters panel — floats below header */}
      {showFilters && (
        <div className="fixed left-4 right-4 z-40 p-4 rounded-2xl"
          style={{
            top: "calc(56px + env(safe-area-inset-top) + 8px)",
            background: "rgba(13,6,24,0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(201,168,76,0.2)",
          }}>
          <div className="flex justify-between text-xs text-cream/50 uppercase tracking-wider mb-3 font-semibold">
            <span>{t("discover.minAge")}: {pendingMin}</span>
            <span>{t("discover.maxAge")}: {pendingMax}</span>
          </div>
          <Slider min={18} max={80} step={1} value={[pendingMin, pendingMax]}
            onValueChange={([min, max]) => { setPendingMin(min); setPendingMax(max); }}
            data-testid="filter-age-range"
            className="[&_[role=slider]]:bg-[#c9a84c] [&_[role=slider]]:border-[#c9a84c] [&_.relative]:bg-white/10 [&_[data-orientation=horizontal]]:h-1.5 [&_.absolute]:bg-[#c9a84c]"
          />
          <div className="flex justify-between text-xs text-cream/30 mt-1.5 mb-4">
            <span>18</span><span>80</span>
          </div>

          <div className="mb-4">
            <p className="text-xs text-cream/50 uppercase tracking-wider font-semibold mb-2">Country</p>
            <select
              value={pendingCountry}
              onChange={e => setPendingCountry(e.target.value)}
              data-testid="filter-country"
              className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(201,168,76,0.25)",
                color: pendingCountry ? "rgba(253,248,240,0.9)" : "rgba(253,248,240,0.35)",
              }}
            >
              <option value="">All countries</option>
              {["USA","Canada","Australia","Germany","Holland","Sweden","Belgium","France","Turkey","Iraq","Armenia","Georgia","Russia","UK"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button onClick={handleApplyFilters} data-testid="button-apply-filters"
            className="w-full py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}>
            {t("discover.applyFilters")}
          </button>
        </div>
      )}

      {/* ── Scrollable content ── */}
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto"
        style={{
          opacity: fading ? 0 : 1,
          transition: "opacity 0.25s ease",
          paddingTop: "calc(56px + env(safe-area-inset-top))",
          paddingBottom: "calc(62px + env(safe-area-inset-bottom))",
        }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-cream/40 text-sm">{t("discover.finding")}</p>
          </div>
        ) : !current ? (
          <div className="flex flex-col items-center justify-center gap-5 text-center px-8"
            style={{ height: "calc(100dvh - 56px - 62px - env(safe-area-inset-top) - env(safe-area-inset-bottom))" }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "rgba(201,168,76,0.08)", border: "2px solid rgba(201,168,76,0.3)" }}>
              <Heart size={32} color="#c9a84c" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-bold text-gold mb-2">{t("discover.noMore")}</h3>
              <p className="text-cream/60 text-sm leading-relaxed">{t("discover.noMoreSub")}</p>
            </div>
            <button
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
              data-testid="button-reset-discover"
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold mt-1 disabled:opacity-60"
              style={{ background: "#c9a84c", color: "#1a0a2e" }}>
              <RotateCcw size={15} />
              {resetMutation.isPending ? t("discover.resetting") : t("discover.resetStart")}
            </button>
          </div>
        ) : (
          <div data-testid={`card-profile-${current.id}`}>

            {/* ── Full-screen photo card with overlays ── */}
            {(() => {
              const photos = current.photos ?? [];
              const photo = photos[photoIdx] ?? photos[0] ?? null;
              return (
                <div
                  className="relative mx-3 overflow-hidden"
                  style={{
                    borderRadius: 16,
                    height: "calc(100dvh - 56px - env(safe-area-inset-top) - 62px - env(safe-area-inset-bottom) - 16px)",
                  }}
                  onTouchStart={(e) => {
                    photoTouchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, isHoriz: null };
                  }}
                  onTouchMove={(e) => {
                    const dx = Math.abs(e.touches[0].clientX - photoTouchRef.current.startX);
                    const dy = Math.abs(e.touches[0].clientY - photoTouchRef.current.startY);
                    if (photoTouchRef.current.isHoriz === null && (dx > 6 || dy > 6)) {
                      photoTouchRef.current.isHoriz = dx > dy;
                    }
                    if (photoTouchRef.current.isHoriz) e.preventDefault();
                  }}
                  onTouchEnd={(e) => {
                    if (!photoTouchRef.current.isHoriz || photos.length <= 1) return;
                    const dx = e.changedTouches[0].clientX - photoTouchRef.current.startX;
                    if (dx < -40) { setPhotoSlideDir(1); setPhotoIdx(i => Math.min(photos.length - 1, i + 1)); }
                    else if (dx > 40) { setPhotoSlideDir(-1); setPhotoIdx(i => Math.max(0, i - 1)); }
                  }}
                >
                  {/* Photo — animated slide between photos */}
                  <AnimatePresence initial={false} custom={photoSlideDir}>
                    <motion.div
                      key={`${current.id}-${photoIdx}`}
                      custom={photoSlideDir}
                      variants={{
                        enter: (dir: number) => ({ x: `${dir * 100}%`, opacity: 0.6 }),
                        center: { x: 0, opacity: 1 },
                        exit: (dir: number) => ({ x: `${dir * -100}%`, opacity: 0.6 }),
                      }}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="absolute inset-0"
                    >
                      {photo ? (
                        <ProtectedPhoto src={photo} alt={current.fullName ?? ""}
                          className="absolute inset-0 w-full h-full object-cover object-top"
                          blurred={current.gender === "female" && !!current.photosBlurred} />
                      ) : (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, #2d0f4a, #4a1e6b, #7b3fa0)" }}>
                          <span className="font-serif text-8xl text-gold/20">
                            {(current.fullName ?? current.firstName ?? "M").charAt(0)}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Bottom gradient for name/button readability */}
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(to bottom, transparent 48%, rgba(13,6,24,0.95) 100%)" }} />

                  {/* Progress bars — leave right side clear for caste badge */}
                  {photos.length > 1 && (
                    <div className="absolute left-3 flex gap-1 z-20" style={{ top: 10, right: 80 }}>
                      {photos.map((_, i) => (
                        <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.3)" }}>
                          <div className="h-full rounded-full"
                            style={{
                              background: i <= photoIdx ? "rgba(255,255,255,0.95)" : "transparent",
                              width: i <= photoIdx ? "100%" : "0%",
                              transition: "width 0.15s",
                            }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Caste badge — top right corner */}
                  {current.caste && (
                    <div className="absolute z-20 px-3 py-1.5"
                      style={{
                        top: 8, right: 10,
                        background: "rgba(13,6,24,0.8)",
                        border: "0.5px solid rgba(201,168,76,0.3)",
                        borderRadius: 12,
                      }}>
                      <span className="text-xs font-semibold" style={{ color: "rgba(201,168,76,0.6)" }}>
                        {casteLabel(current.caste)}
                      </span>
                    </div>
                  )}

                  {/* Photo nav — tap left/right third */}
                  {photos.length > 1 && (
                    <div
                      className="absolute inset-0 z-10"
                      style={{ touchAction: "none" }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        if (x < rect.width / 3) {
                          setPhotoSlideDir(-1);
                          setPhotoIdx(i => Math.max(0, i - 1));
                        } else if (x > (rect.width * 2) / 3) {
                          setPhotoSlideDir(1);
                          setPhotoIdx(i => Math.min(photos.length - 1, i + 1));
                        }
                      }}
                    />
                  )}

                  {/* Name — left-aligned, just above buttons */}
                  <div className="absolute left-4 right-4 z-20 pointer-events-none"
                    style={{ bottom: 96 }}>
                    <div className="flex items-center gap-2">
                      <h2 className="font-serif text-2xl text-white font-bold"
                        style={{ textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}
                        data-testid={`text-name-${current.id}`}>
                        {current.fullName ?? current.firstName ?? "Member"}{current.age ? `, ${current.age}` : ""}
                      </h2>
                      {current.isVerified && (
                        <div className="flex items-center justify-center rounded-full flex-shrink-0"
                          style={{ width: 22, height: 22, background: "#3b82f6", boxShadow: "0 1px 4px rgba(59,130,246,0.5)" }}>
                          <Check size={13} color="white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pass + Like buttons — centered inside photo */}
                  <div className="absolute left-0 right-0 z-30 flex justify-center items-center gap-8"
                    style={{ bottom: 16 }}>
                    <button
                      onClick={() => dislikeMutation.mutate({ userId: current.id })}
                      disabled={isPending}
                      data-testid="button-dislike"
                      className="flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
                      style={{
                        width: 62, height: 62, borderRadius: "50%",
                        background: "rgba(13,6,24,0.75)",
                        border: "1.5px solid rgba(136,136,136,0.5)",
                      }}>
                      <X size={26} color="#888888" strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => likeMutation.mutate({ userId: current.id })}
                      disabled={isPending}
                      data-testid="button-like"
                      className="flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
                      style={{
                        width: 62, height: 62, borderRadius: "50%",
                        background: "rgba(13,6,24,0.75)",
                        border: "1.5px solid rgba(255,255,255,0.4)",
                      }}>
                      <Heart size={26} fill="white" color="white" strokeWidth={2} />
                    </button>
                  </div>

                </div>
              );
            })()}

            {/* ── Profile info cards ── */}
            <div className="px-4 pt-3 pb-10 space-y-3" style={{ background: "#0d0618" }}>

              {/* Identity card */}
              {(current.caste || current.city || current.country || age) && (
                <div className="p-4" style={{ background: "rgba(13,6,24,0.8)", border: "0.5px solid rgba(201,168,76,0.3)", borderRadius: 12 }}
                  data-testid={`badge-caste-${current.id}`}>
                  <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "rgba(201,168,76,0.6)" }}>Identity</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {current.caste && (
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: "rgba(253,248,240,0.4)" }}>Caste</p>
                        <p className="text-white text-sm font-medium">{casteLabel(current.caste)}</p>
                      </div>
                    )}
                    {(current.city || current.country) && (
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: "rgba(253,248,240,0.4)" }}>Location</p>
                        <p className="text-white text-sm font-medium leading-tight">{[current.city, current.state, current.country].filter(Boolean).join(", ")}</p>
                      </div>
                    )}
                    {age && (
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: "rgba(253,248,240,0.4)" }}>Age</p>
                        <p className="text-white text-sm font-medium">{age}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* About card */}
              {(current.bio || (current as any).occupation || (current as any).education) && (
                <div className="p-4" style={{ background: "rgba(13,6,24,0.8)", border: "0.5px solid rgba(201,168,76,0.3)", borderRadius: 12 }}>
                  <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "rgba(201,168,76,0.6)" }}>About</p>
                  {current.bio && <p className="text-cream/75 text-sm leading-relaxed">{current.bio}</p>}
                  {current.bio && ((current as any).occupation || (current as any).education) && (
                    <div className="my-3" style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
                  )}
                  {((current as any).occupation || (current as any).education) && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {(current as any).occupation && (
                        <div>
                          <p className="text-xs mb-0.5" style={{ color: "rgba(253,248,240,0.4)" }}>Occupation</p>
                          <p className="text-white text-sm font-medium">{(current as any).occupation}</p>
                        </div>
                      )}
                      {(current as any).education && (
                        <div>
                          <p className="text-xs mb-0.5" style={{ color: "rgba(253,248,240,0.4)" }}>Education</p>
                          <p className="text-white text-sm font-medium">{(current as any).education}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Languages card */}
              {(current.languages ?? []).length > 0 && (
                <div className="p-4" style={{ background: "rgba(13,6,24,0.8)", border: "0.5px solid rgba(201,168,76,0.3)", borderRadius: 12 }}>
                  <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "rgba(201,168,76,0.6)" }}>Languages</p>
                  <div className="flex flex-wrap gap-2">
                    {(current.languages ?? []).map((lang: string) => (
                      <span key={lang} className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{ color: "#ffffff", border: "1px solid rgba(201,168,76,0.4)", background: "transparent" }}>
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Interests card */}
              {((current as any).interests ?? []).length > 0 && (
                <div className="p-4" style={{ background: "rgba(13,6,24,0.8)", border: "0.5px solid rgba(201,168,76,0.3)", borderRadius: 12 }}>
                  <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "rgba(201,168,76,0.6)" }}>Interests</p>
                  <div className="flex flex-wrap gap-2">
                    {((current as any).interests ?? []).map((it: string) => (
                      user.isPremium ? (
                        <button key={it}
                          onClick={() => { setReplyTo({ topic: it, label: "interest" }); setReplyText(""); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                          style={{ color: "#ffffff", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)" }}>
                          {it} <MessageCircle size={11} />
                        </button>
                      ) : (
                        <span key={it} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                          style={{ color: "#ffffff", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)" }}>
                          {it}
                        </span>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Movies & TV */}
              {((current as any).moviesAndTv ?? []).length > 0 && (
                <div className="p-4"
                  style={{ background: "rgba(13,6,24,0.8)", border: "0.5px solid rgba(201,168,76,0.3)", borderRadius: 12 }}>
                  <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "rgba(201,168,76,0.6)" }}>Movies &amp; TV</p>
                  <div className="flex flex-wrap gap-2">
                    {((current as any).moviesAndTv ?? []).map((title: string) => (
                      user.isPremium ? (
                        <button key={title}
                          onClick={() => { setReplyTo({ topic: title, label: "movie/show" }); setReplyText(""); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                          style={{ color: "#ffffff", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)" }}>
                          🎬 {title} <MessageCircle size={11} />
                        </button>
                      ) : (
                        <span key={title} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                          style={{ color: "#ffffff", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)" }}>
                          🎬 {title}
                        </span>
                      )
                    ))}
                  </div>
                </div>
              )}

              <p className="text-center text-cream/20 text-xs pt-2">
                {profiles.length - currentIndex - 1} more profile{profiles.length - currentIndex - 1 !== 1 ? "s" : ""} to discover
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Action buttons — fixed just above the bottom nav bar ── */}
      {/* Undo pill — fixed above bottom nav */}
      {current && (
        <div
          className="fixed left-0 right-0 z-40 flex justify-center py-3"
          style={{ bottom: "calc(62px + env(safe-area-inset-bottom))", pointerEvents: "none" }}
        >
          <div style={{
            opacity: undoState ? 1 : 0,
            transform: undoState ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 0.25s ease, transform 0.25s ease",
            pointerEvents: undoState ? "auto" : "none",
          }}>
            <button onClick={handleUndo} disabled={undoMutation.isPending}
              data-testid="button-undo"
              className="relative flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold overflow-hidden"
              style={{
                background: "rgba(13,6,24,0.85)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1.5px solid rgba(201,168,76,0.6)",
                color: "#c9a84c",
              }}>
              <span className="absolute inset-0 rounded-full"
                style={{ background: "rgba(201,168,76,0.1)", transformOrigin: "left center", transform: `scaleX(${undoProgress / 100})`, transition: "transform 0.05s linear" }} />
              <Undo2 size={14} />
              <span className="relative z-10">
                {t("discover.undo")}{undoState ? ` — ${undoState.profile.fullName ?? undoState.profile.firstName ?? ""}` : ""}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Reply modal */}
      {replyTo && current && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setReplyTo(null)}>
          <div className="rounded-t-3xl px-5 pt-5 pb-8 flex flex-col gap-4"
            style={{ background: "#1a0a2e", border: "1px solid rgba(201,168,76,0.2)" }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-1" style={{ background: "rgba(255,255,255,0.2)" }} />
            <div>
              <p className="text-cream/50 text-xs uppercase tracking-wider mb-1">
                Replying to {current.firstName ?? current.fullName?.split(" ")[0]}'s {replyTo.label}
              </p>
              <p className="text-gold font-semibold text-sm">"{replyTo.topic}"</p>
            </div>
            <textarea
              autoFocus
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder={`Say something about ${replyTo.topic}…`}
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm text-cream placeholder-cream/30 outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(201,168,76,0.25)" }}
            />
            <button
              disabled={!replyText.trim() || isPending}
              onClick={() => {
                const comment = `Re: ${replyTo.topic} — ${replyText.trim()}`;
                setReplyTo(null);
                likeMutation.mutate({ userId: current.id, comment });
              }}
              className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7b3fa0, #d4608a)", boxShadow: "0 6px 20px rgba(212,96,138,0.35)" }}>
              <Send size={15} /> Like & Send
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
