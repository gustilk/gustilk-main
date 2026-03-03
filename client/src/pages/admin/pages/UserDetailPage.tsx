import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Crown, Ban, Shield, AlertTriangle, MessageSquare, Trash2 } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import type { User } from "@shared/schema";

export default function UserDetailPage({ user: adminUser, userId }: { user: User; userId: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [warnReason, setWarnReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [showWarn, setShowWarn] = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);

  const { data, isLoading } = useQuery<{ user: User; stats: { matches: number; messages: number } }>({
    queryKey: ["/api/admin/users", userId],
    queryFn: async () => (await fetch(`/api/admin/users/${userId}`, { credentials: "include" })).json(),
  });

  const updateMutation = useMutation({
    mutationFn: async (patch: any) => (await apiRequest("PATCH", `/api/admin/users/${userId}`, patch)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User updated" });
    },
  });

  const warnMutation = useMutation({
    mutationFn: async (reason: string) => (await apiRequest("POST", `/api/admin/users/${userId}/warn`, { reason })).json(),
    onSuccess: () => { toast({ title: "Warning sent" }); setShowWarn(false); setWarnReason(""); },
  });

  const suspendMutation = useMutation({
    mutationFn: async (reason: string) => (await apiRequest("POST", `/api/admin/users/${userId}/suspend`, { reason, days: 7 })).json(),
    onSuccess: () => { toast({ title: "User suspended for 7 days" }); setShowSuspend(false); setSuspendReason(""); },
  });

  const startChatMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/admin/start-chat/${userId}`)).json(),
    onSuccess: (data: any) => setLocation(`/chat/${data.matchId}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => (await apiRequest("DELETE", `/api/admin/users/${userId}`)).json(),
    onSuccess: () => { toast({ title: "User deleted" }); setLocation("/admin/users"); },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-cream/40 text-sm">Loading…</div>;
  }

  const u = data?.user;
  if (!u) {
    return <div className="flex items-center justify-center h-64 text-cream/40 text-sm">User not found</div>;
  }

  const statusColor = u.verificationStatus === "banned" ? "#ef4444" : u.isVerified ? "#10b981" : "#fbbf24";
  const casteLabel = ({ sheikh: "Sheikh", pir: "Pir", murid: "Mirid" }[u.caste ?? ""] ?? u.caste ?? "—");

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <button onClick={() => setLocation("/admin/users")} data-testid="button-back-users"
        className="flex items-center gap-2 text-cream/50 text-sm mb-4 hover:text-cream/80 transition-colors">
        <ArrowLeft size={14} /> Back to Users
      </button>

      {/* Profile header */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-xl font-bold text-gold"
            style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)" }}>
            {u.mainPhotoUrl
              ? <img src={u.mainPhotoUrl} alt="" className="w-full h-full object-cover" />
              : (u.fullName ?? "U").charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-serif text-lg text-gold font-bold">{u.fullName ?? u.firstName ?? "Member"}</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${statusColor}22`, color: statusColor }}>
                {u.verificationStatus === "banned" ? "Banned" : u.isVerified ? "Verified" : "Pending"}
              </span>
              {u.isPremium && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}>Premium</span>
              )}
            </div>
            <div className="text-cream/50 text-sm mt-1">{u.email} · {u.phone ?? "No phone"}</div>
            <div className="text-cream/40 text-xs mt-1">
              {casteLabel} · {u.gender} · {u.age} yrs · {u.city}, {u.country}
            </div>
            {u.createdAt && (
              <div className="text-cream/30 text-xs mt-1">
                Joined {format(new Date(u.createdAt), "PPP")} ({formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })})
              </div>
            )}
          </div>
        </div>
        {u.bio && (
          <div className="mt-3 pt-3 border-t text-cream/60 text-sm" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            {u.bio}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Matches", value: data?.stats?.matches },
          { label: "Messages", value: data?.stats?.messages },
          { label: "Occupation", value: u.occupation ?? "—" },
        ].map(item => (
          <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-cream text-lg font-bold">{item.value ?? 0}</div>
            <div className="text-cream/40 text-xs">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Photos */}
      {u.photos && u.photos.length > 0 && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.1)" }}>
          <h3 className="text-cream text-sm font-semibold mb-3">Photos</h3>
          <div className="flex gap-2 flex-wrap">
            {u.photos.map((url, i) => (
              <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.1)" }}>
        <h3 className="text-cream text-sm font-semibold mb-3">Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => updateMutation.mutate({ isPremium: !u.isPremium })}
            data-testid="button-toggle-premium"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.2)" }}>
            <Crown size={13} /> {u.isPremium ? "Remove Premium" : "Grant Premium"}
          </button>
          <button onClick={() => startChatMutation.mutate()}
            data-testid="button-message-user"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}>
            <MessageSquare size={13} /> Send Message
          </button>
          <button onClick={() => setShowWarn(!showWarn)}
            data-testid="button-warn-user"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
            <AlertTriangle size={13} /> Warn User
          </button>
          <button onClick={() => setShowSuspend(!showSuspend)}
            data-testid="button-suspend-user"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(249,115,22,0.1)", color: "#f97316", border: "1px solid rgba(249,115,22,0.2)" }}>
            <Shield size={13} /> Suspend 7 Days
          </button>
          <button onClick={() => {
            if (confirm(`Ban ${u.fullName ?? u.email}?`))
              updateMutation.mutate({ isBanned: u.verificationStatus !== "banned" });
          }}
            data-testid="button-ban-user"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
            <Ban size={13} /> {u.verificationStatus === "banned" ? "Unban" : "Ban"}
          </button>
          {!u.isAdmin && (
            <button onClick={() => { if (confirm("Delete this user permanently?")) deleteMutation.mutate(); }}
              data-testid="button-delete-user"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(239,68,68,0.06)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.15)" }}>
              <Trash2 size={13} /> Delete Account
            </button>
          )}
        </div>

        {showWarn && (
          <div className="mt-3 flex gap-2">
            <input value={warnReason} onChange={e => setWarnReason(e.target.value)}
              placeholder="Warning reason…" data-testid="input-warn-reason"
              className="flex-1 px-3 py-2 rounded-lg text-xs text-cream placeholder-cream/30 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(251,191,36,0.2)" }} />
            <button onClick={() => warnReason.trim() && warnMutation.mutate(warnReason)}
              data-testid="button-send-warn"
              className="px-3 py-2 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>
              Send
            </button>
          </div>
        )}

        {showSuspend && (
          <div className="mt-3 flex gap-2">
            <input value={suspendReason} onChange={e => setSuspendReason(e.target.value)}
              placeholder="Suspension reason…" data-testid="input-suspend-reason"
              className="flex-1 px-3 py-2 rounded-lg text-xs text-cream placeholder-cream/30 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(249,115,22,0.2)" }} />
            <button onClick={() => suspendReason.trim() && suspendMutation.mutate(suspendReason)}
              data-testid="button-confirm-suspend"
              className="px-3 py-2 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}>
              Suspend
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
