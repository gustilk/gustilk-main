import { useState, useEffect, useRef } from "react";
import { X, Heart, MapPin, Shield, ChevronDown } from "lucide-react";
import type { SafeUser } from "@shared/schema";
import ProtectedPhoto from "@/components/ProtectedPhoto";

interface Props {
  profile: SafeUser;
  onClose: () => void;
  onLike: () => void;
  onPass: () => void;
  isLikePending: boolean;
  isPassPending: boolean;
}

export default function DiscoverProfileSheet({ profile, onClose, onLike, onPass, isLikePending, isPassPending }: Props) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragDelta = useRef(0);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const close = () => {
    setMounted(false);
    setTimeout(onClose, 320);
  };

  const photos = profile.photos ?? [];
  const displayName = profile.firstName ?? profile.fullName?.split(" ")[0] ?? "Member";
  const location = [profile.city, profile.state, profile.country].filter(Boolean).join(", ");
  const casteLabel = (c: string) => ({ sheikh: "Sheikh", pir: "Pir", murid: "Mirid" }[c] ?? c);
  const shouldBlur = profile.gender === "female" && !!profile.photosBlurred;

  const age = (() => {
    if ((profile as any).dateOfBirth) {
      const dob = new Date((profile as any).dateOfBirth);
      const today = new Date();
      let a = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--;
      return a;
    }
    return profile.age;
  })();

  // Swipe-down to close — only when scroll is at the top
  const onTouchStart = (e: React.TouchEvent) => {
    const scroll = scrollRef.current;
    if (scroll && scroll.scrollTop > 4) return;
    dragStartY.current = e.touches[0].clientY;
    dragDelta.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy < 0) { dragStartY.current = null; return; }
    dragDelta.current = dy;
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`;
  };

  const onTouchEnd = () => {
    if (dragDelta.current > 100) { close(); return; }
    if (sheetRef.current) sheetRef.current.style.transform = "";
    dragStartY.current = null;
    dragDelta.current = 0;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: mounted ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0)", transition: "background 0.32s ease" }}
      onClick={close}
    >
      <div
        ref={sheetRef}
        className="relative flex flex-col rounded-t-3xl overflow-hidden"
        style={{
          background: "#0d0618",
          maxHeight: "94vh",
          transform: mounted ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          willChange: "transform",
        }}
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full z-30"
          style={{ background: "rgba(255,255,255,0.25)" }} />

        {/* ── Photo section ── */}
        <div className="relative flex-shrink-0" style={{ height: "56vh" }}>
          {photos.length > 0 ? (
            <ProtectedPhoto
              src={photos[photoIdx] ?? photos[0]}
              alt={displayName}
              className="w-full h-full object-cover"
              blurred={shouldBlur}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1a0a2e, #4a1e6b, #7b3fa0)" }}>
              <span className="font-serif text-8xl text-gold/20">{displayName[0]?.toUpperCase()}</span>
            </div>
          )}

          {/* Bottom gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
            style={{ background: "linear-gradient(to top, rgba(13,6,24,1) 0%, rgba(13,6,24,0.5) 60%, transparent 100%)" }} />

          {/* Photo progress bars */}
          {photos.length > 1 && (
            <div className="absolute top-7 left-4 right-4 flex gap-1 z-20">
              {photos.map((_, i) => (
                <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.25)" }}>
                  <div className="h-full rounded-full"
                    style={{ background: i <= photoIdx ? "rgba(255,255,255,0.95)" : "transparent", width: i <= photoIdx ? "100%" : "0%", transition: "width 0.15s" }} />
                </div>
              ))}
            </div>
          )}

          {/* Photo tap zones */}
          {photos.length > 1 && (
            <>
              <button className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
                onClick={() => setPhotoIdx(i => Math.max(0, i - 1))} />
              <button className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
                onClick={() => setPhotoIdx(i => Math.min(photos.length - 1, i + 1))} />
            </>
          )}

          {/* Close button */}
          <button
            onClick={close}
            className="absolute top-10 right-4 w-9 h-9 rounded-full flex items-center justify-center z-30"
            style={{ background: "rgba(13,6,24,0.75)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <ChevronDown size={20} color="rgba(253,248,240,0.85)" />
          </button>

          {/* Caste badge */}
          {profile.caste && (
            <div className="absolute top-10 left-4 px-2.5 py-1 rounded-full text-xs font-bold z-20"
              style={{ background: "rgba(201,168,76,0.9)", color: "#1a0a2e" }}>
              {casteLabel(profile.caste)}
            </div>
          )}

          {/* Name overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 z-20 pointer-events-none">
            <h2 className="font-serif text-2xl text-white font-bold leading-tight">
              {displayName}{age ? `, ${age}` : ""}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {profile.isVerified && (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "rgba(59,130,246,0.85)", color: "white" }}>
                  <Shield size={9} /> Verified
                </span>
              )}
              {location && (
                <span className="flex items-center gap-1 text-[11px] text-white/65">
                  <MapPin size={10} color="rgba(201,168,76,0.8)" />
                  {location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Scrollable info ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-4 pb-36 space-y-3">

          {/* Active status */}
          {(profile as any).activitySeenAt && (() => {
            const hours = (Date.now() - new Date((profile as any).activitySeenAt).getTime()) / 3_600_000;
            if (hours > 72) return null;
            return (
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" style={{ boxShadow: "0 0 6px #34d399" }} />
                <span className="text-emerald-400 text-xs font-medium">
                  {hours < 24 ? "Active today" : "Active recently"}
                </span>
              </div>
            );
          })()}

          {/* Bio */}
          {profile.bio && (
            <div className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="text-white font-semibold text-sm mb-2">About</h3>
              <p className="text-cream/75 text-sm leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Info chips */}
          {(() => {
            const chips = [
              profile.caste && `${casteLabel(profile.caste)} · Yezidi`,
              profile.age && `${profile.age} years old`,
              profile.gender && profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1),
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
          {(profile.languages ?? []).length > 0 && (
            <div className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="text-white font-semibold text-sm mb-2.5">Languages</h3>
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

          {/* Interests */}
          {((profile as any).interests ?? []).length > 0 && (
            <div className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="text-white font-semibold text-sm mb-2.5">Interests</h3>
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
        </div>

        {/* ── Fixed action buttons ── */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-10 pb-10 pt-6"
          style={{ background: "linear-gradient(to top, #0d0618 65%, transparent 100%)" }}>
          <button
            onClick={onPass}
            disabled={isLikePending || isPassPending}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.07)", border: "2px solid rgba(255,255,255,0.12)" }}
          >
            <X size={26} color="rgba(253,248,240,0.7)" />
          </button>
          <button
            onClick={onLike}
            disabled={isLikePending || isPassPending}
            className="w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #7b3fa0, #d4608a)", boxShadow: "0 8px 28px rgba(212,96,138,0.45)" }}
          >
            <Heart size={30} fill="white" color="white" />
          </button>
        </div>
      </div>
    </div>
  );
}
