import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Edit2, Star, LogOut, CheckCircle, Clock, Globe, Bell, FileText, Shield, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SafeUser } from "@shared/schema";

interface Props { user: SafeUser }

export default function ProfilePage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data } = useQuery<{ user: SafeUser }>({
    queryKey: ["/api/auth/me"],
  });

  const me = data?.user ?? user;

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });

  const casteLabel = (c: string) => ({ sheikh: "Sheikh", pir: "Pir", murid: "Murid" }[c] ?? c);

  const handleLanguage = () => {
    toast({ title: "Language", description: "Language settings coming soon." });
  };

  const handleNotifications = () => {
    toast({ title: "Notifications", description: "Notification settings coming soon." });
  };

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "#0d0618" }}>
      <div className="pt-12 pb-2 px-5 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-gold">My Profile</h1>
        <button
          onClick={() => setLocation("/profile/edit")}
          data-testid="button-edit-profile"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold"
          style={{ border: "1.5px solid rgba(201,168,76,0.35)", color: "#c9a84c" }}
        >
          <Edit2 size={13} />
          Edit
        </button>
      </div>

      <div className="px-5 pt-4">
        <div
          className="rounded-3xl overflow-hidden"
          style={{ border: "1px solid rgba(201,168,76,0.2)", background: "rgba(255,255,255,0.03)" }}
        >
          <div
            className="h-52 relative flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #2d0f4a, #4a1e6b, #7b3fa0)" }}
          >
            {me.photos && me.photos.length > 0 ? (
              <img src={me.photos[0]} alt={me.fullName} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center font-serif text-4xl font-bold text-gold"
                style={{ background: "rgba(201,168,76,0.12)", border: "2px solid rgba(201,168,76,0.3)" }}
                data-testid="avatar-placeholder"
              >
                {me.fullName.charAt(0)}
              </div>
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(13,6,24,0.85) 0%, transparent 60%)" }} />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="font-serif text-2xl text-white font-bold" data-testid="text-profile-name">{me.fullName}</h2>
                  <p className="text-white/60 text-sm">{me.city}, {me.country} · {me.age}</p>
                </div>
                <div
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: "rgba(201,168,76,0.9)", color: "#1a0a2e" }}
                  data-testid="badge-caste"
                >
                  {casteLabel(me.caste)}
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              {me.isPremium && (
                <span
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "white" }}
                  data-testid="badge-premium"
                >
                  <Star size={11} fill="white" />
                  Premium
                </span>
              )}
              {me.isVerified ? (
                <span
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
                  data-testid="badge-verified"
                >
                  <CheckCircle size={11} />
                  Verified
                </span>
              ) : (
                <span
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(201,168,76,0.1)", color: "rgba(201,168,76,0.7)", border: "1px solid rgba(201,168,76,0.2)" }}
                  data-testid="badge-unverified"
                >
                  <Clock size={11} />
                  {me.verificationStatus === "pending" ? "Pending Verification" : "Unverified"}
                </span>
              )}
              <span
                className="px-3 py-1 rounded-full text-xs"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(253,248,240,0.5)" }}
              >
                {me.gender.charAt(0).toUpperCase() + me.gender.slice(1)}
              </span>
            </div>

            {me.bio && (
              <div>
                <div className="text-xs text-cream/40 uppercase tracking-wider mb-1.5 font-semibold">About Me</div>
                <p className="text-cream/70 text-sm leading-relaxed" data-testid="text-bio">{me.bio}</p>
              </div>
            )}

            {me.occupation && (
              <div>
                <div className="text-xs text-cream/40 uppercase tracking-wider mb-1.5 font-semibold">Occupation</div>
                <p className="text-cream/70 text-sm" data-testid="text-occupation">{me.occupation}</p>
              </div>
            )}

            {me.languages && me.languages.length > 0 && (
              <div>
                <div className="text-xs text-cream/40 uppercase tracking-wider mb-2 font-semibold">Languages</div>
                <div className="flex flex-wrap gap-2">
                  {me.languages.map(lang => (
                    <span
                      key={lang}
                      className="px-3 py-1 rounded-full text-xs"
                      style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.2)" }}
                      data-testid={`badge-lang-${lang}`}
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-3">
        {!me.isPremium && (
          <button
            onClick={() => setLocation("/premium")}
            data-testid="button-go-premium"
            className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "white" }}
          >
            <Star size={16} fill="white" />
            Zu Premium wechseln — $5/Monat
          </button>
        )}

        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}
        >
          <SettingsRow
            icon={Globe}
            label="Language"
            sub="Kurdish, German, English"
            onClick={handleLanguage}
            testId="button-language"
          />
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} />
          <SettingsRow
            icon={Bell}
            label="Notifications"
            sub="Manage push notifications"
            onClick={handleNotifications}
            testId="button-notifications"
          />
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} />
          <SettingsRow
            icon={FileText}
            label="Community Guidelines"
            sub="Read our community rules"
            onClick={() => toast({ title: "Community Guidelines", description: "Respect, honesty, and cultural sensitivity are core values of our community." })}
            testId="button-guidelines"
          />
          {me.isAdmin && (
            <>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} />
              <SettingsRow
                icon={Shield}
                label="Admin Panel"
                sub="Manage verification requests"
                onClick={() => setLocation("/admin")}
                testId="button-admin"
              />
            </>
          )}
        </div>

        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
          className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <LogOut size={16} />
          {logoutMutation.isPending ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </div>
  );
}

function SettingsRow({ icon: Icon, label, sub, onClick, testId }: {
  icon: any;
  label: string;
  sub: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="w-full flex items-center gap-4 px-4 py-3.5 transition-all text-left"
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(201,168,76,0.1)" }}
      >
        <Icon size={16} color="#c9a84c" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-cream text-sm font-medium">{label}</p>
        <p className="text-cream/40 text-xs">{sub}</p>
      </div>
      <ChevronRight size={16} color="rgba(253,248,240,0.25)" />
    </button>
  );
}
