import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, CheckCircle, XCircle, Ban, Shield, Flag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { SafeUser, Report } from "@shared/schema";

interface Props { user: SafeUser }

type AdminTab = "verifications" | "reports";

export default function AdminPage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>("verifications");

  const { data: verifyData, isLoading: verifyLoading } = useQuery<{ users: SafeUser[] }>({
    queryKey: ["/api/admin/verifications"],
    queryFn: async () => {
      const res = await fetch("/api/admin/verifications", { credentials: "include" });
      return res.json();
    },
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery<{ reports: Report[] }>({
    queryKey: ["/api/admin/reports"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reports", { credentials: "include" });
      return res.json();
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "approve" | "reject" | "ban" }) => {
      const res = await apiRequest("POST", `/api/admin/verify/${userId}`, { action });
      return res.json();
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      toast({
        title: action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Banned",
        description: `User has been ${action === "approve" ? "verified" : action === "reject" ? "rejected" : "banned"}.`,
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const res = await apiRequest("POST", `/api/admin/reports/${reportId}/resolve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({ title: "Report resolved" });
    },
  });

  if (!user.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center" style={{ background: "#0d0618" }}>
        <Shield size={48} color="rgba(201,168,76,0.3)" />
        <h2 className="font-serif text-xl text-gold">Access Denied</h2>
        <p className="text-cream/40 text-sm">You do not have admin access.</p>
        <button onClick={() => setLocation("/profile")} className="text-gold text-sm underline">Back to Profile</button>
      </div>
    );
  }

  const pending = verifyData?.users ?? [];
  const reports = (reportsData?.reports ?? []).filter(r => r.status === "pending");
  const resolvedReports = (reportsData?.reports ?? []).filter(r => r.status !== "pending");

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "#0d0618" }}>
      <div
        className="flex items-center gap-3 px-5 pt-12 pb-4"
        style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}
      >
        <button onClick={() => setLocation("/profile")} data-testid="button-back" className="text-cream/60">
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Shield size={18} color="#c9a84c" />
          <h1 className="font-serif text-xl text-gold">Admin Panel</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {pending.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "#7b3fa0", color: "white" }}>
              {pending.length}
            </span>
          )}
          {reports.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "#d4608a", color: "white" }}>
              {reports.length}
            </span>
          )}
        </div>
      </div>

      <div className="flex px-5 pt-4 gap-2 pb-2">
        {([["verifications", "Verifications", Shield], ["reports", "Reports", Flag]] as const).map(([tab, label, Icon]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            data-testid={`tab-${tab}`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
            style={activeTab === tab
              ? { background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)" }
              : { background: "rgba(255,255,255,0.04)", color: "rgba(253,248,240,0.4)", border: "1px solid rgba(255,255,255,0.06)" }
            }
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-2">
        {activeTab === "verifications" && (
          verifyLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
              <CheckCircle size={48} color="rgba(16,185,129,0.5)" />
              <h3 className="font-serif text-xl text-gold">All caught up!</h3>
              <p className="text-cream/40 text-sm">No pending verification requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(u => (
                <VerificationCard
                  key={u.id}
                  user={u}
                  onApprove={() => actionMutation.mutate({ userId: u.id, action: "approve" })}
                  onReject={() => actionMutation.mutate({ userId: u.id, action: "reject" })}
                  onBan={() => actionMutation.mutate({ userId: u.id, action: "ban" })}
                  isPending={actionMutation.isPending}
                />
              ))}
            </div>
          )
        )}

        {activeTab === "reports" && (
          reportsLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reports.length === 0 && resolvedReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
              <Flag size={48} color="rgba(201,168,76,0.3)" />
              <h3 className="font-serif text-xl text-gold">No reports</h3>
              <p className="text-cream/40 text-sm">No user reports have been filed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onResolve={() => resolveMutation.mutate(report.id)}
                  isPending={resolveMutation.isPending}
                />
              ))}
              {resolvedReports.length > 0 && (
                <div>
                  <p className="text-cream/25 text-xs uppercase tracking-wider mb-2 px-1">Resolved ({resolvedReports.length})</p>
                  {resolvedReports.map(report => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      onResolve={() => {}}
                      isPending={false}
                      resolved
                    />
                  ))}
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ReportCard({ report, onResolve, isPending, resolved }: {
  report: Report;
  onResolve: () => void;
  isPending: boolean;
  resolved?: boolean;
}) {
  const timeLabel = report.createdAt
    ? formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })
    : "";

  return (
    <div
      className="rounded-2xl p-4 mb-2"
      style={{
        background: resolved ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${resolved ? "rgba(255,255,255,0.06)" : "rgba(212,96,138,0.2)"}`,
        opacity: resolved ? 0.6 : 1,
      }}
      data-testid={`report-card-${report.id}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Flag size={12} color={resolved ? "rgba(253,248,240,0.3)" : "#d4608a"} />
            <span className="text-cream text-sm font-semibold">{report.reason}</span>
          </div>
          <p className="text-cream/35 text-xs">{timeLabel}</p>
        </div>
        {!resolved && (
          <button
            onClick={onResolve}
            disabled={isPending}
            data-testid={`button-resolve-${report.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 disabled:opacity-50"
            style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
          >
            <CheckCircle size={12} />
            Resolve
          </button>
        )}
        {resolved && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
            Resolved
          </span>
        )}
      </div>
      {report.description && (
        <p className="text-cream/40 text-xs leading-relaxed mt-2 px-1">{report.description}</p>
      )}
      <div className="flex gap-3 mt-3 text-xs text-cream/25">
        <span>Reporter: <span className="text-cream/45 font-mono">{report.reporterId.slice(0, 8)}…</span></span>
        <span>Reported: <span className="text-cream/45 font-mono">{report.reportedUserId.slice(0, 8)}…</span></span>
      </div>
    </div>
  );
}

function VerificationCard({ user, onApprove, onReject, onBan, isPending }: {
  user: SafeUser;
  onApprove: () => void;
  onReject: () => void;
  onBan: () => void;
  isPending: boolean;
}) {
  const timeLabel = user.createdAt
    ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })
    : "";

  const casteLabel = (user.caste ? { sheikh: "Sheikh", pir: "Pir", murid: "Mirid" }[user.caste] : null) ?? user.caste ?? "";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.12)" }}
      data-testid={`verification-card-${user.id}`}
    >
      <div className="flex items-center gap-4 p-4">
        <div
          className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center font-serif text-xl font-bold text-gold flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)", border: "2px solid rgba(201,168,76,0.3)" }}
        >
          {user.photos && user.photos.length > 0 ? (
            <img src={user.photos[0]} alt={user.fullName ?? ""} className="w-full h-full object-cover" />
          ) : (
            (user.fullName ?? user.firstName ?? "M").charAt(0)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-cream text-sm" data-testid={`text-admin-name-${user.id}`}>
              {user.fullName ?? user.firstName ?? "Member"}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}
            >
              {casteLabel}
            </span>
          </div>
          <p className="text-cream/40 text-xs">{user.city}{user.state ? `, ${user.state}` : ""}, {user.country} · {user.age} yrs</p>
          <p className="text-cream/30 text-xs mt-0.5">Requested {timeLabel}</p>
        </div>
      </div>

      {user.verificationSelfie && (
        <div className="px-4 pb-3">
          <div
            className="w-full h-32 rounded-xl overflow-hidden flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <img
              src={user.verificationSelfie}
              alt="Selfie"
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <p className="text-cream/30 text-xs mt-1 text-center">Verification selfie</p>
        </div>
      )}

      <div
        className="flex gap-2 px-4 pb-4 pt-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <button
          onClick={onApprove}
          disabled={isPending}
          data-testid={`button-approve-${user.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
        >
          <CheckCircle size={14} />
          Approve
        </button>
        <button
          onClick={onReject}
          disabled={isPending}
          data-testid={`button-reject-${user.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}
        >
          <XCircle size={14} />
          Reject
        </button>
        <button
          onClick={onBan}
          disabled={isPending}
          data-testid={`button-ban-${user.id}`}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <Ban size={14} />
          Ban
        </button>
      </div>
    </div>
  );
}
