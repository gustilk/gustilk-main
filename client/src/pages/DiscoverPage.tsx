import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SlidersHorizontal, X, Heart, RotateCcw, MapPin, Shield, Undo2, MessageCircle, Send } from "lucide-react";
import { motion } from "framer-motion";
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
  const [fading, setFading] = useState(false);
  const [replyTo, setReplyTo] = useState<{ topic: string; label: string } | null>(null);
  const [replyText, setReplyText] = useState("");

  const undoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const undoStartRef = useRef<number>(0);
  const lastVisitedId = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<{ profiles: SafeUser[] }>({
    queryKey: ["/api/discover", minAge, maxAge, country],
    queryFn: async () => {
      const params = new URLSearchParams({ minAge: String(minAge), maxAge: String(maxAge) });
      if (country) params.set("country", country);
      const res = await fetch(`/api/discover?${params}`, { credentials: "include" });
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
    <div className="relative h-screen overflow-hidden" style={{ background: "#0d0618" }}>

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
        <h1 className="font-serif text-2xl font-bold text-white">
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
        }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-cream/40 text-sm">{t("discover.finding")}</p>
          </div>
        ) : !current ? (
          <div className="flex flex-col items-center justify-center gap-5 text-center px-8"
            style={{ minHeight: "calc(100dvh - 56px - 62px - env(safe-area-inset-top) - env(safe-area-inset-bottom))" }}>
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

            {/* ── Full-screen photo ── */}
            {(() => {
              const photos = current.photos ?? [];
              const photo = photos[photoIdx] ?? photos[0] ?? null;
              return (
                <div className="relative mx-3 rounded-3xl overflow-hidden" style={{ height: "72dvh", minHeight: 480 }}>
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

                  {/* Photo progress bars */}
                  {photos.length > 1 && (
                    <div className="absolute left-3 right-3 flex gap-1 z-20" style={{ top: 10 }}>
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

                  {/* Photo count */}
                  {photos.length > 1 && (
                    <div className="absolute right-3 z-20 px-2 py-1 rounded-full text-xs"
                      style={{
                        top: 18,
                        background: "rgba(13,6,24,0.55)",
                        backdropFilter: "blur(6px)",
                        WebkitBackdropFilter: "blur(6px)",
                        color: "rgba(255,255,255,0.7)",
                      }}>
                      {photoIdx + 1}/{photos.length}
                    </div>
                  )}

                  {/* Swipe + tap zone for photo navigation */}
                  {photos.length > 1 && (
                    <motion.div
                      className="absolute inset-0 z-10"
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.15}
                      style={{ touchAction: "pan-y" }}
                      onDragEnd={(_, info) => {
                        if (info.offset.x < -50)
                          setPhotoIdx(i => Math.min(photos.length - 1, i + 1));
                        else if (info.offset.x > 50)
                          setPhotoIdx(i => Math.max(0, i - 1));
                      }}
                      onTap={(e) => {
                        const el = e.target as HTMLElement;
                        const rect = el.getBoundingClientRect();
                        const x = (e as PointerEvent).clientX - rect.left;
                        if (x < rect.width / 3)
                          setPhotoIdx(i => Math.max(0, i - 1));
                        else if (x > (rect.width * 2) / 3)
                          setPhotoIdx(i => Math.min(photos.length - 1, i + 1));
                      }}
                    />
                  )}

                </div>
              );
            })()}

            {/* ── Sticky name + age — sticks below header when photo scrolls away ── */}
            <div className="sticky z-20 px-5 py-3"
              style={{
                top: "calc(56px + env(safe-area-inset-top))",
                background: "#0d0618",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
              <h2 className="font-serif text-2xl text-white font-bold leading-tight"
                data-testid={`text-name-${current.id}`}>
                {current.fullName ?? current.firstName ?? "Member"}{age ? `, ${age}` : ""}
              </h2>
            </div>

            {/* ── Profile info cards — same layout as ViewUserProfilePage ── */}
            <div className="px-4 pt-3 pb-44 space-y-3" style={{ background: "#0d0618" }}>

              {/* Active status */}
              {getActiveLabel(current.activitySeenAt) && (
                <div className="flex items-center gap-2 px-1" data-testid={`status-active-${current.id}`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
                  <span className="text-emerald-400 text-xs font-medium">{getActiveLabel(current.activitySeenAt)}</span>
                </div>
              )}

              {/* Location */}
              {(current.city || current.country) && (
                <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <MapPin size={18} color="#c9a84c" />
                  <span className="text-cream/85 text-sm font-medium">
                    {[current.city, current.state, current.country].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}

              {/* About me */}
              {current.bio && (
                <div className="rounded-2xl p-4"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <h3 className="text-white font-bold text-base mb-2">About me</h3>
                  <p className="text-cream/75 text-sm leading-relaxed">{current.bio}</p>
                </div>
              )}

              {/* Faith & Caste */}
              {current.caste && (
                <div className="rounded-2xl p-4"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <h3 className="text-white font-bold text-base mb-3">Faith & Caste</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ background: "rgba(201,168,76,0.18)", color: "#e8c97a", border: "1px solid rgba(201,168,76,0.35)" }}
                      data-testid={`badge-caste-${current.id}`}>
                      {casteLabel(current.caste)}
                    </span>
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(253,248,240,0.75)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      Yezidi
                    </span>
                  </div>
                </div>
              )}

              {/* General info */}
              {(() => {
                const chips = [
                  age && `${age} years old`,
                  current.gender && current.gender.charAt(0).toUpperCase() + current.gender.slice(1),
                  (current as any).occupation,
                ].filter(Boolean) as string[];
                if (!chips.length) return null;
                return (
                  <div className="rounded-2xl p-4"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <h3 className="text-white font-bold text-base mb-3">General info</h3>
                    <div className="flex flex-wrap gap-2">
                      {chips.map(c => (
                        <span key={c} className="px-3 py-1.5 rounded-full text-xs font-medium"
                          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(253,248,240,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Languages */}
              {(current.languages ?? []).length > 0 && (
                <div className="rounded-2xl p-4"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <h3 className="text-white font-bold text-base mb-3">Languages</h3>
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
                  <h3 className="text-white font-bold text-base mb-3">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {((current as any).interests ?? []).map((it: string) => (
                      user.isPremium ? (
                        <button key={it}
                          onClick={() => { setReplyTo({ topic: it, label: "interest" }); setReplyText(""); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                          style={{ background: "rgba(123,63,160,0.18)", color: "#d4608a", border: "1px solid rgba(212,96,138,0.25)" }}>
                          {it} <MessageCircle size={11} />
                        </button>
                      ) : (
                        <span key={it} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                          style={{ background: "rgba(123,63,160,0.18)", color: "#d4608a", border: "1px solid rgba(212,96,138,0.25)" }}>
                          {it}
                        </span>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Movies & TV */}
              {((current as any).moviesAndTv ?? []).length > 0 && (
                <div className="rounded-2xl p-4"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <h3 className="text-white font-bold text-base mb-3">Movies & TV Shows</h3>
                  <div className="flex flex-wrap gap-2">
                    {((current as any).moviesAndTv ?? []).map((title: string) => (
                      user.isPremium ? (
                        <button key={title}
                          onClick={() => { setReplyTo({ topic: title, label: "movie/show" }); setReplyText(""); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                          style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.22)" }}>
                          🎬 {title} <MessageCircle size={11} />
                        </button>
                      ) : (
                        <span key={title} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                          style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.22)" }}>
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
      {current && (
        <div
          className="fixed left-0 right-0 z-40 flex flex-col items-center gap-3 py-3"
          style={{ bottom: "calc(62px + env(safe-area-inset-bottom))", pointerEvents: "none" }}
        >
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

          {/* Pass / Like — same size, white background */}
          <div className="flex items-center gap-8" style={{ pointerEvents: "auto" }}>
            <button
              onClick={() => dislikeMutation.mutate({ userId: current.id })}
              disabled={isPending}
              data-testid="button-dislike"
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
              style={{
                background: "#1a0a2e",
                boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
              }}>
              <X size={26} color="#888888" strokeWidth={3} />
            </button>

            <button
              onClick={() => likeMutation.mutate({ userId: current.id })}
              disabled={isPending}
              data-testid="button-like"
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
              style={{
                background: "#1a0a2e",
                boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
              }}>
              <Heart size={26} fill="white" color="white" strokeWidth={2} />
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
