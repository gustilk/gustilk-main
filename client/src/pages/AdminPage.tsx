import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft, CheckCircle, XCircle, Ban, Shield, Flag, Users, BarChart2,
  Calendar, Search, Star, Trash2, ChevronRight, Plus, Edit2, X, Crown,
  UserCheck, MessageSquare, Heart, TrendingUp, AlertTriangle, Camera, Image, Eye,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { SafeUser, Report, Event } from "@shared/schema";
import type { PhotoSlot } from "@shared/schema";

interface Props { user: SafeUser }
type AdminTab = "overview" | "users" | "verifications" | "reports" | "events";

interface Stats {
  totalUsers: number; premiumUsers: number; verifiedUsers: number;
  bannedUsers: number; totalMatches: number; totalMessages: number;
  totalEvents: number; newThisWeek: number;
}

export default function AdminPage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const { data: statsData } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => (await fetch("/api/admin/stats", { credentials: "include" })).json(),
  });

  const { data: verifyData, isLoading: verifyLoading } = useQuery<{ users: SafeUser[] }>({
    queryKey: ["/api/admin/verifications"],
    queryFn: async () => (await fetch("/api/admin/verifications", { credentials: "include" })).json(),
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery<{ reports: Report[] }>({
    queryKey: ["/api/admin/reports"],
    queryFn: async () => (await fetch("/api/admin/reports", { credentials: "include" })).json(),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: SafeUser[] }>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => (await fetch("/api/admin/users", { credentials: "include" })).json(),
    enabled: activeTab === "users",
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery<{ events: Event[] }>({
    queryKey: ["/api/admin/events"],
    queryFn: async () => (await fetch("/api/admin/events", { credentials: "include" })).json(),
    enabled: activeTab === "events",
  });

  const photoActionMutation = useMutation({
    mutationFn: async ({ userId, slotIdx, action, reason }: { userId: string; slotIdx: number; action: "approve" | "reject"; reason?: string }) => {
      const res = await apiRequest("POST", `/api/admin/photos/${userId}/${action}/${slotIdx}`, reason ? { reason } : undefined);
      return res.json();
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      toast({ title: action === "approve" ? "Photo approved" : "Photo rejected" });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ userId, action, reason }: { userId: string; action: "approve" | "reject" | "ban"; reason?: string }) => {
      const res = await apiRequest("POST", `/api/admin/verify/${userId}`, { action, reason });
      return res.json();
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Banned" });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (reportId: string) => (await apiRequest("POST", `/api/admin/reports/${reportId}/resolve`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({ title: "Report resolved" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; isPremium?: boolean; isBanned?: boolean; isAdmin?: boolean; profileVisible?: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/admin/users/${id}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "User deleted" });
    },
  });

  const startChatMutation = useMutation({
    mutationFn: async (userId: string) => (await apiRequest("POST", `/api/admin/start-chat/${userId}`)).json(),
    onSuccess: (data: { matchId: string }) => {
      setLocation(`/chat/${data.matchId}`);
    },
    onError: () => toast({ title: "Could not open chat", variant: "destructive" }),
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: Partial<Event>) => (await apiRequest("POST", "/api/admin/events", data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Event created" });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Event> & { id: string }) =>
      (await apiRequest("PATCH", `/api/admin/events/${id}`, data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event updated" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/admin/events/${id}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Event deleted" });
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

  const TABS: { id: AdminTab; label: string; Icon: any; badge?: number }[] = [
    { id: "overview", label: "Overview", Icon: BarChart2 },
    { id: "users", label: "Users", Icon: Users },
    { id: "verifications", label: "Verify", Icon: Shield, badge: pending.length },
    { id: "reports", label: "Reports", Icon: Flag, badge: reports.length },
    { id: "events", label: "Events", Icon: Calendar },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "#0d0618" }}>
      <div className="flex items-center gap-3 px-5 pt-12 pb-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
        <button onClick={() => setLocation("/profile")} data-testid="button-back" className="text-cream/60">
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Shield size={18} color="#c9a84c" />
          <h1 className="font-serif text-xl text-gold">Admin Panel</h1>
        </div>
      </div>

      <div className="flex px-4 pt-3 gap-1.5 pb-2 overflow-x-auto scrollbar-none">
        {TABS.map(({ id, label, Icon, badge }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            data-testid={`tab-${id}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap relative flex-shrink-0"
            style={activeTab === id
              ? { background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)" }
              : { background: "rgba(255,255,255,0.04)", color: "rgba(253,248,240,0.4)", border: "1px solid rgba(255,255,255,0.06)" }
            }
          >
            <Icon size={12} />
            {label}
            {badge != null && badge > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none"
                style={{ background: id === "reports" ? "#d4608a" : "#7b3fa0", color: "white" }}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 pt-2 flex-1">
        {activeTab === "overview" && <OverviewTab stats={statsData} />}
        {activeTab === "users" && (
          <UsersTab
            users={usersData?.users ?? []}
            isLoading={usersLoading}
            currentUserId={user.id}
            onTogglePremium={(id, val) => updateUserMutation.mutate({ id, isPremium: val })}
            onToggleBan={(id, val) => updateUserMutation.mutate({ id, isBanned: val })}
            onToggleApprove={(id, val) => updateUserMutation.mutate({ id, profileVisible: val })}
            onDelete={(id) => deleteUserMutation.mutate(id)}
            onMessage={(id) => startChatMutation.mutate(id)}
            isPending={updateUserMutation.isPending || deleteUserMutation.isPending || startChatMutation.isPending}
          />
        )}
        {activeTab === "verifications" && (
          <VerificationsTab
            pending={pending}
            isLoading={verifyLoading}
            onAction={(userId, action, reason) => verifyMutation.mutate({ userId, action, reason })}
            onPhotoAction={(userId, slotIdx, action, reason) => photoActionMutation.mutate({ userId, slotIdx, action, reason })}
            isPending={verifyMutation.isPending || photoActionMutation.isPending}
          />
        )}
        {activeTab === "reports" && (
          <ReportsTab
            reports={reportsData?.reports ?? []}
            isLoading={reportsLoading}
            onResolve={(id) => resolveMutation.mutate(id)}
            isPending={resolveMutation.isPending}
          />
        )}
        {activeTab === "events" && (
          <EventsTab
            events={eventsData?.events ?? []}
            isLoading={eventsLoading}
            onCreate={(data) => createEventMutation.mutate(data)}
            onUpdate={(id, data) => updateEventMutation.mutate({ id, ...data })}
            onDelete={(id) => deleteEventMutation.mutate(id)}
            isPending={createEventMutation.isPending || updateEventMutation.isPending || deleteEventMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | undefined; color: string }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}22` }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <div className="text-2xl font-bold text-cream">{value ?? "—"}</div>
        <div className="text-xs text-cream/40 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function OverviewTab({ stats }: { stats: Stats | undefined }) {
  return (
    <div className="space-y-3 pt-1">
      <p className="text-cream/30 text-xs uppercase tracking-wider font-semibold px-1">Platform Overview</p>
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard icon={Users} label="Total Users" value={stats?.totalUsers} color="#c9a84c" />
        <StatCard icon={TrendingUp} label="New This Week" value={stats?.newThisWeek} color="#10b981" />
        <StatCard icon={Crown} label="Premium Users" value={stats?.premiumUsers} color="#7b3fa0" />
        <StatCard icon={UserCheck} label="Verified Users" value={stats?.verifiedUsers} color="#3b82f6" />
        <StatCard icon={Heart} label="Total Matches" value={stats?.totalMatches} color="#d4608a" />
        <StatCard icon={MessageSquare} label="Messages Sent" value={stats?.totalMessages} color="#f59e0b" />
        <StatCard icon={Calendar} label="Events" value={stats?.totalEvents} color="#06b6d4" />
        <StatCard icon={AlertTriangle} label="Banned Users" value={stats?.bannedUsers} color="#ef4444" />
      </div>
    </div>
  );
}

function UserCard({ u, isMe, isPending, onTogglePremium, onToggleBan, onToggleApprove, onDelete, onMessage }: {
  u: SafeUser; isMe: boolean; isPending: boolean;
  onTogglePremium: (id: string, val: boolean) => void;
  onToggleBan: (id: string, val: boolean) => void;
  onToggleApprove: (id: string, val: boolean) => void;
  onDelete: (id: string) => void;
  onMessage: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isBanned = u.verificationStatus === "banned";
  const isApproved = !!(u as any).profileVisible;
  return (
    <>
      <div data-testid={`user-card-${u.id}`}
        className="rounded-2xl p-3.5"
        style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${isBanned ? "rgba(239,68,68,0.2)" : u.isAdmin ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.07)"}` }}
      >
        <div className="flex items-center gap-3 mb-2.5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-serif font-bold text-gold flex-shrink-0 overflow-hidden"
            style={{ background: "linear-gradient(135deg,#2d0f4a,#7b3fa0)", border: "2px solid rgba(201,168,76,0.25)" }}>
            {u.photos && u.photos.length > 0
              ? <img src={u.photos[0]} alt={u.fullName ?? ""} className="w-full h-full object-cover" />
              : (u.fullName ?? u.firstName ?? "?").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-cream">{u.fullName ?? u.firstName ?? "—"}</span>
              {u.isPremium && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(123,63,160,0.2)", color: "#7b3fa0" }}>Premium</span>}
              {u.isVerified && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>Verified</span>}
              {isBanned && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>Banned</span>}
              {u.isAdmin && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}>Admin</span>}
              {!u.isAdmin && !isApproved && !isBanned && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(251,146,60,0.15)", color: "#fb923c" }}>Pending</span>}
            </div>
            <p className="text-cream/35 text-xs truncate">{u.email}</p>
            <p className="text-cream/25 text-xs">{[u.caste, u.city, u.country].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        {!isMe && (
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => onMessage(u.id)} disabled={isPending} data-testid={`button-message-${u.id}`}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 transition-all"
              style={{ background: "rgba(123,63,160,0.15)", color: "#9b6bd4", border: "1px solid rgba(123,63,160,0.3)" }}>
              <MessageSquare size={11} />Message
            </button>
            {!u.isAdmin && (
              <button onClick={() => onToggleApprove(u.id, !isApproved)} disabled={isPending || isBanned} data-testid={`button-approve-${u.id}`}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 transition-all"
                style={isApproved ? { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" } : { background: "rgba(16,185,129,0.07)", color: "rgba(16,185,129,0.7)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <CheckCircle size={11} />{isApproved ? "Approved" : "Approve"}
              </button>
            )}
            <button onClick={() => onTogglePremium(u.id, !u.isPremium)} disabled={isPending} data-testid={`button-premium-${u.id}`}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 transition-all"
              style={u.isPremium ? { background: "rgba(123,63,160,0.2)", color: "#7b3fa0", border: "1px solid rgba(123,63,160,0.3)" } : { background: "rgba(255,255,255,0.05)", color: "rgba(253,248,240,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <Crown size={11} />{u.isPremium ? "Revoke Premium" : "Grant Premium"}
            </button>
            <button onClick={() => onToggleBan(u.id, !isBanned)} disabled={isPending} data-testid={`button-ban-${u.id}`}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 transition-all"
              style={isBanned ? { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" } : { background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
              <Ban size={11} />{isBanned ? "Unban" : "Ban"}
            </button>
            <button onClick={() => setConfirmDelete(true)} disabled={isPending} data-testid={`button-delete-${u.id}`}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{ background: "rgba(239,68,68,0.06)", color: "rgba(239,68,68,0.6)", border: "1px solid rgba(239,68,68,0.12)" }}>
              <Trash2 size={11} />Delete
            </button>
          </div>
        )}
        {isMe && <p className="text-cream/20 text-xs italic px-1">This is your account</p>}
      </div>
      {confirmDelete && (
        <div className="fixed inset-0 flex items-end justify-center z-50 pb-8 px-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: "#1a0a2e", border: "1px solid rgba(239,68,68,0.3)" }}>
            <h3 className="font-serif text-lg text-cream">Delete user?</h3>
            <p className="text-cream/50 text-sm">This will permanently delete the account and all associated data.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(253,248,240,0.6)" }}>Cancel</button>
              <button onClick={() => { onDelete(u.id); setConfirmDelete(false); }} data-testid="button-confirm-delete"
                className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function UsersTab({ users, isLoading, currentUserId, onTogglePremium, onToggleBan, onToggleApprove, onDelete, onMessage, isPending }: {
  users: SafeUser[]; isLoading: boolean; currentUserId: string;
  onTogglePremium: (id: string, val: boolean) => void;
  onToggleBan: (id: string, val: boolean) => void;
  onToggleApprove: (id: string, val: boolean) => void;
  onDelete: (id: string) => void;
  onMessage: (id: string) => void;
  isPending: boolean;
}) {
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const admins = users.filter(u => u.isAdmin);
  const members = users.filter(u => !u.isAdmin);

  const countries = Array.from(new Set(members.map(u => u.country).filter(Boolean))).sort() as string[];
  const cities = Array.from(new Set(
    members.filter(u => !countryFilter || u.country === countryFilter).map(u => u.city).filter(Boolean)
  )).sort() as string[];

  const filteredMembers = members.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search || u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.city?.toLowerCase().includes(q);
    const matchCountry = !countryFilter || u.country === countryFilter;
    const matchCity = !cityFilter || u.city === cityFilter;
    return matchSearch && matchCountry && matchCity;
  });

  const premiumMembers = filteredMembers.filter(u => u.isPremium);
  const standardMembers = filteredMembers.filter(u => !u.isPremium);

  if (isLoading) return <Spinner />;

  const selectStyle = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(253,248,240,0.7)" };

  const cardProps = { isPending, onTogglePremium, onToggleBan, onToggleApprove, onDelete, onMessage };

  return (
    <div className="space-y-4 pt-1">
      {/* Search & filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/30" />
          <input type="text" placeholder="Search by name, email, city…" value={search} onChange={e => setSearch(e.target.value)}
            data-testid="input-user-search"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-cream placeholder-cream/30 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
        </div>
        <div className="flex gap-2">
          <select value={countryFilter} onChange={e => { setCountryFilter(e.target.value); setCityFilter(""); }}
            data-testid="select-country-filter"
            className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
            style={selectStyle}>
            <option value="">All countries</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
            data-testid="select-city-filter"
            className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
            style={selectStyle}>
            <option value="">All cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Admins section */}
      {admins.length > 0 && (
        <div>
          <SectionHeader icon="🛡️" label="Admins" count={admins.length} color="#c9a84c" />
          <div className="space-y-2">
            {admins.map(u => (
              <UserCard key={u.id} u={u} isMe={u.id === currentUserId} {...cardProps} />
            ))}
          </div>
        </div>
      )}

      {/* Premium members */}
      {premiumMembers.length > 0 && (
        <div>
          <SectionHeader icon="👑" label="Premium Members" count={premiumMembers.length} color="#7b3fa0" />
          <div className="space-y-2">
            {premiumMembers.map(u => (
              <UserCard key={u.id} u={u} isMe={u.id === currentUserId} {...cardProps} />
            ))}
          </div>
        </div>
      )}

      {/* Standard members */}
      <div>
        <SectionHeader icon="👤" label="Standard Members" count={standardMembers.length} color="rgba(253,248,240,0.3)" />
        <div className="space-y-2">
          {standardMembers.map(u => (
            <UserCard key={u.id} u={u} isMe={u.id === currentUserId} {...cardProps} />
          ))}
          {standardMembers.length === 0 && filteredMembers.length === 0 && (
            <p className="text-cream/25 text-sm text-center py-6">No members match the selected filters.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, label, count, color }: { icon: string; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-2 mt-1">
      <span className="text-sm">{icon}</span>
      <p className="text-xs uppercase tracking-wider font-semibold" style={{ color }}>{label}</p>
      <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(253,248,240,0.4)" }}>{count}</span>
    </div>
  );
}

function VerificationsTab({ pending, isLoading, onAction, onPhotoAction, isPending }: {
  pending: SafeUser[]; isLoading: boolean;
  onAction: (userId: string, action: "approve" | "reject" | "ban", reason?: string) => void;
  onPhotoAction: (userId: string, slotIdx: number, action: "approve" | "reject", reason?: string) => void;
  isPending: boolean;
}) {
  const [, setLocation] = useLocation();
  if (isLoading) return <Spinner />;
  if (pending.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
      <CheckCircle size={48} color="rgba(16,185,129,0.5)" />
      <h3 className="font-serif text-xl text-gold">All caught up!</h3>
      <p className="text-cream/40 text-sm">No pending verification requests.</p>
    </div>
  );
  return (
    <div className="space-y-4 pt-1">
      {pending.map(u => (
        <VerificationCard key={u.id} user={u}
          onApprove={() => onAction(u.id, "approve")}
          onReject={(reason) => onAction(u.id, "reject", reason)}
          onBan={(reason) => onAction(u.id, "ban", reason)}
          onPhotoAction={(slotIdx, action, reason) => onPhotoAction(u.id, slotIdx, action, reason)}
          onViewProfile={() => setLocation(`/profile/${u.id}`)}
          isPending={isPending}
        />
      ))}
    </div>
  );
}

function ReportsTab({ reports, isLoading, onResolve, isPending }: {
  reports: Report[]; isLoading: boolean;
  onResolve: (id: string) => void;
  isPending: boolean;
}) {
  const pending = reports.filter(r => r.status === "pending");
  const resolved = reports.filter(r => r.status !== "pending");
  if (isLoading) return <Spinner />;
  if (reports.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
      <Flag size={48} color="rgba(201,168,76,0.3)" />
      <h3 className="font-serif text-xl text-gold">No reports</h3>
      <p className="text-cream/40 text-sm">No user reports have been filed.</p>
    </div>
  );
  return (
    <div className="space-y-3">
      {pending.map(r => <ReportCard key={r.id} report={r} onResolve={() => onResolve(r.id)} isPending={isPending} />)}
      {resolved.length > 0 && (
        <div className="pt-2">
          <p className="text-cream/25 text-xs uppercase tracking-wider mb-2 px-1">Resolved ({resolved.length})</p>
          {resolved.map(r => <ReportCard key={r.id} report={r} onResolve={() => {}} isPending={false} resolved />)}
        </div>
      )}
    </div>
  );
}

function EventsTab({ events, isLoading, onCreate, onUpdate, onDelete, isPending }: {
  events: Event[]; isLoading: boolean;
  onCreate: (data: Partial<Event>) => void;
  onUpdate: (id: string, data: Partial<Event>) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const blankForm = { title: "", description: "", type: "cultural" as const, date: "", location: "", country: "", organizer: "", imageUrl: "" };
  const [form, setForm] = useState(blankForm);

  function openCreate() { setForm(blankForm); setEditEvent(null); setShowForm(true); }
  function openEdit(ev: Event) {
    setForm({
      title: ev.title, description: ev.description, type: ev.type as any,
      date: format(new Date(ev.date), "yyyy-MM-dd'T'HH:mm"),
      location: ev.location, country: ev.country, organizer: ev.organizer, imageUrl: ev.imageUrl ?? "",
    });
    setEditEvent(ev); setShowForm(true);
  }

  function handleSubmit() {
    if (!form.title || !form.description || !form.date || !form.location || !form.country || !form.organizer) return;
    const data = { ...form, date: new Date(form.date) };
    if (editEvent) { onUpdate(editEvent.id, data); }
    else { onCreate(data); }
    setShowForm(false);
  }

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-3 pt-1">
      <button
        onClick={openCreate}
        data-testid="button-create-event"
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all"
        style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.25)" }}
      >
        <Plus size={16} />
        Create New Event
      </button>

      {events.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
          <Calendar size={40} color="rgba(201,168,76,0.3)" />
          <p className="text-cream/40 text-sm">No events yet.</p>
        </div>
      )}

      <div className="space-y-2">
        {events.map(ev => (
          <div key={ev.id} data-testid={`event-card-${ev.id}`}
            className="rounded-2xl p-3.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cream leading-snug">{ev.title}</p>
                <p className="text-cream/35 text-xs mt-0.5">{format(new Date(ev.date), "dd MMM yyyy, HH:mm")} · {ev.location}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize"
                    style={{ background: ev.type === "cultural" ? "rgba(201,168,76,0.15)" : ev.type === "meetup" ? "rgba(212,96,138,0.15)" : "rgba(59,130,246,0.15)", color: ev.type === "cultural" ? "#c9a84c" : ev.type === "meetup" ? "#d4608a" : "#3b82f6" }}>
                    {ev.type}
                  </span>
                  <span className="text-cream/25 text-xs">{ev.attendeeCount} attending</span>
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => openEdit(ev)} data-testid={`button-edit-event-${ev.id}`}
                  className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                  style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)" }}>
                  <Edit2 size={13} color="#c9a84c" />
                </button>
                <button onClick={() => setConfirmDelete(ev.id)} data-testid={`button-delete-event-${ev.id}`}
                  className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <Trash2 size={13} color="#ef4444" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-end justify-center z-50" style={{ background: "rgba(0,0,0,0.75)" }}>
          <div className="w-full max-w-lg rounded-t-3xl pb-8 overflow-y-auto max-h-[90vh]" style={{ background: "#130826", border: "1px solid rgba(201,168,76,0.2)" }}>
            <div className="sticky top-0 flex items-center justify-between px-5 py-4" style={{ background: "#130826", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <h3 className="font-serif text-lg text-gold">{editEvent ? "Edit Event" : "New Event"}</h3>
              <button onClick={() => setShowForm(false)} className="text-cream/40"><X size={20} /></button>
            </div>
            <div className="px-5 pt-4 space-y-3">
              {([
                ["Title", "title", "text", "Yezidi Cultural Festival 2026"],
                ["Location", "location", "text", "Bielefeld, Germany"],
                ["Country", "country", "text", "Germany"],
                ["Organizer", "organizer", "text", "Community Team"],
                ["Image URL", "imageUrl", "text", "https://... (optional)"],
              ] as [string, string, string, string][]).map(([label, key, type, placeholder]) => (
                <div key={key}>
                  <label className="text-cream/50 text-xs mb-1 block">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    data-testid={`input-event-${key}`}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-cream placeholder-cream/25 outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
              ))}
              <div>
                <label className="text-cream/50 text-xs mb-1 block">Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  data-testid="input-event-date"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-cream outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", colorScheme: "dark" }}
                />
              </div>
              <div>
                <label className="text-cream/50 text-xs mb-1 block">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                  data-testid="select-event-type"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-cream outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <option value="cultural">Cultural</option>
                  <option value="meetup">Meetup</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div>
                <label className="text-cream/50 text-xs mb-1 block">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the event…"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  data-testid="textarea-event-description"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-cream placeholder-cream/25 outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                data-testid="button-save-event"
                className="w-full py-3 rounded-xl text-sm font-bold mt-2 disabled:opacity-50"
                style={{ background: "rgba(201,168,76,0.2)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.35)" }}
              >
                {isPending ? "Saving…" : editEvent ? "Save Changes" : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 flex items-end justify-center z-50 pb-8 px-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: "#1a0a2e", border: "1px solid rgba(239,68,68,0.3)" }}>
            <h3 className="font-serif text-lg text-cream">Delete event?</h3>
            <p className="text-cream/50 text-sm">This will permanently remove the event and all RSVPs.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(253,248,240,0.6)" }}>
                Cancel
              </button>
              <button onClick={() => { onDelete(confirmDelete); setConfirmDelete(null); }}
                data-testid="button-confirm-delete-event"
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ReportCard({ report, onResolve, isPending, resolved }: {
  report: Report; onResolve: () => void; isPending: boolean; resolved?: boolean;
}) {
  const timeLabel = report.createdAt ? formatDistanceToNow(new Date(report.createdAt), { addSuffix: true }) : "";
  return (
    <div className="rounded-2xl p-4 mb-2"
      style={{ background: resolved ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)", border: `1px solid ${resolved ? "rgba(255,255,255,0.06)" : "rgba(212,96,138,0.2)"}`, opacity: resolved ? 0.6 : 1 }}
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
        {!resolved ? (
          <button onClick={onResolve} disabled={isPending} data-testid={`button-resolve-${report.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 disabled:opacity-50"
            style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
            <CheckCircle size={12} /> Resolve
          </button>
        ) : (
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>Resolved</span>
        )}
      </div>
      {report.description && <p className="text-cream/40 text-xs leading-relaxed mt-2 px-1">{report.description}</p>}
      <div className="flex gap-3 mt-3 text-xs text-cream/25">
        <span>Reporter: <span className="text-cream/45 font-mono">{report.reporterId.slice(0, 8)}…</span></span>
        <span>Reported: <span className="text-cream/45 font-mono">{report.reportedUserId.slice(0, 8)}…</span></span>
      </div>
    </div>
  );
}

function VerificationCard({ user, onApprove, onReject, onBan, onPhotoAction, onViewProfile, isPending }: {
  user: SafeUser;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onBan: (reason: string) => void;
  onPhotoAction: (slotIdx: number, action: "approve" | "reject", reason?: string) => void;
  onViewProfile: () => void;
  isPending: boolean;
}) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [photoRejectReasons, setPhotoRejectReasons] = useState<Record<number, string>>({});
  const timeLabel = user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : "";
  const casteLabel = (user.caste ? { sheikh: "Sheikh", pir: "Pir", murid: "Mirid" }[user.caste] : null) ?? user.caste ?? "";
  const slots = ((user as any).photoSlots ?? []) as PhotoSlot[];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)" }} data-testid={`verification-card-${user.id}`}>

      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-serif text-lg font-bold text-gold flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)", border: "2px solid rgba(201,168,76,0.3)" }}>
          {user.photos && user.photos.length > 0
            ? <img src={user.photos[0]} alt={user.fullName ?? ""} className="w-full h-full object-cover" />
            : (user.fullName ?? user.firstName ?? "M").charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-cream text-sm" data-testid={`text-admin-name-${user.id}`}>{user.fullName ?? user.firstName ?? "Member"}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}>{casteLabel}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(212,96,138,0.12)", color: "#d4608a" }}>{user.gender}</span>
          </div>
          <p className="text-cream/40 text-xs mt-0.5">{user.city}{user.state ? `, ${user.state}` : ""}, {user.country} · {user.age} yrs</p>
          {user.occupation && <p className="text-cream/30 text-xs">{user.occupation}</p>}
          <p className="text-cream/25 text-xs mt-0.5">Registered {timeLabel}</p>
        </div>
        <button onClick={onViewProfile} data-testid={`button-view-profile-${user.id}`}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold flex-shrink-0"
          style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.2)" }}>
          <Eye size={11} /> Profile
        </button>
      </div>

      {/* Bio */}
      {user.bio && (
        <div className="px-4 pb-3">
          <p className="text-cream/50 text-xs leading-relaxed italic">"{user.bio}"</p>
        </div>
      )}

      {/* Languages */}
      {user.languages && user.languages.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {user.languages.map(l => (
            <span key={l} className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(253,248,240,0.5)" }}>{l}</span>
          ))}
        </div>
      )}

      {/* All photos */}
      {slots.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-cream/30 text-[10px] uppercase tracking-wider font-semibold mb-2">Profile Photos</p>
          <div className="grid grid-cols-2 gap-2">
            {slots.map((slot, idx) => {
              const photoRejectReason = photoRejectReasons[idx] ?? "";
              const statusColor = slot.status === "approved" ? "#10b981" : slot.status === "rejected" ? "#ef4444" : "#f59e0b";
              return (
                <div key={idx} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${statusColor}30` }} data-testid={`photo-slot-${user.id}-${idx}`}>
                  <div className="relative" style={{ aspectRatio: "4/5" }}>
                    <img src={slot.url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{ background: `${statusColor}dd`, color: "white" }}>
                      {slot.status === "approved" ? "✓ OK" : slot.status === "rejected" ? "✗ Rejected" : "⏳ Pending"}
                    </div>
                  </div>
                  {slot.status === "pending" && (
                    <div className="p-1.5 space-y-1.5" style={{ background: "rgba(0,0,0,0.4)" }}>
                      <input
                        type="text"
                        placeholder="Rejection note (optional)"
                        value={photoRejectReason}
                        onChange={e => setPhotoRejectReasons(prev => ({ ...prev, [idx]: e.target.value }))}
                        data-testid={`input-photo-reject-reason-${user.id}-${idx}`}
                        className="w-full rounded px-2 py-1 text-[10px] outline-none"
                        style={{ background: "rgba(255,255,255,0.07)", color: "#fdf8f0", border: "1px solid rgba(255,255,255,0.1)" }}
                      />
                      <div className="flex gap-1">
                        <button onClick={() => onPhotoAction(idx, "approve")} disabled={isPending}
                          data-testid={`button-approve-photo-${user.id}-${idx}`}
                          className="flex-1 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 disabled:opacity-50"
                          style={{ background: "rgba(16,185,129,0.8)", color: "white" }}>
                          <CheckCircle size={10} /> OK
                        </button>
                        <button onClick={() => { onPhotoAction(idx, "reject", photoRejectReason); setPhotoRejectReasons(prev => { const n = { ...prev }; delete n[idx]; return n; }); }}
                          disabled={isPending}
                          data-testid={`button-reject-photo-${user.id}-${idx}`}
                          className="flex-1 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 disabled:opacity-50"
                          style={{ background: "rgba(239,68,68,0.8)", color: "white" }}>
                          <XCircle size={10} /> Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Verification selfie */}
      {user.verificationSelfie && (
        <div className="px-4 pb-3">
          <p className="text-cream/30 text-[10px] uppercase tracking-wider font-semibold mb-2">Verification Selfie</p>
          <div className="w-full rounded-xl overflow-hidden" style={{ border: "1px solid rgba(123,63,160,0.3)", aspectRatio: "16/9" }}>
            <img src={user.verificationSelfie} alt="Selfie" className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
        </div>
      )}

      {/* Rejection reason input */}
      <div className="px-4 pb-3">
        <textarea
          value={rejectionReason}
          onChange={e => setRejectionReason(e.target.value)}
          placeholder="Rejection / ban reason (optional) — will be sent to the user automatically"
          rows={2}
          data-testid={`input-rejection-reason-${user.id}`}
          className="w-full rounded-xl px-3 py-2 text-xs outline-none resize-none leading-relaxed"
          style={{ background: "rgba(255,255,255,0.05)", color: "#fdf8f0", border: "1px solid rgba(255,255,255,0.1)", placeholder: "rgba(253,248,240,0.3)" }}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 px-4 pb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <button onClick={onApprove} disabled={isPending} data-testid={`button-approve-${user.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 mt-3"
          style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
          <CheckCircle size={13} /> Approve Account
        </button>
        <button onClick={() => onReject(rejectionReason)} disabled={isPending} data-testid={`button-reject-${user.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 mt-3"
          style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
          <XCircle size={13} /> Reject
        </button>
        <button onClick={() => onBan(rejectionReason)} disabled={isPending} data-testid={`button-ban-${user.id}`}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 mt-3"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
          <Ban size={13} /> Ban
        </button>
      </div>
    </div>
  );
}
