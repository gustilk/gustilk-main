import { useEffect } from "react";

// ─── Keyframe injection ────────────────────────────────────────────────────
const CSS = `
@keyframes g-float    { 0%,100%{transform:translateY(0)}      50%{transform:translateY(-5px)} }
@keyframes g-pulse    { 0%,100%{transform:scale(1)}            50%{transform:scale(1.14)} }
@keyframes g-spin-y   { from{transform:perspective(120px) rotateY(0deg) rotateX(18deg)}   to{transform:perspective(120px) rotateY(360deg) rotateX(18deg)} }
@keyframes g-spin-z   { from{transform:rotateZ(0deg)}          to{transform:rotateZ(360deg)} }
@keyframes g-ring     { from{transform:perspective(80px) rotateX(68deg) rotateZ(0deg)}    to{transform:perspective(80px) rotateX(68deg) rotateZ(360deg)} }
@keyframes g-wobble   { 0%,100%{transform:rotateZ(-9deg) scale(1)} 50%{transform:rotateZ(9deg) scale(1.05)} }
@keyframes g-bounce   { 0%,100%{transform:translateY(0) scaleY(1)} 45%{transform:translateY(-7px) scaleY(1.04)} 65%{transform:translateY(-5px) scaleY(1)} }
@keyframes g-twinkle  { 0%,100%{opacity:1;transform:scale(1) rotateZ(0deg)} 50%{opacity:.45;transform:scale(.75) rotateZ(22deg)} }
@keyframes g-glow     { 0%,100%{opacity:.7;transform:scale(1)}  50%{opacity:1;transform:scale(1.08)} }
@keyframes g-orbit    { from{transform:rotateZ(0deg) translateX(var(--r,10px)) rotateZ(0deg)}   to{transform:rotateZ(360deg) translateX(var(--r,10px)) rotateZ(-360deg)} }
@keyframes g-orbit-r  { from{transform:rotateZ(180deg) translateX(var(--r,10px)) rotateZ(-180deg)} to{transform:rotateZ(-180deg) translateX(var(--r,10px)) rotateZ(180deg)} }
@keyframes g-petal    { 0%,100%{transform:rotateZ(var(--a,0deg)) scaleX(.55) scaleY(.28)} 50%{transform:rotateZ(calc(var(--a,0deg) + 10deg)) scaleX(.6) scaleY(.3)} }
@keyframes g-lid      { 0%,100%{transform:perspective(60px) rotateX(-15deg) translateY(0)} 50%{transform:perspective(60px) rotateX(-25deg) translateY(-3px)} }
@keyframes g-string   { 0%,100%{transform:translateX(0)} 50%{transform:translateX(1.5px)} }
`;

let injected = false;
function injectCSS() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style");
  s.id = "gift3d-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

// ─── Shared helpers ─────────────────────────────────────────────────────────
const C: React.CSSProperties = { position: "absolute" };
const abs = (extra: React.CSSProperties): React.CSSProperties => ({ ...C, ...extra });

// ─── Individual 3D gift renders ─────────────────────────────────────────────

function Rose({ s }: { s: number }) {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <div style={{ width: s, height: s, position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, animation: "g-spin-z 6s linear infinite" }}>
        {petals.map((a, i) => (
          <div key={i} style={abs({
            width: s * 0.52, height: s * 0.28,
            borderRadius: "50%",
            background: i % 2 === 0
              ? "radial-gradient(ellipse at 40% 40%, #ff7eb3, #e83e6c 55%, #9c1a3e)"
              : "radial-gradient(ellipse at 40% 40%, #ff9ec9, #e03050 55%, #8b1a50)",
            top: "50%", left: "50%",
            transformOrigin: "0% 50%",
            transform: `rotateZ(${a}deg) translateX(${s * 0.04}px)`,
            opacity: 0.92,
            boxShadow: `inset 0 1px 3px rgba(255,255,255,0.3), 0 2px 6px rgba(232,62,108,0.4)`,
          })} />
        ))}
      </div>
      <div style={abs({
        width: s * 0.26, height: s * 0.26, borderRadius: "50%",
        background: "radial-gradient(circle at 38% 38%, #ffe0ef, #e83e6c 60%, #7c1433)",
        top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        boxShadow: "0 2px 8px rgba(232,62,108,0.7)",
        zIndex: 2,
      })} />
    </div>
  );
}

