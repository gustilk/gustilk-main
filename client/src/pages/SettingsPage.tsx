import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { LANGUAGE_LIST, LangCode, setLanguage } from "@/i18n";
import {
  ChevronLeft, ChevronRight, Globe, Bell, FileText, Shield,
  LogOut, Trash2, AlertTriangle, X, Lock, Heart, MessageCircle,
  Star, CalendarDays, Smartphone,
} from "lucide-react";
import type { SafeUser } from "@shared/schema";

const COMMUNITY_GUIDELINES = [
  {
    title: "1. Respect the Yezidi Faith",
    body: "Members must respect and honour the Yezidi religion, its sacred traditions, figures, and practices. Any mockery, disrespect, or misrepresentation is strictly forbidden and may result in immediate account removal.",
  },
  {
    title: "2. Honour the Community",
    body: "Treat every member with dignity and respect. Harassment, discrimination, abusive language, or any behaviour that brings shame to the community will not be tolerated.",
  },
  {
    title: "3. Be Honest",
    body: "You must represent yourself truthfully. Fake photos, false names, or misleading information is a serious violation. Gûstîlk is built on trust.",
  },
  {
    title: "4. Caste Integrity",
    body: "You must register under your true caste — Sheikh, Pir, or Mirid. Misrepresenting your caste is a grave dishonour and will result in account deletion.",
  },
  {
    title: "5. No Harmful Content",
    body: "Sharing explicit, offensive, or inappropriate content is prohibited — including photos, messages, or media that conflicts with Yezidi values.",
  },
  {
    title: "6. Serious Intentions",
    body: "Gûstîlk is for genuine connection with the intention of marriage. It must not be used for casual encounters or purposes conflicting with community values.",
  },
  {
    title: "7. Privacy & Safety",
    body: "Do not share another member's personal information without consent. Report any behaviour that makes you or others feel unsafe.",
  },
  {
    title: "8. Account Suspension",
    body: "Violations of these guidelines may result in a temporary suspension or permanent removal of your account. Gûstîlk reserves the right to remove any member who endangers the safety or integrity of the community.",
  },
];

const PRIVACY_POLICY = [
  {
    title: "Data We Collect",
    body: "We collect the information you provide when creating your profile: name, age, location, photos, and caste. We also collect usage data to improve the app experience.",
  },
  {
    title: "How We Use Your Data",
    body: "Your profile information is used to match you with compatible members. Your verification selfie is only visible to our admin team and is never shared publicly.",
  },
  {
    title: "Data Storage",
    body: "Your data is stored securely on encrypted servers. Profile photos are stored as compressed images. We do not sell your personal information to third parties.",
  },
  {
    title: "Account Deletion",
    body: "When you delete your account, all your personal data, photos, matches, and messages are permanently removed from our servers within 30 days.",
  },
  {
    title: "Contact",
    body: "For privacy-related questions or data requests, please contact our support team through the app's help section.",
  },
];

const NOTIF_STORAGE_KEY = "gustilk_notif_prefs";

interface NotifPrefs {
  pushEnabled: boolean;
  newMatches: boolean;
  newMessages: boolean;
  newLikes: boolean;
  events: boolean;
}

function loadNotifPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw) return { ...defaultNotifPrefs(), ...JSON.parse(raw) };
  } catch {}
  return defaultNotifPrefs();
}

function defaultNotifPrefs(): NotifPrefs {
  return { pushEnabled: false, newMatches: true, newMessages: true, newLikes: true, events: false };
}

function saveNotifPrefs(prefs: NotifPrefs) {
  localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(prefs));
}

interface Props { user: SafeUser }

type SubScreen = null | "guidelines" | "privacy" | "language" | "notifications";

