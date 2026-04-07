import { useState, useEffect, useRef } from "react";

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

  // Initial cover dimensions (set once on load)
  const initDim = useRef({ w: 0, h: 0 });
  // Natural image dimensions
  const natural = useRef({ w: 0, h: 0 });

  // Transform state — use CSS transform, never change width/height
  const tx = useRef(0);
  const ty = useRef(0);
  const scale = useRef(1);
  const minScale = useRef(1);

  // Gesture tracking
  const dragging = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  const [ready, setReady] = useState(false);

  // Apply transform via direct DOM mutation — no React re-render per frame
  const applyTransform = () => {
    const img = imgRef.current;
    if (!img) return;
    img.style.transform = `translate(${tx.current}px, ${ty.current}px) scale(${scale.current})`;
  };

  const scheduleApply = () => {
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      applyTransform();
    });
  };

  // Clamp translate so image always covers the container
  const clampTranslate = () => {
    const containerSize = containerRef.current?.offsetWidth ?? 0;
    const s = scale.current;
    const halfExcessX = (initDim.current.w * s - containerSize) / 2;
    const halfExcessY = (initDim.current.h * s - containerSize) / 2;
    tx.current = Math.max(-halfExcessX, Math.min(halfExcessX, tx.current));
    ty.current = Math.max(-halfExcessY, Math.min(halfExcessY, ty.current));
  };

  // Load image, calculate cover fill size, centre it
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !imgSrc) return;
    const containerSize = container.offsetWidth;

    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      natural.current = { w: nw, h: nh };

      const coverScale = Math.max(containerSize / nw, containerSize / nh);
      initDim.current = { w: nw * coverScale, h: nh * coverScale };

      scale.current = 1;
      tx.current = 0;
      ty.current = 0;
      minScale.current = 1;

      const imgEl = imgRef.current;
      if (imgEl) {
        imgEl.style.width = `${initDim.current.w}px`;
        imgEl.style.height = `${initDim.current.h}px`;
        imgEl.style.transform = `translate(0px, 0px) scale(1)`;
      }
      setReady(true);
    };
    img.src = imgSrc;
  }, [imgSrc]);

  // Touch events
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !ready) return;

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
        // Pan — just shift translate, clamp so image keeps filling viewport
        const dx = e.touches[0].clientX - lastPoint.current.x;
        const dy = e.touches[0].clientY - lastPoint.current.y;
        lastPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        tx.current += dx;
        ty.current += dy;
        clampTranslate();
        scheduleApply();

      } else if (e.touches.length === 2 && lastPinchDist.current !== null) {
        // Pinch-to-zoom using CSS scale — never touches width/height
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ratio = dist / lastPinchDist.current;

        const prevScale = scale.current;
        const newScale = Math.min(5, Math.max(minScale.current, prevScale * ratio));
        const scaleRatio = newScale / prevScale;

        // Keep the pinch midpoint fixed in the viewport.
        // With transform-origin:center, a point at offset (mx, my) from container
        // centre stays fixed when we adjust translate by: tx' = mx + (tx - mx) * scaleRatio
        const rect = el.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left - cx;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top - cy;

        tx.current = mx + (tx.current - mx) * scaleRatio;
        ty.current = my + (ty.current - my) * scaleRatio;
        scale.current = newScale;
        lastPinchDist.current = dist;

        clampTranslate();
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
  }, [ready]);

  // Mouse drag (desktop)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    dragging.current = true;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" || !dragging.current) return;
    tx.current += e.clientX - lastPoint.current.x;
    ty.current += e.clientY - lastPoint.current.y;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    clampTranslate();
    scheduleApply();
  };

  const handlePointerUp = () => { dragging.current = false; };

  // Crop & export — derive source rect from the CSS transform, draw at natural resolution
  const handleConfirm = () => {
    const container = containerRef.current;
    if (!container || !natural.current.w) return;

    const containerSize = container.offsetWidth;
    const { w: nw, h: nh } = natural.current;
    const { w: initW, h: initH } = initDim.current;
    const s = scale.current;

    // Top-left of the displayed image in container-space
    // (image is centred at container centre, then translated by tx/ty)
    const imgLeft = containerSize / 2 - (initW * s) / 2 + tx.current;
    const imgTop  = containerSize / 2 - (initH * s) / 2 + ty.current;

    // Crop window is the entire container square
    // In display pixels, the crop starts at -imgLeft (how far into the image we are)
    const cropX = -imgLeft;
    const cropY = -imgTop;

    // Convert display-pixel crop rect back to natural-image pixels
    const displayToNatural = nw / (initW * s);
    const srcX = cropX * displayToNatural;
    const srcY = cropY * displayToNatural;
    const srcW = containerSize * displayToNatural;
    const srcH = containerSize * displayToNatural;

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputSize, outputSize);
      onConfirm(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = imgSrc;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.92)" }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#0F1F4F", border: "1px solid rgba(244,196,48,0.35)" }}>
        <div className="px-4 py-3 text-center" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
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
          {ready && (
            <img
              ref={imgRef}
              src={imgSrc}
              alt="crop preview"
              draggable={false}
              className="absolute pointer-events-none"
              style={{
                left: "50%",
                top: "50%",
                marginLeft: `-${initDim.current.w / 2}px`,
                marginTop: `-${initDim.current.h / 2}px`,
                transformOrigin: "center center",
                willChange: "transform",
                userSelect: "none",
              }}
            />
          )}

          {/* Rule-of-thirds grid */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "linear-gradient(rgba(244,196,48,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(244,196,48,0.1) 1px, transparent 1px)",
            backgroundSize: "33.33% 33.33%",
          }} />
          {/* Border */}
          <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 0 2px rgba(244,196,48,0.5)" }} />
        </div>

        <div className="flex gap-2 px-4 py-4">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-medium"
            style={{ background: "rgba(0,0,0,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(51,51,51,0.6)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            data-testid="button-crop-confirm"
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #F4C430, #D4A017)", color: "#0F1F4F" }}
          >
            Use Photo
          </button>
        </div>
      </div>
    </div>
  );
}
