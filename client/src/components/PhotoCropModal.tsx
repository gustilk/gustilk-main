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
  const [containerW, setContainerW] = useState(0);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [coverScale, setCoverScale] = useState(1);
  const [userScale, setUserScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPoint = useRef({ x: 0, y: 0 });

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
      setNaturalSize({ w: nw, h: nh });
      setCoverScale(cs);
      setUserScale(1);
      setOffset({ x: (containerW - nw * cs) / 2, y: (containerW - nh * cs) / 2 });
    };
    img.src = imgSrc;
  }, [containerW, imgSrc]);

  const dispW = naturalSize ? naturalSize.w * coverScale * userScale : 0;
  const dispH = naturalSize ? naturalSize.h * coverScale * userScale : 0;

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    lastPoint.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastPoint.current.x;
    const dy = e.clientY - lastPoint.current.y;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
  };

  const handlePointerUp = () => setDragging(false);

  const handleZoom = (newUserScale: number) => {
    if (!containerW) return;
    const cx = containerW / 2;
    const cy = containerW / 2;
    const ratio = newUserScale / userScale;
    setOffset(o => ({ x: cx - (cx - o.x) * ratio, y: cy - (cy - o.y) * ratio }));
    setUserScale(newUserScale);
  };

  const handleConfirm = () => {
    if (!naturalSize || !containerW) return;
    const ratio = outputSize / containerW;
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, offset.x * ratio, offset.y * ratio, dispW * ratio, dispH * ratio);
      onConfirm(canvas.toDataURL("image/jpeg", 0.80));
    };
    img.src = imgSrc;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.92)" }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#1a0a2e", border: "1px solid rgba(201,168,76,0.35)" }}>
        <div className="px-4 py-3 text-center" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-gold font-serif font-semibold">Position your photo</p>
          <p className="text-cream/40 text-xs mt-0.5">Drag to reposition · Slider to zoom</p>
        </div>
        <div
          ref={containerRef}
          className="relative overflow-hidden select-none"
          style={{ width: "100%", aspectRatio: "1 / 1", touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {naturalSize && (
            <img
              src={imgSrc}
              alt="crop preview"
              draggable={false}
              className="absolute pointer-events-none"
              style={{ left: offset.x, top: offset.y, width: dispW, height: dispH, userSelect: "none" }}
            />
          )}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "linear-gradient(rgba(201,168,76,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.1) 1px, transparent 1px)",
            backgroundSize: "33.33% 33.33%",
          }} />
          <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 0 2px rgba(201,168,76,0.5)" }} />
        </div>
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-cream/50 text-base font-bold leading-none">−</span>
          <input
            type="range" min={1} max={3} step={0.01} value={userScale}
            onChange={e => handleZoom(parseFloat(e.target.value))}
            className="flex-1"
            style={{ accentColor: "#c9a84c" }}
          />
          <span className="text-cream/50 text-base font-bold leading-none">+</span>
        </div>
        <div className="flex gap-2 px-4 pb-4">
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
