import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { LANGUAGE_LIST, LangCode, setLanguage } from "@/i18n";
import {
  ChevronLeft, ChevronRight, Globe, Bell, FileText, Shield,
  LogOut, Trash2, AlertTriangle, Lock, Heart, MessageCircle,
  Star, CalendarDays, Smartphone, Mail, KeyRound, Phone, Eye, EyeOff, CheckCircle2, ShieldX, UserX,
  Cookie, ShieldCheck, ShieldAlert, ImageOff,
} from "lucide-react";
import type { SafeUser } from "@shared/schema";

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

type SubScreen = null | "guidelines" | "privacy" | "language" | "notifications" | "account" | "blocked-users";

interface TranslatedSection { title: string; body: string; }

export default function SettingsPage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [subScreen, setSubScreen] = useState<SubScreen>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(loadNotifPrefs);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");

  const [profileVisible, setProfileVisible] = useState<boolean>(user.profileVisible ?? true);
  const [photosBlurred, setPhotosBlurred] = useState<boolean>(user.photosBlurred ?? false);

  const privacyMutation = useMutation({
    mutationFn: (data: { profileVisible?: boolean; photosBlurred?: boolean }) =>
      apiRequest("PATCH", "/api/me", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Privacy settings saved", description: "Your changes have been applied." });
    },
    onError: () => {
      toast({ title: "Could not save", description: "Please try again.", variant: "destructive" });
    },
  });

  const currentLang = LANGUAGE_LIST.find(l => l.code === i18n.language) ?? LANGUAGE_LIST[0];

  const guidelineSections: TranslatedSection[] = [
    ...(t("agreement.sections", { returnObjects: true }) as TranslatedSection[]),
    { title: t("settings.guidelinesSection8Title"), body: t("settings.guidelinesSection8Body") },
  ];

  const privacySections: TranslatedSection[] = t("settings.privacySections", { returnObjects: true }) as TranslatedSection[];

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
      toast({ title: t("settings.pushOffTitle"), description: t("settings.pushOffDesc") });
      return;
    }
    if (!("Notification" in window)) {
      updatePref("pushEnabled", true);
      toast({ title: t("settings.prefSavedTitle"), description: t("settings.prefSavedDesc") });
      return;
    }
    if (Notification.permission === "denied") {
      toast({ title: t("settings.permBlockedTitle"), description: t("settings.permBlockedDesc"), variant: "destructive" });
      return;
    }
    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    if (permission === "granted") {
      updatePref("pushEnabled", true);
      toast({ title: t("settings.pushOnTitle"), description: t("settings.pushOnDesc") });
    } else {
      toast({ title: t("settings.permNotGrantedTitle"), description: t("settings.permNotGrantedDesc"), variant: "destructive" });
    }
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/account");
      if (!res.ok) throw new Error("Failed to delete account");
      return res.json();
    },
    onSuccess: () => {
      localStorage.removeItem("gustilk_email");
      localStorage.removeItem("gustilk_phone");
      localStorage.removeItem("gustilk_country_iso");
      queryClient.clear();
      window.location.href = "/";
    },
    onError: () => {
      toast({ title: t("settings.couldNotDelete"), description: t("common.error"), variant: "destructive" });
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
          <h1 className="font-serif text-xl text-gold">{t("settings.guidelinesPageTitle")}</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-16 space-y-5">
          <p className="text-cream/50 text-sm leading-relaxed">
            {t("settings.guidelinesIntro")}
          </p>
          {guidelineSections.map((g, i) => (
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
    const isFemale = user.gender === "female";

    const handleProfileVisibleToggle = (val: boolean) => {
      const prev = profileVisible;
      setProfileVisible(val);
      privacyMutation.mutate({ profileVisible: val }, { onError: () => setProfileVisible(prev) });
    };

    const handlePhotosBlurredToggle = (val: boolean) => {
      const prev = photosBlurred;
      setPhotosBlurred(val);
      privacyMutation.mutate({ photosBlurred: val }, { onError: () => setPhotosBlurred(prev) });
    };

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
          <h1 className="font-serif text-xl text-gold">{t("settings.privacyPageTitle")}</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-16 space-y-5">

          {/* Female-only privacy controls */}
          {isFemale && (
            <div>
              <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">Profile Controls</p>
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.15)", background: "rgba(255,255,255,0.03)" }}>
                {/* Profile Visibility */}
                <div className="flex items-center gap-4 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.1)" }}>
                    <Eye size={16} color="#c9a84c" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "rgba(253,248,240,0.85)" }}>Profile visible to others</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(253,248,240,0.35)" }}>
                      {profileVisible ? "Your profile appears in the discover feed" : "Your profile is hidden from discover"}
                    </p>
                  </div>
                  <button
                    data-testid="toggle-settings-profile-visible"
                    onClick={() => handleProfileVisibleToggle(!profileVisible)}
                    disabled={privacyMutation.isPending}
                    className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50"
                    style={{ background: profileVisible ? "#c9a84c" : "rgba(255,255,255,0.12)" }}
                    aria-checked={profileVisible}
                    role="switch"
                  >
                    <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200"
                      style={{ background: "white", transform: profileVisible ? "translateX(20px)" : "translateX(0)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                  </button>
                </div>

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} />

                {/* Photo blur toggle */}
                <div className="flex items-center gap-4 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.1)" }}>
                    <ImageOff size={16} color="#c9a84c" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "rgba(253,248,240,0.85)" }}>Blur photos until matched</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(253,248,240,0.35)" }}>
                      {photosBlurred ? "Photos are blurred until you both like each other" : "Photos are visible to all who view your profile"}
                    </p>
                  </div>
                  <button
                    data-testid="toggle-settings-photos-blurred"
                    onClick={() => handlePhotosBlurredToggle(!photosBlurred)}
                    disabled={privacyMutation.isPending}
                    className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50"
                    style={{ background: photosBlurred ? "#c9a84c" : "rgba(255,255,255,0.12)" }}
                    aria-checked={photosBlurred}
                    role="switch"
                  >
                    <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200"
                      style={{ background: "white", transform: photosBlurred ? "translateX(20px)" : "translateX(0)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-cream/30 px-1 mt-2 leading-relaxed">
                These settings apply to your profile only and can be changed at any time.
              </p>
            </div>
          )}

          <p className="text-cream/50 text-sm leading-relaxed">
            {t("settings.privacyIntro")}
          </p>
          {privacySections.map((p, i) => (
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
          <h1 className="font-serif text-xl text-gold">{t("settings.notifPageTitle")}</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 pb-16 space-y-5">

          <div>
            <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">{t("settings.pushSection")}</p>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}>
              <NotifToggleRow
                icon={Smartphone}
                label={t("settings.pushEnable")}
                sub={pushBlocked ? t("settings.pushBlockedSub") : t("settings.pushReceiveSub")}
                checked={notifPrefs.pushEnabled && !pushBlocked}
                disabled={pushBlocked}
                testId="toggle-push-enabled"
                onChange={handlePushToggle}
              />
            </div>
            {pushBlocked && (
              <p className="text-xs mt-2 pl-1" style={{ color: "rgba(239,68,68,0.7)" }}>
                {t("settings.pushBlockedWarning")}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">{t("settings.alertTypesSection")}</p>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}>
              <NotifToggleRow
                icon={Heart}
                label={t("settings.newMatches")}
                sub={t("settings.newMatchesSub")}
                checked={notifPrefs.newMatches}
                testId="toggle-new-matches"
                onChange={v => updatePref("newMatches", v)}
              />
              <NotifDivider />
              <NotifToggleRow
                icon={MessageCircle}
                label={t("settings.newMessages")}
                sub={t("settings.newMessagesSub")}
                checked={notifPrefs.newMessages}
                testId="toggle-new-messages"
                onChange={v => updatePref("newMessages", v)}
              />
              <NotifDivider />
              <NotifToggleRow
                icon={Star}
                label={t("settings.likesItem")}
                sub={t("settings.likesSub")}
                checked={notifPrefs.newLikes}
                testId="toggle-new-likes"
                onChange={v => updatePref("newLikes", v)}
              />
              <NotifDivider />
              <NotifToggleRow
                icon={CalendarDays}
                label={t("settings.communityEventsItem")}
                sub={t("settings.communityEventsSub")}
                checked={notifPrefs.events}
                testId="toggle-events"
                onChange={v => updatePref("events", v)}
              />
            </div>
          </div>

          <p className="text-xs text-cream/30 text-center px-4 leading-relaxed">
            {t("settings.notifFooter")}
          </p>
        </div>
      </div>
    );
  }

  if (subScreen === "account") {
    return <AccountSecurityScreen user={user} onBack={() => setSubScreen(null)} />;
  }

  if (subScreen === "blocked-users") {
    return <BlockedUsersScreen onBack={() => setSubScreen(null)} />;
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
        <h1 className="font-serif text-2xl text-gold">{t("settings.title")}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 space-y-4">

        <div>
          <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">{t("settings.preferencesSection")}</p>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}>
            <Row icon={Globe} label={t("profile.language")} sub={`${currentLang.flag} ${currentLang.native}`} onClick={() => setSubScreen("language")} testId="button-settings-language" />
            <Divider />
            <Row
              icon={Bell}
              label={t("settings.notifMenuItem")}
              sub={t("settings.notifMenuSub")}
              onClick={() => setSubScreen("notifications")}
              testId="button-settings-notifications"
            />
          </div>
        </div>

        <div>
          <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">Account Security</p>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}>
            <Row icon={KeyRound} label="Email, Password & Phone" sub="Change your login credentials" onClick={() => setSubScreen("account")} testId="button-settings-account" />
            <Divider />
            <Row icon={ShieldX} label="Blocked Users" sub="Manage who you've blocked" onClick={() => setSubScreen("blocked-users")} testId="button-settings-blocked" />
          </div>
        </div>

        <div>
          <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">Legal & Safety</p>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}>
            <Row icon={FileText} label={t("settings.guidelinesMenuItem")} sub={t("settings.guidelinesMenuSub")} onClick={() => setSubScreen("guidelines")} testId="button-settings-guidelines" />
            <Divider />
            <Row icon={Lock} label={t("settings.privacyMenuItem")} sub={t("settings.privacyMenuSub")} onClick={() => setSubScreen("privacy")} testId="button-settings-privacy" />
            <Divider />
            <Row icon={Cookie} label="Cookie Policy" sub="How we use cookies and tracking" onClick={() => setLocation("/cookie-policy")} testId="button-settings-cookie-policy" />
            <Divider />
            <Row icon={ShieldCheck} label="GDPR Privacy Notice" sub="Your rights under EU & UK data law" onClick={() => setLocation("/gdpr")} testId="button-settings-gdpr" />
            <Divider />
            <Row icon={ShieldAlert} label="Safety Tips" sub="Stay safe while using Gûstîlk" onClick={() => setLocation("/safety-tips")} testId="button-settings-safety-tips" />
          </div>
        </div>

        {user.isAdmin && (
          <div>
            <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">{t("settings.adminSection")}</p>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}>
              <Row icon={Shield} label={t("settings.adminPanelItem")} sub={t("settings.adminPanelSub")} onClick={() => setLocation("/admin")} testId="button-settings-admin" />
            </div>
          </div>
        )}

        <div>
          <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">{t("settings.accountSection")}</p>
          <div className="space-y-2">
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
              className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <LogOut size={16} />
              {logoutMutation.isPending ? t("settings.signingOut") : t("profile.logout")}
            </button>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                data-testid="button-delete-account"
                className="w-full py-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2"
                style={{ background: "transparent", color: "rgba(239,68,68,0.4)", border: "1px solid rgba(239,68,68,0.1)" }}
              >
                <Trash2 size={13} />
                {t("profile.deleteAccount")}
              </button>
            ) : (
              <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <div className="flex items-start gap-2.5 mb-3">
                  <AlertTriangle size={15} color="#ef4444" className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>{t("settings.deleteConfirmTitle")}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(253,248,240,0.45)" }}>
                      {t("settings.deleteConfirmDesc")}
                    </p>
                  </div>
                </div>
                {user.isPremium && (
                  <div className="flex items-start gap-2 mb-3 px-3 py-2.5 rounded-lg"
                    style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)" }}>
                    <Star size={13} color="#c9a84c" className="flex-shrink-0 mt-0.5" />
                    <p className="text-xs" style={{ color: "rgba(201,168,76,0.85)" }}>
                      You have an active Premium membership. Deleting your account will permanently cancel it with no refund.
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    data-testid="button-cancel-delete"
                    className="flex-1 py-2.5 rounded-lg text-xs font-semibold"
                    style={{ background: "rgba(255,255,255,0.07)", color: "rgba(253,248,240,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={() => deleteAccountMutation.mutate()}
                    disabled={deleteAccountMutation.isPending}
                    data-testid="button-confirm-delete"
                    className="flex-1 py-2.5 rounded-lg text-xs font-bold disabled:opacity-50"
                    style={{ background: "#ef4444", color: "white" }}
                  >
                    {deleteAccountMutation.isPending ? t("settings.deleting") : t("common.yes")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs pb-4" style={{ color: "rgba(253,248,240,0.15)" }}>{t("settings.footer")}</p>
      </div>
    </div>
  );
}

function AccountSecurityScreen({ user, onBack }: { user: SafeUser; onBack: () => void }) {
  const [emailForm, setEmailForm] = useState({ newEmail: "", currentPassword: "" });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailDone, setEmailDone] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [phoneForm, setPhoneForm] = useState({ newPhone: user.phone ?? "" });
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneDone, setPhoneDone] = useState(false);

  const parseError = async (err: any) => {
    const raw: string = err.message?.match(/\d+: (.+)/)?.[1] || err.message || "Something went wrong";
    try { return JSON.parse(raw).message || raw; } catch { return raw; }
  };

  const emailMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/auth/change-email", emailForm).then(r => r.json()),
    onSuccess: () => { setEmailDone(true); setEmailError(null); queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }); },
    onError: async (err: any) => setEmailError(await parseError(err)),
  });

  const pwMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/auth/change-password", { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }).then(r => r.json()),
    onSuccess: () => { setPwDone(true); setPwError(null); },
    onError: async (err: any) => setPwError(await parseError(err)),
  });

  const phoneMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/auth/change-phone", { newPhone: phoneForm.newPhone }).then(r => r.json()),
    onSuccess: () => { setPhoneDone(true); setPhoneError(null); queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }); },
    onError: async (err: any) => setPhoneError(await parseError(err)),
  });

  const inputStyle = {
    background: "rgba(255,255,255,0.07)",
    border: "1.5px solid rgba(201,168,76,0.25)",
    color: "#fdf8f0",
  };
  const inputClass = "w-full px-4 py-3 rounded-xl text-sm placeholder-cream/25 outline-none";
  const labelClass = "block text-cream/50 text-xs font-semibold mb-1.5 uppercase tracking-wider";
  const errorClass = "text-xs mt-1.5 font-medium";
  const sectionStyle = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.1)" };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0d0618" }}>
      <div className="flex items-center gap-3 px-5 pt-12 pb-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
        <button onClick={onBack} data-testid="button-back-account" className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronLeft size={18} color="rgba(253,248,240,0.7)" />
        </button>
        <h1 className="font-serif text-xl text-gold">Account Security</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 pb-20 space-y-5">

        {/* Change Email */}
        <div className="rounded-2xl p-4 space-y-3" style={sectionStyle}>
          <div className="flex items-center gap-2 mb-1">
            <Mail size={16} color="#c9a84c" />
            <p className="text-sm font-semibold text-gold">Change Email</p>
          </div>
          <p className="text-xs text-cream/40 -mt-1">Current: {user.email ?? "Not set"}</p>
          {emailDone ? (
            <div className="flex items-center gap-2 py-2" style={{ color: "#10b981" }}>
              <CheckCircle2 size={16} /><span className="text-sm font-medium">Email updated successfully</span>
            </div>
          ) : (
            <>
              <div>
                <label className={labelClass}>New Email</label>
                <input type="email" value={emailForm.newEmail} onChange={e => { setEmailForm(f => ({ ...f, newEmail: e.target.value })); setEmailError(null); }}
                  placeholder="new@email.com" data-testid="input-new-email" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass}>Current Password</label>
                <input type="password" value={emailForm.currentPassword} onChange={e => { setEmailForm(f => ({ ...f, currentPassword: e.target.value })); setEmailError(null); }}
                  placeholder="Confirm with your password" data-testid="input-email-current-password" className={inputClass} style={inputStyle} />
              </div>
              {emailError && <p className={errorClass} style={{ color: "#d4608a" }}>{emailError}</p>}
              <button onClick={() => emailMutation.mutate()} disabled={!emailForm.newEmail || !emailForm.currentPassword || emailMutation.isPending}
                data-testid="button-save-email" className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}>
                {emailMutation.isPending ? "Saving…" : "Update Email"}
              </button>
            </>
          )}
        </div>

        {/* Change Password */}
        <div className="rounded-2xl p-4 space-y-3" style={sectionStyle}>
          <div className="flex items-center gap-2 mb-1">
            <KeyRound size={16} color="#c9a84c" />
            <p className="text-sm font-semibold text-gold">Change Password</p>
          </div>
          {pwDone ? (
            <div className="flex items-center gap-2 py-2" style={{ color: "#10b981" }}>
              <CheckCircle2 size={16} /><span className="text-sm font-medium">Password changed successfully</span>
            </div>
          ) : (
            <>
              <div>
                <label className={labelClass}>Current Password</label>
                <div className="relative">
                  <input type={showCurrent ? "text" : "password"} value={pwForm.currentPassword} onChange={e => { setPwForm(f => ({ ...f, currentPassword: e.target.value })); setPwError(null); }}
                    placeholder="Enter current password" data-testid="input-current-password" className={`${inputClass} pr-11`} style={inputStyle} />
                  <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40">
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>New Password</label>
                <div className="relative">
                  <input type={showNew ? "text" : "password"} value={pwForm.newPassword} onChange={e => { setPwForm(f => ({ ...f, newPassword: e.target.value })); setPwError(null); }}
                    placeholder="At least 6 characters" data-testid="input-new-password" className={`${inputClass} pr-11`} style={inputStyle} />
                  <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40">
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Confirm New Password</label>
                <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Repeat new password" data-testid="input-confirm-new-password" className={inputClass} style={{
                    ...inputStyle,
                    border: pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword ? "1.5px solid rgba(212,96,138,0.7)" : inputStyle.border
                  }} />
                {pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword && (
                  <p className={errorClass} style={{ color: "#d4608a" }}>Passwords do not match</p>
                )}
              </div>
              {pwError && <p className={errorClass} style={{ color: "#d4608a" }}>{pwError}</p>}
              <button onClick={() => pwMutation.mutate()}
                disabled={!pwForm.currentPassword || !pwForm.newPassword || pwForm.newPassword !== pwForm.confirmPassword || pwMutation.isPending}
                data-testid="button-save-password" className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}>
                {pwMutation.isPending ? "Saving…" : "Update Password"}
              </button>
            </>
          )}
        </div>

        {/* Change Phone */}
        <div className="rounded-2xl p-4 space-y-3" style={sectionStyle}>
          <div className="flex items-center gap-2 mb-1">
            <Phone size={16} color="#c9a84c" />
            <p className="text-sm font-semibold text-gold">Change Phone Number</p>
          </div>
          <p className="text-xs text-cream/40 -mt-1">Current: {user.phone ?? "Not set"}</p>
          {phoneDone ? (
            <div className="flex items-center gap-2 py-2" style={{ color: "#10b981" }}>
              <CheckCircle2 size={16} /><span className="text-sm font-medium">Phone number updated successfully</span>
            </div>
          ) : (
            <>
              <div>
                <label className={labelClass}>New Phone Number</label>
                <input type="tel" value={phoneForm.newPhone} onChange={e => { setPhoneForm({ newPhone: e.target.value }); setPhoneError(null); }}
                  placeholder="+1 555 000 0000" data-testid="input-new-phone" className={inputClass} style={inputStyle} />
              </div>
              {phoneError && <p className={errorClass} style={{ color: "#d4608a" }}>{phoneError}</p>}
              <button onClick={() => phoneMutation.mutate()} disabled={!phoneForm.newPhone || phoneMutation.isPending}
                data-testid="button-save-phone" className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}>
                {phoneMutation.isPending ? "Saving…" : "Update Phone"}
              </button>
            </>
          )}
        </div>

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

