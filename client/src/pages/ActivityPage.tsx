import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Heart, Eye, Send, Crown, Lock } from "lucide-react";
import type { SafeUser } from "@shared/schema";

interface ActivityItem {
  user: SafeUser;
  createdAt: string;
}

interface Props {
  user: SafeUser;
}

type Tab = "likes-received" | "visitors" | "likes-sent";

export default function ActivityPage({ user }: Props) {
  const [tab, setTab] = useState<Tab>("likes-received");
  const isPremium = user.isPremium;

  const { data: likesReceived, isLoading: loadingLR } = useQuery<{ items: ActivityItem[] }>({
    queryKey: ["/api/activity/likes-received"],
    refetchInterval: 30000,
  });

  const { data: visitors, isLoading: loadingV } = useQuery<{ items: ActivityItem[] }>({
    queryKey: ["/api/activity/visitors"],
    refetchInterval: 30000,
  });

  const { data: likesSent, isLoading: loadingLS } = useQuery<{ items: ActivityItem[] }>({
    queryKey: ["/api/activity/likes-sent"],
    refetchInterval: 30000,
  });

  const tabs: { id: Tab; label: string; icon: typeof Heart; data: ActivityItem[] | undefined; loading: boolean }[] = [
    { id: "likes-received", label: "Likes", icon: Heart, data: likesReceived?.items, loading: loadingLR },
    { id: "visitors", label: "Visitors", icon: Eye, data: visitors?.items, loading: loadingV },
    { id: "likes-sent", label: "Likes Sent", icon: Send, data: likesSent?.items, loading: loadingLS },
  ];

  const activeTab = tabs.find(t => t.id === tab)!;
  const items = activeTab.data ?? [];
  const isLoading = activeTab.loading;

  const likesReceivedCount = likesReceived?.items?.length ?? 0;
  const visitorsCount = visitors?.items?.length ?? 0;

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ background: "#0d0618" }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
        <h1 className="font-serif text-2xl text-gold">Activity</h1>
        <p className="text-cream/40 text-xs mt-1">See who's interested in you</p>
      </div>

      {/* Premium banner for free users */}
      {!isPremium && (
        <div
          className="mx-5 mt-4 px-4 py-3 rounded-2xl flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, rgba(123,63,160,0.2), rgba(201,168,76,0.12))", border: "1px solid rgba(201,168,76,0.25)" }}
          data-testid="banner-premium"
        >
          <Crown size={18} color="#c9a84c" className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gold">Upgrade to Premium</p>
            <p className="text-cream/50 text-xs">See who liked you and who visited your profile</p>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex mx-5 mt-5 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.1)" }}>
        {tabs.map(({ id, label, icon: Icon, data }) => {
          const count = data?.length ?? 0;
          const isActive = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              data-testid={`tab-${id}`}
              className="flex-1 flex flex-col items-center py-3 gap-1 transition-all relative"
              style={{ color: isActive ? "#c9a84c" : "rgba(253,248,240,0.35)", background: isActive ? "rgba(201,168,76,0.08)" : "transparent" }}
            >
              <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
              {count > 0 && (
                <span
                  className="absolute top-1.5 right-3 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: isActive ? "#c9a84c" : "rgba(201,168,76,0.4)", color: isActive ? "#0d0618" : "rgba(253,248,240,0.8)" }}
                  data-testid={`count-${id}`}
                >
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item, idx) => (
              <ActivityCard
                key={`${item.user.id}-${idx}`}
                item={item}
                isPremium={isPremium ?? false}
                blurred={!isPremium && tab !== "likes-sent"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityCard({ item, isPremium, blurred }: { item: ActivityItem; isPremium: boolean; blurred: boolean }) {
  const [, setLocation] = useLocation();
  const { user, createdAt } = item;
  const displayName = user.firstName ?? user.fullName?.split(" ")[0] ?? "Member";
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform"
      style={{ aspectRatio: "3/4", background: "#1a0a2e" }}
      data-testid={`activity-card-${user.id}`}
      onClick={() => setLocation(`/profile/${user.id}`)}
    >
      {/* Photo */}
      {user.mainPhotoUrl ? (
        <img
          src={user.mainPhotoUrl}
          alt={displayName}
          className="w-full h-full object-cover"
          style={{ filter: blurred ? "blur(18px) brightness(0.65) saturate(0.4)" : "none", transform: blurred ? "scale(1.08)" : "none" }}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #1a0a2e, #2d1054)" }}
        >
          <span className="text-4xl font-serif text-gold/40">{displayName[0]?.toUpperCase()}</span>
        </div>
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: blurred ? "rgba(13,6,24,0.35)" : "linear-gradient(to top, rgba(13,6,24,0.9) 0%, rgba(13,6,24,0.2) 50%, transparent 100%)" }}
      />

      {/* Premium lock overlay — tap to view profile (photos blurred there) */}
      {blurred && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(13,6,24,0.8)", border: "1.5px solid rgba(201,168,76,0.4)" }}
          >
            <Lock size={16} color="#c9a84c" />
          </div>
          <p className="text-[10px] font-bold text-center px-3 leading-tight" style={{ color: "#c9a84c" }}>Tap to view</p>
        </div>
      )}

      {/* Info at bottom — always show name for non-blurred */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
        {!blurred ? (
          <>
            <p className="text-cream font-semibold text-sm truncate">{displayName}{user.age ? `, ${user.age}` : ""}</p>
            <p className="text-cream/50 text-[10px]">{timeAgo}</p>
          </>
        ) : (
          <p className="text-cream/40 text-[10px] text-center">{timeAgo}</p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const messages: Record<Tab, { icon: typeof Heart; text: string; sub: string }> = {
    "likes-received": { icon: Heart, text: "No likes yet", sub: "Keep completing your profile to attract more people" },
    "visitors": { icon: Eye, text: "No visitors yet", sub: "As people discover you, they'll appear here" },
    "likes-sent": { icon: Send, text: "No likes sent", sub: "Start swiping to like profiles" },
  };
  const { icon: Icon, text, sub } = messages[tab];
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}
      >
        <Icon size={24} color="rgba(201,168,76,0.4)" />
      </div>
      <div className="text-center">
        <p className="text-cream/60 font-medium text-sm">{text}</p>
        <p className="text-cream/30 text-xs mt-1 max-w-[200px] mx-auto leading-relaxed">{sub}</p>
      </div>
    </div>
  );
}
