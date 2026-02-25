import { useState, useEffect, useLayoutEffect, useRef } from "react";

export async function compressImage(file: File, maxPx = 800, quality = 0.70): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round((height / width) * maxPx); width = maxPx; }
        else { width = Math.round((width / height) * maxPx); height = maxPx; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function PhotoCropModal({
  imgSrc,
  outputSize = 800,
  onConfirm,
  onCancel,
}: {
  imgSrc: string;
  outputSize?: number;
  onConfirm: (base64: string) => void;
  onCancel: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [containerW, setContainerW] = useState(0);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [coverScale, setCoverScale] = useState(1);

  // Render state — only used to trigger re-render after gesture ends
  const [renderTick, setRenderTick] = useState(0);

  // Gesture state kept in refs so touch handlers always read the latest values
  const scaleRef = useRef(1);      // userScale
  const offsetRef = useRef({ x: 0, y: 0 });
  const coverScaleRef = useRef(1);

  const dragging = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);

  const rafId = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (containerRef.current) setContainerW(containerRef.current.offsetWidth);
  }, []);

  useEffect(() => {
    if (!containerW || !imgSrc) return;
    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const cs = Math.max(containerW / nw, containerW / nh);
      const initOffset = { x: (containerW - nw * cs) / 2, y: (containerW - nh * cs) / 2 };
      setNaturalSize({ w: nw, h: nh });
      setCoverScale(cs);
      coverScaleRef.current = cs;
      scaleRef.current = 1;
      offsetRef.current = initOffset;
      setRenderTick(t => t + 1);
    };
    img.src = imgSrc;
  }, [containerW, imgSrc]);

  // Apply transform directly to the img DOM node — bypasses React re-render on every frame
  const applyTransform = () => {
    const el = imgRef.current;
    if (!el || !naturalSize) return;
    const s = scaleRef.current;
    const cs = coverScaleRef.current;
    const o = offsetRef.current;
    el.style.left = `${o.x}px`;
    el.style.top = `${o.y}px`;
    el.style.width = `${naturalSize.w * cs * s}px`;
    el.style.height = `${naturalSize.h * cs * s}px`;
  };

  const scheduleApply = () => {
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      applyTransform();
    });
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        dragging.current = true;
        lastPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        lastPinchDist.current = null;
      } else if (e.touches.length === 2) {
        dragging.current = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && dragging.current) {
        const dx = e.touches[0].clientX - lastPoint.current.x;
        const dy = e.touches[0].clientY - lastPoint.current.y;
        lastPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        offsetRef.current = { x: offsetRef.current.x + dx, y: offsetRef.current.y + dy };
        scheduleApply();
      } else if (e.touches.length === 2 && lastPinchDist.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ratio = dist / lastPinchDist.current;

        const prevScale = scaleRef.current;
        const newScale = Math.min(5, Math.max(1, prevScale * ratio));
        const scaleRatio = newScale / prevScale;

        const rect = el.getBoundingClientRect();
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        offsetRef.current = {
          x: mx - (mx - offsetRef.current.x) * scaleRatio,
          y: my - (my - offsetRef.current.y) * scaleRatio,
        };
        scaleRef.current = newScale;
        lastPinchDist.current = dist;
        scheduleApply();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) lastPinchDist.current = null;
      if (e.touches.length === 0) dragging.current = false;
      if (e.touches.length === 1) {
        dragging.current = true;
        lastPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      setRenderTick(t => t + 1);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, [naturalSize]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    dragging.current = true;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" || !dragging.current) return;
    const dx = e.clientX - lastPoint.current.x;
    const dy = e.clientY - lastPoint.current.y;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    offsetRef.current = { x: offsetRef.current.x + dx, y: offsetRef.current.y + dy };
    scheduleApply();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    dragging.current = false;
  };

  const handleConfirm = () => {
    if (!naturalSize || !containerW) return;
    const s = scaleRef.current;
    const cs = coverScaleRef.current;
    const o = offsetRef.current;
    const dispW = naturalSize.w * cs * s;
    const dispH = naturalSize.h * cs * s;
    const ratio = outputSize / containerW;
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, o.x * ratio, o.y * ratio, dispW * ratio, dispH * ratio);
      onConfirm(canvas.toDataURL("image/jpeg", 0.80));
    };
    img.src = imgSrc;
  };

  const initDispW = naturalSize ? naturalSize.w * coverScale * scaleRef.current : 0;
  const initDispH = naturalSize ? naturalSize.h * coverScale * scaleRef.current : 0;
  const initOffset = offsetRef.current;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.92)" }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#1a0a2e", border: "1px solid rgba(201,168,76,0.35)" }}>
        <div className="px-4 py-3 text-center" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-gold font-serif font-semibold">Position your photo</p>
          <p className="text-cream/40 text-xs mt-0.5">Drag to reposition · Pinch to zoom</p>
        </div>
        <div
          ref={containerRef}
          className="relative overflow-hidden select-none"
          style={{ width: "100%", aspectRatio: "1 / 1", touchAction: "none", cursor: "grab" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {naturalSize && (
            <img
              ref={imgRef}
              src={imgSrc}
              alt="crop preview"
              draggable={false}
              className="absolute pointer-events-none"
              style={{
                left: initOffset.x,
                top: initOffset.y,
                width: initDispW,
                height: initDispH,
                userSelect: "none",
              }}
            />
          )}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "linear-gradient(rgba(201,168,76,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.1) 1px, transparent 1px)",
            backgroundSize: "33.33% 33.33%",
          }} />
          <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 0 2px rgba(201,168,76,0.5)" }} />
        </div>
        <div className="flex gap-2 px-4 py-4">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-medium"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(253,248,240,0.6)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            data-testid="button-crop-confirm"
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
          >
            Use Photo
          </button>
        </div>
      </div>
    </div>
  );
}
