import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Send, Lock, Star, MoreVertical, Flag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SafeUser, Message, MatchWithUser } from "@shared/schema";
import ReportModal from "@/components/ReportModal";

interface Props {
  user: SafeUser;
  matchId: string;
}

export default function ChatPage({ user, matchId }: Props) {
  const [, setLocation] = useLocation();
  const [text, setText] = useState("");
  const [showReport, setShowReport] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    const waitingCount = messages.filter(m => m.senderId !== user.id).length;
    return (
      <div className="flex flex-col h-screen" style={{ background: "#0d0618" }}>
        <div
          className="flex items-center gap-3 px-4 pt-12 pb-3"
          style={{ background: "rgba(13,6,24,0.97)", borderBottom: "1px solid rgba(201,168,76,0.15)" }}
        >
          <button
            onClick={() => setLocation("/matches")}
            data-testid="button-back"
            className="text-cream/60"
          >
            <ArrowLeft size={22} />
          </button>
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-serif text-lg font-bold text-gold overflow-hidden"
            style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)", border: "2px solid rgba(201,168,76,0.3)" }}
          >
            {otherUser?.photos && otherUser.photos.length > 0 ? (
              <img src={otherUser.photos[0]} alt={otherUser.fullName} className="w-full h-full object-cover" />
            ) : (
              otherUser?.fullName.charAt(0)
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
            <button
              onClick={() => setShowReport(true)}
              data-testid="button-report-user"
              className="p-2 rounded-xl"
              style={{ color: "rgba(253,248,240,0.35)" }}
              title="Report user"
            >
              <Flag size={18} />
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: "rgba(245,158,11,0.1)", border: "2px solid rgba(245,158,11,0.3)" }}
          >
            <Lock size={36} color="#f59e0b" />
          </div>
          <div>
            <h3 className="font-serif text-2xl text-gold mb-2">
              {waitingCount > 0 ? `${waitingCount} Nachricht${waitingCount !== 1 ? "en" : ""} warten` : "Nachrichten gesperrt"}
            </h3>
            <p className="text-cream/50 text-sm leading-relaxed">
              Wechsle zu Premium, um alle Nachrichten zu lesen und zu senden.
            </p>
          </div>
          <button
            onClick={() => setLocation("/premium")}
            data-testid="button-upgrade-chat"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "white", boxShadow: "0 8px 24px rgba(245,158,11,0.3)" }}
          >
            <Star size={17} fill="white" />
            Premium — $5/Monat
          </button>
          <button
            onClick={() => setLocation("/matches")}
            className="text-cream/40 text-sm"
          >
            Zurück zu Matches
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
            <img src={otherUser.photos[0]} alt={otherUser.fullName} className="w-full h-full object-cover" />
          ) : (
            otherUser?.fullName.charAt(0)
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
          <button
            onClick={() => setShowReport(true)}
            data-testid="button-report-user-main"
            className="p-2 rounded-xl"
            style={{ color: "rgba(253,248,240,0.35)" }}
            title="Report user"
          >
            <Flag size={18} />
          </button>
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
            placeholder="Send a message…"
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
          reportedUserName={otherUser.fullName}
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
