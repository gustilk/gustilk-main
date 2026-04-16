import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import ProtectedPhoto from "@/components/ProtectedPhoto";

interface Props {
  photos: string[];
  initialIndex?: number;
  blurred?: boolean;
  useProtected?: boolean;
  onClose: () => void;
}

export default function PhotoViewerModal({
  photos,
  initialIndex = 0,
  blurred = false,
  useProtected = false,
  onClose,
}: Props) {
  const [idx, setIdx] = useState(initialIndex);

  // Touch swipe state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(photos.length - 1, i + 1));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only swipe horizontally if horizontal movement dominates
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const currentPhoto = photos[idx];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "rgba(0,0,0,0.95)" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-10 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
      >
        <X size={20} color="white" />
      </button>

      {/* Photo counter */}
      {photos.length > 1 && (
        <div
          className="absolute top-5 left-0 right-0 flex justify-center"
          style={{ pointerEvents: "none" }}
        >
          <span
            className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.8)" }}
          >
            {idx + 1} / {photos.length}
          </span>
        </div>
      )}

      {/* Photo */}
      <div
        className="w-full px-4 flex items-center justify-center"
        style={{ height: "75vh" }}
      >
        {useProtected ? (
          <div className="rounded-2xl overflow-hidden w-full h-full">
            <ProtectedPhoto
              src={currentPhoto}
              alt={`Photo ${idx + 1}`}
              className="w-full h-full object-contain"
              blurred={blurred}
            />
          </div>
        ) : (
          <img
            src={currentPhoto}
            alt={`Photo ${idx + 1}`}
            className="rounded-2xl object-contain w-full h-full"
            draggable={false}
          />
        )}
      </div>

      {/* Prev / Next arrows (desktop) */}
      {photos.length > 1 && (
        <>
          <button
            onClick={prev}
            disabled={idx === 0}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-opacity disabled:opacity-20"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            <ChevronLeft size={22} color="white" />
          </button>
          <button
            onClick={next}
            disabled={idx === photos.length - 1}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-opacity disabled:opacity-20"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            <ChevronRight size={22} color="white" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div className="absolute bottom-8 flex gap-2">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="rounded-full transition-all"
              style={{
                width: i === idx ? 20 : 8,
                height: 8,
                background: i === idx ? "#c9a84c" : "rgba(255,255,255,0.35)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
