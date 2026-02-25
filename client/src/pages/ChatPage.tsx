import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Send, Lock, Star, Flag, Video } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import type { SafeUser, Message, MatchWithUser } from "@shared/schema";
import ReportModal from "@/components/ReportModal";
import { useVideoCallContext } from "@/hooks/useVideoCall";

interface Props {
  user: SafeUser;
  matchId: string;
}

export default function ChatPage({ user, matchId }: Props) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [showReport, setShowReport] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { startCall, callState } = useVideoCallContext();

  const { data: matchData } = useQuery<{ matches: MatchWithUser[] }>({
    queryKey: ["/api/matches"],
  });

  const match = matchData?.matches?.find(m => m.id === matchId);
  const otherUser = match?.otherUser;

  const { data: msgData, isLoading } = useQuery<{ messages: Message[] }>({
    queryKey: ["/api/messages", matchId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${matchId}`, { credentials: "include" });
      return res.json();
    },
    refetchInterval: 5000,
    enabled: !!user.isPremium,
  });

  const messages = msgData?.messages ?? [];

  const sendMutation = useMutation({
    mutationFn: async (txt: string) => {
      const res = await apiRequest("POST", `/api/messages/${matchId}`, { text: txt });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", matchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      setText("");
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user.isPremium) {
    return (
      <div className="flex flex-col h-screen" style={{ background: "#0d0618" }}>
        {/* Header — back button only, no identity revealed */}
        <div className="flex items-center gap-3 px-4 pt-12 pb-3"
          style={{ background: "rgba(13,6,24,0.97)", borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
          <button onClick={() => setLocation("/matches")} data-testid="button-back" className="text-cream/60">
            <ArrowLeft size={22} />
          </button>
          {/* Blurred avatar — identity hidden */}
          <div className="relative w-10 h-10 flex-shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden"
              style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)", filter: "blur(4px)", border: "2px solid rgba(201,168,76,0.2)" }}>
              {otherUser?.photos?.[0] && (
                <img src={otherUser.photos[0]} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="absolute inset-0 rounded-full flex items-center justify-center">
              <Lock size={13} color="#c9a84c" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-cream/30 font-semibold text-sm" data-testid="text-chat-name">
              {t("chat.hiddenMember")}
            </h2>
            <p className="text-cream/25 text-xs">{t("chat.hiddenSub")}</p>
          </div>
        </div>

        {/* Lock screen body */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: "rgba(201,168,76,0.08)", border: "2px solid rgba(201,168,76,0.25)" }}>
            <Lock size={36} color="#c9a84c" />
          </div>

          <div>
            <h3 className="font-serif text-2xl text-gold mb-2">{t("chat.locked")}</h3>
            <p className="text-cream/50 text-sm leading-relaxed max-w-xs">
              {t("chat.lockedDesc")}
            </p>
          </div>

          <div className="w-full max-w-xs space-y-2">
            {[
              t("chat.benefitMessages"),
              t("chat.benefitMatches"),
              t("chat.benefitCalls"),
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.12)" }}>
                <Star size={13} fill="#c9a84c" color="#c9a84c" className="flex-shrink-0" />
                <span className="text-cream/60 text-xs">{benefit}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setLocation("/premium")}
            data-testid="button-upgrade-chat"
            className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 8px 24px rgba(201,168,76,0.3)" }}
          >
            <Star size={17} fill="#1a0a2e" color="#1a0a2e" />
            {t("chat.upgradeButton")}
          </button>

          <button onClick={() => setLocation("/matches")} className="text-cream/35 text-sm">
            {t("chat.backToMatches")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: "#0d0618" }}>
      <div
        className="flex items-center gap-3 px-4 pt-12 pb-3"
        style={{ background: "rgba(13,6,24,0.97)", borderBottom: "1px solid rgba(201,168,76,0.15)" }}
      >
        <button
          onClick={() => setLocation("/matches")}
          data-testid="button-back"
          className="text-cream/60 transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        <div
          className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-serif text-lg font-bold text-gold overflow-hidden"
          style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)", border: "2px solid rgba(201,168,76,0.3)" }}
        >
          {otherUser?.photos && otherUser.photos.length > 0 ? (
            <img src={otherUser.photos[0]} alt={otherUser.fullName ?? ""} className="w-full h-full object-cover" />
          ) : (
            (otherUser?.fullName ?? otherUser?.firstName ?? "M").charAt(0)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-cream font-semibold text-sm" data-testid="text-chat-name">
            {otherUser?.fullName ?? "Loading…"}
          </h2>
          <p className="text-cream/40 text-xs">
            {otherUser ? `${otherUser.city}, ${otherUser.country}` : ""}
          </p>
        </div>
        {otherUser && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => startCall(
                matchId,
                otherUser.id,
                otherUser.fullName ?? otherUser.firstName ?? "Member",
                otherUser.photos?.[0] ?? null,
                user.fullName ?? user.firstName ?? "Member",
                user.photos?.[0] ?? null,
              )}
              disabled={callState !== "idle"}
              data-testid="button-start-video-call"
              className="p-2 rounded-xl disabled:opacity-40 transition-all"
              style={{ color: callState !== "idle" ? "rgba(201,168,76,0.4)" : "rgba(201,168,76,0.8)" }}
              title="Video call"
            >
              <Video size={20} />
            </button>
            <button
              onClick={() => setShowReport(true)}
              data-testid="button-report-user-main"
              className="p-2 rounded-xl"
              style={{ color: "rgba(253,248,240,0.35)" }}
              title="Report user"
            >
              <Flag size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-12">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ border: "2px solid rgba(201,168,76,0.3)" }}
            >
              <span className="text-2xl text-gold font-serif">✦</span>
            </div>
            <p className="text-cream/40 text-sm">You matched! Say hello to <strong className="text-gold">{otherUser?.fullName}</strong></p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} isMine={msg.senderId === user.id} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div
        className="flex items-end gap-3 px-4 py-3"
        style={{ background: "rgba(13,6,24,0.97)", borderTop: "1px solid rgba(201,168,76,0.15)" }}
      >
        <div
          className="flex-1 rounded-2xl px-4 py-2.5 flex items-end"
          style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.2)" }}
        >
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.placeholder")}
            rows={1}
            data-testid="input-message"
            className="w-full bg-transparent text-cream text-sm outline-none resize-none placeholder-cream/25 leading-relaxed"
            style={{ maxHeight: "120px" }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          data-testid="button-send"
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #7b3fa0, #d4608a)" }}
        >
          <Send size={18} color="white" />
        </button>
      </div>

      {showReport && otherUser && (
        <ReportModal
          reportedUserId={otherUser.id}
          reportedUserName={otherUser.fullName ?? otherUser.firstName ?? "Member"}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

function MessageBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  const timeLabel = formatDistanceToNow(new Date(msg.createdAt!), { addSuffix: true });

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[72%] px-4 py-2.5 rounded-2xl"
        style={isMine
          ? { background: "linear-gradient(135deg, #5a2080, #7b3fa0)", borderBottomRightRadius: "4px" }
          : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(201,168,76,0.15)", borderBottomLeftRadius: "4px" }
        }
        data-testid={`message-bubble-${msg.id}`}
      >
        <p className="text-cream text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
        <span className="block text-[10px] mt-1 text-right opacity-50" style={{ color: isMine ? "rgba(253,248,240,0.6)" : "rgba(253,248,240,0.4)" }}>
          {timeLabel}
        </span>
      </div>
    </div>
  );
}
