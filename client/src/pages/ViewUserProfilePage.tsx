import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, MessageCircle, Video, Star, Lock, Flag, Crown, Heart, X } from "lucide-react";
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
      <div className="flex items-center justify-center h-screen" style={{ background: "#0d0618" }}>
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" style={{ background: "#0d0618" }}>
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
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "#0d0618" }}>

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

        {/* Name over photo bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pointer-events-none z-20">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="font-serif text-2xl text-white font-bold" data-testid="text-profile-name">
                {displayName}{profile.age ? `, ${profile.age}` : ""}
              </h1>
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

      {/* ── Profile info cards ──────────── */}
      <div className="px-4 pt-4 pb-32 space-y-3">

        {/* Identity card */}
        {(profile.caste || location || profile.age) && (
          <div className="p-4" style={{ background: "rgba(13,6,24,0.8)", border: "0.5px solid rgba(201,168,76,0.3)", borderRadius: 12 }}>
            <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "rgba(201,168,76,0.6)" }}>Identity</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {profile.caste && (
                <div>
                  <p className="text-xs mb-0.5" style={{ color: "rgba(253,248,240,0.4)" }}>Caste</p>
                  <p className="text-white text-sm font-medium">{casteLabel(profile.caste)}</p>
                </div>
              )}
              {location && (
                <div>
                  <p className="text-xs mb-0.5" style={{ color: "rgba(253,248,240,0.4)" }}>Location</p>
                  <p className="text-white text-sm font-medium leading-tight" data-testid="text-profile-location">{location}</p>
                </div>
              )}
              {profile.age && (
                <div>
                  <p className="text-xs mb-0.5" style={{ color: "rgba(253,248,240,0.4)" }}>Age</p>
                  <p className="text-white text-sm font-medium">{profile.age}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* About card */}
        {(profile.bio || (profile as any).occupation || (profile as any).education) && (
          <div className="p-4" style={{ background: "rgba(13,6,24,0.8)", border: "0.5px solid rgba(201,168,76,0.3)", borderRadius: 12 }}>
            <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "rgba(201,168,76,0.6)" }}>About</p>
            {profile.bio && <p className="text-cream/75 text-sm leading-relaxed" data-testid="text-profile-bio">{profile.bio}</p>}
            {profile.bio && ((profile as any).occupation || (profile as any).education) && (
              <div className="my-3" style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
            )}
            {((profile as any).occupation || (profile as any).education) && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {(profile as any).occupation && (
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: "rgba(253,248,240,0.4)" }}>Occupation</p>
                    <p className="text-white text-sm font-medium">{(profile as any).occupation}</p>
                  </div>
                )}
                {(profile as any).education && (
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: "rgba(253,248,240,0.4)" }}>Education</p>
                    <p className="text-white text-sm font-medium">{(profile as any).education}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Languages card */}
        {(profile.languages ?? []).length > 0 && (
          <div className="p-4" style={{ background: "rgba(13,6,24,0.8)", border: "0.5px solid rgba(201,168,76,0.3)", borderRadius: 12 }}>
            <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "rgba(201,168,76,0.6)" }}>Languages</p>
            <div className="flex flex-wrap gap-2">
              {(profile.languages ?? []).map((lang: string) => (
                <span key={lang} className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ color: "#ffffff", border: "1px solid rgba(201,168,76,0.4)", background: "transparent" }}>
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Interests card */}
        {((profile as any).interests ?? []).length > 0 && (
          <div className="p-4" style={{ background: "rgba(13,6,24,0.8)", border: "0.5px solid rgba(201,168,76,0.3)", borderRadius: 12 }}>
            <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "rgba(201,168,76,0.6)" }}>Interests</p>
            <div className="flex flex-wrap gap-2">
              {((profile as any).interests ?? []).map((it: string) => (
                <span key={it} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ color: "#ffffff", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)" }}>
                  {it}
                </span>
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

      {/* ── Floating action bar — same style and position as DiscoverPage ── */}
      <div
        className="fixed left-0 right-0 z-40 flex justify-center py-3 pointer-events-none"
        style={{ bottom: "calc(62px + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-8 pointer-events-auto">
          {showLikeActions && !actedOnLike ? (
            <>
              <button onClick={() => dislikeMutation.mutate()}
                disabled={dislikeMutation.isPending || likeMutation.isPending}
                data-testid="button-pass-from-likes"
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
                style={{ background: "#1a0a2e", boxShadow: "0 4px 20px rgba(0,0,0,0.45)" }}>
                <X size={26} color="#888888" strokeWidth={3} />
              </button>
              <button onClick={() => likeMutation.mutate()}
                disabled={likeMutation.isPending || dislikeMutation.isPending}
                data-testid="button-like-from-likes"
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
                style={{ background: "#1a0a2e", boxShadow: "0 4px 20px rgba(0,0,0,0.45)" }}>
                <Heart size={26} fill="#c9a84c" color="#c9a84c" strokeWidth={2} />
              </button>
            </>
          ) : (
            <>
              {isPremium && (
                <button onClick={handleCall} data-testid="button-videocall-user"
                  disabled={!match || callState !== "idle"}
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
                  style={{ background: "#1a0a2e", boxShadow: "0 4px 20px rgba(0,0,0,0.45)", border: "1.5px solid rgba(201,168,76,0.35)" }}>
                  <Video size={22} color="#c9a84c" />
                </button>
              )}
              <button onClick={handleMessage} data-testid="button-message-user"
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: "#1a0a2e", boxShadow: "0 4px 20px rgba(0,0,0,0.45)", border: "1.5px solid rgba(201,168,76,0.35)" }}>
                {isPremium ? <MessageCircle size={22} color="#c9a84c" /> : <Lock size={20} color="#c9a84c" />}
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
