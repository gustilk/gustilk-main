import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, MessageCircle, Video, Star, Lock, MapPin, Shield, Flag, Crown, Heart, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SafeUser, MatchWithUser } from "@shared/schema";
import ProtectedPhoto from "@/components/ProtectedPhoto";
import ReportModal from "@/components/ReportModal";
import { useVideoCallContext } from "@/hooks/useVideoCall";
import { apiRequest, queryClient } from "@/lib/queryClient";

const REFERRER_KEY = "profile_back_to";
const LIKE_ACTIONS_KEY = "profile_show_like_actions";

interface Props {
  viewer: SafeUser;
  userId: string;
}

export default function ViewUserProfilePage({ viewer, userId }: Props) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const { startCall, callState } = useVideoCallContext();

  // Capture the referrer that was stored by the navigating page.
  // Read-once on mount, then clear it so it doesn't leak to other navigations.
  const [referrer] = useState<string | null>(() => {
    const stored = sessionStorage.getItem(REFERRER_KEY);
    if (stored) sessionStorage.removeItem(REFERRER_KEY);
    return stored;
  });

  // Whether to show inline Like/Pass buttons (set when arriving from likes-received).
  const [showLikeActions] = useState<boolean>(() => {
    const stored = sessionStorage.getItem(LIKE_ACTIONS_KEY);
    if (stored) sessionStorage.removeItem(LIKE_ACTIONS_KEY);
    return stored === "true";
  });

  const [actedOnLike, setActedOnLike] = useState(false);

  // Navigate back to wherever the user came from.
  // Use the stored referrer URL directly — history.back() is unreliable in SPA
  // routing because the stack may contain unexpected entries. A direct
  // setLocation to the known referrer is always correct.
  const goBack = useCallback(() => {
    setLocation(referrer ?? "/discover");
  }, [referrer, setLocation]);

  const isPremium = !!viewer.isPremium;

  const likeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/like/${userId}`),
    onSuccess: () => {
      setActedOnLike(true);
      queryClient.invalidateQueries({ queryKey: ["/api/activity/likes-received"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/discover"] });
      goBack();
    },
  });

  const dislikeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/dislike/${userId}`),
    onSuccess: () => {
      setActedOnLike(true);
      queryClient.invalidateQueries({ queryKey: ["/api/activity/likes-received"] });
      queryClient.invalidateQueries({ queryKey: ["/api/discover"] });
      goBack();
    },
  });

  const { data, isLoading } = useQuery<{ user: SafeUser; isMatchedWithViewer: boolean }>({
    queryKey: ["/api/profile", userId],
    queryFn: () => fetch(`/api/profile/${userId}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: matchData } = useQuery<{ matches: MatchWithUser[] }>({
    queryKey: ["/api/matches"],
    enabled: isPremium,
  });

  const profile = data?.user;
  const isMatchedWithViewer = data?.isMatchedWithViewer ?? false;
  const match = matchData?.matches?.find(m => m.otherUser?.id === userId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "#0d2a1e" }}>
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" style={{ background: "#0d2a1e" }}>
        <p className="text-cream/50">Profile not found.</p>
        <button onClick={goBack} className="text-gold text-sm">Go back</button>
      </div>
    );
  }

  const photos = profile.photos ?? [];
  const mainPhoto = profile.mainPhotoUrl ?? photos[0] ?? null;
  const allPhotos = mainPhoto ? [mainPhoto, ...photos.filter(p => p !== mainPhoto)] : photos;
  const shouldBlurPhotos = profile.gender === "female" && !!profile.photosBlurred && !isMatchedWithViewer;
  const displayName = profile.firstName ?? profile.fullName?.split(" ")[0] ?? "Member";
  const casteLabel = (c: string) => ({ sheikh: "Sheikh", pir: "Pir", murid: "Mirid" }[c] ?? c);
  const location = [profile.city, profile.state, profile.country].filter(Boolean).join(", ");

  const handleMessage = () => {
    if (!isPremium) { setLocation("/premium"); return; }
    if (match) setLocation(`/chat/${match.id}`);
  };

  const handleCall = () => {
    if (!isPremium) { setLocation("/premium"); return; }
    if (!match) return;
    startCall(
      match.id,
      profile.id,
      displayName,
      mainPhoto,
      viewer.firstName ?? viewer.fullName?.split(" ")[0] ?? "Member",
      viewer.mainPhotoUrl ?? viewer.photos?.[0] ?? null,
    );
  };

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "#0d2a1e" }}>

      {/* ── Photo section ───────────────────────────────── */}
      <div className="relative" style={{ aspectRatio: "3 / 4", maxHeight: "85vh", background: "#0a0412" }}>
        {allPhotos.length > 0 ? (
          <div className="w-full h-full overflow-hidden flex items-center justify-center">
            {isPremium ? (
              <ProtectedPhoto
                src={allPhotos[photoIdx] ?? allPhotos[0]}
                alt={displayName}
                className="w-full h-full object-contain"
                blurred={shouldBlurPhotos}
              />
            ) : (
              <img src={allPhotos[0]} alt="" className="w-full h-full object-cover"
                style={{ filter: "blur(22px) brightness(0.65) saturate(0.4)", transform: "scale(1.1)" }} />
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1a0a2e, #2d1054)" }}>
            <span className="text-8xl font-serif text-gold/20">{displayName[0]?.toUpperCase()}</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(13,6,24,0.6) 0%, transparent 30%, transparent 55%, rgba(13,6,24,0.95) 100%)" }} />

        {/* Photo progress bars — premium */}
        {isPremium && allPhotos.length > 1 && (
          <div className="absolute top-0 left-0 right-0 flex gap-1 px-4 pt-14 z-20">
            {allPhotos.map((_, i) => (
              <button key={i} onClick={() => setPhotoIdx(i)} className="flex-1 h-[3px] rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.25)" }}>
                <div className="h-full rounded-full transition-all duration-200"
                  style={{ background: i <= photoIdx ? "rgba(255,255,255,0.9)" : "transparent", width: i <= photoIdx ? "100%" : "0%" }} />
              </button>
            ))}
          </div>
        )}

        {/* Premium lock */}
        {!isPremium && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pt-16 z-10">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(13,6,24,0.85)", border: "2px solid rgba(201,168,76,0.5)" }}>
              <Lock size={22} color="#c9a84c" />
            </div>
            <p className="text-cream/70 text-sm font-semibold">Photos locked</p>
            <button onClick={() => setLocation("/premium")} data-testid="button-unlock-photos"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}>
              <Crown size={14} /> Unlock with Premium
            </button>
          </div>
        )}

        {/* Back button */}
        <button onClick={goBack} data-testid="button-back-profile"
          className="absolute top-12 left-4 w-9 h-9 rounded-full flex items-center justify-center z-30"
          style={{ background: "rgba(13,6,24,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <ArrowLeft size={18} color="rgba(253,248,240,0.85)" />
        </button>

        {/* Report button */}
        <button onClick={() => setShowReport(true)} data-testid="button-report-profile"
          className="absolute top-12 right-4 w-9 h-9 rounded-full flex items-center justify-center z-30"
          style={{ background: "rgba(13,6,24,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <Flag size={16} color="rgba(253,248,240,0.5)" />
        </button>

        {/* Tap zones for photo browsing — premium */}
        {isPremium && allPhotos.length > 1 && (
          <>
            <button className="absolute left-0 top-0 bottom-0 w-1/3 z-10" onClick={() => setPhotoIdx(i => Math.max(0, i - 1))} />
            <button className="absolute right-0 top-0 bottom-0 w-1/3 z-10" onClick={() => setPhotoIdx(i => Math.min(allPhotos.length - 1, i + 1))} />
          </>
        )}

        {/* Name + location over photo bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pointer-events-none z-20">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="font-serif text-2xl text-white font-bold" data-testid="text-profile-name">
                {displayName}{profile.age ? `, ${profile.age}` : ""}
              </h1>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {profile.caste && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "rgba(201,168,76,0.85)", color: "#1a0a2e" }}>
                    {casteLabel(profile.caste)}
                  </span>
                )}
                {profile.isVerified && (
                  <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "rgba(59,130,246,0.85)", color: "white" }}>
                    <Shield size={9} /> Verified
                  </span>
                )}
                {location && (
                  <span className="flex items-center gap-1 text-[11px] text-white/60">
                    <MapPin size={10} color="rgba(201,168,76,0.8)" /> {location}
                  </span>
                )}
              </div>
            </div>
            {profile.isPremium && (
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(201,168,76,0.15)", border: "1.5px solid rgba(201,168,76,0.4)" }}>
                <Star size={16} fill="#c9a84c" color="#c9a84c" />
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Profile info — Hily-style clean cards ──────────── */}
      <div className="px-4 pt-4 pb-32 space-y-3">

        {/* Active status pill */}
        {(profile as any).activitySeenAt && (() => {
          const hours = (Date.now() - new Date((profile as any).activitySeenAt).getTime()) / 3_600_000;
          if (hours > 72) return null;
          return (
            <div className="flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
              <span className="text-emerald-400 text-xs font-medium">{hours < 24 ? "Active today" : "Active recently"}</span>
            </div>
          );
        })()}

        {/* Location card */}
        {location && (
          <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <MapPin size={18} color="#c9a84c" />
            <span className="text-cream/85 text-sm font-medium" data-testid="text-profile-location">{location}</span>
          </div>
        )}

        {/* About me card */}
        {profile.bio && (
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="text-white font-bold text-base mb-2">About me</h3>
            <p className="text-cream/75 text-sm leading-relaxed" data-testid="text-profile-bio">{profile.bio}</p>
          </div>
        )}

        {/* Faith & Caste card */}
        {profile.caste && (
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="text-white font-bold text-base mb-3">Faith & Caste</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "rgba(201,168,76,0.18)", color: "#e8c97a", border: "1px solid rgba(201,168,76,0.35)" }}>
                {casteLabel(profile.caste)}
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(253,248,240,0.75)", border: "1px solid rgba(255,255,255,0.08)" }}>
                Yezidi
              </span>
            </div>
          </div>
        )}

        {/* General info card */}
        {(() => {
          const chips = [
            profile.age && `${profile.age} years old`,
            profile.gender && profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1),
            (profile as any).occupation,
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

        {/* Languages card */}
        {(profile.languages ?? []).length > 0 && (
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="text-white font-bold text-base mb-3">Languages</h3>
            <div className="flex flex-wrap gap-2">
              {(profile.languages ?? []).map((lang: string) => (
                <span key={lang} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.22)" }}>
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Interests card */}
        {((profile as any).interests ?? []).length > 0 && (
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="text-white font-bold text-base mb-3">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {((profile as any).interests ?? []).map((it: string) => (
                <span key={it} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(123,63,160,0.18)", color: "#d4608a", border: "1px solid rgba(212,96,138,0.25)" }}>
                  {it}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Photo thumbnails card — premium */}
        {isPremium && allPhotos.length > 1 && (
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="text-white font-bold text-base mb-3">All Photos</h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allPhotos.map((p, i) => (
                <button key={i} onClick={() => setPhotoIdx(i)} data-testid={`thumb-photo-${i}`}
                  className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden transition-all"
                  style={{ border: i === photoIdx ? "2px solid #c9a84c" : "2px solid transparent", opacity: i === photoIdx ? 1 : 0.6 }}>
                  <ProtectedPhoto src={p} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" blurred={shouldBlurPhotos} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Premium upgrade CTA */}
        {!isPremium && (
          <button onClick={() => setLocation("/premium")} data-testid="button-upgrade-profile"
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 6px 20px rgba(201,168,76,0.25)" }}>
            <Crown size={16} /> Upgrade to see photos &amp; message
          </button>
        )}
      </div>

      {/* ── Floating action bar — Hily-style ────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pt-6 pb-5 z-40 pointer-events-none"
        style={{ background: "linear-gradient(to top, #0d2a1e 55%, rgba(13,6,24,0.6) 85%, transparent 100%)" }}>
        <div className="flex items-center justify-center gap-5 max-w-sm mx-auto pointer-events-auto">
          {showLikeActions && !actedOnLike ? (
            <>
              <button onClick={() => dislikeMutation.mutate()}
                disabled={dislikeMutation.isPending || likeMutation.isPending}
                data-testid="button-pass-from-likes"
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
                style={{ background: "rgba(30,15,45,0.95)", border: "1.5px solid rgba(255,255,255,0.12)", boxShadow: "0 6px 20px rgba(0,0,0,0.5)" }}>
                <X size={26} color="rgba(253,248,240,0.85)" strokeWidth={2.5} />
              </button>
              <button onClick={() => likeMutation.mutate()}
                disabled={likeMutation.isPending || dislikeMutation.isPending}
                data-testid="button-like-from-likes"
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", boxShadow: "0 8px 26px rgba(201,168,76,0.5)" }}>
                <Heart size={28} color="#1a0a2e" fill="#1a0a2e" strokeWidth={2.5} />
              </button>
            </>
          ) : (
            <>
              <button onClick={handleCall} data-testid="button-videocall-user"
                disabled={isPremium && (!match || callState !== "idle")}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
                style={{ background: "rgba(30,15,45,0.95)", border: "1.5px solid rgba(201,168,76,0.35)", boxShadow: "0 6px 20px rgba(0,0,0,0.5)" }}>
                {isPremium ? <Video size={22} color="#c9a84c" /> : <Lock size={20} color="#c9a84c" />}
              </button>
              <button onClick={handleMessage} data-testid="button-message-user"
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: isPremium && match
                    ? "linear-gradient(135deg, #7b3fa0, #d4608a)"
                    : "linear-gradient(135deg, #c9a84c, #e8c97a)",
                  boxShadow: isPremium && match
                    ? "0 8px 26px rgba(123,63,160,0.5)"
                    : "0 8px 26px rgba(201,168,76,0.5)",
                }}>
                {isPremium ? <MessageCircle size={28} color="white" /> : <Lock size={24} color="#1a0a2e" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Report modal */}
      {showReport && (
        <ReportModal
          reportedUserId={profile.id}
          reportedUserName={displayName}
          onClose={() => setShowReport(false)}
          onBlocked={() => { setShowReport(false); goBack(); }}
        />
      )}
    </div>
  );
}
