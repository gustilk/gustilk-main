import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, MessageCircle, Video, Star, Lock, MapPin, Shield, Flag, Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SafeUser, MatchWithUser } from "@shared/schema";
import ProtectedPhoto from "@/components/ProtectedPhoto";
import ReportModal from "@/components/ReportModal";
import { useVideoCallContext } from "@/hooks/useVideoCall";

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

  const isPremium = !!viewer.isPremium;

  const { data, isLoading } = useQuery<{ user: SafeUser }>({
    queryKey: ["/api/profile", userId],
    queryFn: () => fetch(`/api/profile/${userId}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: matchData } = useQuery<{ matches: MatchWithUser[] }>({
    queryKey: ["/api/matches"],
    enabled: isPremium,
  });

  const profile = data?.user;
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
        <button onClick={() => history.back()} className="text-gold text-sm">Go back</button>
      </div>
    );
  }

  const photos = profile.photos ?? [];
  const mainPhoto = profile.mainPhotoUrl ?? photos[0] ?? null;
  const allPhotos = mainPhoto ? [mainPhoto, ...photos.filter(p => p !== mainPhoto)] : photos;
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

      {/* ── Photos ─────────────────────────────────────────── */}
      <div className="relative" style={{ height: "65vw", maxHeight: 400, minHeight: 280 }}>
        {allPhotos.length > 0 ? (
          <div className="w-full h-full overflow-hidden">
            {isPremium ? (
              <ProtectedPhoto
                src={allPhotos[photoIdx] ?? allPhotos[0]}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={allPhotos[0]}
                alt=""
                className="w-full h-full object-cover"
                style={{ filter: "blur(22px) brightness(0.65) saturate(0.4)", transform: "scale(1.1)" }}
              />
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1a0a2e, #2d1054)" }}>
            <span className="text-8xl font-serif text-gold/20">{displayName[0]?.toUpperCase()}</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(13,6,24,0.55) 0%, transparent 35%, transparent 60%, rgba(13,6,24,0.85) 100%)" }} />

        {/* Photo dot indicators — premium only */}
        {isPremium && allPhotos.length > 1 && (
          <div className="absolute top-0 left-0 right-0 flex gap-1 px-3 pt-14">
            {allPhotos.map((_, i) => (
              <button key={i} onClick={() => setPhotoIdx(i)}
                className="flex-1 h-[3px] rounded-full transition-all"
                style={{ background: i === photoIdx ? "rgba(201,168,76,0.9)" : "rgba(255,255,255,0.3)" }} />
            ))}
          </div>
        )}

        {/* Premium lock over photo */}
        {!isPremium && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pt-16">
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
        <button onClick={() => window.history.length > 1 ? history.back() : setLocation("/matches")} data-testid="button-back-profile"
          className="absolute top-12 left-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(13,6,24,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <ArrowLeft size={18} color="rgba(253,248,240,0.85)" />
        </button>

        {/* Report button */}
        <button onClick={() => setShowReport(true)} data-testid="button-report-profile"
          className="absolute top-12 right-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(13,6,24,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <Flag size={16} color="rgba(253,248,240,0.5)" />
        </button>

        {/* Tap zones for photo browsing — premium */}
        {isPremium && allPhotos.length > 1 && (
          <>
            <button className="absolute left-0 top-0 bottom-0 w-1/3" onClick={() => setPhotoIdx(i => Math.max(0, i - 1))} />
            <button className="absolute right-0 top-0 bottom-0 w-1/3" onClick={() => setPhotoIdx(i => Math.min(allPhotos.length - 1, i + 1))} />
          </>
        )}
      </div>

      {/* ── Profile info ──────────────────────────────────── */}
      <div className="px-5 pt-4 space-y-4">

        {/* Name + badges */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl text-cream" data-testid="text-profile-name">
              {displayName}{profile.age ? `, ${profile.age}` : ""}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {profile.caste && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.25)" }}>
                  {casteLabel(profile.caste)}
                </span>
              )}
              {profile.isVerified && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.25)" }}>
                  <Shield size={10} /> Verified
                </span>
              )}
            </div>
          </div>
          {profile.isPremium && (
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(201,168,76,0.1)", border: "1.5px solid rgba(201,168,76,0.3)" }}>
              <Star size={18} fill="#c9a84c" color="#c9a84c" />
            </div>
          )}
        </div>

        {/* Location */}
        {location && (
          <div className="flex items-center gap-2 text-cream/50 text-sm">
            <MapPin size={14} className="flex-shrink-0" />
            <span data-testid="text-profile-location">{location}</span>
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <div className="px-4 py-3.5 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.1)" }}>
            <p className="text-cream/70 text-sm leading-relaxed" data-testid="text-profile-bio">
              {profile.bio}
            </p>
          </div>
        )}

        {/* ── Divider ── */}
        <div style={{ height: 1, background: "rgba(201,168,76,0.08)" }} />

        {/* ── Action buttons ────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">

          {/* Message button */}
          <button
            onClick={handleMessage}
            data-testid="button-message-user"
            className="flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all"
            style={isPremium && match
              ? { background: "linear-gradient(135deg, #7b3fa0, #d4608a)", color: "white", boxShadow: "0 4px 16px rgba(123,63,160,0.3)" }
              : isPremium && !match
                ? { background: "rgba(255,255,255,0.06)", color: "rgba(253,248,240,0.4)", border: "1px solid rgba(255,255,255,0.1)", cursor: "default" }
                : { background: "rgba(201,168,76,0.08)", color: "#c9a84c", border: "1.5px solid rgba(201,168,76,0.3)" }
            }
          >
            {isPremium ? <MessageCircle size={18} /> : <Lock size={16} />}
            {isPremium ? (match ? "Message" : "Not matched") : "Message"}
          </button>

          {/* Video call button */}
          <button
            onClick={handleCall}
            data-testid="button-videocall-user"
            disabled={isPremium && (!match || callState !== "idle")}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"
            style={isPremium && match
              ? { background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1.5px solid rgba(201,168,76,0.3)" }
              : !isPremium
                ? { background: "rgba(201,168,76,0.08)", color: "#c9a84c", border: "1.5px solid rgba(201,168,76,0.3)" }
                : { background: "rgba(255,255,255,0.04)", color: "rgba(253,248,240,0.3)", border: "1px solid rgba(255,255,255,0.08)" }
            }
          >
            {isPremium ? <Video size={18} /> : <Lock size={16} />}
            Video Call
          </button>
        </div>

        {/* Premium upsell strip for free users */}
        {!isPremium && (
          <button
            onClick={() => setLocation("/premium")}
            data-testid="button-upgrade-profile"
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 6px 20px rgba(201,168,76,0.25)" }}
          >
            <Crown size={16} />
            Upgrade to see photos &amp; message
          </button>
        )}

        {/* Photo gallery row — premium only */}
        {isPremium && allPhotos.length > 1 && (
          <div>
            <p className="text-cream/30 text-xs uppercase tracking-wider font-semibold mb-2">Photos</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allPhotos.map((p, i) => (
                <button key={i} onClick={() => setPhotoIdx(i)} data-testid={`thumb-photo-${i}`}
                  className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden transition-all"
                  style={{ border: i === photoIdx ? "2px solid #c9a84c" : "2px solid transparent", opacity: i === photoIdx ? 1 : 0.65 }}>
                  <ProtectedPhoto src={p} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Report modal */}
      {showReport && (
        <ReportModal
          reportedUserId={profile.id}
          reportedUserName={displayName}
          onClose={() => setShowReport(false)}
          onBlocked={() => { setShowReport(false); history.back(); }}
        />
      )}
    </div>
  );
}
