import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MessageCircle } from "lucide-react";
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

  return (
    <div className="flex flex-col min-h-screen pb-20" style={{ background: "#0d0618" }}>
      {/* Header */}
      <div className="pt-12 pb-4 px-5">
        <h1 className="font-serif text-2xl text-gold">Your Matches</h1>
        <p className="text-cream/40 text-sm mt-0.5">{matches.length} connection{matches.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Content */}
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
        <div className="px-4 space-y-2">
          {matches.map((match) => (
            <MatchItem
              key={match.id}
              match={match}
              currentUserId={user.id}
              onClick={() => setLocation(`/chat/${match.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchItem({ match, currentUserId, onClick }: {
  match: MatchWithUser;
  currentUserId: string;
  onClick: () => void;
}) {
  const other = match.otherUser;
  const lastMsg = match.lastMessage;
  const hasUnread = (match.unreadCount || 0) > 0;

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
      {/* Avatar */}
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
        {hasUnread && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{ background: "#d4608a", color: "white" }}
          >
            {(match.unreadCount || 0) > 9 ? "9+" : match.unreadCount}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-semibold text-cream text-sm truncate" data-testid={`text-match-name-${match.id}`}>
            {other.fullName}
          </span>
          <span className="text-cream/30 text-xs flex-shrink-0">{timeLabel}</span>
        </div>
        <div className="text-xs text-cream/40 mb-1">
          {other.caste.charAt(0).toUpperCase() + other.caste.slice(1)} · {other.city}, {other.country}
        </div>
        {lastMsg ? (
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