function Heart({ s }: { s: number }) {
  const h = s * 0.44;
  const hw = h * 0.84;
  return (
    <div style={{ width: s, height: s, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: hw, height: hw, position: "relative",
        animation: "g-pulse 1.4s ease-in-out infinite, g-float 3s ease-in-out infinite",
        filter: "drop-shadow(0 4px 10px rgba(239,68,68,0.7))",
      }}>
        <div style={abs({ width: hw * 0.6, height: hw * 0.6, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #fca5a5, #ef4444 55%, #991b1b)", top: 0, left: 0 })} />
        <div style={abs({ width: hw * 0.6, height: hw * 0.6, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #fca5a5, #ef4444 55%, #991b1b)", top: 0, right: 0 })} />
        <div style={abs({
          width: hw * 0.84, height: hw * 0.84,
          background: "radial-gradient(circle at 35% 30%, #fca5a5, #ef4444 50%, #991b1b)",
          bottom: 0, left: "50%", transform: "translateX(-50%) rotateZ(45deg)",
          borderRadius: "4px 2px 12px 2px",
        })} />
        <div style={abs({
          width: hw * 0.25, height: hw * 0.18, borderRadius: "50%",
          background: "rgba(255,255,255,0.45)", top: "12%", left: "15%",
          transform: "rotateZ(-30deg)",
        })} />
      </div>
    </div>
  );
}

function Bouquet({ s }: { s: number }) {
  const flowers = [
    { x: 50, y: 30, r: s * 0.22, c1: "#ffb3cc", c2: "#e03050" },
    { x: 28, y: 48, r: s * 0.19, c1: "#ffd6e7", c2: "#c9508a" },
    { x: 72, y: 48, r: s * 0.19, c1: "#ff99c8", c2: "#b84080" },
  ];
  return (
    <div style={{ width: s, height: s, position: "relative", animation: "g-float 3.5s ease-in-out infinite" }}>
      {/* Stem */}
      <div style={abs({ width: 3, height: s * 0.32, background: "linear-gradient(180deg,#4ade80,#16a34a)", bottom: "8%", left: "50%", transform: "translateX(-50%)", borderRadius: 2 })} />
      {/* Leaves */}
      <div style={abs({ width: s * 0.2, height: s * 0.1, background: "#22c55e", borderRadius: "50%", bottom: "22%", left: "50%", transform: "rotateZ(-40deg)", transformOrigin: "0% 50%" })} />
      <div style={abs({ width: s * 0.2, height: s * 0.1, background: "#16a34a", borderRadius: "50%", bottom: "22%", right: "50%", transform: "rotateZ(40deg)", transformOrigin: "100% 50%" })} />
      {/* Flowers */}
      {flowers.map((f, i) => (
        <div key={i} style={abs({ width: f.r * 2, height: f.r * 2, borderRadius: "50%", background: `radial-gradient(circle at 38% 38%, ${f.c1}, ${f.c2} 65%, #6b1230)`, top: `${f.y - f.r / s * 100}%`, left: `${f.x - f.r / s * 100}%`, boxShadow: `0 2px 8px ${f.c2}88`, animation: `g-pulse ${2.2 + i * 0.3}s ease-in-out infinite` })}>
          <div style={abs({ width: "30%", height: "20%", borderRadius: "50%", background: "rgba(255,255,255,0.4)", top: "15%", left: "18%", transform: "rotateZ(-20deg)" })} />
        </div>
      ))}
    </div>
  );
}

function Diamond({ s }: { s: number }) {
  const d = s * 0.72;
  return (
    <div style={{ width: s, height: s, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: d, height: d, position: "relative",
        animation: "g-spin-y 4s linear infinite",
        filter: "drop-shadow(0 4px 10px rgba(103,232,249,0.7))",
      }}>
        {/* Main gem shape */}
        <div style={{
          width: "100%", height: "100%",
          background: "linear-gradient(145deg, #e0f9ff 0%, #a5f3fc 20%, #67e8f9 45%, #0891b2 70%, #083344 100%)",
          clipPath: "polygon(50% 0%, 95% 30%, 78% 100%, 22% 100%, 5% 30%)",
        }} />
        {/* Top facet */}
        <div style={abs({
          width: "50%", height: "30%", top: 0, left: "25%",
          background: "linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 100%)",
          clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
        })} />
        {/* Left facet */}
        <div style={abs({
          width: "46%", height: "70%", top: "30%", left: "5%",
          background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(8,145,178,0.6))",
          clipPath: "polygon(0% 0%, 100% 0%, 74% 100%, 0% 100%)",
        })} />
        {/* Right facet shine */}
        <div style={abs({
          width: "20%", height: "25%", top: "5%", right: "12%",
          background: "rgba(255,255,255,0.55)", borderRadius: "50%",
          filter: "blur(2px)",
        })} />
      </div>
    </div>
  );
}

function Ring({ s }: { s: number }) {
  const r = s * 0.58;
  const thick = s * 0.12;
  return (
    <div style={{ width: s, height: s, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: r, height: r, borderRadius: "50%",
        border: `${thick}px solid transparent`,
        background: `linear-gradient(#1a0005, #1a0005) padding-box,
                     linear-gradient(135deg, #e9d5ff, #a855f7, #7c3aed, #c4b5fd, #e9d5ff) border-box`,
        animation: "g-ring 3.5s linear infinite",
        boxShadow: "0 0 12px rgba(168,85,247,0.6), inset 0 0 8px rgba(168,85,247,0.2)",
        position: "relative",
      }}>
        {/* Diamond on ring */}
        <div style={abs({
          width: thick * 1.4, height: thick * 1.4,
          background: "radial-gradient(circle at 40% 35%, #e0f9ff, #67e8f9 50%, #0891b2)",
          borderRadius: "2px",
          top: "-" + (thick * 0.7) + "px",
          left: "50%", transform: "translateX(-50%) rotateZ(45deg)",
          boxShadow: "0 0 8px rgba(103,232,249,0.8)",
        })} />
      </div>
    </div>
  );
}

function Crown({ s }: { s: number }) {
  const w = s * 0.82;
  const h = s * 0.56;
  const jewels = [
    { x: "50%", c1: "#fde68a", c2: "#f59e0b" },
    { x: "15%", c1: "#fca5a5", c2: "#ef4444" },
    { x: "85%", c1: "#c4b5fd", c2: "#8b5cf6" },
  ];
  return (
    <div style={{ width: s, height: s, display: "flex", alignItems: "center", justifyContent: "center", animation: "g-bounce 2s ease-in-out infinite" }}>
      <div style={{ width: w, height: h, position: "relative" }}>
        {/* Crown body */}
        <div style={{
          width: "100%", height: "100%",
          background: "linear-gradient(180deg, #fbbf24 0%, #f59e0b 40%, #d97706 100%)",
          clipPath: "polygon(0% 100%, 0% 55%, 20% 0%, 35% 55%, 50% 0%, 65% 55%, 80% 0%, 100% 55%, 100% 100%)",
          boxShadow: "inset 0 -3px 8px rgba(0,0,0,0.3), inset 0 3px 6px rgba(255,255,255,0.25)",
        }} />
        {/* Jewels */}
        {jewels.map((j, i) => (
          <div key={i} style={abs({
            width: s * 0.13, height: s * 0.13, borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, ${j.c1}, ${j.c2})`,
            top: "25%", left: j.x, transform: "translateX(-50%)",
            boxShadow: `0 0 6px ${j.c2}99`,
            animation: `g-glow ${1.5 + i * 0.4}s ease-in-out infinite`,
          })} />
        ))}
        {/* Gold trim line */}
        <div style={abs({ bottom: 0, left: 0, right: 0, height: "18%", background: "linear-gradient(180deg,#fde68a,#b45309)", borderRadius: "0 0 3px 3px" })} />
      </div>
    </div>
  );
}

function Balloon({ s }: { s: number }) {
  const bw = s * 0.56, bh = s * 0.64;
  return (
    <div style={{ width: s, height: s, position: "relative", animation: "g-float 3s ease-in-out infinite" }}>
      {/* Balloon body */}
      <div style={abs({
        width: bw, height: bh, borderRadius: "50% 50% 48% 48% / 55% 55% 45% 45%",
        background: "radial-gradient(ellipse at 38% 32%, #fed7aa, #f97316 50%, #c2410c 90%)",
        top: "4%", left: "50%", transform: "translateX(-50%)",
        boxShadow: "inset -4px -4px 10px rgba(0,0,0,0.25), 0 4px 14px rgba(249,115,22,0.5)",
      })}>
        {/* Highlight */}
        <div style={abs({ width: "28%", height: "22%", borderRadius: "50%", background: "rgba(255,255,255,0.5)", top: "14%", left: "22%", filter: "blur(1px)" })} />
      </div>
      {/* Knot */}
      <div style={abs({
        width: s * 0.1, height: s * 0.1, borderRadius: "50%",
        background: "#ea580c",
        bottom: "28%", left: "50%", transform: "translateX(-50%)",
      })} />
      {/* String */}
      <div style={abs({
        width: 2, height: "22%", background: "rgba(253,186,116,0.8)",
        bottom: "2%", left: "50%", transform: "translateX(-50%)",
        animation: "g-string 2s ease-in-out infinite",
      })} />
    </div>
  );
}

function Sparkle({ s }: { s: number }) {
  const arm = s * 0.44;
  const stars = [0, 45];
  return (
    <div style={{ width: s, height: s, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: arm * 2, height: arm * 2, animation: "g-spin-z 4s linear infinite" }}>
        {stars.map((rot, i) => (
          <div key={i} style={abs({
            width: "100%", height: "100%",
            background: `linear-gradient(${rot + 90}deg, transparent 42%, ${i === 0 ? "#fde68a" : "#fbbf24"} 42%, ${i === 0 ? "#fbbf24" : "#f59e0b"} 58%, transparent 58%),
                         linear-gradient(${rot}deg, transparent 42%, ${i === 0 ? "#fde68a" : "#fbbf24"} 42%, ${i === 0 ? "#fbbf24" : "#f59e0b"} 58%, transparent 58%)`,
            top: 0, left: 0, borderRadius: "4px",
            filter: i === 0 ? "drop-shadow(0 0 4px #f59e0baa)" : undefined,
            animation: `g-twinkle ${2 + i * 0.6}s ease-in-out infinite`,
          })} />
        ))}
        {/* Center dot */}
        <div style={abs({
          width: s * 0.2, height: s * 0.2, borderRadius: "50%",
          background: "radial-gradient(circle at 40% 40%, #fffbeb, #f59e0b)",
          top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          boxShadow: "0 0 10px #f59e0b",
        })} />
      </div>
    </div>
  );
}

function Chocolate({ s }: { s: number }) {
  const bw = s * 0.64, bh = s * 0.52, top = s * 0.22;
  return (
    <div style={{ width: s, height: s, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: bw, height: bh + top }}>
        {/* Box lid */}
        <div style={abs({
          width: bw, height: top,
          background: "linear-gradient(180deg, #fda4af, #fb7185 60%, #e11d48)",
          borderRadius: "6px 6px 2px 2px",
          top: 0,
          boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), 0 2px 6px rgba(225,29,72,0.4)",
          animation: "g-lid 2.5s ease-in-out infinite",
          transformOrigin: "50% 100%",
          zIndex: 2,
        })}>
          <div style={abs({ top: "20%", left: "50%", transform: "translateX(-50%)", width: "60%", height: "25%", background: "#fecdd3", borderRadius: 2, opacity: 0.6 })} />
        </div>
        {/* Box body */}
        <div style={abs({
          width: bw, height: bh,
          background: "linear-gradient(180deg, #fb7185, #e11d48 40%, #9f1239)",
          borderRadius: "2px 2px 6px 6px",
          top: top * 0.6,
          boxShadow: "inset 0 -3px 6px rgba(0,0,0,0.3), inset 3px 0 6px rgba(255,255,255,0.08)",
        })}>
          {/* Heart on box */}
          <div style={{ position: "relative", top: "20%", left: "50%", transform: "translateX(-50%)", width: s * 0.22, height: s * 0.18 }}>
            <div style={abs({ width: "55%", height: "55%", borderRadius: "50%", background: "#fecdd3", top: 0, left: 0 })} />
            <div style={abs({ width: "55%", height: "55%", borderRadius: "50%", background: "#fecdd3", top: 0, right: 0 })} />
            <div style={abs({ width: "78%", height: "78%", background: "#fecdd3", bottom: 0, left: "50%", transform: "translateX(-50%) rotateZ(45deg)", borderRadius: "1px 1px 6px 1px" })} />
          </div>
        </div>
        {/* Side shadow */}
        <div style={abs({
          width: s * 0.12, height: bh, right: -s * 0.08,
          background: "linear-gradient(90deg, rgba(0,0,0,0.25), transparent)",
          top: top * 0.6, borderRadius: "0 4px 4px 0",
          skewY: "0deg",
        })} />
      </div>
    </div>
  );
}

function Kiss({ s }: { s: number }) {
  return (
    <div style={{ width: s, height: s, display: "flex", alignItems: "center", justifyContent: "center", animation: "g-pulse 2s ease-in-out infinite" }}>
      <div style={{ position: "relative", width: s * 0.78, height: s * 0.52, filter: "drop-shadow(0 4px 8px rgba(200,0,14,0.6))" }}>
        {/* Upper lip */}
        <div style={abs({
          width: "100%", height: "52%",
          background: "linear-gradient(180deg, #fda4af, #fb7185 80%)",
          clipPath: "polygon(0% 100%, 14% 30%, 30% 60%, 50% 20%, 70% 60%, 86% 30%, 100% 100%)",
          top: 0,
        })} />
        {/* Lower lip */}
        <div style={abs({
          width: "92%", height: "55%",
          background: "linear-gradient(180deg, #fb7185, #e11d48 80%)",
          borderRadius: "0 0 60% 60%",
          bottom: 0, left: "4%",
        })}>
          <div style={abs({ width: "35%", height: "30%", borderRadius: "50%", background: "rgba(255,255,255,0.3)", top: "15%", left: "20%" })} />
        </div>
        {/* Cupid's bow shadow */}
        <div style={abs({
          width: "30%", height: "12%", top: "44%", left: "35%",
          background: "rgba(0,0,0,0.15)", borderRadius: "50%",
        })} />
      </div>
    </div>
  );
}

function Love({ s }: { s: number }) {
  const hw = s * 0.36;
  function MiniHeart({ style }: { style: React.CSSProperties }) {
    return (
      <div style={{ width: hw, height: hw, position: "relative", ...style }}>
        <div style={abs({ width: "55%", height: "55%", borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #fde68a, #f59e0b 60%, #92400e)", top: 0, left: 0 })} />
        <div style={abs({ width: "55%", height: "55%", borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #fde68a, #f59e0b 60%, #92400e)", top: 0, right: 0 })} />
        <div style={abs({ width: "78%", height: "78%", background: "radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 60%, #92400e)", bottom: 0, left: "50%", transform: "translateX(-50%) rotateZ(45deg)", borderRadius: "2px 1px 10px 1px" })} />
      </div>
    );
  }
  return (
    <div style={{ width: s, height: s, display: "flex", alignItems: "center", justifyContent: "center", animation: "g-float 2.8s ease-in-out infinite" }}>
      <div style={{ position: "relative", width: hw * 2.2, height: hw * 1.4, filter: "drop-shadow(0 4px 10px rgba(245,158,11,0.65))" }}>
        <MiniHeart style={{ position: "absolute", top: 0, left: 0, animation: "g-pulse 1.6s 0s ease-in-out infinite" }} />
        <MiniHeart style={{ position: "absolute", top: 0, right: 0, animation: "g-pulse 1.6s 0.4s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

function Energy({ s }: { s: number }) {
  const orbs = [
    { r: s * 0.15, delay: "0s",   color: "#a78bfa" },
    { r: s * 0.13, delay: "0.5s", color: "#7c3aed" },
    { r: s * 0.11, delay: "1s",   color: "#c4b5fd" },
  ];
  return (
    <div style={{ width: s, height: s, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Core */}
      <div style={{
        width: s * 0.3, height: s * 0.3, borderRadius: "50%",
        background: "radial-gradient(circle at 38% 38%, #ede9fe, #a78bfa 50%, #4c1d95)",
        boxShadow: "0 0 14px #7c3aedaa, 0 0 30px #7c3aed44",
        animation: "g-glow 1.8s ease-in-out infinite",
        zIndex: 2,
      }} />
      {/* Orbiting rings */}
      {orbs.map((o, i) => (
        <div key={i} style={abs({
          width: s * (0.7 + i * 0.1), height: s * (0.44 + i * 0.06),
          borderRadius: "50%",
          border: `2px solid ${o.color}77`,
          top: "50%", left: "50%",
          transform: `translate(-50%,-50%) rotateX(${65 + i * 8}deg)`,
          animation: `${i % 2 === 0 ? "g-ring" : "g-ring"} ${2.8 + i * 0.5}s ${o.delay} linear infinite`,
          boxShadow: `0 0 6px ${o.color}44`,
        })} />
      ))}
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
const RENDERS: Record<string, (s: number) => React.ReactNode> = {
  rose:      s => <Rose s={s} />,
  heart:     s => <Heart s={s} />,
  bouquet:   s => <Bouquet s={s} />,
  diamond:   s => <Diamond s={s} />,
  ring:      s => <Ring s={s} />,
  crown:     s => <Crown s={s} />,
  balloon:   s => <Balloon s={s} />,
  sparkle:   s => <Sparkle s={s} />,
  chocolate: s => <Chocolate s={s} />,
  bear:      s => <Kiss s={s} />,
  star:      s => <Love s={s} />,
  butterfly: s => <Energy s={s} />,
};

export default function Gift3D({ id, size = 48 }: { id: string; size?: number }) {
  useEffect(() => { injectCSS(); }, []);
  const render = RENDERS[id];
  if (!render) return null;
  return (
    <div style={{ width: size, height: size, flexShrink: 0 }}>
      {render(size)}
    </div>
  );
}
