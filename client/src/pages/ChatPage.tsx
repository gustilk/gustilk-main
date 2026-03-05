import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Send, Lock, Star, Flag, Video, Gift, ChevronRight } from "lucide-react";
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
  { id: "rose",         lottie: "/lottie/rose.json",              name: "Rose",         color: "#e83e6c" },
  { id: "butterfly",    lottie: "/lottie/butterfly.json",          name: "Butterfly",    color: "#7b3fa0" },
  { id: "diamond",      lottie: "/lottie/add-to-favorites.json",  name: "Favourite",    color: "#f59e0b" },
  { id: "crown",        lottie: "/lottie/valentines.json",         name: "Valentine",    color: "#c9a84c" },
  { id: "balloon",      lottie: "/lottie/butterfly-hearts.json",   name: "Butterfly ♥", color: "#f97316" },
  { id: "sparkle",      lottie: "/lottie/celebration.json",        name: "Celebrate",   color: "#c9a84c" },
  { id: "birds",        lottie: "/lottie/bird-pair.json",          name: "Birds",       color: "#67e8f9" },
  { id: "garden",       lottie: "/lottie/couple-garden.json",      name: "Garden",      color: "#22c55e" },
  { id: "ring",         lottie: "/lottie/rose2.json",              name: "Rose ♥",      color: "#a855f7" },
  { id: "unbox",        lottie: "/lottie/gift-unbox.json",         name: "Surprise",    color: "#c9a84c" },
  { id: "heart-pulse",  lottie: "/lottie/heart-pulse.json",        name: "Heart",       color: "#ef4444" },
  { id: "filling-heart",lottie: "/lottie/filling-heart.json",      name: "Full Heart",  color: "#e83e6c" },
  { id: "heart-kiss",   lottie: "/lottie/heart-kiss.json",         name: "Flying Kiss", color: "#d4608a" },
  { id: "heart-cry",    lottie: "/lottie/heart-crying.json",       name: "Heart Cry",   color: "#7b3fa0" },
  { id: "broken-heart", lottie: "/lottie/broken-heart-2.json",     name: "Broken",      color: "#6366f1" },
  { id: "cute-broken",  lottie: "/lottie/cute-broken-heart.json",  name: "Oops",        color: "#a855f7" },
  { id: "diamond-gem",  lottie: "/lottie/diamond-gem.json",        name: "Diamond",     color: "#67e8f9" },
  { id: "engagement",   lottie: "/lottie/engagement-ring.json",    name: "Ring",        color: "#c9a84c" },
  { id: "flower-grow",  lottie: "/lottie/flower-growing.json",     name: "Flower",      color: "#22c55e" },
  { id: "girl-face",    lottie: "/lottie/girl-face.json",          name: "Wink",        color: "#d4608a" },
  { id: "love-energy",  lottie: "/lottie/love-energy-2.json",      name: "Love",        color: "#c9a84c" },
  { id: "love-letter",  lottie: "/lottie/love-letter.json",        name: "Letter",      color: "#e83e6c" },
  { id: "pink-gift",    lottie: "/lottie/pink-gift-box.json",      name: "Gift Box",    color: "#d4608a" },
  { id: "val-kiss",     lottie: "/lottie/valentines-kiss-2.json",  name: "Kiss",        color: "#ef4444" },
  { id: "rose-v3",        lottie: "/lottie/rose-v3.json",            name: "Red Rose",       color: "#e83e6c" },
  { id: "daisy",          lottie: "/lottie/daisy.json",              name: "Daisy",          color: "#f59e0b" },
  { id: "finger-heart",   lottie: "/lottie/finger-heart.json",       name: "Finger Heart",   color: "#e83e6c" },
  { id: "fox-hello",      lottie: "/lottie/fox-hello.json",          name: "Fox Hello",      color: "#f97316" },
  { id: "give-bouquet",   lottie: "/lottie/give-bouquet.json",       name: "Give Bouquet",   color: "#22c55e" },
  { id: "gold-crown",     lottie: "/lottie/gold-crown.json",         name: "Gold Crown",     color: "#c9a84c" },
  { id: "hello",          lottie: "/lottie/hello.json",              name: "Hello!",         color: "#d4608a" },
  { id: "multi-bouquet",  lottie: "/lottie/multi-bouquet.json",      name: "Rainbow Bouquet",color: "#a855f7" },
  { id: "heart-face",     lottie: "/lottie/heart-face.json",         name: "Heart Face",     color: "#f59e0b" },
  { id: "rose-leafs",     lottie: "/lottie/rose-leafs.json",         name: "Rose & Leaves",  color: "#e83e6c" },
  { id: "rose-wrapped",   lottie: "/lottie/rose-wrapped.json",       name: "Wrapped Rose",   color: "#d4608a" },
  { id: "yellow-bear",    lottie: "/lottie/yellow-bear.json",        name: "Bear Hello",     color: "#f59e0b" },
  { id: "bird-sticker",   lottie: "/lottie/bird-sticker.json",       name: "Bird",           color: "#67e8f9" },
  { id: "blue-pink-bouquet",lottie:"/lottie/blue-pink-bouquet.json", name: "Pink Bouquet",   color: "#a855f7" },
  { id: "blue-bear",      lottie: "/lottie/blue-bear.json",          name: "Blue Bear",      color: "#6366f1" },
  { id: "blue-gift-box",  lottie: "/lottie/blue-gift-box.json",      name: "Blue Gift",      color: "#4488ff" },
  { id: "blonde-lady",    lottie: "/lottie/blonde-lady.json",        name: "Lady Wave",      color: "#c9a84c" },
  { id: "bouquet",        lottie: "/lottie/bouquet.json",            name: "Bouquet",        color: "#d4608a" },
  { id: "bouquet-hearts", lottie: "/lottie/bouquet-hearts.json",     name: "Heart Bouquet",  color: "#ef4444" },
  { id: "brunette-lady",  lottie: "/lottie/brunette-lady.json",      name: "Lady Wave ♥",   color: "#d4608a" },
  { id: "cat",            lottie: "/lottie/cat.json",                name: "Cat",            color: "#7b3fa0" },
  { id: "pink-lady",      lottie: "/lottie/pink-lady.json",          name: "Lady Wave 💗",   color: "#d4608a" },
  { id: "pink-heart",     lottie: "/lottie/pink-heart.json",         name: "Pink Heart",     color: "#e83e6c" },
  { id: "pink-rose",      lottie: "/lottie/pink-rose.json",          name: "Pink Rose",      color: "#d4608a" },
  { id: "red-rose-sticker",lottie:"/lottie/red-rose-sticker.json",   name: "Red Rose 🌹",    color: "#e83e6c" },
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
    mutationFn: async ({ giftType, message, animationStyle }: { giftType: string; message: string; animationStyle: string }) => {
      const res = await apiRequest("POST", "/api/gifts", {
        recipientId: otherUser!.id,
        matchId,
        giftType,
        message,
        animationStyle,
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
        <button
          onClick={() => otherUser && setLocation(`/profile/${otherUser.id}`)}
          data-testid="button-view-profile"
          className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70 transition-opacity text-left"
          disabled={!otherUser}
        >
          <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-serif text-lg font-bold text-gold overflow-hidden"
            style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)", border: "2px solid rgba(201,168,76,0.3)" }}>
            {otherUser?.photos && otherUser.photos.length > 0
              ? <ProtectedPhoto src={otherUser.photos[0]} alt={otherUser.firstName ?? ""} className="w-full h-full object-cover" />
              : (otherUser?.firstName ?? otherUser?.fullName?.split(" ")[0] ?? "M").charAt(0)
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <h2 className="text-cream font-semibold text-sm" data-testid="text-chat-name">
                {otherUser?.firstName ?? otherUser?.fullName?.split(" ")[0] ?? "Loading…"}
              </h2>
              <ChevronRight size={13} className="text-cream/30 flex-shrink-0" />
            </div>
            <p className="text-cream/40 text-xs">
              {otherUser ? `${otherUser.city}${otherUser.state ? `, ${otherUser.state}` : ""}, ${otherUser.country}` : ""}
            </p>
          </div>
        </button>
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
              : <GiftBubble key={`g-${item.data.id}`} gift={item.data} isMine={item.data.senderId === user.id} viewerId={user.id} />
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex items-end gap-2 px-4 py-3"
        style={{ background: "rgba(13,6,24,0.97)", borderTop: "1px solid rgba(201,168,76,0.15)" }}>
        {/* Gift button — premium only */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowGiftPicker(true)}
            data-testid="button-open-gift-picker"
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
            style={{ background: "rgba(201,168,76,0.1)", border: "1.5px solid rgba(201,168,76,0.25)", color: "#c9a84c" }}
            title="Send a gift (Premium)"
          >
            <Gift size={18} />
          </button>
          {/* Crown badge */}
          <span className="absolute -top-1 -right-1 text-[9px] leading-none select-none pointer-events-none">👑</span>
        </div>

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
          onSend={(giftType, message, animationStyle) => giftMutation.mutate({ giftType, message, animationStyle })}
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

// ─── Gift reveal overlay ─────────────────────────────────────────────────────

let revealCssInjected = false;
function injectRevealCSS() {
  if (revealCssInjected || typeof document === "undefined") return;
  revealCssInjected = true;
  const s = document.createElement("style");
  s.id = "gift-reveal-css";
  s.textContent = `
    @keyframes gr-float-up   { 0%{opacity:0;transform:translateY(0) rotate(0deg) scale(.5)} 8%{opacity:1} 85%{opacity:.9} 100%{opacity:0;transform:translateY(-105vh) rotate(540deg) scale(1.1)} }
    @keyframes gr-fall-down  { 0%{opacity:0;transform:translateY(0) rotate(0deg) scale(.5)} 8%{opacity:1} 85%{opacity:.9} 100%{opacity:0;transform:translateY(110vh) rotate(-360deg) scale(1)} }
    @keyframes gr-zoom-in    { 0%{opacity:0;transform:scale(.3)} 8%{opacity:1} 100%{opacity:1;transform:scale(1)} }
    @keyframes gr-glow-pulse { 0%,100%{opacity:.55;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
    @keyframes gr-name-in    { 0%{opacity:0;transform:translateY(24px)} 100%{opacity:1;transform:translateY(0)} }
    @keyframes gr-hint-fade  { 0%{opacity:0} 100%{opacity:1} }
    @keyframes gr-confetti   { 0%{opacity:0;transform:translateY(0) rotate(0deg)} 8%{opacity:1} 88%{opacity:1} 100%{opacity:0;transform:translateY(110vh) rotate(720deg)} }
    @keyframes gr-sparkle    { 0%{opacity:0;transform:scale(0) rotate(0deg)} 25%{opacity:1;transform:scale(1.6) rotate(25deg)} 60%{opacity:.9;transform:scale(1) rotate(15deg)} 100%{opacity:0;transform:scale(0) rotate(70deg)} }
    @keyframes gr-fw-dot     { 0%{opacity:0;transform:scale(0)} 20%{opacity:1;transform:scale(1.8)} 70%{opacity:.8;transform:scale(1)} 100%{opacity:0;transform:scale(.2)} }
    @keyframes gr-heart-rise { 0%{opacity:0;transform:translateY(0) scale(.5)} 12%{opacity:1;transform:translateY(-18px) scale(1)} 100%{opacity:0;transform:translateY(-110vh) scale(1.2)} }
    @keyframes gr-petal-fall { 0%{opacity:0;transform:translateY(-5%) rotate(0deg) scale(.5)} 10%{opacity:1} 88%{opacity:.85} 100%{opacity:0;transform:translateY(110vh) rotate(300deg) scale(1)} }
  `;
  document.head.appendChild(s);
}

const CONFETTI_COLORS = ["#ff4444","#ff8800","#ffdd00","#44dd44","#4488ff","#aa44ff","#ff44aa","#c9a84c","#ff6600","#00ccff"];
const SPARKLE_CHARS = ["✨","⭐","✦","★","💫","✷","✸"];
const HEART_CHARS = ["❤️","💕","💖","💗","💓","💝","🩷","♥"];
const FLOWER_CHARS = ["🌸","🌺","🌼","🌷","🌻","💐"];
const FW_COLORS = ["#ff4444","#ffaa00","#44ff88","#4488ff","#ff44ff","#ffff44","#ff8800","#00ffcc","#ff6699","#aaffaa"];

function genRevealParticles(style: string) {
  const rnd = Math.random;
  if (style === "none") {
    return [];
  }
  if (style === "confetti") {
    return Array.from({ length: 65 }, (_, i) => ({
      id: i, type: "confetti" as const,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: rnd() * 100,
      width: 6 + rnd() * 9,
      height: 9 + rnd() * 13,
      delay: rnd() * 2.2,
      duration: 2.8 + rnd() * 2,
    }));
  }
  if (style === "sparkles") {
    return Array.from({ length: 38 }, (_, i) => ({
      id: i, type: "sparkle" as const,
      char: SPARKLE_CHARS[i % SPARKLE_CHARS.length],
      left: 8 + rnd() * 84,
      top: 8 + rnd() * 84,
      size: 16 + rnd() * 26,
      delay: rnd() * 3.5,
      duration: 0.9 + rnd() * 1.6,
    }));
  }
  if (style === "fireworks") {
    const bursts = [{x:22,y:18},{x:78,y:22},{x:14,y:58},{x:86,y:62},{x:50,y:12},{x:35,y:72}];
    const particles: any[] = [];
    let id = 0;
    bursts.forEach((b, bi) => {
      const n = 10;
      for (let j = 0; j < n; j++) {
        const angle = (j / n) * Math.PI * 2;
        const r = 7 + rnd() * 8;
        particles.push({
          id: id++, type: "fw" as const,
          left: b.x + Math.cos(angle) * r,
          top: b.y + Math.sin(angle) * r * 0.65,
          size: 7 + rnd() * 9,
          color: FW_COLORS[(bi * 3 + j) % FW_COLORS.length],
          delay: bi * 0.55 + rnd() * 0.25,
          duration: 0.65 + rnd() * 0.5,
        });
      }
    });
    return particles;
  }
  if (style === "hearts") {
    return Array.from({ length: 42 }, (_, i) => ({
      id: i, type: "heart" as const,
      char: HEART_CHARS[i % HEART_CHARS.length],
      left: rnd() * 100,
      size: 15 + rnd() * 24,
      delay: rnd() * 2.8,
      duration: 2.8 + rnd() * 2.5,
    }));
  }
  if (style === "flowers") {
    return Array.from({ length: 42 }, (_, i) => ({
      id: i, type: "flower" as const,
      char: FLOWER_CHARS[i % FLOWER_CHARS.length],
      left: rnd() * 100,
      size: 14 + rnd() * 22,
      delay: rnd() * 2.2,
      duration: 2.8 + rnd() * 2.2,
    }));
  }
  return [];
}

function GiftRevealOverlay({ gift, onClose, isPreview = false }: { gift: GiftType; onClose: () => void; isPreview?: boolean }) {
  const g = giftById(gift.giftType);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const animStyle = gift.animationStyle ?? "none";

  const particles = useMemo(() => genRevealParticles(animStyle), [animStyle]);

  useEffect(() => {
    injectRevealCSS();
    const t = setTimeout(() => onCloseRef.current(), isPreview ? 4000 : 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center select-none overflow-hidden"
      style={{ background: "rgba(13,6,24,0.94)" }}
      onClick={onClose}
      data-testid="gift-reveal-overlay"
    >

      {/* ── Particles ─────────────────────────────────────────── */}
      {particles.map((p: any) => {
        if (p.type === "confetti") return (
          <div key={p.id} style={{
            position: "absolute", top: "-3%", left: `${p.left}%`,
            width: p.width, height: p.height,
            background: p.color, borderRadius: 2,
            opacity: 0, pointerEvents: "none",
            animation: `gr-confetti ${p.duration}s ${p.delay}s ease-in forwards`,
          }} />
        );
        if (p.type === "sparkle") return (
          <span key={p.id} style={{
            position: "absolute", left: `${p.left}%`, top: `${p.top}%`,
            fontSize: p.size, opacity: 0, pointerEvents: "none",
            animation: `gr-sparkle ${p.duration}s ${p.delay}s ease-in-out forwards`,
          }}>{p.char}</span>
        );
        if (p.type === "fw") return (
          <div key={p.id} style={{
            position: "absolute", left: `${p.left}%`, top: `${p.top}%`,
            width: p.size, height: p.size, borderRadius: "50%",
            background: p.color, opacity: 0, pointerEvents: "none",
            boxShadow: `0 0 ${p.size * 1.5}px ${p.color}`,
            animation: `gr-fw-dot ${p.duration}s ${p.delay}s ease-out forwards`,
          }} />
        );
        if (p.type === "heart") return (
          <span key={p.id} style={{
            position: "absolute", bottom: "-3%", left: `${p.left}%`,
            fontSize: p.size, opacity: 0, pointerEvents: "none",
            animation: `gr-heart-rise ${p.duration}s ${p.delay}s ease-out forwards`,
          }}>{p.char}</span>
        );
        if (p.type === "flower") return (
          <span key={p.id} style={{
            position: "absolute", top: "-3%", left: `${p.left}%`,
            fontSize: p.size, opacity: 0, pointerEvents: "none",
            animation: `gr-petal-fall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}>{p.char}</span>
        );
        return null;
      })}

      {/* Gift animation */}
      <div
        style={{
          width: 230,
          height: 230,
          animation: "gr-zoom-in 5s ease-out forwards",
          opacity: 0,
          position: "relative",
          zIndex: 2,
        }}
        data-testid="gift-reveal-animation"
      >
        {g.lottie
          ? <LottieAnimation src={g.lottie} loop autoplay style={{ width: "100%", height: "100%" }} placeholderSize={80} />
          : <span style={{ fontSize: 120 }}>🎁</span>
        }
      </div>

      {/* Message only — no name */}
      {gift.message && (
        <div
          className="text-center mt-6 px-8 z-10"
          style={{ animation: "gr-name-in 0.6s 0.55s ease-out both" }}
        >
          <p className="text-cream/65 text-sm italic leading-relaxed max-w-xs mx-auto">
            "{gift.message}"
          </p>
        </div>
      )}

      {/* Preview badge */}
      {isPreview && (
        <div
          className="absolute top-12 flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
          style={{ background: "rgba(201,168,76,0.18)", border: "1px solid rgba(201,168,76,0.4)", color: "#c9a84c" }}
        >
          <span>✦</span> Preview <span>✦</span>
        </div>
      )}

      {/* Tap hint */}
      <p
        className="absolute bottom-12 text-cream/25 text-xs tracking-wide"
        style={{ animation: "gr-hint-fade 0.5s 1.5s ease both" }}
      >
        {isPreview ? "Tap anywhere to close preview" : "Tap anywhere to close"}
      </p>
    </div>
  );
}

// ─── Gift bubble ────────────────────────────────────────────────────────────
function GiftBubble({ gift, isMine, viewerId }: { gift: GiftType; isMine: boolean; viewerId: string }) {
  const storageKey = `gift-revealed-${viewerId}-${gift.id}`;
  const [revealed, setRevealed] = useState(() => {
    try { return localStorage.getItem(storageKey) === "1"; } catch { return false; }
  });
  const [showReveal, setShowReveal] = useState(false);
  const g = giftById(gift.giftType);
  const timeLabel = formatDistanceToNow(new Date(gift.createdAt!), { addSuffix: true });

  const handleClose = () => {
    setShowReveal(false);
    setRevealed(true);
    try { localStorage.setItem(storageKey, "1"); } catch {}
  };

  return (
    <>
      {showReveal && (
        <GiftRevealOverlay gift={gift} onClose={handleClose} />
      )}
      <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
        <div className="flex flex-col items-center gap-2 max-w-[190px]" data-testid={`gift-bubble-${gift.id}`}>
          {/* Gift card */}
          <button
            onClick={() => setShowReveal(true)}
            data-testid={`button-reveal-gift-${gift.id}`}
            className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            {revealed ? (
              /* Revealed — bare animation, no card */
              <div style={{ width: 90, height: 90 }}>
                {g.lottie
                  ? <LottieAnimation src={g.lottie} loop autoplay style={{ width: "100%", height: "100%" }} placeholderSize={34} />
                  : <span className="text-5xl">🎁</span>
                }
              </div>
            ) : (
              /* Unrevealed — mystery card */
              <div
                className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl"
                style={{
                  background: "#0d0618",
                  border: `1px solid ${g.color}44`,
                  boxShadow: `0 0 16px ${g.color}22`,
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 72,
                    height: 72,
                    background: `radial-gradient(circle, ${g.color}18 0%, transparent 75%)`,
                    border: `2px solid ${g.color}55`,
                    animation: "gift-bubble-pulse 2s ease-in-out infinite",
                  }}
                >
                  <Gift size={34} style={{ color: g.color, opacity: 0.85 }} />
                </div>
                <p style={{ color: g.color, opacity: 0.5 }} className="text-[9px] mt-1 tracking-wide">Tap to reveal ✦</p>
              </div>
            )}
          </button>
          <style>{`@keyframes gift-bubble-pulse { 0%,100%{box-shadow:0 0 0 0 transparent} 50%{box-shadow:0 0 10px 3px ${g.color}30} }`}</style>
          {/* Message + timestamp */}
          <div className="text-center px-1">
            {gift.message && (
              <p className="text-cream/55 text-xs leading-snug italic mb-1">"{gift.message}"</p>
            )}
            <p className="text-cream/25 text-[10px]">{isMine ? "You sent a gift" : "Sent you a gift"} · {timeLabel}</p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Gift picker ───────────────────────────────────────────────────────────
const ANIM_STYLES = [
  { id: "none",      label: "No Animation", icon: "✕" },
  { id: "confetti",  label: "Confetti",     icon: "🎊" },
  { id: "sparkles",  label: "Sparkles",     icon: "✨" },
  { id: "fireworks", label: "Fireworks",    icon: "🎆" },
  { id: "hearts",    label: "Hearts",       icon: "❤️" },
  { id: "flowers",   label: "Flowers",      icon: "🌸" },
];

function GiftPicker({ recipientName, isPending, onSend, onClose }: {
  recipientName: string;
  isPending: boolean;
  onSend: (giftType: string, message: string, animationStyle: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [animStyle, setAnimStyle] = useState<string>("none");
  const [showPreview, setShowPreview] = useState(false);

  const previewGift = selected ? {
    id: "preview",
    senderId: "",
    recipientId: "",
    matchId: "",
    giftType: selected,
    message,
    animationStyle: animStyle,
    createdAt: new Date(),
  } as GiftType : null;

  return (
    <>
    {showPreview && previewGift && (
      <GiftRevealOverlay gift={previewGift} onClose={() => setShowPreview(false)} isPreview />
    )}
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
      data-testid="gift-picker"
    >
      <div className="w-full max-w-sm flex flex-col rounded-t-3xl" style={{ background: "#130820", border: "1px solid rgba(201,168,76,0.2)", maxHeight: "82vh" }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
          <div>
            <h3 className="font-serif text-lg text-gold">Send a Gift</h3>
            <p className="text-cream/40 text-xs mt-0.5">to {recipientName}</p>
          </div>
          <button onClick={onClose} className="text-cream/40 text-lg leading-none" data-testid="button-close-gift-picker">✕</button>
        </div>

        {/* ── Animation style strip — always visible ── */}
        <div className="flex-shrink-0 px-4 pt-3 pb-2" style={{ borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
          <p className="text-cream/35 text-[10px] font-semibold uppercase tracking-wider mb-2">
            Animation Style
            {selected && animStyle !== "none" && (
              <span className="ml-2 text-gold/70 normal-case tracking-normal font-normal">
                · {ANIM_STYLES.find(a => a.id === animStyle)?.label}
              </span>
            )}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {ANIM_STYLES.map(a => (
              <button
                key={a.id}
                onClick={() => setAnimStyle(a.id)}
                data-testid={`anim-style-${a.id}`}
                className="flex items-center gap-1 flex-shrink-0 px-3 py-1.5 rounded-xl text-xs transition-all"
                style={{
                  background: animStyle === a.id ? "rgba(201,168,76,0.18)" : "rgba(255,255,255,0.04)",
                  border: animStyle === a.id ? "1.5px solid rgba(201,168,76,0.6)" : "1.5px solid rgba(255,255,255,0.07)",
                  color: animStyle === a.id ? "#c9a84c" : "rgba(253,248,240,0.4)",
                  fontWeight: animStyle === a.id ? 600 : 400,
                }}
              >
                <span>{a.icon}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Gift grid — scrollable ── */}
        <div className="overflow-y-auto px-4 py-3 flex-1">
          <div className="grid grid-cols-4 gap-3">
            {GIFTS.map(g => {
              const isSelected = selected === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelected(g.id === selected ? null : g.id)}
                  data-testid={`gift-option-${g.id}`}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl transition-all"
                  style={{
                    background: "none",
                    transform: isSelected ? "scale(1.12) translateY(-3px)" : "scale(1)",
                    outline: isSelected ? `2px solid ${g.color}88` : "none",
                    borderRadius: 12,
                  }}
                >
                  <div style={{ width: 58, height: 58 }}>
                    {g.lottie
                      ? <LottieAnimation src={g.lottie} loop autoplay style={{ width: "100%", height: "100%" }} placeholderSize={24} />
                      : <span className="text-3xl">🎁</span>
                    }
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Bottom: message + send — always visible ── */}
        <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: "1px solid rgba(201,168,76,0.08)" }}>
          {selected && (
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Add a message (optional)…"
              maxLength={200}
              data-testid="input-gift-message"
              className="w-full px-4 py-2.5 rounded-2xl text-sm text-cream placeholder-cream/25 outline-none mb-3"
              style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(201,168,76,0.15)" }}
            />
          )}
          {selected && animStyle !== "none" && (
            <button
              onClick={() => setShowPreview(true)}
              data-testid="button-preview-gift"
              className="w-full py-2.5 rounded-2xl text-sm font-semibold mb-2 transition-all flex items-center justify-center gap-2"
              style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c" }}
            >
              <span>▶</span> Preview Animation
            </button>
          )}
          <button
            onClick={() => selected && onSend(selected, message, animStyle)}
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
              {isPending ? "Sending…" : selected ? `Send ${giftById(selected).name}` : "Select a gift above"}
            </span>
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
