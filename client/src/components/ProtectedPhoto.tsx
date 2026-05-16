const block = (e: React.SyntheticEvent) => e.preventDefault();

export default function ProtectedPhoto({
  src,
  alt,
  className,
  blurred = false,
  style,
  loading = "lazy",
}: {
  src: string;
  alt?: string;
  className?: string;
  blurred?: boolean;
  style?: React.CSSProperties;
  loading?: "lazy" | "eager";
}) {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <img
        src={src}
        alt={blurred ? "" : (alt ?? "")}
        className={className}
        draggable={false}
        loading={loading}
        decoding="async"
        onContextMenu={block}
        onDragStart={block}
        style={{
          WebkitUserDrag: "none",
          userSelect: "none",
          WebkitTouchCallout: "none",
          ...(blurred ? { filter: "blur(22px) brightness(0.65) saturate(0.4)", transform: "scale(1.1)" } : {}),
          ...style,
        } as React.CSSProperties}
      />
      {blurred && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          style={{ background: "rgba(13,6,24,0.25)" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(201,168,76,0.18)", border: "1.5px solid rgba(201,168,76,0.4)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span className="text-xs font-semibold" style={{ color: "rgba(201,168,76,0.9)", textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
            Match to see photos
          </span>
        </div>
      )}
      {!blurred && (
        <div
          className="absolute inset-0"
          onContextMenu={block}
          onDragStart={block}
          style={{
            WebkitTouchCallout: "none",
            userSelect: "none",
            background: "transparent",
          }}
        />
      )}
    </div>
  );
}
