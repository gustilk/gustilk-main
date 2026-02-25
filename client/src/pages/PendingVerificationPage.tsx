import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Clock, CheckCircle, ArrowRight, LogOut } from "lucide-react";
import type { SafeUser } from "@shared/schema";

interface Props { user: SafeUser }

export default function PendingVerificationPage({ user }: Props) {
  const [, setLocation] = useLocation();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });

  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-6 text-center" style={{ background: "#0d0618" }}>
      <div className="relative mb-8">
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(201,168,76,0.08)",
            border: "2px solid rgba(201,168,76,0.3)",
          }}
        >
          <Clock size={52} color="rgba(201,168,76,0.7)" />
        </div>
        <div
          className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(201,168,76,0.15)", border: "2px solid rgba(201,168,76,0.4)" }}
        >
          <span className="text-gold text-lg">⏳</span>
        </div>
      </div>

      <h1 className="font-serif text-3xl text-gold mb-3">Being Reviewed</h1>
      <p className="text-cream/60 text-sm leading-relaxed mb-2 max-w-xs">
        Your identity is currently being reviewed by our team.
      </p>
      <p className="text-cream/40 text-sm mb-8">
        This usually takes <span className="text-gold font-semibold">24–48 hours</span>.
      </p>

      <div
        className="w-full max-w-xs rounded-2xl p-5 mb-8 text-left space-y-3"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}
      >
        <p className="text-cream/50 text-xs uppercase tracking-wider font-semibold">What happens next?</p>
        {[
          { icon: CheckCircle, text: "You'll be notified when your profile is approved", color: "#10b981" },
          { icon: CheckCircle, text: "Once approved, you can start discovering matches", color: "#10b981" },
          { icon: CheckCircle, text: "Verified badge will appear on your profile", color: "#10b981" },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <item.icon size={15} color={item.color} className="flex-shrink-0 mt-0.5" />
            <p className="text-cream/60 text-sm">{item.text}</p>
          </div>
        ))}
      </div>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={() => setLocation("/discover")}
          data-testid="button-browse-anyway"
          className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
        >
          Browse in the meantime
          <ArrowRight size={16} />
        </button>
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          data-testid="button-logout-pending"
          className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{ color: "rgba(253,248,240,0.35)" }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
