import { Shield, Mail } from "lucide-react";
import type { User } from "@shared/schema";

export default function TeamPage({ user }: { user: User }) {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">Admin Team</h1>
        <p className="text-cream/40 text-xs mt-0.5">Current administrators with full platform access</p>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,215,0,0.15)" }}>
        <h3 className="text-cream text-sm font-semibold mb-3">Administrator</h3>
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.10)" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-gold"
            style={{ background: "linear-gradient(135deg, #2d0f4a, #A0000A)" }}>
            {(user.fullName ?? user.email ?? "A").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-cream text-sm font-medium">{user.fullName ?? "Admin"}</div>
            <div className="text-cream/40 text-xs flex items-center gap-1 mt-0.5">
              <Mail size={10} />
              {user.email}
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
            style={{ background: "rgba(255,215,0,0.15)", color: "#FFD700" }}>
            Admin
          </span>
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-start gap-3">
          <Shield size={16} color="rgba(255,215,0,0.6)" className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-cream/70 text-xs font-semibold mb-1">Single-administrator platform</p>
            <p className="text-cream/40 text-xs leading-relaxed">
              Gûstîlk operates with a single administrator account that has full access to all platform features including user management, approvals, moderation, analytics, and payments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
