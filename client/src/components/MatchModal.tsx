import newLogo from "@assets/IMG_1777_1777566688564.jpeg";
import { useEffect, useRef } from "react";
import { MessageCircle, X } from "lucide-react";
import { useLocation } from "wouter";
import type { SafeUser } from "@shared/schema";
import ProtectedPhoto from "@/components/ProtectedPhoto";

interface MatchModalProps {
  matchedUser: SafeUser;
  currentUser: SafeUser;
  matchId: string;
  onClose: () => void;
}

const CONFETTI_COLORS = [
  "#c9a84c", "#e8c97a", "#7b3fa0", "#d4608a",
  "#10b981", "#fdf8f0", "#ff6b6b", "#4ecdc4", "#ffe066", "#a78bfa",
];

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const pieces = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 300,
      w: 5 + Math.random() * 9,
      h: 3 + Math.random() * 5,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.18,
      dx: (Math.random() - 0.5) * 1.8,
      dy: 2.2 + Math.random() * 2.8,
      opacity: 0.75 + Math.random() * 0.25,
      shape: Math.random() < 0.4 ? "circle" : "rect",
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.y += p.dy;
        p.x += p.dx;
        p.rotation += p.rotSpeed;
        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}

function FireworksCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      alpha: number; decay: number;
      color: string; size: number;
    };

    const particles: Particle[] = [];

    const burst = (x: number, y: number) => {
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const count = 28 + Math.floor(Math.random() * 18);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const speed = 2.5 + Math.random() * 3.5;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          decay: 0.012 + Math.random() * 0.014,
          color,
          size: 2 + Math.random() * 2.5,
        });
      }
    };

    const schedule = () => {
      const x = canvas.width * (0.1 + Math.random() * 0.8);
      const y = canvas.height * (0.08 + Math.random() * 0.55);
      burst(x, y);
      setTimeout(schedule, 600 + Math.random() * 900);
    };

    burst(canvas.width * 0.2, canvas.height * 0.25);
    burst(canvas.width * 0.8, canvas.height * 0.2);
    burst(canvas.width * 0.5, canvas.height * 0.35);
    setTimeout(schedule, 400);

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06;
        p.vx *= 0.98;
        p.alpha -= p.decay;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

function GlowAvatar({ user }: { user: SafeUser }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: 88, height: 88 }}>
      {/* Outer pulsing glow ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "transparent",
          border: "3px solid #c9a84c",
          boxShadow: "0 0 0 0 rgba(201,168,76,0.7)",
          animation: "glow-pulse 1.8s ease-in-out infinite",
          borderRadius: "50%",
        }}
      />
      {/* Inner gold ring */}
      <div
        className="absolute rounded-full overflow-hidden flex items-center justify-center font-serif text-3xl font-bold text-gold"
        style={{
          inset: 3,
          background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)",
          border: "2.5px solid rgba(201,168,76,0.9)",
          boxShadow: "0 0 20px rgba(201,168,76,0.55), 0 0 40px rgba(201,168,76,0.25)",
        }}
      >
        {user.photos && user.photos.length > 0 ? (
          <ProtectedPhoto src={user.photos[0]} alt={user.fullName ?? ""} className="w-full h-full object-cover" />
        ) : (
          (user.fullName ?? user.firstName ?? "M").charAt(0)
        )}
      </div>
    </div>
  );
}

export default function MatchModal({ matchedUser, currentUser, matchId, onClose }: MatchModalProps) {
  const [, setLocation] = useLocation();

  const handleChat = () => {
    onClose();
    setLocation(`/chat/${matchId}`);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)" }}
      data-testid="match-modal"
    >
      {/* Keyframe injection */}
      <style>{`
        @keyframes glow-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(201,168,76,0.8), 0 0 12px rgba(201,168,76,0.5); }
          50%  { box-shadow: 0 0 0 10px rgba(201,168,76,0), 0 0 30px rgba(201,168,76,0.6); }
          100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.0), 0 0 12px rgba(201,168,76,0.5); }
        }
        @keyframes logo-bounce {
          0%, 100% { transform: scale(1) translateY(0); }
          50%       { transform: scale(1.1) translateY(-4px); }
        }
      `}</style>

      {/* Fireworks layer — behind everything */}
      <FireworksCanvas />

      {/* Confetti layer — above fireworks, below card */}
      <ConfettiCanvas />

      {/* Modal card */}
      <div
        className="relative w-full max-w-sm rounded-3xl p-8 text-center"
        style={{
          background: "linear-gradient(160deg, #2d0f4a, #1a0a2e)",
          border: "1px solid rgba(201,168,76,0.35)",
          boxShadow: "0 0 60px rgba(123,63,160,0.5), 0 0 120px rgba(201,168,76,0.15)",
          zIndex: 2,
        }}
      >
        <button
          onClick={onClose}
          data-testid="button-close-modal"
          className="absolute top-4 right-4 z-10"
          style={{ color: "rgba(253,248,240,0.4)" }}
        >
          <X size={20} />
        </button>

        {/* Photos row */}
        <div className="flex justify-center items-center gap-5 mb-6">
          <GlowAvatar user={currentUser} />

          {/* Gûstîlk logo centrepiece */}
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{ animation: "logo-bounce 2s ease-in-out infinite" }}
          >
            <img
              src={newLogo}
              alt="Gûstîlk"
              style={{
                width: 48,
                height: 48,
                filter: "drop-shadow(0 0 10px rgba(201,168,76,0.9)) drop-shadow(0 0 24px rgba(201,168,76,0.5))",
              }}
            />
          </div>

          <GlowAvatar user={matchedUser} />
        </div>

        <h2 className="font-serif text-3xl font-bold text-gold mb-2" style={{ textShadow: "0 0 20px rgba(201,168,76,0.5)" }}>
          It's a Match!
        </h2>
        <p className="text-cream/60 text-sm mb-6">
          You and{" "}
          <span className="text-gold font-semibold">
            {matchedUser.fullName ?? matchedUser.firstName ?? "your match"}
          </span>{" "}
          have liked each other
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleChat}
            data-testid="button-send-message"
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
          >
            <MessageCircle size={18} />
            Send a Message
          </button>
          <button
            onClick={onClose}
            data-testid="button-keep-swiping"
            className="py-3 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(253,248,240,0.6)", border: "1px solid rgba(201,168,76,0.2)" }}
          >
            Keep Discovering
          </button>
        </div>
      </div>
    </div>
  );
}
