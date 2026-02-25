import { Heart, MessageCircle, X } from "lucide-react";
import { useLocation } from "wouter";
import type { SafeUser } from "@shared/schema";

interface MatchModalProps {
  matchedUser: SafeUser;
  matchId: string;
  onClose: () => void;
}

export default function MatchModal({ matchedUser, matchId, onClose }: MatchModalProps) {
  const [, setLocation] = useLocation();

  const handleChat = () => {
    onClose();
    setLocation(`/chat/${matchId}`);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      data-testid="match-modal"
    >
      <div
        className="relative w-full max-w-sm rounded-3xl p-8 text-center animate-slide-up"
        style={{ background: "linear-gradient(160deg, #2d0f4a, #1a0a2e)", border: "1px solid rgba(201,168,76,0.3)" }}
      >
        <button
          onClick={onClose}
          data-testid="button-close-modal"
          className="absolute top-4 right-4 text-cream/40 transition-colors"
          style={{ color: "rgba(253,248,240,0.4)" }}
        >
          <X size={20} />
        </button>

        <div className="flex justify-center mb-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse-ring"
            style={{ border: "2px solid #c9a84c" }}
          >
            <Heart size={36} fill="#c9a84c" color="#c9a84c" />
          </div>
        </div>

        <h2 className="font-serif text-3xl font-bold text-gold mb-2">It's a Match!</h2>
        <p className="text-cream/60 text-sm mb-6">
          You and <span className="text-gold font-semibold">{matchedUser.fullName}</span> have liked each other
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
