import { Users, Shield } from "lucide-react";
import type { User } from "@shared/schema";

const ROLES = [
  { name: "Admin", description: "Full access to all admin features including payments and user management", color: "#c9a84c" },
  { name: "Moderator", description: "Can approve users, handle reports, and moderate content. No payment access.", color: "#8b5cf6" },
  { name: "Viewer", description: "Analytics only. Read-only access to stats and reports.", color: "#6b7280" },
];

export default function TeamPage({ user }: { user: User }) {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">Team Management</h1>
        <p className="text-cream/40 text-xs mt-0.5">Manage admin team members and their access roles</p>
      </div>

      {/* Current admins */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}>
        <h3 className="text-cream text-sm font-semibold mb-3">Current Admin</h3>
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-gold"
            style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)" }}>
            {(user.fullName ?? user.email ?? "A").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="text-cream text-sm font-medium">{user.fullName ?? "Admin"}</div>
            <div className="text-cream/40 text-xs">{user.email}</div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}>
            Admin
          </span>
        </div>
      </div>

      {/* Role definitions */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <h3 className="text-cream text-sm font-semibold mb-3">Role Definitions</h3>
        {ROLES.map(role => (
          <div key={role.name} data-testid={`role-${role.name.toLowerCase()}`}
            className="flex items-start gap-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <Shield size={14} color={role.color} className="mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-cream text-xs font-semibold" style={{ color: role.color }}>{role.name}</div>
              <div className="text-cream/50 text-xs mt-0.5">{role.description}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl text-cream/40 text-xs" style={{ background: "rgba(255,255,255,0.02)" }}>
        Multi-admin support requires inviting additional team members via email. This feature will be enabled in a future update.
      </div>
    </div>
  );
}
