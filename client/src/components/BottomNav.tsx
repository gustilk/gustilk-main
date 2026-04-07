import { useLocation, Link } from "wouter";
import { Heart, MessageCircle, User, CalendarDays, Zap } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MatchWithUser, User as UserType } from "@shared/schema";

interface ActivityItem { user: unknown; createdAt: string; }

const ALL_NAV_ITEMS = [
  { href: "/discover", icon: Heart, tKey: "nav.discover", id: "discover", adminHide: false },
  { href: "/matches", icon: MessageCircle, tKey: "nav.matches", id: "matches", adminHide: false },
  { href: "/activity", icon: Zap, tKey: "nav.activity", id: "activity", adminHide: false },
  { href: "/events", icon: CalendarDays, tKey: "nav.events", id: "events", adminHide: false },
  { href: "/profile", icon: User, tKey: "nav.profile", id: "profile", adminHide: false },
];

export default function BottomNav() {
  const [location] = useLocation();
  const { t } = useTranslation();

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
    onMutate: () => {
      // Immediately zero out all unread counts in the cache — survives remounts
      queryClient.setQueryData(["/api/matches"], (old: any) =>
        old ? { ...old, matches: old.matches?.map((m: any) => ({ ...m, unreadCount: 0 })) } : old
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    },
  });

  const seenActivityMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/seen/activity"),
    onMutate: () => {
      // Immediately advance activitySeenAt to now in the cache — survives remounts
      const now = new Date().toISOString();
      queryClient.setQueryData(["/api/auth/me"], (old: any) =>
        old ? { ...old, user: { ...old.user, activitySeenAt: now } } : old
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  // Badge counts — derived purely from the React Query cache (no local flags needed)
  const unreadCount = matchData?.matches?.reduce((sum, m) => sum + (m.unreadCount || 0), 0) ?? 0;

  const activitySeenAt = userData?.user?.activitySeenAt
    ? new Date(userData.user.activitySeenAt as unknown as string)
    : null;

  const likesCount = likesData?.items?.filter(item =>
    activitySeenAt ? new Date(item.createdAt) > activitySeenAt : true
  ).length ?? 0;

  const handleNavClick = (id: string) => {
    if (id === "matches" && unreadCount > 0) {
      seenMatchesMutation.mutate();
    }
    if (id === "activity" && likesCount > 0) {
      seenActivityMutation.mutate();
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex"
      style={{ background: "rgba(13,6,24,0.97)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(200,0,14,0.15)", paddingBottom: "env(safe-area-inset-bottom)" }}
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
            style={{ color: isActive ? "#c8000e" : "rgba(253,248,240,0.3)" }}
            data-testid={`nav-${id}`}
          >
            <div className="relative">
              <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              {isMatches && unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: "#e03050", color: "white" }}
                  data-testid="badge-unread"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {isActivity && likesCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: "#c8000e", color: "#0d0002" }}
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
