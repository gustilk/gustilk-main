import Lottie from "lottie-react";
import { useEffect, useState } from "react";

interface Props {
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function LottieAnimation({ src, loop = true, autoplay = true, className, style }: Props) {
  const [data, setData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(src)
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [src]);

  if (!data) return null;

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
