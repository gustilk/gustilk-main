import { Mail } from "lucide-react";
import type { User } from "@shared/schema";

const TEMPLATES = [
  { name: "Welcome Email", description: "Sent when a new user registers", trigger: "On signup" },
  { name: "Match Notification", description: "Sent when a user gets a new match", trigger: "On match" },
  { name: "Magic Link / Password Reset", description: "Sent when a user requests a login link", trigger: "On request" },
  { name: "Photo Approved", description: "Sent when a user's photo is approved by admin", trigger: "On approval" },
  { name: "Photo Rejected", description: "Sent when a user's photo is rejected", trigger: "On rejection" },
  { name: "Account Suspended", description: "Sent when an account is suspended or banned", trigger: "On ban" },
];

export default function EmailTemplatesPage({ user }: { user: User }) {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">Email Templates</h1>
        <p className="text-cream/40 text-xs mt-0.5">Manage transactional email content</p>
      </div>
      <div className="space-y-2">
        {TEMPLATES.map(t => (
          <div key={t.name} data-testid={`template-${t.name.toLowerCase().replace(/ /g, "-")}`}
            className="flex items-center gap-3 p-4 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(59,130,246,0.15)" }}>
              <Mail size={14} color="#3b82f6" />
            </div>
            <div className="flex-1">
              <div className="text-cream text-sm font-medium">{t.name}</div>
              <div className="text-cream/40 text-xs">{t.description}</div>
            </div>
            <span className="text-cream/40 text-[10px] px-2 py-1 rounded-lg"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              {t.trigger}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 p-4 rounded-xl text-cream/40 text-xs" style={{ background: "rgba(255,255,255,0.02)" }}>
        Email template editing requires integration with your email service provider (Resend). Templates are currently managed in code.
      </div>
    </div>
  );
}
