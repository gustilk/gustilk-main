import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Lock, Star, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import logoImg from "@assets/Untitled_design_1772024284063.png";
import type { SafeUser, MatchWithUser } from "@shared/schema";
import ProtectedPhoto from "@/components/ProtectedPhoto";

interface Props { user: SafeUser }

export default function MatchesPage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const isPremium = !!user.isPremium;

  const { data, isLoading } = useQuery<{ matches: MatchWithUser[] }>({
    queryKey: ["/api/matches"],
    refetchInterval: 10000,
  });

  const matches = data?.matches ?? [];
  const newMatches = matches.filter(m => !m.lastMessage);
  const conversations = matches.filter(m => !!m.lastMessage);

  return (
    <div className="flex flex-col min-h-screen pb-20" style={{ background: "#0d0618" }}>
      <div className="pt-12 pb-2 px-5 flex items-center gap-2.5">
        <img src={logoImg} alt="" className="flex-shrink-0" style={{ width: "48px", height: "48px", objectFit: "contain", filter: "drop-shadow(0 1px 6px rgba(201,168,76,0.6))" }} />
        <h1 className="font-serif text-2xl text-gold">{t("matches.title")}</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ border: "2px solid rgba(201,168,76,0.3)" }}>
            <MessageCircle size={32} color="rgba(201,168,76,0.5)" />
          </div>
          <h3 className="font-serif text-xl text-gold">{t("matches.noMatches")}</h3>
          <p className="text-cream/40 text-sm">{t("matches.noMatchesSub")}</p>
        </div>
      ) : (
        <div>
          {/* Premium upsell banner for non-premium users with matches */}
          {!isPremium && matches.length > 0 && (
            <div className="mx-4 mb-4 mt-2 rounded-2xl p-4"
              style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.1), rgba(123,63,160,0.1))", border: "1px solid rgba(201,168,76,0.3)" }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)" }}>
                  <Lock size={16} color="#1a0a2e" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-cream font-semibold text-sm">
                    {matches.length} {matches.length === 1 ? "person" : "people"} liked you
                  </p>
                  <p className="text-cream/45 text-xs mt-0.5">
                    {t("matches.upgradeSub")}
                  </p>
                </div>
                <button
                  onClick={() => setLocation("/premium")}
                  data-testid="button-upgrade-matches"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
                >
                  {t("matches.upgradeBtn")}
                </button>
              </div>
            </div>
          )}

          {newMatches.length > 0 && (
            <div className="mb-2">
              <div className="px-5 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "rgba(201,168,76,0.6)" }}>
                  {isPremium ? t("matches.newMatches") : t("matches.newMatchesHidden")}
                </span>
              </div>
              <div className="flex gap-4 px-5 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {newMatches.map(match => (
                  <NewMatchBubble
                    key={match.id}
                    match={match}
                    isPremium={isPremium}
                    onClick={() => isPremium ? setLocation(`/chat/${match.id}`) : setLocation("/premium")}
                  />
                ))}
              </div>
            </div>
          )}

          {conversations.length > 0 && (
            <div>
              <div className="px-5 mb-2 mt-4">
                <span className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "rgba(201,168,76,0.6)" }}>
                  {t("matches.messages")}
                </span>
              </div>
              <div className="px-4 space-y-2">
                {conversations.map(match => (
                  <ConversationItem
                    key={match.id}
                    match={match}
                    currentUserId={user.id}
                    isPremium={isPremium}
                    onClick={() => isPremium ? setLocation(`/chat/${match.id}`) : setLocation("/premium")}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewMatchBubble({ match, isPremium, onClick }: {
  match: MatchWithUser;
  isPremium: boolean;
  onClick: () => void;
}) {
  const other = match.otherUser;

  return (
    <button
      onClick={onClick}
      data-testid={`new-match-${match.id}`}
      className="flex flex-col items-center gap-1.5 flex-shrink-0"
    >
      <div className="relative">
        <div
          className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center font-serif text-xl font-bold text-gold"
          style={{
            background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)",
            border: isPremium ? "2.5px solid rgba(201,168,76,0.5)" : "2.5px solid rgba(201,168,76,0.2)",
            boxShadow: isPremium ? "0 0 16px rgba(201,168,76,0.2)" : "none",
            filter: isPremium ? "none" : "blur(5px)",
          }}
        >
          {other.photos && other.photos.length > 0 ? (
            <ProtectedPhoto src={other.photos[0]} alt="" className="w-full h-full object-cover" />
          ) : (
            (other.firstName ?? other.fullName?.split(" ")[0] ?? "M").charAt(0)
          )}
        </div>
        {/* Lock overlay for non-premium */}
        {!isPremium && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center"
            style={{ background: "rgba(13,6,24,0.5)" }}>
            <Lock size={18} color="#c9a84c" />
          </div>
        )}
      </div>
      <span className="text-[11px] text-cream/60 font-medium max-w-[60px] truncate">
        {isPremium ? (other.firstName ?? other.fullName?.split(" ")[0] ?? "Member") : "???"}
      </span>
    </button>
  );
}

function ConversationItem({ match, currentUserId, isPremium, onClick }: {
  match: MatchWithUser;
  currentUserId: string;
  isPremium: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const other = match.otherUser;
  const lastMsg = match.lastMessage;
  const hasUnread = !isPremium ? false : (match.unreadCount || 0) > 0;

  const timeLabel = lastMsg?.createdAt
    ? formatDistanceToNow(new Date(lastMsg.createdAt!), { addSuffix: true })
    : match.createdAt
      ? formatDistanceToNow(new Date(match.createdAt), { addSuffix: true })
      : "";

  return (
    <button
      onClick={onClick}
      data-testid={`match-item-${match.id}`}
      className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.1)" }}
    >
      {/* Avatar — blurred for non-premium */}
      <div className="relative flex-shrink-0">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center font-serif text-xl font-bold text-gold overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)",
            border: "2px solid rgba(201,168,76,0.3)",
            filter: isPremium ? "none" : "blur(6px)",
          }}
        >
          {other.photos && other.photos.length > 0 ? (
            <ProtectedPhoto src={other.photos[0]} alt="" className="w-full h-full object-cover" />
          ) : (
            (other.firstName ?? other.fullName?.split(" ")[0] ?? "M").charAt(0)
          )}
        </div>
        {!isPremium && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center">
            <Lock size={16} color="#c9a84c" />
          </div>
        )}
        {hasUnread && isPremium && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{ background: "#d4608a", color: "white" }}>
            {(match.unreadCount || 0) > 9 ? "9+" : match.unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-semibold text-sm truncate"
            style={{ color: isPremium ? "rgba(253,248,240,1)" : "rgba(253,248,240,0.25)" }}
            data-testid={`text-match-name-${match.id}`}>
            {isPremium ? (other.firstName ?? other.fullName?.split(" ")[0] ?? "Member") : t("matches.lockedName")}
          </span>
          {isPremium && (
            <span className="text-cream/30 text-xs flex-shrink-0">{timeLabel}</span>
          )}
        </div>
        {isPremium && (
          <div className="text-xs text-cream/35 mb-1">
            {other.caste ? other.caste.charAt(0).toUpperCase() + other.caste.slice(1) : ""} · {other.city}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Lock size={11} color="rgba(201,168,76,0.7)" />
          <p className="text-xs" style={{ color: isPremium ? "rgba(253,248,240,0.4)" : "rgba(201,168,76,0.7)" }}>
            {isPremium
              ? (lastMsg
                  ? (lastMsg.senderId === currentUserId ? t("matches.youPrefix") : "") + lastMsg.text
                  : t("matches.newMatchHello"))
              : t("matches.upgradeToSee")
            }
          </p>
        </div>
      </div>
    </button>
  );
}
