import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Edit2, Star, CheckCircle, Clock, ChevronRight, X, Camera, ImagePlus, Settings, Eye, MapPin, ChevronLeft, Shield } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { SafeUser } from "@shared/schema";
import { PhotoCropModal } from "@/components/PhotoCropModal";

function ProfilePreviewModal({ user, onClose }: { user: SafeUser; onClose: () => void }) {
  const { t } = useTranslation();
  const photos = (user.photos ?? []).filter(Boolean);
  const [photoIdx, setPhotoIdx] = useState(0);
  const casteLabel = (c: string) => ({ sheikh: "Sheikh", pir: "Pir", murid: "Mirid" }[c] ?? c);
  const age = (() => {
    if ((user as any).dateOfBirth) {
      const dob = new Date((user as any).dateOfBirth);
      const today = new Date();
      let a = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--;
      return a;
    }
    return user.age;
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(13,6,24,0.97)" }}
      data-testid="modal-profile-preview"
    >
      <div className="flex items-center justify-between px-5 pt-12 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Eye size={16} color="#c9a84c" />
          <span className="text-gold text-sm font-semibold">{t("profile.howOthersSeeYou")}</span>
        </div>
        <button
          onClick={onClose}
          data-testid="button-close-preview"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <X size={16} color="rgba(253,248,240,0.7)" />
        </button>
      </div>

      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            border: "1.5px solid rgba(201,168,76,0.2)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(74,30,107,0.3)",
          }}
        >
          <div
            className="relative flex items-center justify-center"
            style={{ height: "min(440px, 55vh)", background: "linear-gradient(135deg, #2d0f4a, #4a1e6b, #7b3fa0)" }}
          >
            {photos.length > 0 ? (
              <img
                src={photos[photoIdx]}
                alt={user.fullName ?? ""}
                className="w-full h-full object-cover"
                data-testid="preview-main-photo"
              />
            ) : (
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center text-5xl font-serif text-gold"
                style={{ background: "rgba(201,168,76,0.12)", border: "2px solid rgba(201,168,76,0.25)" }}
              >
                {(user.fullName ?? user.firstName ?? "M").charAt(0)}
              </div>
            )}

            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setPhotoIdx(i => Math.max(0, i - 1))}
                  data-testid="button-preview-photo-prev"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(13,6,24,0.6)", border: "1px solid rgba(255,255,255,0.15)" }}
                  disabled={photoIdx === 0}
                >
                  <ChevronLeft size={18} color={photoIdx === 0 ? "rgba(255,255,255,0.2)" : "white"} />
                </button>
                <button
                  onClick={() => setPhotoIdx(i => Math.min(photos.length - 1, i + 1))}
                  data-testid="button-preview-photo-next"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(13,6,24,0.6)", border: "1px solid rgba(255,255,255,0.15)" }}
                  disabled={photoIdx === photos.length - 1}
                >
                  <ChevronRight size={18} color={photoIdx === photos.length - 1 ? "rgba(255,255,255,0.2)" : "white"} />
                </button>
                <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      data-testid={`button-preview-dot-${i}`}
                      className="rounded-full transition-all"
                      style={{
                        width: i === photoIdx ? "18px" : "6px",
                        height: "6px",
                        background: i === photoIdx ? "#c9a84c" : "rgba(255,255,255,0.35)",
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            <div
              className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: "rgba(201,168,76,0.9)", color: "#1a0a2e" }}
              data-testid="preview-badge-caste"
            >
              {casteLabel(user.caste ?? "murid")}
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-52" style={{ background: "linear-gradient(to top, rgba(13,6,24,0.98), transparent)" }} />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h2 className="font-serif text-2xl text-white font-bold leading-tight" data-testid="preview-text-name">
                {user.fullName ?? user.firstName ?? "Member"}{age ? `, ${age}` : ""}
              </h2>
              {(user.city || user.country) && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <MapPin size={13} color="rgba(201,168,76,0.8)" />
                  <p className="text-white/60 text-sm">{user.city}{user.state ? `, ${user.state}` : ""}{user.country ? `, ${user.country}` : ""}</p>
                </div>
              )}
              {user.bio && (
                <p className="text-white/50 text-xs mt-2 line-clamp-2 leading-relaxed">{user.bio}</p>
              )}
              {(user.languages ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {(user.languages ?? []).slice(0, 3).map(lang => (
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

          <div className="p-5 space-y-4">
            {user.occupation && (
              <div>
                <div className="text-xs text-cream/40 uppercase tracking-wider mb-1 font-semibold">{t("profile.occupation")}</div>
                <p className="text-cream/70 text-sm" data-testid="preview-text-occupation">{user.occupation}</p>
              </div>
            )}
            {(user.languages ?? []).length > 3 && (
              <div>
                <div className="text-xs text-cream/40 uppercase tracking-wider mb-2 font-semibold">{t("profile.languages")}</div>
                <div className="flex flex-wrap gap-2">
                  {(user.languages ?? []).map(lang => (
                    <span
                      key={lang}
                      className="px-3 py-1 rounded-full text-xs"
                      style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.2)" }}
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              {user.isVerified && (
                <span
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
                >
                  <CheckCircle size={11} />
                  {t("profile.verified")}
                </span>
              )}
              {user.isPremium && (
                <span
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "white" }}
                >
                  <Star size={11} fill="white" />
                  Premium
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-cream/25 text-xs mt-4">{t("profile.previewNote")}</p>
      </div>
    </div>
  );
}

interface Props { user: SafeUser }

export default function ProfilePage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [localPhotos, setLocalPhotos] = useState<(string | null)[]>(() => {
    const arr: (string | null)[] = Array(6).fill(null);
    (user.photos ?? []).forEach((p, i) => { arr[i] = p; });
    return arr;
  });
  const [localPendingPhotos, setLocalPendingPhotos] = useState<string[]>(
    (user as any).pendingPhotos ?? []
  );
  const [photosEdited, setPhotosEdited] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<{ imgSrc: string; slotIdx: number } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<number>(0);

  const { data } = useQuery<{ user: SafeUser }>({
    queryKey: ["/api/auth/me"],
  });

  const me = data?.user ?? user;

  const savePhotosMutation = useMutation({
    mutationFn: async () => {
      const photos = localPhotos.filter(Boolean) as string[];
      const res = await apiRequest("PUT", "/api/profile", { photos });
      return res.json();
    },
    onSuccess: (data) => {
      const arr: (string | null)[] = Array(6).fill(null);
      ((data.user as SafeUser).photos ?? []).forEach((p: string, i: number) => { arr[i] = p; });
      setLocalPhotos(arr);
      setLocalPendingPhotos((data.user as any).pendingPhotos ?? []);
      setPhotosEdited(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: t("profile.photosUpdated") });
    },
    onError: (err: Error) => {
      try {
        const jsonStart = err.message.indexOf("{");
        if (jsonStart !== -1) {
          const parsed = JSON.parse(err.message.slice(jsonStart));
          setPhotoError(parsed.error || t("profile.couldNotSavePhotos"));
        } else {
          setPhotoError(err.message || t("profile.couldNotSavePhotos"));
        }
      } catch {
        setPhotoError(err.message || t("profile.couldNotSavePhotos"));
      }
    },
  });

  const openPicker = (slotIdx: number) => {
    pendingSlotRef.current = slotIdx;
    if (fileInputRef.current) { fileInputRef.current.value = ""; fileInputRef.current.click(); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) setCropTarget({ imgSrc: ev.target.result as string, slotIdx: pendingSlotRef.current });
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = (base64: string) => {
    if (!cropTarget) return;
    setLocalPhotos(prev => { const next = [...prev]; next[cropTarget.slotIdx] = base64; return next; });
    setPhotosEdited(true);
    setCropTarget(null);
  };

  const removePhoto = (idx: number) => {
    setLocalPhotos(prev => { const next = [...prev]; next[idx] = null; return next; });
    setPhotosEdited(true);
  };

  const setAsMain = (idx: number) => {
    if (idx === 0) return;
    setLocalPhotos(prev => {
      const next = [...prev];
      const main = next[0];
      next[0] = next[idx];
      next[idx] = main;
      return next;
    });
    setPhotosEdited(true);
  };

  const casteLabel = (c: string) => ({ sheikh: "Sheikh", pir: "Pir", murid: "Mirid" }[c] ?? c);

  return (
    <>
    {cropTarget && (
      <PhotoCropModal
        imgSrc={cropTarget.imgSrc}
        outputSize={800}
        onConfirm={handleCropConfirm}
        onCancel={() => setCropTarget(null)}
      />
    )}
    {previewOpen && (
      <ProfilePreviewModal user={me} onClose={() => setPreviewOpen(false)} />
    )}
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "#0d0618" }}>
      <div className="pt-12 pb-2 px-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/gustilk-logo.svg" alt="" className="flex-shrink-0" style={{ width: "48px", height: "48px", objectFit: "contain", filter: "drop-shadow(0 1px 6px rgba(201,168,76,0.6))" }} />
          <h1 className="font-serif text-2xl text-gold">{t("profile.title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewOpen(true)}
            data-testid="button-preview-profile"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold"
            style={{ border: "1.5px solid rgba(201,168,76,0.2)", color: "rgba(201,168,76,0.6)" }}
          >
            <Eye size={13} />
            {t("profile.preview")}
          </button>
          <button
            onClick={() => setLocation("/profile/edit")}
            data-testid="button-edit-profile"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold"
            style={{ border: "1.5px solid rgba(201,168,76,0.35)", color: "#c9a84c" }}
          >
            <Edit2 size={13} />
            {t("profile.edit")}
          </button>
        </div>
      </div>

      <div className="px-5 pt-4">
        <div
          className="rounded-3xl overflow-hidden"
          style={{ border: "1px solid rgba(201,168,76,0.2)", background: "rgba(255,255,255,0.03)" }}
        >
          <div
            className="h-52 relative flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #2d0f4a, #4a1e6b, #7b3fa0)" }}
          >
            {me.photos && me.photos.length > 0 ? (
              <img src={me.photos[0]} alt={me.fullName ?? ""} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center font-serif text-4xl font-bold text-gold"
                style={{ background: "rgba(201,168,76,0.12)", border: "2px solid rgba(201,168,76,0.3)" }}
                data-testid="avatar-placeholder"
              >
                {(me.fullName ?? me.firstName ?? "M").charAt(0)}
              </div>
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(13,6,24,0.85) 0%, transparent 60%)" }} />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="font-serif text-2xl text-white font-bold" data-testid="text-profile-name">{me.fullName ?? me.firstName ?? "Member"}</h2>
                  <p className="text-white/60 text-sm">{me.city}{me.state ? `, ${me.state}` : ""}, {me.country} · {(me as any).dateOfBirth ? (() => {
                    const dob = new Date((me as any).dateOfBirth);
                    const today = new Date();
                    let a = today.getFullYear() - dob.getFullYear();
                    const m = today.getMonth() - dob.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--;
                    return a;
                  })() : me.age}</p>
                </div>
                <div
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: "rgba(201,168,76,0.9)", color: "#1a0a2e" }}
                  data-testid="badge-caste"
                >
                  {casteLabel(me.caste ?? "murid")}
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              {me.isPremium && (
                <span
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "white" }}
                  data-testid="badge-premium"
                >
                  <Star size={11} fill="white" />
                  Premium
                </span>
              )}
              {me.isVerified ? (
                <span
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
                  data-testid="badge-verified"
                >
                  <CheckCircle size={11} />
                  {t("profile.verified")}
                </span>
              ) : (
                <span
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(201,168,76,0.1)", color: "rgba(201,168,76,0.7)", border: "1px solid rgba(201,168,76,0.2)" }}
                  data-testid="badge-unverified"
                >
                  <Clock size={11} />
                  {me.verificationStatus === "pending" ? t("profile.pending") : t("discover.verifiedMember")}
                </span>
              )}
              <span
                className="px-3 py-1 rounded-full text-xs"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(253,248,240,0.5)" }}
              >
                {me.gender ? me.gender.charAt(0).toUpperCase() + me.gender.slice(1) : ""}
              </span>
            </div>

            {me.bio && (
              <div>
                <div className="text-xs text-cream/40 uppercase tracking-wider mb-1.5 font-semibold">{t("profile.aboutMe")}</div>
                <p className="text-cream/70 text-sm leading-relaxed" data-testid="text-bio">{me.bio}</p>
              </div>
            )}

            {me.occupation && (
              <div>
                <div className="text-xs text-cream/40 uppercase tracking-wider mb-1.5 font-semibold">{t("profile.occupation")}</div>
                <p className="text-cream/70 text-sm" data-testid="text-occupation">{me.occupation}</p>
              </div>
            )}

            {me.languages && me.languages.length > 0 && (
              <div>
                <div className="text-xs text-cream/40 uppercase tracking-wider mb-2 font-semibold">{t("profile.languages")}</div>
                <div className="flex flex-wrap gap-2">
                  {me.languages.map(lang => (
                    <span
                      key={lang}
                      className="px-3 py-1 rounded-full text-xs"
                      style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.2)" }}
                      data-testid={`badge-lang-${lang}`}
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Photo Gallery ── */}
      <div className="px-5 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs text-cream/40 uppercase tracking-wider font-semibold">{t("profile.photos")}</h3>
          {photosEdited && (
            <button
              onClick={() => { setPhotoError(null); savePhotosMutation.mutate(); }}
              disabled={savePhotosMutation.isPending}
              data-testid="button-save-photos"
              className="px-4 py-1.5 rounded-full text-xs font-bold disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
            >
              {savePhotosMutation.isPending ? t("profile.savingPhotos") : t("profile.savePhotos")}
            </button>
          )}
        </div>
        {photoError && (
          <p className="text-xs mt-2 font-medium" style={{ color: "#d4608a" }}>{photoError}</p>
        )}
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, idx) => {
            const photo = localPhotos[idx];
            return (
              <div key={idx} className="relative">
                {photo ? (
                  <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
                    <img
                      src={photo}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                      data-testid={`img-profile-photo-${idx}`}
                    />
                    <button
                      onClick={() => openPicker(idx)}
                      data-testid={`button-replace-photo-${idx}`}
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.0)" }}
                    >
                      <Camera size={20} color="white" style={{ opacity: 0 }} />
                    </button>
                    <button
                      onClick={() => removePhoto(idx)}
                      data-testid={`button-remove-photo-${idx}`}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center z-10"
                      style={{ background: "rgba(212,96,138,0.9)" }}
                    >
                      <X size={10} color="white" />
                    </button>
                    {idx === 0 ? (
                      <div
                        className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded flex items-center gap-1 text-xs font-bold"
                        style={{ background: "rgba(201,168,76,0.9)", color: "#1a0a2e" }}
                      >
                        <Star size={9} fill="#1a0a2e" color="#1a0a2e" />
                        {t("profile.mainPhoto")}
                      </div>
                    ) : (
                      <button
                        onClick={() => setAsMain(idx)}
                        data-testid={`button-set-main-photo-${idx}`}
                        className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded flex items-center gap-1 text-xs font-semibold transition-all active:scale-95"
                        style={{ background: "rgba(0,0,0,0.55)", color: "rgba(201,168,76,0.9)", border: "1px solid rgba(201,168,76,0.35)" }}
                      >
                        <Star size={9} color="#c9a84c" />
                        {t("profile.mainPhoto")}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => openPicker(idx)}
                    data-testid={`button-add-photo-${idx}`}
                    className="w-full rounded-2xl flex flex-col items-center justify-center gap-1"
                    style={{ aspectRatio: "1 / 1", background: "rgba(255,255,255,0.03)", border: "2px dashed rgba(201,168,76,0.18)" }}
                  >
                    <ImagePlus size={20} color="rgba(201,168,76,0.28)" />
                    <span className="text-xs" style={{ color: "rgba(253,248,240,0.18)" }}>Photo {idx + 1}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs mt-2" style={{ color: "rgba(253,248,240,0.2)" }}>{t("profile.photoInstruction")}</p>

        {localPendingPhotos.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={12} color="rgba(201,168,76,0.6)" />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(201,168,76,0.6)" }}>
                Pending Admin Review
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {localPendingPhotos.map((photo, idx) => (
                <div key={idx} className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
                  <img src={photo} alt={`Pending ${idx + 1}`} className="w-full h-full object-cover" style={{ filter: "brightness(0.6)" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="px-2 py-1 rounded-full text-center" style={{ background: "rgba(201,168,76,0.85)" }}>
                      <Clock size={10} color="#1a0a2e" />
                      <p className="text-[9px] font-bold mt-0.5" style={{ color: "#1a0a2e" }}>Pending</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs mt-1.5" style={{ color: "rgba(201,168,76,0.4)" }}>
              These photos are under review and will be visible after admin approval.
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          data-testid="input-photo-upload"
          onChange={handleFileChange}
        />
      </div>

      <div className="px-5 mt-5 space-y-3">
        {!me.isPremium && (
          <button
            onClick={() => setLocation("/premium")}
            data-testid="button-go-premium"
            className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
          >
            <Star size={16} fill="#1a0a2e" />
            {t("premium.subscribe")}
          </button>
        )}

        {me.isAdmin && (
          <button
            onClick={() => setLocation("/admin")}
            data-testid="button-open-admin"
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all text-left"
            style={{ border: "1px solid rgba(123,63,160,0.3)", background: "rgba(123,63,160,0.1)" }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(123,63,160,0.2)" }}>
              <Shield size={16} color="#7b3fa0" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: "rgba(253,248,240,0.85)" }}>Admin Panel</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(253,248,240,0.35)" }}>Manage verifications & reports</p>
            </div>
            <ChevronRight size={15} color="rgba(253,248,240,0.2)" />
          </button>
        )}

        <button
          onClick={() => setLocation("/settings")}
          data-testid="button-open-settings"
          className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all text-left"
          style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.1)" }}>
            <Settings size={16} color="#c9a84c" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: "rgba(253,248,240,0.85)" }}>Settings</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(253,248,240,0.35)" }}>Language, notifications, guidelines & more</p>
          </div>
          <ChevronRight size={15} color="rgba(253,248,240,0.2)" />
        </button>
      </div>
    </div>
    </>
  );
}

