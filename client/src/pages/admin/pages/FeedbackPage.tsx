import { useQuery } from "@tanstack/react-query";
import { Star, Bug, Lightbulb, MessageSquare, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { User } from "@shared/schema";

interface FeedbackRow {
  id: string;
  type: string;
  rating: number | null;
  message: string;
  deviceInfo: any;
  emailSent: boolean;
  createdAt: string;
  userId: string;
  userFirstName: string | null;
  userFullName: string | null;
  userEmail: string | null;
}

const TYPE_META: Record<string, { label: string; color: string; bg: string; Icon: typeof MessageSquare }> = {
  feature_request: { label: "Feature Request", color: "#7b3fa0", bg: "rgba(123,63,160,0.18)", Icon: Lightbulb },
  bug_report:      { label: "Bug Report",       color: "#d4608a", bg: "rgba(212,96,138,0.15)", Icon: Bug },
  general:         { label: "General",           color: "#c9a84c", bg: "rgba(201,168,76,0.15)", Icon: MessageSquare },
  other:           { label: "Other",             color: "rgba(253,248,240,0.5)", bg: "rgba(255,255,255,0.07)", Icon: MessageSquare },
};

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={12}
          fill={n <= rating ? "#c9a84c" : "none"}
          color={n <= rating ? "#c9a84c" : "rgba(201,168,76,0.3)"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

export default function FeedbackPage({ user }: { user: User }) {
  const { data, isLoading } = useQuery<{ feedback: FeedbackRow[] }>({
    queryKey: ["/api/admin/feedback"],
    queryFn: async () => (await fetch("/api/admin/feedback", { credentials: "include" })).json(),
    refetchInterval: 60000,
  });

  const rows = data?.feedback ?? [];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-xl text-gold font-bold">User Feedback</h1>
          <p className="text-cream/40 text-xs mt-0.5">In-app feedback and suggestions from users</p>
        </div>
        {rows.length > 0 && (
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)" }}
          >
            {rows.length} total
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(201,168,76,0.2)" }}>
          <MessageSquare size={32} color="rgba(201,168,76,0.4)" className="mx-auto mb-3" />
          <div className="text-cream/50 text-sm font-medium">No Feedback Yet</div>
          <div className="text-cream/30 text-xs mt-2">Feedback submissions will appear here once users start sending them.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(row => {
            const meta = TYPE_META[row.type] ?? TYPE_META.other;
            const Icon = meta.Icon;
            const name = row.userFirstName ?? row.userFullName?.split(" ")[0] ?? "User";
            const timeAgo = formatDistanceToNow(new Date(row.createdAt), { addSuffix: true });
            return (
              <div
                key={row.id}
                className="rounded-2xl p-4"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.1)" }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: meta.bg }}
                  >
                    <Icon size={14} color={meta.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                      {row.rating && <StarRating rating={row.rating} />}
                      {row.emailSent && (
                        <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "rgba(253,248,240,0.35)" }}>
                          <CheckCircle size={10} /> Alerted
                        </span>
                      )}
                    </div>
                    <p className="text-cream/80 text-sm leading-relaxed">{row.message}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-cream/40 text-[11px]">
                        {name}{row.userEmail ? ` · ${row.userEmail}` : ""}
                      </span>
                      <span className="text-cream/25 text-[11px]">{timeAgo}</span>
                      {row.deviceInfo?.platform && (
                        <span className="text-cream/25 text-[11px]">{row.deviceInfo.platform}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
