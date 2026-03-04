import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Send, Lock, Star, Flag, Video, Gift } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import type { SafeUser, Message, MatchWithUser, Gift as GiftType } from "@shared/schema";
import ReportModal from "@/components/ReportModal";
import ProtectedPhoto from "@/components/ProtectedPhoto";
import { useVideoCallContext } from "@/hooks/useVideoCall";
import LottieAnimation from "@/components/LottieAnimation";

interface Props {
  user: SafeUser;
  matchId: string;
}

// ─── Gift catalogue ────────────────────────────────────────────────────────
export const GIFTS = [
  { id: "rose",      lottie: "/lottie/rose.json",            name: "Rose",       color: "#e83e6c" },
  { id: "butterfly", lottie: "/lottie/butterfly.json",       name: "Butterfly",  color: "#7b3fa0" },
  { id: "diamond",   lottie: "/lottie/add-to-favorites.json",name: "Favourite",  color: "#f59e0b" },
  { id: "crown",     lottie: "/lottie/valentines.json",      name: "Valentine",  color: "#c9a84c" },
  { id: "balloon",   lottie: "/lottie/butterfly-hearts.json",name: "Butterfly ♥",color: "#f97316" },
  { id: "sparkle",   lottie: "/lottie/celebration.json",     name: "Celebrate",  color: "#c9a84c" },
  { id: "bear",      lottie: "/lottie/cat-kiss.json",        name: "Kiss",       color: "#c9a84c" },
  { id: "birds",     lottie: "/lottie/bird-pair.json",       name: "Birds",      color: "#67e8f9" },
  { id: "garden",    lottie: "/lottie/couple-garden.json",   name: "Garden",     color: "#22c55e" },
  { id: "ring",      lottie: "/lottie/rose2.json",           name: "Rose ♥",     color: "#a855f7" },
  { id: "unbox",     lottie: "/lottie/gift-unbox.json",      name: "Surprise",   color: "#c9a84c" },
];

function giftById(id: string) {
  return GIFTS.find(g => g.id === id) ?? { id, lottie: null as string | null, name: "Gift", color: "#c9a84c" };
}

// ─── Merged timeline item ─────────────────────────────────────────────────
type TimelineItem =
  | { kind: "message"; data: Message }
  | { kind: "gift";    data: GiftType };

function mergeTimeline(messages: Message[], gifts: GiftType[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...messages.map(m => ({ kind: "message" as const, data: m })),
    ...gifts.map(g => ({ kind: "gift" as const, data: g })),
  ];
  items.sort((a, b) => {
    const ta = new Date(a.data.createdAt!).getTime();
    const tb = new Date(b.data.createdAt!).getTime();
    return ta - tb;
  });
  return items;
}

