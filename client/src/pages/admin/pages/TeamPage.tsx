import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, Mail, Trash2, ChevronDown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface TeamMember {
  id: string;
  email: string | null;
  fullName: string | null;
  role: string | null;
  isAdmin: boolean | null;
  createdAt: string | null;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "#c9a84c" },
  admin:       { label: "Admin",       color: "#a78bfa" },
  moderator:   { label: "Moderator",   color: "#6ee7b7" },
};

const VALID_ROLES = ["moderator", "admin", "super_admin"] as const;
type AdminRole = typeof VALID_ROLES[number];

function RoleBadge({ role }: { role: string | null }) {
  const cfg = ROLE_LABELS[role ?? ""] ?? { label: "Admin", color: "#c9a84c" };
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
      style={{ background: `${cfg.color}22`, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

export default function TeamPage({ user }: { user: User }) {
  const isSuperAdmin = (user as any).role === "super_admin";

  const { data, isLoading } = useQuery<{ team: TeamMember[] }>({
    queryKey: ["/api/admin/team"],
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminRole>("moderator");
  const [inviteError, setInviteError] = useState("");

  const inviteMutation = useMutation({
    mutationFn: (body: { email: string; role: AdminRole }) =>
      apiRequest("POST", "/api/admin/team/invite", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      setInviteEmail("");
      setInviteError("");
    },
    onError: async (err: any) => {
      const body = await err.response?.json().catch(() => ({}));
      setInviteError(body?.error ?? "Something went wrong");
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AdminRole }) =>
      apiRequest("PATCH", `/api/admin/team/${userId}/role`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] }),
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("DELETE", `/api/admin/team/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] }),
  });

  const team = data?.team ?? [];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">Team Members</h1>
        <p className="text-cream/40 text-xs mt-0.5">Manage admin and moderator access</p>
      </div>

      {/* Invite form — super_admin only */}
      {isSuperAdmin && (
        <div className="rounded-2xl p-4 mb-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}>
          <h3 className="text-cream text-sm font-semibold mb-3">Add Team Member</h3>
          <div className="flex flex-col gap-2">
            <input
              type="email"
              placeholder="User's email address"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm text-cream bg-transparent outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as AdminRole)}
                  className="w-full appearance-none px-3 py-2 rounded-xl text-sm text-cream bg-transparent outline-none pr-8"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}
                >
                  <option value="moderator" style={{ background: "#1a0a2e" }}>Moderator</option>
                  <option value="admin" style={{ background: "#1a0a2e" }}>Admin</option>
                  <option value="super_admin" style={{ background: "#1a0a2e" }}>Super Admin</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40 pointer-events-none" />
              </div>
              <button
                onClick={() => {
                  setInviteError("");
                  inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
                }}
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c", opacity: inviteEmail.trim() ? 1 : 0.4 }}
              >
                {inviteMutation.isPending ? "Adding…" : "Add"}
              </button>
            </div>
            {inviteError && <p className="text-red-400 text-xs">{inviteError}</p>}
          </div>
        </div>
      )}

      {/* Team list */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}>
        {isLoading ? (
          <div className="p-6 text-center text-cream/40 text-sm">Loading…</div>
        ) : team.length === 0 ? (
          <div className="p-6 text-center text-cream/40 text-sm">No team members yet</div>
        ) : (
          team.map((member, i) => (
            <div key={member.id}
              className="flex items-center gap-3 p-3"
              style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-gold flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)" }}>
                {(member.fullName ?? member.email ?? "A").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-cream text-sm font-medium truncate">{member.fullName ?? "—"}</div>
                <div className="text-cream/40 text-xs flex items-center gap-1 mt-0.5">
                  <Mail size={10} />
                  <span className="truncate">{member.email}</span>
                </div>
              </div>

              <RoleBadge role={member.role} />

              {isSuperAdmin && member.id !== (user as any).id && (
                <div className="flex items-center gap-1 ml-1">
                  {/* Role selector */}
                  <div className="relative">
                    <select
                      value={(member.role && VALID_ROLES.includes(member.role as AdminRole)) ? member.role : "admin"}
                      onChange={e => changeRoleMutation.mutate({ userId: member.id, role: e.target.value as AdminRole })}
                      className="appearance-none px-2 py-1 rounded-lg text-[11px] text-cream/60 bg-transparent outline-none pr-5"
                      style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
                    >
                      <option value="moderator" style={{ background: "#1a0a2e" }}>Moderator</option>
                      <option value="admin" style={{ background: "#1a0a2e" }}>Admin</option>
                      <option value="super_admin" style={{ background: "#1a0a2e" }}>Super Admin</option>
                    </select>
                    <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-cream/30 pointer-events-none" />
                  </div>
                  {/* Revoke button */}
                  <button
                    onClick={() => {
                      if (confirm(`Revoke admin access for ${member.email}?`)) {
                        revokeMutation.mutate(member.id);
                      }
                    }}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: "rgba(248,113,113,0.6)" }}
                    title="Revoke access"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Role legend */}
      <div className="rounded-2xl p-4 mt-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-start gap-3">
          <Shield size={15} color="rgba(201,168,76,0.5)" className="mt-0.5 flex-shrink-0" />
          <div className="space-y-1.5">
            {[
              { role: "super_admin", desc: "Full access + team management" },
              { role: "admin",       desc: "Verify profiles, moderate content, ban users" },
              { role: "moderator",   desc: "View and action flagged reports only" },
            ].map(({ role, desc }) => (
              <div key={role} className="flex items-center gap-2">
                <RoleBadge role={role} />
                <span className="text-cream/40 text-xs">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
