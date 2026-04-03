import { useQuery, useMutation } from "@tanstack/react-query";
import { ShieldAlert, Crown, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { User } from "@shared/schema";

type FlaggedUser = {
  id: string;
  fullName: string | null;
  email: string | null;
  isPremium: boolean | null;
  premiumUntil: string | null;
  suspiciousLoginAt: string | null;
  suspiciousLoginIp: string | null;
  mainPhotoUrl: string | null;
};

export default function SuspiciousLoginsPage({ user }: { user: User }) {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ users: FlaggedUser[] }>({
    queryKey: ["/api/admin/suspicious-logins"],
    queryFn: async () =>
      (await fetch("/api/admin/suspicious-logins", { credentials: "include" })).json(),
  });

  const revokeMutation = useMutation({
    mutationFn: async (userId: string) =>
      (await apiRequest("POST", `/api/admin/suspicious-logins/${userId}/revoke-premium`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suspicious-logins"] });
      toast({ title: "Premium revoked" });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (userId: string) =>
      (await apiRequest("POST", `/api/admin/suspicious-logins/${userId}/dismiss`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suspicious-logins"] });
      toast({ title: "Dismissed" });
    },
  });

  const flagged = data?.users ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="w-6 h-6 text-gold" />
        <div>
          <h1 className="text-xl font-bold text-cream">Suspicious Logins</h1>
          <p className="text-cream/50 text-sm">
            Iraq accounts that logged in from a non-Iraqi IP address
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/5 rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && flagged.length === 0 && (
        <div className="text-center py-16 text-cream/40">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No suspicious logins detected</p>
        </div>
      )}

      {!isLoading && flagged.length > 0 && (
        <div className="space-y-3">
          {flagged.map(u => (
            <div
              key={u.id}
              data-testid={`suspicious-login-${u.id}`}
              className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-4"
            >
              {u.mainPhotoUrl ? (
                <img
                  src={u.mainPhotoUrl}
                  alt={u.fullName ?? ""}
                  className="w-12 h-12 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-cream/40 text-lg font-bold">
                  {(u.fullName ?? "?")[0]}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-cream text-sm" data-testid={`suspicious-name-${u.id}`}>
                    {u.fullName ?? "Unknown"}
                  </span>
                  {u.isPremium && (
                    <span className="flex items-center gap-1 text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full">
                      <Crown className="w-3 h-3" /> Premium
                    </span>
                  )}
                </div>
                <p className="text-cream/50 text-xs mt-0.5 truncate">{u.email}</p>
                <div className="mt-1.5 text-xs text-cream/40 space-y-0.5">
                  <p>
                    <span className="text-rose-400">Non-Iraqi IP:</span>{" "}
                    <span className="font-mono">{u.suspiciousLoginIp ?? "unknown"}</span>
                  </p>
                  <p>
                    {u.suspiciousLoginAt
                      ? formatDistanceToNow(new Date(u.suspiciousLoginAt), { addSuffix: true })
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                {u.isPremium && (
                  <button
                    data-testid={`btn-revoke-${u.id}`}
                    onClick={() => revokeMutation.mutate(u.id)}
                    disabled={revokeMutation.isPending}
                    className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
                  >
                    Revoke Premium
                  </button>
                )}
                <button
                  data-testid={`btn-dismiss-${u.id}`}
                  onClick={() => dismissMutation.mutate(u.id)}
                  disabled={dismissMutation.isPending}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-cream/60 hover:bg-white/20 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
