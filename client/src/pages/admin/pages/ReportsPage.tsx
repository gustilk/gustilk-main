import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Flag, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { User, Report } from "@shared/schema";

const PAGE_SIZE = 20;

const CATEGORIES = ["all", "harassment", "fake profile", "inappropriate content", "underage", "scam"];
const STATUS_OPTS = ["all", "pending", "resolved"];

export default function ReportsPage({ user }: { user: User }) {
  const { toast } = useToast();
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery<{ reports: Report[] }>({
    queryKey: ["/api/admin/reports"],
    queryFn: async () => (await fetch("/api/admin/reports", { credentials: "include" })).json(),
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("POST", `/api/admin/reports/${id}/resolve`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({ title: "Report resolved" });
    },
  });

  const allReports = data?.reports ?? [];
  const filtered = allReports.filter(r => {
    if (status !== "all" && r.status !== status) return false;
    if (category !== "all" && !r.reason.toLowerCase().includes(category)) return false;
    return true;
  });
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const statusColor = (s?: string | null) => ({ pending: "#fbbf24", resolved: "#10b981" }[s ?? ""] ?? "#6b7280");

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">Reports</h1>
        <p className="text-cream/40 text-xs mt-0.5">{filtered.length} report{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => { setStatus(s); setPage(0); }}
              data-testid={`filter-status-${s}`}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize"
              style={{
                background: status === s ? "rgba(244,196,48,0.2)" : "rgba(0,0,0,0.05)",
                color: status === s ? "#F4C430" : "rgba(51,51,51,0.5)",
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-cream/40 text-sm">Loading…</div>
      ) : paged.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <CheckCircle size={36} color="rgba(16,185,129,0.4)" />
          <p className="text-cream/40 text-sm">No reports matching filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paged.map(report => (
            <div key={report.id} data-testid={`report-card-${report.id}`}
              className="rounded-2xl p-4" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,0.15)" }}>
                    <Flag size={14} color="#ef4444" />
                  </div>
                  <div>
                    <div className="text-cream text-sm font-medium">{report.reason}</div>
                    {report.description && (
                      <div className="text-cream/50 text-xs mt-0.5">{report.description}</div>
                    )}
                    <div className="text-cream/30 text-[10px] mt-1">
                      Reporter: {report.reporterId?.slice(0, 8)}… · Target: {report.reportedUserId?.slice(0, 8)}…
                      {report.createdAt && ` · ${formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize"
                    style={{ background: `${statusColor(report.status)}22`, color: statusColor(report.status) }}>
                    {report.status}
                  </span>
                  {report.status !== "resolved" && (
                    <button onClick={() => resolveMutation.mutate(report.id)}
                      data-testid={`button-resolve-report-${report.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                      Resolve
                    </button>
                  )}
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
              style={{ background: "rgba(0,0,0,0.05)", color: "#F4C430" }}>
              <ChevronLeft size={14} />
            </button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
              style={{ background: "rgba(0,0,0,0.05)", color: "#F4C430" }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
