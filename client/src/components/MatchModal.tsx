import { MessageCircle, X } from "lucide-react";
import { useLocation } from "wouter";
import type { SafeUser } from "@shared/schema";
import ProtectedPhoto from "@/components/ProtectedPhoto";
import LottieAnimation from "@/components/LottieAnimation";

interface MatchModalProps {
  matchedUser: SafeUser;
  currentUser: SafeUser;
  matchId: string;
  onClose: () => void;
}

function Avatar({ user }: { user: SafeUser }) {
  return (
    <div
      className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center font-serif text-3xl font-bold text-gold flex-shrink-0"
      style={{
        background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)",
        border: "3px solid rgba(201,168,76,0.6)",
        boxShadow: "0 0 24px rgba(201,168,76,0.25)",
      }}
    >
      {user.photos && user.photos.length > 0 ? (
        <ProtectedPhoto src={user.photos[0]} alt={user.fullName ?? ""} className="w-full h-full object-cover" />
      ) : (
        (user.fullName ?? user.firstName ?? "M").charAt(0)
      )}
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
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      data-testid="match-modal"
    >
      {/* Full-screen celebration confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <LottieAnimation
          src="/lottie/celebration.json"
          loop
          autoplay
          style={{ width: "100%", height: "100%", opacity: 0.7 }}
        />
      </div>

      <div
        className="relative w-full max-w-sm rounded-3xl p-8 text-center"
        style={{ background: "linear-gradient(160deg, #2d0f4a, #1a0a2e)", border: "1px solid rgba(201,168,76,0.3)" }}
      >
        <button
          onClick={onClose}
          data-testid="button-close-modal"
          className="absolute top-4 right-4 z-10"
          style={{ color: "rgba(253,248,240,0.4)" }}
        >
          <X size={20} />
        </button>

        <div className="flex justify-center items-center gap-4 mb-6">
          <Avatar user={currentUser} />
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12">
              <LottieAnimation src="/lottie/valentine-hearts.json" loop autoplay style={{ width: "100%", height: "100%" }} />
            </div>
          </div>
          <Avatar user={matchedUser} />
        </div>

        <h2 className="font-serif text-3xl font-bold text-gold mb-2">It's a Match!</h2>
        <p className="text-cream/60 text-sm mb-6">
          You and <span className="text-gold font-semibold">{matchedUser.fullName ?? matchedUser.firstName ?? "your match"}</span> have liked each other
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