export default function SettingsPage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [subScreen, setSubScreen] = useState<SubScreen>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(loadNotifPrefs);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");

  const currentLang = LANGUAGE_LIST.find(l => l.code === i18n.language) ?? LANGUAGE_LIST[0];

  useEffect(() => {
    if ("Notification" in window) setPushPermission(Notification.permission);
  }, []);

  const updatePref = (key: keyof NotifPrefs, value: boolean) => {
    setNotifPrefs(prev => {
      const next = { ...prev, [key]: value };
      saveNotifPrefs(next);
      return next;
    });
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (!enabled) {
      updatePref("pushEnabled", false);
      toast({ title: "Push notifications off", description: "You won't receive push notifications." });
      return;
    }
    if (!("Notification" in window)) {
      updatePref("pushEnabled", true);
      toast({ title: "Preference saved", description: "Open the app directly in your browser (not inside a preview) to activate push notifications." });
      return;
    }
    if (Notification.permission === "denied") {
      toast({ title: "Permission blocked", description: "Enable notifications for this site in your browser settings, then try again.", variant: "destructive" });
      return;
    }
    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    if (permission === "granted") {
      updatePref("pushEnabled", true);
      toast({ title: "Push notifications on", description: "You'll be notified about new matches and messages." });
    } else {
      toast({ title: "Permission not granted", description: "Enable notifications in your browser settings to receive alerts.", variant: "destructive" });
    }
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/account");
      if (!res.ok) throw new Error("Failed to delete account");
      return res.json();
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
    onError: () => {
      toast({ title: "Could not delete account", description: "Please try again.", variant: "destructive" });
      setShowDeleteConfirm(false);
    },
  });

  if (subScreen === "guidelines") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0d0618" }}>
        <div className="flex items-center gap-3 px-5 pt-12 pb-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
          <button
            onClick={() => setSubScreen(null)}
            data-testid="button-back-guidelines"
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <ChevronLeft size={18} color="rgba(253,248,240,0.7)" />
          </button>
          <h1 className="font-serif text-xl text-gold">Community Guidelines</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-16 space-y-5">
          <p className="text-cream/50 text-sm leading-relaxed">
            By using Gûstîlk, you agree to uphold these principles. They exist to protect our community's honour, safety, and the sacred values of the Yezidi faith.
          </p>
          {COMMUNITY_GUIDELINES.map((g, i) => (
            <div key={i} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.1)" }}>
              <p className="text-gold text-sm font-semibold mb-1.5">{g.title}</p>
              <p className="text-cream/60 text-sm leading-relaxed">{g.body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (subScreen === "privacy") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0d0618" }}>
        <div className="flex items-center gap-3 px-5 pt-12 pb-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
          <button
            onClick={() => setSubScreen(null)}
            data-testid="button-back-privacy"
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <ChevronLeft size={18} color="rgba(253,248,240,0.7)" />
          </button>
          <h1 className="font-serif text-xl text-gold">Privacy Policy</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-16 space-y-5">
          <p className="text-cream/50 text-sm leading-relaxed">
            Your privacy matters. Here is how Gûstîlk handles your personal data.
          </p>
          {PRIVACY_POLICY.map((p, i) => (
            <div key={i} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.1)" }}>
              <p className="text-gold text-sm font-semibold mb-1.5">{p.title}</p>
              <p className="text-cream/60 text-sm leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (subScreen === "language") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0d0618" }}>
        <div className="flex items-center gap-3 px-5 pt-12 pb-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
          <button
            onClick={() => setSubScreen(null)}
            data-testid="button-back-language"
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <ChevronLeft size={18} color="rgba(253,248,240,0.7)" />
          </button>
          <h1 className="font-serif text-xl text-gold">{t("profile.changeLanguage")}</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-2.5">
            {LANGUAGE_LIST.map(({ code, native, flag }) => {
              const isActive = code === i18n.language;
              const isImage = typeof flag === "string" && flag.startsWith("/");
              return (
                <button
                  key={code}
                  data-testid={`button-lang-switch-${code}`}
                  onClick={() => { setLanguage(code as LangCode); setSubScreen(null); }}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left"
                  style={{
                    background: isActive ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)",
                    border: isActive ? "1.5px solid rgba(201,168,76,0.5)" : "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {isImage
                    ? <img src={flag} alt={code} className="w-7 h-5 object-cover rounded flex-shrink-0" />
                    : <span className="text-2xl flex-shrink-0">{flag}</span>
                  }
                  <span className="text-sm font-medium truncate" style={{ color: isActive ? "#c9a84c" : "rgba(253,248,240,0.75)" }}>
                    {native}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (subScreen === "notifications") {
    const pushBlocked = pushPermission === "denied";
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0d0618" }}>
        <div className="flex items-center gap-3 px-5 pt-12 pb-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
          <button
            onClick={() => setSubScreen(null)}
            data-testid="button-back-notifications"
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <ChevronLeft size={18} color="rgba(253,248,240,0.7)" />
          </button>
          <h1 className="font-serif text-xl text-gold">Notifications</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 pb-16 space-y-5">

          {/* Push toggle */}
          <div>
            <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">Push Notifications</p>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}>
              <NotifToggleRow
                icon={Smartphone}
                label="Enable push notifications"
                sub={pushBlocked ? "Blocked — enable in browser settings" : "Receive alerts on your device"}
                checked={notifPrefs.pushEnabled && !pushBlocked}
                disabled={pushBlocked}
                testId="toggle-push-enabled"
                onChange={handlePushToggle}
              />
            </div>
            {pushBlocked && (
              <p className="text-xs mt-2 pl-1" style={{ color: "rgba(239,68,68,0.7)" }}>
                Push notifications are blocked. Go to your browser settings → Site permissions → Notifications and allow Gûstîlk.
              </p>
            )}
          </div>

          {/* In-app alerts */}
          <div>
            <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">Alert Types</p>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}>
              <NotifToggleRow
                icon={Heart}
                label="New matches"
                sub="When someone matches with you"
                checked={notifPrefs.newMatches}
                testId="toggle-new-matches"
                onChange={v => updatePref("newMatches", v)}
              />
              <NotifDivider />
              <NotifToggleRow
                icon={MessageCircle}
                label="New messages"
                sub="When a match sends you a message"
                checked={notifPrefs.newMessages}
                testId="toggle-new-messages"
                onChange={v => updatePref("newMessages", v)}
              />
              <NotifDivider />
              <NotifToggleRow
                icon={Star}
                label="Likes"
                sub="When someone likes your profile"
                checked={notifPrefs.newLikes}
                testId="toggle-new-likes"
                onChange={v => updatePref("newLikes", v)}
              />
              <NotifDivider />
              <NotifToggleRow
                icon={CalendarDays}
                label="Community events"
                sub="Upcoming events near you"
                checked={notifPrefs.events}
                testId="toggle-events"
                onChange={v => updatePref("events", v)}
              />
            </div>
          </div>

          <p className="text-xs text-cream/30 text-center px-4 leading-relaxed">
            Notification preferences are saved on this device. Enabling push notifications will ask for your browser's permission.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ background: "#0d0618" }}>
      <div className="flex items-center gap-3 px-5 pt-12 pb-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
        <button
          onClick={() => setLocation("/profile")}
          data-testid="button-back-settings"
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ChevronLeft size={18} color="rgba(253,248,240,0.7)" />
        </button>
        <h1 className="font-serif text-2xl text-gold">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 space-y-4">

        {/* ── Preferences ── */}
        <div>
          <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">Preferences</p>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}>
            <Row icon={Globe} label={t("profile.language")} sub={`${currentLang.flag} ${currentLang.native}`} onClick={() => setSubScreen("language")} testId="button-settings-language" />
            <Divider />
            <Row
              icon={Bell}
              label="Notifications"
              sub="Manage push notifications"
              onClick={() => setSubScreen("notifications")}
              testId="button-settings-notifications"
            />
          </div>
        </div>

        {/* ── Legal ── */}
        <div>
          <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">Legal</p>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}>
            <Row icon={FileText} label="Community Guidelines" sub="Read our full community rules" onClick={() => setSubScreen("guidelines")} testId="button-settings-guidelines" />
            <Divider />
            <Row icon={Lock} label="Privacy Policy" sub="How we handle your data" onClick={() => setSubScreen("privacy")} testId="button-settings-privacy" />
          </div>
        </div>

        {/* ── Admin ── */}
        {user.isAdmin && (
          <div>
            <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">Admin</p>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}>
              <Row icon={Shield} label="Admin Panel" sub="Manage verification requests" onClick={() => setLocation("/admin")} testId="button-settings-admin" />
            </div>
          </div>
        )}

        {/* ── Account ── */}
        <div>
          <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">Account</p>
          <div className="space-y-2">
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
              className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <LogOut size={16} />
              {logoutMutation.isPending ? "Signing out…" : t("profile.logout")}
            </button>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                data-testid="button-delete-account"
                className="w-full py-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2"
                style={{ background: "transparent", color: "rgba(239,68,68,0.4)", border: "1px solid rgba(239,68,68,0.1)" }}
              >
                <Trash2 size={13} />
                Delete Account
              </button>
            ) : (
              <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <div className="flex items-start gap-2.5 mb-3">
                  <AlertTriangle size={15} color="#ef4444" className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>Delete your account?</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(253,248,240,0.45)" }}>
                      This permanently deletes your profile, photos, matches and messages. This cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    data-testid="button-cancel-delete"
                    className="flex-1 py-2.5 rounded-lg text-xs font-semibold"
                    style={{ background: "rgba(255,255,255,0.07)", color: "rgba(253,248,240,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteAccountMutation.mutate()}
                    disabled={deleteAccountMutation.isPending}
                    data-testid="button-confirm-delete"
                    className="flex-1 py-2.5 rounded-lg text-xs font-bold disabled:opacity-50"
                    style={{ background: "#ef4444", color: "white" }}
                  >
                    {deleteAccountMutation.isPending ? "Deleting…" : "Yes, Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs pb-4" style={{ color: "rgba(253,248,240,0.15)" }}>Gûstîlk · Yezidi Community</p>
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} />;
}

function NotifDivider() {
  return <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} />;
}

function Row({ icon: Icon, label, sub, onClick, testId }: {
  icon: any; label: string; sub: string; onClick: () => void; testId: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="w-full flex items-center gap-4 px-4 py-3.5 transition-all text-left"
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.1)" }}>
        <Icon size={16} color="#c9a84c" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "rgba(253,248,240,0.85)" }}>{label}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(253,248,240,0.35)" }}>{sub}</p>
      </div>
      <ChevronRight size={15} color="rgba(253,248,240,0.2)" />
    </button>
  );
}

function NotifToggleRow({ icon: Icon, label, sub, checked, onChange, testId, disabled = false }: {
  icon: any; label: string; sub: string; checked: boolean;
  onChange: (v: boolean) => void; testId: string; disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.1)" }}>
        <Icon size={16} color={disabled ? "rgba(201,168,76,0.3)" : "#c9a84c"} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: disabled ? "rgba(253,248,240,0.35)" : "rgba(253,248,240,0.85)" }}>{label}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(253,248,240,0.35)" }}>{sub}</p>
      </div>
      <button
        data-testid={testId}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40"
        style={{ background: checked && !disabled ? "#c9a84c" : "rgba(255,255,255,0.12)" }}
        aria-checked={checked}
        role="switch"
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200"
          style={{
            background: "white",
            transform: checked && !disabled ? "translateX(20px)" : "translateX(0)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </button>
    </div>
  );
}
