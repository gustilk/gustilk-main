import { useState, useEffect } from "react";
import { PEACOCK_LOGOS, SESSION_LOGO } from "@/lib/peacocks";

interface Props {
  /** Pixel size of the square container — all logos are letterboxed to this */
  size: number;
  /** If true, cycles through all 26 logos automatically (landing page use) */
  cycle?: boolean;
  /** Interval in ms between logo changes when cycling (default 2500) */
  intervalMs?: number;
  className?: string;
  filter?: string;
}

/**
 * Renders one of the 26 Tawûsî Melek peacock logos inside a fixed square
 * container so every logo appears at the exact same size regardless of its
 * original aspect ratio (object-fit: contain).
 *
 * - Without `cycle`: shows the session-random logo (same logo for the whole session).
 * - With `cycle`:    fades through all 26 in order.
 */
export default function PeacockLogo({
  size,
  cycle = false,
  intervalMs = 2500,
  className = "",
  filter = "drop-shadow(0 1px 8px rgba(201,168,76,0.55))",
}: Props) {
  const [idx, setIdx] = useState(() =>
    cycle ? 0 : PEACOCK_LOGOS.indexOf(SESSION_LOGO)
  );
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!cycle) return;
    const timer = setInterval(() => {
      // Fade out
      setVisible(false);
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % PEACOCK_LOGOS.length);
        setVisible(true);
      }, 350); // half the CSS transition
    }, intervalMs);
    return () => clearInterval(timer);
  }, [cycle, intervalMs]);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <img
        src={PEACOCK_LOGOS[idx]}
        alt="Gûstîlk"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          filter,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.35s ease",
        }}
      />
    </div>
  );
}