// ─── ChatPage ─────────────────────────────────────────────────────────────
export default function ChatPage({ user, matchId }: Props) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { startCall, callState } = useVideoCallContext();

  const { data: matchData } = useQuery<{ matches: MatchWithUser[] }>({
    queryKey: ["/api/matches"],
  });

  const match = matchData?.matches?.find(m => m.id === matchId);
  const otherUser = match?.otherUser;

  const { data: msgData, isLoading } = useQuery<{ messages: Message[] }>({
    queryKey: ["/api/messages", matchId],
    refetchInterval: 5000,
    enabled: !!user.isPremium,
  });

  const { data: giftData } = useQuery<{ gifts: GiftType[] }>({
    queryKey: ["/api/gifts/match", matchId],
    refetchInterval: 10000,
    enabled: !!user.isPremium,
  });

  const messages = msgData?.messages ?? [];
  const gifts = giftData?.gifts ?? [];
  const timeline = mergeTimeline(messages, gifts);

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

  const giftMutation = useMutation({
    mutationFn: async ({ giftType, message }: { giftType: string; message: string }) => {
      const res = await apiRequest("POST", "/api/gifts", {
        recipientId: otherUser!.id,
        matchId,
        giftType,
        message,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gifts/match", matchId] });
      setShowGiftPicker(false);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline.length]);

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
        <div className="flex items-center gap-3 px-4 pt-12 pb-3"
          style={{ background: "rgba(13,6,24,0.97)", borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
          <button onClick={() => setLocation("/matches")} data-testid="button-back" className="text-cream/60">
            <ArrowLeft size={22} />
          </button>
          <div className="relative w-10 h-10 flex-shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden"
              style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)", filter: "blur(4px)", border: "2px solid rgba(201,168,76,0.2)" }}>
              {otherUser?.photos?.[0] && <ProtectedPhoto src={otherUser.photos[0]} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="absolute inset-0 rounded-full flex items-center justify-center"><Lock size={13} color="#c9a84c" /></div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-cream/30 font-semibold text-sm" data-testid="text-chat-name">{t("chat.hiddenMember")}</h2>
            <p className="text-cream/25 text-xs">{t("chat.hiddenSub")}</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: "rgba(201,168,76,0.08)", border: "2px solid rgba(201,168,76,0.25)" }}>
            <Lock size={36} color="#c9a84c" />
          </div>
          <div>
            <h3 className="font-serif text-2xl text-gold mb-2">{t("chat.locked")}</h3>
            <p className="text-cream/50 text-sm leading-relaxed max-w-xs">{t("chat.lockedDesc")}</p>
          </div>
          <div className="w-full max-w-xs space-y-2">
            {[t("chat.benefitMessages"), t("chat.benefitMatches"), t("chat.benefitCalls")].map((b, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.12)" }}>
                <Star size={13} fill="#c9a84c" color="#c9a84c" className="flex-shrink-0" />
                <span className="text-cream/60 text-xs">{b}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setLocation("/premium")} data-testid="button-upgrade-chat"
            className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 8px 24px rgba(201,168,76,0.3)" }}>
            <Star size={17} fill="#1a0a2e" color="#1a0a2e" />
            {t("chat.upgradeButton")}
          </button>
          <button onClick={() => setLocation("/matches")} className="text-cream/35 text-sm">{t("chat.backToMatches")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: "#0d0618" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3"
        style={{ background: "rgba(13,6,24,0.97)", borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
        <button onClick={() => setLocation("/matches")} data-testid="button-back" className="text-cream/60">
          <ArrowLeft size={22} />
        </button>
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-serif text-lg font-bold text-gold overflow-hidden"
          style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)", border: "2px solid rgba(201,168,76,0.3)" }}>
          {otherUser?.photos && otherUser.photos.length > 0
            ? <ProtectedPhoto src={otherUser.photos[0]} alt={otherUser.firstName ?? ""} className="w-full h-full object-cover" />
            : (otherUser?.firstName ?? otherUser?.fullName?.split(" ")[0] ?? "M").charAt(0)
          }
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-cream font-semibold text-sm" data-testid="text-chat-name">
            {otherUser?.firstName ?? otherUser?.fullName?.split(" ")[0] ?? "Loading…"}
          </h2>
          <p className="text-cream/40 text-xs">
            {otherUser ? `${otherUser.city}${otherUser.state ? `, ${otherUser.state}` : ""}, ${otherUser.country}` : ""}
          </p>
        </div>
        {otherUser && (
          <div className="flex items-center gap-1">
            <button onClick={() => startCall(matchId, otherUser.id,
              otherUser.firstName ?? otherUser.fullName?.split(" ")[0] ?? "Member",
              otherUser.photos?.[0] ?? null,
              user.firstName ?? user.fullName?.split(" ")[0] ?? "Member",
              user.photos?.[0] ?? null,
            )} disabled={callState !== "idle"} data-testid="button-start-video-call"
              className="p-2 rounded-xl disabled:opacity-40 transition-all"
              style={{ color: callState !== "idle" ? "rgba(201,168,76,0.4)" : "rgba(201,168,76,0.8)" }}>
              <Video size={20} />
            </button>
            <button onClick={() => setShowReport(true)} data-testid="button-report-user-main"
              className="p-2 rounded-xl" style={{ color: "rgba(253,248,240,0.35)" }}>
              <Flag size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : timeline.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-12 px-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ border: "2px solid rgba(201,168,76,0.3)" }}>
              <span className="text-2xl text-gold font-serif">✦</span>
            </div>
            <div>
              <p className="text-cream/60 text-sm font-medium mb-1">
                {t("chat.matchedWith")} <strong className="text-gold">{otherUser?.firstName ?? otherUser?.fullName?.split(" ")[0]}</strong>!
              </p>
              <p className="text-cream/30 text-xs">{t("chat.breakIcePrompt")}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-xs">
              {([
                t("chat.icebreaker1"),
                t("chat.icebreaker2"),
                t("chat.icebreaker3"),
                t("chat.icebreaker4"),
                t("chat.icebreaker5"),
              ] as string[]).map((msg) => (
                <button
                  key={msg}
                  data-testid={`icebreaker-${msg.slice(0, 10).replace(/\s/g, "-").toLowerCase()}`}
                  onClick={() => sendMutation.mutate(msg)}
                  disabled={sendMutation.isPending}
                  className="px-3 py-2 rounded-full text-xs font-medium transition-all disabled:opacity-50"
                  style={{
                    background: "rgba(201,168,76,0.1)",
                    border: "1px solid rgba(201,168,76,0.3)",
                    color: "rgba(253,248,240,0.75)",
                  }}
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>
        ) : (
          timeline.map(item =>
            item.kind === "message"
              ? <MessageBubble key={`m-${item.data.id}`} msg={item.data} isMine={item.data.senderId === user.id} />
              : <GiftBubble key={`g-${item.data.id}`} gift={item.data} isMine={item.data.senderId === user.id} />
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex items-end gap-2 px-4 py-3"
        style={{ background: "rgba(13,6,24,0.97)", borderTop: "1px solid rgba(201,168,76,0.15)" }}>
        {/* Gift button */}
        <button
          onClick={() => setShowGiftPicker(true)}
          data-testid="button-open-gift-picker"
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
          style={{ background: "rgba(201,168,76,0.1)", border: "1.5px solid rgba(201,168,76,0.25)", color: "#c9a84c" }}
          title="Send a gift"
        >
          <Gift size={18} />
        </button>

        <div className="flex-1 rounded-2xl px-4 py-2.5 flex items-end"
          style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.2)" }}>
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

      {/* Gift picker */}
      {showGiftPicker && otherUser && (
        <GiftPicker
          recipientName={otherUser.firstName ?? otherUser.fullName?.split(" ")[0] ?? "them"}
          isPending={giftMutation.isPending}
          onSend={(giftType, message) => giftMutation.mutate({ giftType, message })}
          onClose={() => setShowGiftPicker(false)}
        />
      )}

      {showReport && otherUser && (
        <ReportModal
          reportedUserId={otherUser.id}
          reportedUserName={otherUser.firstName ?? otherUser.fullName?.split(" ")[0] ?? "Member"}
          onClose={() => setShowReport(false)}
          onBlocked={() => { setShowReport(false); setLocation("/matches"); }}
        />
      )}
    </div>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  const timeLabel = formatDistanceToNow(new Date(msg.createdAt!), { addSuffix: true });
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[72%] px-4 py-2.5 rounded-2xl"
        style={isMine
          ? { background: "linear-gradient(135deg, #5a2080, #7b3fa0)", borderBottomRightRadius: "4px" }
          : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(201,168,76,0.15)", borderBottomLeftRadius: "4px" }
        }
        data-testid={`message-bubble-${msg.id}`}>
        <p className="text-cream text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
        <span className="block text-[10px] mt-1 text-right opacity-50"
          style={{ color: isMine ? "rgba(253,248,240,0.6)" : "rgba(253,248,240,0.4)" }}>
          {timeLabel}
        </span>
      </div>
    </div>
  );
}

// ─── Gift bubble ────────────────────────────────────────────────────────────
function GiftBubble({ gift, isMine }: { gift: GiftType; isMine: boolean }) {
  const g = giftById(gift.giftType);
  const timeLabel = formatDistanceToNow(new Date(gift.createdAt!), { addSuffix: true });
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className="flex flex-col items-center gap-2 max-w-[190px]" data-testid={`gift-bubble-${gift.id}`}>
        {/* Gift card */}
        <div
          className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl w-full"
          style={{ background: "#0d0618" }}
        >
          {/* Lottie animation */}
          <div style={{ width: 80, height: 80 }}>
            {g.lottie
              ? <LottieAnimation src={g.lottie} loop autoplay style={{ width: "100%", height: "100%" }} />
              : <span className="text-5xl">🎁</span>
            }
          </div>
        </div>
        {/* Message + timestamp outside the card */}
        <div className="text-center px-1">
          {gift.message && (
            <p className="text-cream/55 text-xs leading-snug italic mb-1">"{gift.message}"</p>
          )}
          <p className="text-cream/25 text-[10px]">{isMine ? "You sent" : "Sent you"} a {g.name.toLowerCase()} · {timeLabel}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Gift picker ───────────────────────────────────────────────────────────
function GiftPicker({ recipientName, isPending, onSend, onClose }: {
  recipientName: string;
  isPending: boolean;
  onSend: (giftType: string, message: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
      data-testid="gift-picker"
    >
      <div className="w-full max-w-sm flex flex-col rounded-t-3xl" style={{ background: "#130820", border: "1px solid rgba(201,168,76,0.2)", maxHeight: "80vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
          <div>
            <h3 className="font-serif text-lg text-gold">Send a Gift</h3>
            <p className="text-cream/40 text-xs mt-0.5">to {recipientName}</p>
          </div>
          <button onClick={onClose} className="text-cream/40 text-lg leading-none" data-testid="button-close-gift-picker">✕</button>
        </div>

        {/* Gift grid */}
        <div className="overflow-y-auto px-4 py-4 flex-1">
          <div className="grid grid-cols-4 gap-3 mb-4">
            {GIFTS.map(g => {
              const isSelected = selected === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelected(g.id === selected ? null : g.id)}
                  data-testid={`gift-option-${g.id}`}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl transition-all"
                  style={{
                    background: "#0d0618",
                    transform: isSelected ? "scale(1.1) translateY(-2px)" : "scale(1)",
                  }}
                >
                  <div style={{ width: 60, height: 60 }}>
                    {g.lottie
                      ? <LottieAnimation src={g.lottie} loop autoplay style={{ width: "100%", height: "100%" }} />
                      : <span className="text-3xl">🎁</span>
                    }
                  </div>
                </button>
              );
            })}
          </div>

          {/* Optional message */}
          {selected && (
            <div className="mb-4">
              <p className="text-cream/40 text-xs font-semibold uppercase tracking-wider mb-2">Add a message <span className="normal-case tracking-normal text-cream/25">(optional)</span></p>
              <input
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Write something sweet…"
                maxLength={200}
                data-testid="input-gift-message"
                className="w-full px-4 py-3 rounded-2xl text-sm text-cream placeholder-cream/25 outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(201,168,76,0.2)" }}
              />
            </div>
          )}

          {/* Send button */}
          <button
            onClick={() => selected && onSend(selected, message)}
            disabled={!selected || isPending}
            data-testid="button-send-gift"
            className="relative w-full py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-40 overflow-hidden"
            style={selected ? {
              background: `radial-gradient(ellipse at 30% 30%, ${giftById(selected!).color}ee 0%, ${giftById(selected!).color}99 60%, ${giftById(selected!).color}cc 100%)`,
              color: "white",
              boxShadow: `0 6px 20px ${giftById(selected!).color}55, 0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.25)`,
            } : {
              background: "rgba(255,255,255,0.06)",
              color: "rgba(253,248,240,0.3)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {selected && (
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.2) 0%, transparent 50%)", borderRadius: "inherit" }} />
            )}
            <span className="relative z-10">
              {isPending ? "Sending…" : selected ? `Send ${giftById(selected).name}` : "Select a gift"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
