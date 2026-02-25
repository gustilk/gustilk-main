import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Edit2, Star, CheckCircle, Clock, ChevronRight, X, Camera, ImagePlus, Settings, StarOff } from "lucide-react";
import logoImg from "@assets/Untitled_design_1772024284063.png";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { SafeUser } from "@shared/schema";
import { PhotoCropModal } from "@/components/PhotoCropModal";

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
  const [photosEdited, setPhotosEdited] = useState(false);
  const [cropTarget, setCropTarget] = useState<{ imgSrc: string; slotIdx: number } | null>(null);
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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save photos");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const arr: (string | null)[] = Array(6).fill(null);
      ((data.user as SafeUser).photos ?? []).forEach((p: string, i: number) => { arr[i] = p; });
      setLocalPhotos(arr);
      setPhotosEdited(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Photos updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Could not save photos", description: err.message, variant: "destructive" });
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
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "#0d0618" }}>
      <div className="pt-12 pb-2 px-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src={logoImg} alt="" className="flex-shrink-0" style={{ width: "48px", height: "48px", objectFit: "contain", filter: "drop-shadow(0 1px 6px rgba(201,168,76,0.6))" }} />
          <h1 className="font-serif text-2xl text-gold">{t("profile.title")}</h1>
        </div>
        <button
          onClick={() => setLocation("/profile/edit")}
          data-testid="button-edit-profile"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold"
          style={{ border: "1.5px solid rgba(201,168,76,0.35)", color: "#c9a84c" }}
        >
          <Edit2 size={13} />
          Edit
        </button>
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
                  <p className="text-white/60 text-sm">{me.city}, {me.country} · {(me as any).dateOfBirth ? (() => {
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
                  Verified
                </span>
              ) : (
                <span
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(201,168,76,0.1)", color: "rgba(201,168,76,0.7)", border: "1px solid rgba(201,168,76,0.2)" }}
                  data-testid="badge-unverified"
                >
                  <Clock size={11} />
                  {me.verificationStatus === "pending" ? "Pending Verification" : "Unverified"}
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
                <div className="text-xs text-cream/40 uppercase tracking-wider mb-1.5 font-semibold">About Me</div>
                <p className="text-cream/70 text-sm leading-relaxed" data-testid="text-bio">{me.bio}</p>
              </div>
            )}

            {me.occupation && (
              <div>
                <div className="text-xs text-cream/40 uppercase tracking-wider mb-1.5 font-semibold">Occupation</div>
                <p className="text-cream/70 text-sm" data-testid="text-occupation">{me.occupation}</p>
              </div>
            )}

            {me.languages && me.languages.length > 0 && (
              <div>
                <div className="text-xs text-cream/40 uppercase tracking-wider mb-2 font-semibold">Languages</div>
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
          <h3 className="text-xs text-cream/40 uppercase tracking-wider font-semibold">My Photos</h3>
          {photosEdited && (
            <button
              onClick={() => savePhotosMutation.mutate()}
              disabled={savePhotosMutation.isPending}
              data-testid="button-save-photos"
              className="px-4 py-1.5 rounded-full text-xs font-bold disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
            >
              {savePhotosMutation.isPending ? "Saving…" : "Save Photos"}
            </button>
          )}
        </div>
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
                        Main
                      </div>
                    ) : (
                      <button
                        onClick={() => setAsMain(idx)}
                        data-testid={`button-set-main-photo-${idx}`}
                        className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded flex items-center gap-1 text-xs font-semibold transition-all active:scale-95"
                        style={{ background: "rgba(0,0,0,0.55)", color: "rgba(201,168,76,0.9)", border: "1px solid rgba(201,168,76,0.35)" }}
                      >
                        <Star size={9} color="#c9a84c" />
                        Main
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
        <p className="text-xs mt-2" style={{ color: "rgba(253,248,240,0.2)" }}>Tap ★ Main to set cover photo · × to remove · max 6</p>
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

