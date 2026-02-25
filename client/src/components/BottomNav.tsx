import { useLocation, Link } from "wouter";
import { Heart, MessageCircle, User, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { MatchWithUser } from "@shared/schema";

const navItems = [
  { href: "/discover", icon: Heart, label: "Discover" },
  { href: "/matches", icon: MessageCircle, label: "Matches" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/premium", icon: Star, label: "Premium" },
];

export default function BottomNav() {
  const [location] = useLocation();

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
      {navItems.map(({ href, icon: Icon, label }) => {
        const isActive = location === href || (href === "/discover" && location === "/");
        const isMatches = href === "/matches";
        return (
          <Link key={href} href={href}>
            <a
              data-testid={`nav-${label.toLowerCase()}`}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-all relative"
              style={{ color: isActive ? "#c9a84c" : "rgba(253,248,240,0.3)" }}
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
              <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
            </a>
          </Link>
        );
      })}
    </nav>
  );
}
