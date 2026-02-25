import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Lock, Star, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SafeUser, MatchWithUser } from "@shared/schema";

interface Props { user: SafeUser }

export default function MatchesPage({ user }: Props) {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<{ matches: MatchWithUser[] }>({
    queryKey: ["/api/matches"],
    refetchInterval: 10000,
  });

  const matches = data?.matches ?? [];
  const newMatches = matches.filter(m => !m.lastMessage);
  const conversations = matches.filter(m => !!m.lastMessage);

  return (
    <div className="flex flex-col min-h-screen pb-20" style={{ background: "#0d0618" }}>
      <div className="pt-12 pb-2 px-5">
        <h1 className="font-serif text-2xl text-gold">Matches</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ border: "2px solid rgba(201,168,76,0.3)" }}
          >
            <MessageCircle size={32} color="rgba(201,168,76,0.5)" />
          </div>
          <h3 className="font-serif text-xl text-gold">No matches yet</h3>
          <p className="text-cream/40 text-sm">Keep discovering profiles and liking the ones you connect with!</p>
        </div>
      ) : (
        <div>
          {newMatches.length > 0 && (
            <div className="mb-2">
              <div className="px-5 mb-3">
                <span
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "rgba(201,168,76,0.6)" }}
                >
                  Neue Matches
                </span>
              </div>
              <div className="flex gap-4 px-5 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {newMatches.map(match => (
                  <NewMatchBubble
                    key={match.id}
                    match={match}
                    isPremium={!!user.isPremium}
                    onClick={() => user.isPremium ? setLocation(`/chat/${match.id}`) : setLocation("/premium")}
                  />
                ))}
              </div>
            </div>
          )}

          {conversations.length > 0 && (
            <div>
              <div className="px-5 mb-2 mt-4">
                <span
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "rgba(201,168,76,0.6)" }}
                >
                  Nachrichten
                </span>
              </div>
              <div className="px-4 space-y-2">
                {conversations.map(match => (
                  <ConversationItem
                    key={match.id}
                    match={match}
                    currentUserId={user.id}
                    isPremium={!!user.isPremium}
                    onClick={() => user.isPremium ? setLocation(`/chat/${match.id}`) : setLocation("/premium")}
                  />
                ))}
              </div>
            </div>
          )}

          {!user.isPremium && matches.length > 0 && (
            <div
              className="mx-4 mt-4 rounded-2xl p-4 flex items-center gap-3"
              style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.1))", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}
              >
                <Star size={18} fill="white" color="white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-cream text-sm font-semibold">Unlock all messages</p>
                <p className="text-cream/45 text-xs">Get Premium to read and send messages</p>
              </div>
              <button
                onClick={() => setLocation("/premium")}
                data-testid="button-upgrade-matches"
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "white" }}
              >
                $5/mo
              </button>
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
            border: "2.5px solid rgba(201,168,76,0.5)",
            boxShadow: "0 0 16px rgba(201,168,76,0.2)",
          }}
        >
          {other.photos && other.photos.length > 0 ? (
            <img src={other.photos[0]} alt={other.fullName} className="w-full h-full object-cover" />
          ) : (
            other.fullName.charAt(0)
          )}
        </div>
        {!isPremium && (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "#f59e0b" }}
          >
            <Lock size={10} color="white" />
          </div>
        )}
      </div>
      <span className="text-[11px] text-cream/60 font-medium max-w-[60px] truncate">{other.fullName.split(" ")[0]}</span>
    </button>
  );
}

function ConversationItem({ match, currentUserId, isPremium, onClick }: {
  match: MatchWithUser;
  currentUserId: string;
  isPremium: boolean;
  onClick: () => void;
}) {
  const other = match.otherUser;
  const lastMsg = match.lastMessage;
  const hasUnread = (match.unreadCount || 0) > 0;
  const isLocked = !isPremium;

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
      <div className="relative flex-shrink-0">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center font-serif text-xl font-bold text-gold overflow-hidden"
          style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)", border: "2px solid rgba(201,168,76,0.3)" }}
        >
          {other.photos && other.photos.length > 0 ? (
            <img src={other.photos[0]} alt={other.fullName} className="w-full h-full object-cover" />
          ) : (
            other.fullName.charAt(0)
          )}
        </div>
        {hasUnread && !isLocked && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{ background: "#d4608a", color: "white" }}
          >
            {(match.unreadCount || 0) > 9 ? "9+" : match.unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-semibold text-cream text-sm truncate" data-testid={`text-match-name-${match.id}`}>
            {other.fullName}
          </span>
          <span className="text-cream/30 text-xs flex-shrink-0">{timeLabel}</span>
        </div>
        <div className="text-xs text-cream/35 mb-1">
          {other.caste.charAt(0).toUpperCase() + other.caste.slice(1)} · {other.city}
        </div>
        {isLocked ? (
          <div className="flex items-center gap-1.5">
            <Lock size={11} color="rgba(245,158,11,0.7)" />
            <p className="text-xs" style={{ color: "rgba(245,158,11,0.7)" }}>
              Message locked — upgrade to read
            </p>
          </div>
        ) : lastMsg ? (
          <p
            className="text-xs truncate"
            style={{ color: hasUnread ? "#c9a84c" : "rgba(253,248,240,0.4)", fontWeight: hasUnread ? 600 : 400 }}
            data-testid={`text-last-message-${match.id}`}
          >
            {lastMsg.senderId === currentUserId ? "You: " : ""}{lastMsg.text}
          </p>
        ) : (
          <p className="text-xs" style={{ color: "#c9a84c" }}>New match! Say hello</p>
        )}
      </div>
    </button>
  );
}
