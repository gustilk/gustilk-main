import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { parseApiError } from "@/lib/apiError";
import { Edit2, Star, CheckCircle, Clock, ChevronRight, X, Camera, ImagePlus, Settings, Eye, MapPin, ChevronLeft, Shield, AlertTriangle, XCircle, GripVertical, Trash2 } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { SafeUser } from "@shared/schema";
import type { PhotoSlot } from "@shared/schema";
import { PhotoCropModal } from "@/components/PhotoCropModal";
import { pickPhoto } from "@/lib/camera";

type LocalSlot = { url: string; status: "approved" | "new" } | null;

function SortablePhotoItem({
  id, slot, idx, onTap, onAdd,
}: {
  id: string; slot: LocalSlot; idx: number; onTap: (idx: number) => void; onAdd: (idx: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !slot,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    position: "relative",
  };

  if (!slot) {
    return (
      <div ref={setNodeRef} style={style}>
        <button
          onClick={() => onAdd(idx)}
          data-testid={`button-add-photo-${idx}`}
          className="w-full rounded-2xl flex flex-col items-center justify-center gap-1"
          style={{ aspectRatio: "1 / 1", background: "rgba(255,255,255,0.03)", border: "2px dashed rgba(201,168,76,0.18)" }}
        >
          <ImagePlus size={20} color="rgba(201,168,76,0.28)" />
          <span className="text-xs" style={{ color: "rgba(253,248,240,0.18)" }}>Photo {idx + 1}</span>
        </button>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="rounded-2xl overflow-hidden select-none"
        style={{ aspectRatio: "1 / 1", opacity: isDragging ? 0.7 : 1, cursor: "grab" }}
        onClick={() => !isDragging && onTap(idx)}
        data-testid={`img-profile-photo-${idx}`}
        {...attributes}
        {...listeners}
      >
        <img
          src={slot.url}
          alt={`Photo ${idx + 1}`}
          className="w-full h-full object-cover pointer-events-none"
          style={slot.status === "new" ? { filter: "brightness(0.75)" } : {}}
          draggable={false}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(13,6,24,0.55) 0%, transparent 55%)" }} />
        {slot.status === "new" && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold"
            style={{ background: "rgba(201,168,76,0.9)", color: "#1a0a2e" }}>
            Pending
          </div>
        )}
        {idx === 0 && (
          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] font-bold"
            style={{ background: "rgba(201,168,76,0.9)", color: "#1a0a2e" }}>
            <Star size={8} fill="#1a0a2e" color="#1a0a2e" /> Cover
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 rounded-full p-0.5" style={{ background: "rgba(13,6,24,0.5)" }}>
          <GripVertical size={12} color="rgba(255,255,255,0.5)" />
        </div>
      </div>
    </div>
  );
}

const REJECTION_EXPIRY_MS = 24 * 60 * 60 * 1000;

function formatTimeLeft(rejectedAt: string | undefined): string | null {
  if (!rejectedAt) return null;
  const ms = REJECTION_EXPIRY_MS - (Date.now() - new Date(rejectedAt).getTime());
  if (ms <= 0) return null;
  const totalMins = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) return `Disappears in ${hours}h ${mins}m`;
  return mins > 0 ? `Disappears in ${mins}m` : "Disappears soon";
}

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
  const location = [user.city, user.state, user.country].filter(Boolean).join(", ");
  const HEADER_H = 56;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0d0618" }} data-testid="modal-profile-preview">

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-5 pb-3"
        style={{
          background: "#0d0618",
          paddingTop: "calc(12px + env(safe-area-inset-top))",
          height: `calc(${HEADER_H}px + env(safe-area-inset-top))`,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
        <div className="flex items-center gap-2">
          <Eye size={15} color="#c9a84c" />
          <span className="text-gold text-sm font-semibold">{t("profile.howOthersSeeYou")}</span>
        </div>
        <button onClick={onClose} data-testid="button-close-preview"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <X size={16} color="rgba(253,248,240,0.7)" />
        </button>
      </div>

      {/* Scrollable content — same layout as Discovery */}
      <div className="flex-1 overflow-y-auto"
        style={{ paddingTop: `calc(${HEADER_H}px + env(safe-area-inset-top))` }}>

        {/* Photo card */}
        <div className="relative mx-3 rounded-3xl overflow-hidden" style={{ height: "72dvh", minHeight: 480 }}>
          {photos.length > 0 ? (
            <img src={photos[photoIdx]} alt={user.fullName ?? ""}
              className="absolute inset-0 w-full h-full object-cover object-top"
              data-testid="preview-main-photo" />
          ) : (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #2d0f4a, #4a1e6b, #7b3fa0)" }}>
              <span className="font-serif text-8xl text-gold/20">
                {(user.fullName ?? user.firstName ?? "M").charAt(0)}
              </span>
            </div>
          )}

          {/* Progress bars */}
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
              style={{ top: 18, background: "rgba(13,6,24,0.55)", backdropFilter: "blur(6px)", color: "rgba(255,255,255,0.7)" }}>
              {photoIdx + 1}/{photos.length}
            </div>
          )}

          {/* Tap zones */}
          {photos.length > 1 && (
            <>
              <button className="absolute left-0 top-0 bottom-0 w-1/2 z-10"
                onClick={() => setPhotoIdx(i => Math.max(0, i - 1))} />
              <button className="absolute right-0 top-0 bottom-0 w-1/2 z-10"
                onClick={() => setPhotoIdx(i => Math.min(photos.length - 1, i + 1))} />
            </>
          )}
        </div>

        {/* Sticky name + age */}
        <div className="sticky z-20 px-5 py-3"
          style={{ top: 0, background: "#0d0618", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h2 className="font-serif text-2xl text-white font-bold leading-tight" data-testid="preview-text-name">
            {user.fullName ?? user.firstName ?? "Member"}{age ? `, ${age}` : ""}
          </h2>
        </div>

        {/* Info cards — identical to Discovery */}
        <div className="px-4 pt-3 pb-16 space-y-3" style={{ background: "#0d0618" }}>

          {location && (
            <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <MapPin size={18} color="#c9a84c" />
              <span className="text-cream/85 text-sm font-medium">{location}</span>
            </div>
          )}

          {user.bio && (
            <div className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="text-white font-bold text-base mb-2">About me</h3>
              <p className="text-cream/75 text-sm leading-relaxed">{user.bio}</p>
            </div>
          )}

          {user.caste && (
            <div className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="text-white font-bold text-base mb-3">Faith & Caste</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(201,168,76,0.18)", color: "#e8c97a", border: "1px solid rgba(201,168,76,0.35)" }}
                  data-testid="preview-badge-caste">
                  {casteLabel(user.caste)}
                </span>
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(253,248,240,0.75)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  Yezidi
                </span>
              </div>
            </div>
          )}

          {(() => {
            const chips = [
              age && `${age} years old`,
              user.gender && user.gender.charAt(0).toUpperCase() + user.gender.slice(1),
              (user as any).occupation,
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

          {(user.languages ?? []).length > 0 && (
            <div className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="text-white font-bold text-base mb-3">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {(user.languages ?? []).map(lang => (
                  <span key={lang} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.22)" }}>
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {((user as any).interests ?? []).length > 0 && (
            <div className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="text-white font-bold text-base mb-3">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {((user as any).interests ?? []).map((it: string) => (
                  <span key={it} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: "rgba(123,63,160,0.18)", color: "#d4608a", border: "1px solid rgba(212,96,138,0.25)" }}>
                    {it}
                  </span>
                ))}
              </div>
            </div>
          )}

          {((user as any).moviesAndTv ?? []).length > 0 && (
            <div className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="text-white font-bold text-base mb-3">Movies & TV Shows</h3>
              <div className="flex flex-wrap gap-2">
                {((user as any).moviesAndTv ?? []).map((title: string) => (
                  <span key={title} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.22)" }}>
                    🎬 {title}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-cream/25 text-xs pt-2">{t("profile.previewNote")}</p>
        </div>
      </div>
    </div>
  );
}

interface Props { user: SafeUser }

export default function ProfilePage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const allSlots = ((user as any).photoSlots ?? []) as PhotoSlot[];
  const [localSlots, setLocalSlots] = useState<LocalSlot[]>(() => {
    const photosInOrder: string[] = (user as any).photos ?? [];
    const arr: LocalSlot[] = Array(6).fill(null);
    photosInOrder.forEach((url, i) => { if (i < 6) arr[i] = { url, status: "approved" }; });
    let pi = photosInOrder.length;
    allSlots.forEach(s => { if (s.status === "pending" && pi < 6) arr[pi++] = { url: s.url, status: "new" }; });
    return arr;
  });
  const [pendingSlots] = useState<PhotoSlot[]>(() => allSlots.filter(s => s.status === "pending"));
  const [rejectedSlots, setRejectedSlots] = useState<PhotoSlot[]>(() => allSlots.filter(s => s.status === "rejected"));
  const [, forceRender] = useState(0);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const stillActive = rejectedSlots.filter(s => {
        if (!s.rejectedAt) return true;
        return now - new Date(s.rejectedAt).getTime() < REJECTION_EXPIRY_MS;
      });
      if (stillActive.length !== rejectedSlots.length) {
        setRejectedSlots(stillActive);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      } else {
        forceRender(n => n + 1);
      }
    };
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [rejectedSlots]);

  const [photosEdited, setPhotosEdited] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<{ imgSrc: string; slotIdx: number } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<number>(0);
  const [pickerBusy, setPickerBusy] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = parseInt((active.id as string).replace("slot-", ""));
    const newIdx = parseInt((over.id as string).replace("slot-", ""));
    if (isNaN(oldIdx) || isNaN(newIdx)) return;
    setLocalSlots(prev => arrayMove([...prev], oldIdx, newIdx));
    setPhotosEdited(true);
  };

  const { data } = useQuery<{ user: SafeUser }>({
    queryKey: ["/api/auth/me"],
  });

  const me = data?.user ?? user;

  const savePhotosMutation = useMutation({
    mutationFn: async () => {
      const snapshot = [...localSlots];
      const photos = snapshot.filter(s => s !== null).map(s => s!.url);
      const res = await apiRequest("PUT", "/api/profile", { photos });
      const json = await res.json();
      return { savedUser: json.user, snapshot };
    },
    onSuccess: ({ savedUser, snapshot }) => {
      const updatedSlots = ((savedUser as any).photoSlots ?? []) as PhotoSlot[];
      const approvedUrls = new Set<string>((savedUser as any).photos ?? []);
      const pendingUrls = new Set<string>(
        updatedSlots.filter((s: any) => s.status === "pending").map((s: any) => s.url)
      );
      const arr: LocalSlot[] = snapshot.map(slot => {
        if (!slot) return null;
        if (approvedUrls.has(slot.url)) return { url: slot.url, status: "approved" };
        if (pendingUrls.has(slot.url)) return { url: slot.url, status: "new" };
        return null;
      });
      setLocalSlots(arr);
      setRejectedSlots(updatedSlots.filter((s: any) => s.status === "rejected"));
      setPhotosEdited(false);
      queryClient.setQueryData(["/api/auth/me"], (old: any) =>
        old ? { ...old, user: { ...old.user, ...savedUser } } : old
      );
      toast({ title: t("profile.photosUpdated") });
    },
    onError: (err: Error) => {
      setPhotoError(parseApiError(err, t("profile.couldNotSavePhotos")));
    },
  });

  const openPicker = useCallback(async (slotIdx: number) => {
    if (pickerBusy) return;
    setPickerBusy(true);
    try {
      const result = await pickPhoto("prompt");
      if (result) setCropTarget({ imgSrc: result.dataUrl, slotIdx });
    } finally {
      setPickerBusy(false);
    }
  }, [pickerBusy]);

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
    setLocalSlots(prev => { const next = [...prev]; next[cropTarget.slotIdx] = { url: base64, status: "new" }; return next; });
    setPhotosEdited(true);
    setCropTarget(null);
  };

  const removePhoto = (idx: number) => {
    setLocalSlots(prev => { const next = [...prev]; next[idx] = null; return next; });
    setPhotosEdited(true);
  };

  const setAsMain = (idx: number) => {
    if (idx === 0) return;
    setLocalSlots(prev => {
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
      <div className="pt-12 pb-4 px-5 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold text-gold">{t("profile.title")}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewOpen(true)}
            data-testid="button-preview-profile"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold"
            style={{ border: "1.5px solid rgba(201,168,76,0.35)", color: "rgba(201,168,76,0.75)" }}
          >
            <Eye size={15} />
            {t("profile.preview")}
          </button>
          <button
            onClick={() => setLocation("/profile/edit")}
            data-testid="button-edit-profile"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold"
            style={{ background: "rgba(201,168,76,0.12)", border: "1.5px solid rgba(201,168,76,0.5)", color: "#c9a84c" }}
          >
            <Edit2 size={15} />
            {t("profile.edit")}
          </button>
        </div>
      </div>

      {/* Rejection re-upload banner */}
      {me.verificationStatus === "rejected" && (
        <div className="flex items-start gap-3 px-4 py-3 mx-5 mt-3 rounded-2xl"
          style={{ background: "rgba(212,96,138,0.08)", border: "1px solid rgba(212,96,138,0.3)" }}>
          <XCircle size={15} style={{ color: "#d4608a", flexShrink: 0, marginTop: 1 }} />
          <div className="flex-1">
            <p className="text-xs font-semibold mb-0.5" style={{ color: "#d4608a" }}>Profile not approved</p>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(253,248,240,0.55)" }}>
              Update your photos, then return to submit for re-review.
            </p>
          </div>
          <button onClick={() => setLocation("/")} data-testid="button-back-to-review"
            className="text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0"
            style={{ background: "rgba(212,96,138,0.15)", color: "#d4608a" }}>
            Re-apply →
          </button>
        </div>
      )}

      <div className="px-5 pt-4">
        <div
          className="rounded-3xl overflow-hidden"
          style={{ border: "1px solid rgba(201,168,76,0.2)", background: "rgba(255,255,255,0.03)" }}
        >
          <div
            className="h-52 relative flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #2d0f4a, #4a1e6b, #7b3fa0)" }}
          >
            {(localSlots[0]?.url || (me.photos && me.photos.length > 0)) ? (
              <img src={localSlots[0]?.url ?? me.photos[0]} alt={me.fullName ?? ""} className="w-full h-full object-cover" />
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
            {localSlots.some(s => s !== null) && (
              <button
                onClick={() => setSelectedPhotoIdx(0)}
                className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(0,0,0,0.5)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                <ImagePlus size={12} />
                Change Cover
              </button>
            )}
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

        {/* Approved + new upload slots — drag to reorder, tap for options */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={Array.from({ length: 6 }, (_, i) => `slot-${i}`)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }, (_, idx) => (
                <SortablePhotoItem
                  key={`slot-${idx}`}
                  id={`slot-${idx}`}
                  slot={localSlots[idx]}
                  idx={idx}
                  onTap={i => setSelectedPhotoIdx(i)}
                  onAdd={openPicker}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <p className="text-xs mt-2" style={{ color: "rgba(253,248,240,0.2)" }}>{t("profile.photoInstruction")}</p>

        {/* Photo action sheet */}
        {selectedPhotoIdx !== null && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center px-5"
            style={{ background: "rgba(0,0,0,0.72)" }}
            onClick={() => setSelectedPhotoIdx(null)}
          >
            <div
              className="w-full rounded-3xl px-5 pt-5 pb-6"
              style={{ background: "#1a0a2e", border: "1px solid rgba(201,168,76,0.15)" }}
              onClick={e => e.stopPropagation()}
            >
              <p className="text-center text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: "rgba(253,248,240,0.35)" }}>
                {selectedPhotoIdx === 0 ? "Cover Photo" : `Photo ${selectedPhotoIdx + 1}`}
              </p>
              <div className="flex flex-col gap-2">
                {selectedPhotoIdx === 0 ? (
                  <button
                    data-testid="button-replace-cover"
                    onClick={() => { setSelectedPhotoIdx(null); openPicker(0); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
                    style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.2)" }}
                  >
                    <Camera size={16} color="#c9a84c" />
                    Replace Cover Photo
                  </button>
                ) : (
                  localSlots[selectedPhotoIdx]?.status === "approved" && (
                    <button
                      data-testid="button-set-cover"
                      onClick={() => { setAsMain(selectedPhotoIdx!); setSelectedPhotoIdx(null); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
                      style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.2)" }}
                    >
                      <Star size={16} color="#c9a84c" />
                      Set as Cover Photo
                    </button>
                  )
                )}
                <button
                  data-testid="button-delete-photo"
                  onClick={() => { removePhoto(selectedPhotoIdx!); setSelectedPhotoIdx(null); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
                  style={{ background: "rgba(212,96,138,0.1)", color: "#d4608a", border: "1px solid rgba(212,96,138,0.2)" }}
                >
                  <Trash2 size={16} color="#d4608a" />
                  Remove Photo
                </button>
                <button
                  data-testid="button-cancel-photo-action"
                  onClick={() => setSelectedPhotoIdx(null)}
                  className="w-full flex items-center justify-center px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
                  style={{ background: "rgba(255,255,255,0.04)", color: "rgba(253,248,240,0.45)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending review */}
        {pendingSlots.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={12} color="rgba(201,168,76,0.6)" />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(201,168,76,0.6)" }}>
                Pending Admin Review
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {pendingSlots.map((slot, idx) => (
                <div key={idx} className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
                  <img src={slot.url} alt={`Pending ${idx + 1}`} className="w-full h-full object-cover" style={{ filter: "brightness(0.6)" }} />
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
              These photos are under review and will appear after admin approval.
            </p>
          </div>
        )}

        {/* Rejected photos */}
        {rejectedSlots.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle size={12} color="#d4608a" />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#d4608a" }}>
                Rejected Photos
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {rejectedSlots.map((slot, idx) => {
                const timeLeft = formatTimeLeft(slot.rejectedAt);
                return (
                  <div key={idx} data-testid={`rejected-photo-${idx}`}>
                    <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "1 / 1", border: "1.5px solid rgba(212,96,138,0.4)" }}>
                      <img
                        src={slot.url}
                        alt={`Rejected ${idx + 1}`}
                        className="w-full h-full object-cover"
                        style={{ filter: "brightness(0.4) saturate(0.2)" }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(212,96,138,0.18)" }}>
                        <XCircle size={22} color="rgba(212,96,138,0.9)" />
                      </div>
                    </div>
                    {slot.reason && (
                      <p
                        className="text-[9px] text-center mt-1 leading-snug px-0.5 font-medium"
                        data-testid={`text-rejection-reason-${idx}`}
                        style={{ color: "rgba(212,96,138,0.8)" }}
                      >
                        {slot.reason}
                      </p>
                    )}
                    {timeLeft && (
                      <p
                        className="flex items-center justify-center gap-0.5 text-[9px] mt-0.5 font-medium"
                        data-testid={`text-rejection-timer-${idx}`}
                        style={{ color: "rgba(212,96,138,0.5)" }}
                      >
                        <Clock size={8} />
                        {timeLeft}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs mt-2" style={{ color: "rgba(212,96,138,0.5)" }}>
              These photos were removed by our admin. Use the empty slots above to upload replacements.
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

