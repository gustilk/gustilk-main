const block = (e: React.SyntheticEvent) => e.preventDefault();

export default function ProtectedPhoto({
  src,
  alt,
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <img
        src={src}
        alt={alt ?? ""}
        className={className}
        draggable={false}
        onContextMenu={block}
        onDragStart={block}
        style={{
          WebkitUserDrag: "none",
          userSelect: "none",
          WebkitTouchCallout: "none",
        } as React.CSSProperties}
      />
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
    </div>
  );
}
