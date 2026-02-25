import { useLocation, Link } from "wouter";
import { Heart, MessageCircle, User, CalendarDays } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { MatchWithUser } from "@shared/schema";

const NAV_ITEMS = [
  { href: "/discover", icon: Heart, tKey: "nav.discover", id: "discover" },
  { href: "/matches", icon: MessageCircle, tKey: "nav.matches", id: "matches" },
  { href: "/events", icon: CalendarDays, tKey: "nav.events", id: "events" },
  { href: "/profile", icon: User, tKey: "nav.profile", id: "profile" },
];

export default function BottomNav() {
  const [location] = useLocation();
  const { t } = useTranslation();

  const { data: matchData } = useQuery<{ matches: MatchWithUser[] }>({
    queryKey: ["/api/matches"],
    refetchInterval: 15000,
  });

  const unreadCount = matchData?.matches?.reduce((sum, m) => sum + (m.unreadCount || 0), 0) || 0;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex"
      style={{ background: "rgba(13,6,24,0.97)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(201,168,76,0.15)" }}
    >
      {NAV_ITEMS.map(({ href, icon: Icon, tKey, id }) => {
        const isActive = location === href || (href === "/discover" && location === "/");
        const isMatches = href === "/matches";
        return (
          <Link
            key={href}
            href={href}
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
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider">{t(tKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
