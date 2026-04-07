import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { User, AuditLog } from "@shared/schema";

const PAGE_SIZE = 20;

export default function AuditLogsPage({ user }: { user: User }) {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery<{ logs: AuditLog[]; total: number }>({
    queryKey: ["/api/admin/audit-logs", page],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      return (await fetch(`/api/admin/audit-logs?${params}`, { credentials: "include" })).json();
    },
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const actionColor = (action: string) => {
    if (action.includes("ban") || action.includes("suspend") || action.includes("delete")) return "#ef4444";
    if (action.includes("warn")) return "#fbbf24";
    if (action.includes("approve")) return "#10b981";
    if (action.includes("export")) return "#3b82f6";
    return "#6b7280";
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">Audit Logs</h1>
        <p className="text-cream/40 text-xs mt-0.5">{total.toLocaleString()} total admin actions</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-cream/40 text-sm">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <FileText size={32} color="rgba(107,114,128,0.4)" />
          <p className="text-cream/40 text-sm">No audit logs yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} data-testid={`audit-log-${log.id}`}
              className="flex items-start gap-3 p-3.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: actionColor(log.action ?? "") }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-cream text-xs font-medium font-mono">{log.action}</span>
                  {log.targetType && (
                    <span className="text-cream/40 text-[10px]">{log.targetType}</span>
                  )}
                </div>
                {log.details && <div className="text-cream/50 text-xs mt-0.5 truncate">{log.details}</div>}
                <div className="text-cream/30 text-[10px] mt-0.5">
                  {log.adminEmail || "Admin"}
                  {log.createdAt && ` · ${formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-cream/40 text-xs">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
              style={{ background: "rgba(255,255,255,0.12)", color: "#FFD700" }}>
              <ChevronLeft size={14} />
            </button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
              style={{ background: "rgba(255,255,255,0.12)", color: "#FFD700" }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