function BlockedUsersScreen({ onBack }: { onBack: () => void }) {
  const { data, isLoading } = useQuery<{ users: SafeUser[] }>({
    queryKey: ["/api/blocks"],
  });

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("DELETE", `/api/users/${userId}/block`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    },
  });

  const blockedUsers = data?.users ?? [];

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ background: "#0d0618" }}>
      <div className="flex items-center gap-3 px-5 pt-12 pb-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
        <button
          onClick={onBack}
          data-testid="button-back-blocked"
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ChevronLeft size={18} color="rgba(253,248,240,0.7)" />
        </button>
        <div>
          <h1 className="font-serif text-2xl text-gold">Blocked Users</h1>
          <p className="text-cream/40 text-xs mt-0.5">
            {isLoading ? "Loading…" : `${blockedUsers.length} ${blockedUsers.length === 1 ? "person" : "people"} blocked`}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : blockedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}
            >
              <ShieldX size={24} color="rgba(201,168,76,0.4)" />
            </div>
            <p className="text-cream/40 text-sm text-center">You haven't blocked anyone</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map(u => (
              <div
                key={u.id}
                data-testid={`blocked-user-${u.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.08)" }}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    {u.mainPhotoUrl ? (
                      <img src={u.mainPhotoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserX size={20} color="rgba(253,248,240,0.3)" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-cream font-medium text-sm truncate">{u.firstName ?? u.fullName?.split(" ")[0] ?? "Member"}</p>
                  {u.age && <p className="text-cream/40 text-xs">{u.age} years old</p>}
                </div>
                <button
                  onClick={() => unblockMutation.mutate(u.id)}
                  disabled={unblockMutation.isPending}
                  data-testid={`button-unblock-${u.id}`}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                  style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.2)" }}
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
