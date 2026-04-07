import Lottie from "lottie-react";
import { useEffect, useState, useRef } from "react";

interface Props {
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  style?: React.CSSProperties;
  placeholderSize?: number;
}

export default function LottieAnimation({ src, loop = true, autoplay = true, className, style, placeholderSize }: Props) {
  const [data, setData] = useState<object | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(false);
    fetch(src)
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [src]);

  if (error) {
    return (
      <div className={className} style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: placeholderSize ?? 32 }}>🎁</span>
      </div>
    );
  }

  if (!data) {
    const sz = placeholderSize ?? 32;
    return (
      <div className={className} style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: sz,
            height: sz,
            borderRadius: "50%",
            border: "2.5px solid rgba(200,0,14,0.25)",
            borderTopColor: "#c8000e",
            animation: "lottie-spin 0.9s linear infinite",
          }}
        />
        <style>{`@keyframes lottie-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <Lottie
      animationData={data}
      loop={loop}
      autoplay={autoplay}
      className={className}
      style={style}
    />
  );
}
