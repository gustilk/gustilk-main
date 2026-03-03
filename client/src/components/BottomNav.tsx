import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Heart, MessageCircle, User, CalendarDays, Zap } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MatchWithUser, User as UserType } from "@shared/schema";

interface ActivityItem { user: unknown; createdAt: string; }

const ALL_NAV_ITEMS = [
  { href: "/discover", icon: Heart, tKey: "nav.discover", id: "discover", adminHide: true },
  { href: "/matches", icon: MessageCircle, tKey: "nav.matches", id: "matches", adminHide: false },
  { href: "/activity", icon: Zap, tKey: "nav.activity", id: "activity", adminHide: true },
  { href: "/events", icon: CalendarDays, tKey: "nav.events", id: "events", adminHide: false },
  { href: "/profile", icon: User, tKey: "nav.profile", id: "profile", adminHide: false },
];

export default function BottomNav() {
  const [location] = useLocation();
  const { t } = useTranslation();

  // Local cleared flags — badges vanish instantly on click, server catches up asynchronously
  const [matchesCleared, setMatchesCleared] = useState(false);
  const [activityCleared, setActivityCleared] = useState(false);

  const { data: userData } = useQuery<{ user: UserType } | null>({
    queryKey: ["/api/auth/me"],
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const isAdmin = !!(userData?.user as any)?.isAdmin;
  const NAV_ITEMS = ALL_NAV_ITEMS.filter(item => !isAdmin || !item.adminHide);

  const { data: matchData } = useQuery<{ matches: MatchWithUser[] }>({
    queryKey: ["/api/matches"],
    refetchInterval: 15000,
  });

  const { data: likesData } = useQuery<{ items: ActivityItem[] }>({
    queryKey: ["/api/activity/likes-received"],
    refetchInterval: 30000,
  });

  const seenMatchesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/seen/matches"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const seenActivityMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/seen/activity"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  // Matches badge — clears immediately on click, then refetch confirms
  const unreadCount = matchesCleared
    ? 0
    : (matchData?.matches?.reduce((sum, m) => sum + (m.unreadCount || 0), 0) ?? 0);

  // Activity badge — new likes since activitySeenAt
  const activitySeenAt = userData?.user?.activitySeenAt
    ? new Date(userData.user.activitySeenAt as unknown as string)
    : null;

  const likesCount = activityCleared
    ? 0
    : (likesData?.items?.filter(item =>
        activitySeenAt ? new Date(item.createdAt) > activitySeenAt : true
      ).length ?? 0);

  const handleNavClick = (id: string) => {
    if (id === "matches" && unreadCount > 0) {
      setMatchesCleared(true);
      seenMatchesMutation.mutate();
    }
    if (id === "activity" && likesCount > 0) {
      setActivityCleared(true);
      seenActivityMutation.mutate();
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex"
      style={{ background: "rgba(13,6,24,0.97)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(201,168,76,0.15)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map(({ href, icon: Icon, tKey, id }) => {
        const isActive = location === href || (href === "/discover" && location === "/");
        const isMatches = id === "matches";
        const isActivity = id === "activity";
        return (
          <Link
            key={href}
            href={href}
            onClick={() => handleNavClick(id)}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-all relative"
            style={{ color: isActive ? "#c9a84c" : "rgba(253,248,240,0.3)" }}
            data-testid={`nav-${id}`}
          >
            <div className="relative">
              <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              {isMatches && unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: "#d4608a", color: "white" }}
                  data-testid="badge-unread"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {isActivity && likesCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: "#c9a84c", color: "#0d0618" }}
                  data-testid="badge-activity"
                >
                  {likesCount > 9 ? "9+" : likesCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider truncate max-w-full px-1">{t(tKey, { defaultValue: id })}</span>
          </Link>
        );
      })}
    </nav>
  );
}
