import { useState, useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isNative, restoreIAPPurchases } from "@/lib/purchases";
import { useTranslation } from "react-i18next";
import { LANGUAGE_LIST, LangCode, setLanguage } from "@/i18n";
import {
  ChevronLeft, ChevronRight, Globe, Bell, FileText, Shield,
  LogOut, Trash2, AlertTriangle, Lock, Heart, MessageCircle,
  Star, CalendarDays, Smartphone, Mail, KeyRound, Phone, Eye, EyeOff, CheckCircle2, ShieldX, UserX,
  Cookie, ShieldCheck, ShieldAlert, ImageOff, LifeBuoy, RefreshCw, Crown,
  Lightbulb, ThumbsUp, HelpCircle, ScrollText, Info, Settings2, Send,
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

type SubScreen = null | "guidelines" | "privacy" | "language" | "notifications" | "account" | "blocked-users" | "faq" | "feature-request" | "feedback" | "subscription-terms";

interface TranslatedSection { title: string; body: string; }

export default function SettingsPage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [subScreen, setSubScreen] = useState<SubScreen>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(loadNotifPrefs);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");

  const [photosBlurred, setPhotosBlurred] = useState<boolean>(user.photosBlurred ?? false);

  const privacyMutation = useMutation({
    mutationFn: (data: { photosBlurred?: boolean }) =>
      apiRequest("PATCH", "/api/me", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Privacy settings saved", description: "Your changes have been applied." });
    },
    onError: () => {
      toast({ title: "Could not save", description: "Please try again.", variant: "destructive" });
    },
  });

  const { data: matchesData } = useQuery<{ matches: any[] }>({ queryKey: ["/api/matches"] });
  const supportMatch = matchesData?.matches?.find((m: any) => m.otherUser?.isSystemAccount);

  const startSupportMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/support/start")).json(),
    onSuccess: (data: { matchId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      setLocation(`/chat/${data.matchId}?support=1&from=settings`);
    },
    onError: () => toast({ title: "Could not open support chat", variant: "destructive" }),
  });

  function openSupportChat() {
    if (supportMatch) {
      setLocation(`/chat/${supportMatch.id}?support=1&from=settings`);
    } else {
      startSupportMutation.mutate();
    }
  }

  const restoreMutation = useMutation({
    mutationFn: async (): Promise<{ restored: boolean; isPremium: boolean; premiumUntil: string | null; message: string }> => {
      if (isNative()) {
        const rcResult = await restoreIAPPurchases();
        if (!rcResult.restored) {
          return { restored: false, isPremium: false, premiumUntil: null, message: rcResult.error ?? "No active subscription found." };
        }
      }
      return (await apiRequest("POST", "/api/premium/restore")).json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      if (data.restored) {
        toast({
          title: "Premium Restored",
          description: data.premiumUntil
            ? `Active until ${new Date(data.premiumUntil).toLocaleDateString()}`
            : "Your Premium membership is active.",
        });
      } else {
        toast({
          title: "No Active Subscription",
          description: "We couldn't find an active subscription linked to your account.",
          variant: "destructive",
        });
      }
    },
    onError: () => toast({ title: "Restore failed", description: "Please try again.", variant: "destructive" }),
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
              <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">{t("settings.photoPrivacy")}</p>
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.15)", background: "rgba(255,255,255,0.03)" }}>
                {/* Photo blur toggle */}
                <div className="flex items-center gap-4 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.1)" }}>
                    <ImageOff size={16} color="#c9a84c" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "rgba(253,248,240,0.85)" }}>{t("settings.blurPhotos")}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(253,248,240,0.35)" }}>
                      {photosBlurred ? t("settings.blurPhotosOnDesc") : t("settings.blurPhotosOffDesc")}
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
                {t("settings.photoPrivacyFooter")}
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

  if (subScreen === "faq") {
    return <FaqSubScreen onBack={() => setSubScreen(null)} />;
  }

  if (subScreen === "feature-request") {
    return (
      <FeatureRequestSubScreen
        onBack={() => setSubScreen(null)}
      />
    );
  }

  if (subScreen === "feedback") {
    return (
      <FeedbackSubScreen
        title={t("settings.giveUsFeedback")}
        icon={ThumbsUp}
        placeholder={t("settings.giveUsFeedbackPlaceholder")}
        messagePrefix="FEEDBACK: "
        supportMatch={supportMatch}
        onBack={() => setSubScreen(null)}
        onNavigate={(url) => setLocation(url)}
      />
    );
  }

  if (subScreen === "subscription-terms") {
    return <SubscriptionTermsSubScreen onBack={() => setSubScreen(null)} />;
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

        {/* â”€â”€ PREFERENCES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div>
          <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">{t("settings.preferencesSection")}</p>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}>
            <Row icon={Globe} label={t("profile.language")} sub={`${currentLang.flag} ${currentLang.native}`} onClick={() => setSubScreen("language")} testId="button-settings-language" />
            <Divider />
            <Row icon={Bell} label={t("settings.notifMenuItem")} sub={t("settings.notifMenuSub")} onClick={() => setSubScreen("notifications")} testId="button-settings-notifications" />
          </div>
        </div>

        {/* â”€â”€ ACCOUNT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div>
          <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">{t("settings.accountSection")}</p>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}>
            <Row icon={Mail} label={t("settings.editEmail")} sub={user.email ? t("settings.editEmailSubSet", { email: user.email }) : t("settings.editEmailSubNotSet")} onClick={() => setSubScreen("account")} testId="button-settings-email" />
            <Divider />
            <Row icon={KeyRound} label={t("settings.editPassword")} sub={t("settings.editPasswordSub")} onClick={() => setSubScreen("account")} testId="button-settings-password" />
            <Divider />
            <Row icon={ShieldX} label={t("settings.manageAccount")} sub={t("settings.manageAccountSub")} onClick={() => setSubScreen("blocked-users")} testId="button-settings-manage-account" />
          </div>
        </div>

        {/* â”€â”€ CONTACT US â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div>
          <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">{t("settings.contactUsSection")}</p>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}>
            <Row icon={LifeBuoy} label={t("settings.helpSupport")} sub={t("settings.helpSupportSub")} onClick={openSupportChat} testId="button-settings-support" />
            <Divider />
            <Row icon={Lightbulb} label={t("settings.featureRequest")} sub={t("settings.featureRequestSub")} onClick={() => setSubScreen("feature-request")} testId="button-settings-feature-request" />
            <Divider />
            <Row icon={ThumbsUp} label={t("settings.giveUsFeedback")} sub={t("settings.giveUsFeedbackSub")} onClick={() => setSubScreen("feedback")} testId="button-settings-feedback" />
            <Divider />
            <Row icon={HelpCircle} label={t("settings.faq")} sub={t("settings.faqSub")} onClick={() => setSubScreen("faq")} testId="button-settings-faq" />
          </div>
        </div>

        {/* â”€â”€ SUBSCRIPTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div>
          <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">{t("settings.subscriptionSection")}</p>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}>
            <Row icon={ScrollText} label={t("settings.subscriptionTerms")} sub={t("settings.subscriptionTermsSub")} onClick={() => setSubScreen("subscription-terms")} testId="button-settings-sub-terms" />
            <Divider />
            <Row
              icon={Info}
              label={t("settings.whatIsPremium")}
              sub={t("settings.whatIsPremiumSub")}
              onClick={() => setLocation("/premium")}
              testId="button-settings-what-is-premium"
            />
            <Divider />
            <Row
              icon={Settings2}
              label={t("settings.manageSubscription")}
              sub={user.isPremium
                ? (user.premiumUntil ? t("settings.manageSubscriptionActiveUntil", { date: new Date(user.premiumUntil).toLocaleDateString() }) : t("settings.manageSubscriptionActive"))
                : t("settings.manageSubscriptionNotActive")}
              onClick={() => setLocation("/premium")}
              testId="button-settings-manage-subscription"
            />
            <Divider />
            <Row
              icon={RefreshCw}
              label={restoreMutation.isPending ? t("settings.restorePurchasesIng") : t("settings.restorePurchases")}
              sub={t("settings.restorePurchasesSub")}
              onClick={() => { if (!restoreMutation.isPending) restoreMutation.mutate(); }}
              testId="button-settings-restore-premium"
            />
          </div>
        </div>

        {/* â”€â”€ LEGAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div>
          <p className="text-xs text-cream/35 uppercase tracking-wider font-semibold mb-2 pl-1">{t("settings.legalSection")}</p>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}>
            <Row icon={Lock} label={t("settings.privacyMenuItem")} sub={t("settings.privacyMenuSub")} onClick={() => setSubScreen("privacy")} testId="button-settings-privacy" />
            <Divider />
            <Row icon={FileText} label={t("settings.termsOfUse")} sub={t("settings.termsOfUseSub")} onClick={() => setSubScreen("guidelines")} testId="button-settings-terms" />
            <Divider />
            <Row icon={Cookie} label={t("settings.cookiePolicy")} sub={t("settings.cookiePolicySub")} onClick={() => setLocation("/cookie-policy")} testId="button-settings-cookie-policy" />
            <Divider />
            <Row icon={Shield} label={t("settings.agreements")} sub={t("settings.agreementsSub")} onClick={() => setSubScreen("guidelines")} testId="button-settings-agreements" />
            <Divider />
            <Row icon={ShieldAlert} label={t("settings.communityRules")} sub={t("settings.communityRulesSub")} onClick={() => setSubScreen("guidelines")} testId="button-settings-community-rules" />
            <Divider />
            <Row icon={ShieldCheck} label={t("settings.privacyPreferenceCenter")} sub={t("settings.privacyPreferenceCenterSub")} onClick={() => setLocation("/gdpr")} testId="button-settings-privacy-prefs" />
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
                      {t("settings.premiumDeleteWarning")}
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
  const { t } = useTranslation();
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
        <h1 className="font-serif text-xl text-gold">{t("settings.accountSecurity")}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 pb-20 space-y-5">

        {/* Change Email */}
        <div className="rounded-2xl p-4 space-y-3" style={sectionStyle}>
          <div className="flex items-center gap-2 mb-1">
            <Mail size={16} color="#c9a84c" />
            <p className="text-sm font-semibold text-gold">{t("settings.changeEmail")}</p>
          </div>
          <p className="text-xs text-cream/40 -mt-1">{user.email ? t("settings.changeEmailCurrent", { value: user.email }) : t("settings.notSet")}</p>
          {emailDone ? (
            <div className="flex items-center gap-2 py-2" style={{ color: "#10b981" }}>
              <CheckCircle2 size={16} /><span className="text-sm font-medium">{t("settings.emailUpdated")}</span>
            </div>
          ) : (
            <>
              <div>
                <label className={labelClass}>{t("settings.newEmail")}</label>
                <input type="email" value={emailForm.newEmail} onChange={e => { setEmailForm(f => ({ ...f, newEmail: e.target.value })); setEmailError(null); }}
                  placeholder="new@email.com" data-testid="input-new-email" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass}>{t("settings.currentPassword")}</label>
                <input type="password" value={emailForm.currentPassword} onChange={e => { setEmailForm(f => ({ ...f, currentPassword: e.target.value })); setEmailError(null); }}
                  placeholder="Confirm with your password" data-testid="input-email-current-password" className={inputClass} style={inputStyle} />
              </div>
              {emailError && <p className={errorClass} style={{ color: "#d4608a" }}>{emailError}</p>}
              <button onClick={() => emailMutation.mutate()} disabled={!emailForm.newEmail || !emailForm.currentPassword || emailMutation.isPending}
                data-testid="button-save-email" className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}>
                {emailMutation.isPending ? t("settings.savingEllipsis") : t("settings.updateEmail")}
              </button>
            </>
          )}
        </div>

        {/* Change Password */}
        <div className="rounded-2xl p-4 space-y-3" style={sectionStyle}>
          <div className="flex items-center gap-2 mb-1">
            <KeyRound size={16} color="#c9a84c" />
            <p className="text-sm font-semibold text-gold">{t("settings.changePassword")}</p>
          </div>
          {pwDone ? (
            <div className="flex items-center gap-2 py-2" style={{ color: "#10b981" }}>
              <CheckCircle2 size={16} /><span className="text-sm font-medium">{t("settings.passwordUpdated")}</span>
            </div>
          ) : (
            <>
              <div>
                <label className={labelClass}>{t("settings.currentPassword")}</label>
                <div className="relative">
                  <input type={showCurrent ? "text" : "password"} value={pwForm.currentPassword} onChange={e => { setPwForm(f => ({ ...f, currentPassword: e.target.value })); setPwError(null); }}
                    placeholder="Enter current password" data-testid="input-current-password" className={`${inputClass} pr-11`} style={inputStyle} />
                  <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40">
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>{t("settings.newPassword")}</label>
                <div className="relative">
                  <input type={showNew ? "text" : "password"} value={pwForm.newPassword} onChange={e => { setPwForm(f => ({ ...f, newPassword: e.target.value })); setPwError(null); }}
                    placeholder="At least 6 characters" data-testid="input-new-password" className={`${inputClass} pr-11`} style={inputStyle} />
                  <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40">
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>{t("settings.confirmNewPassword")}</label>
                <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Repeat new password" data-testid="input-confirm-new-password" className={inputClass} style={{
                    ...inputStyle,
                    border: pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword ? "1.5px solid rgba(212,96,138,0.7)" : inputStyle.border
                  }} />
                {pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword && (
                  <p className={errorClass} style={{ color: "#d4608a" }}>{t("settings.passwordsDoNotMatch")}</p>
                )}
              </div>
              {pwError && <p className={errorClass} style={{ color: "#d4608a" }}>{pwError}</p>}
              <button onClick={() => pwMutation.mutate()}
                disabled={!pwForm.currentPassword || !pwForm.newPassword || pwForm.newPassword !== pwForm.confirmPassword || pwMutation.isPending}
                data-testid="button-save-password" className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}>
                {pwMutation.isPending ? t("settings.savingEllipsis") : t("settings.updatePassword")}
              </button>
            </>
          )}
        </div>

        {/* Change Phone */}
        <div className="rounded-2xl p-4 space-y-3" style={sectionStyle}>
          <div className="flex items-center gap-2 mb-1">
            <Phone size={16} color="#c9a84c" />
            <p className="text-sm font-semibold text-gold">{t("settings.changePhone")}</p>
          </div>
          <p className="text-xs text-cream/40 -mt-1">{user.phone ? t("settings.changeEmailCurrent", { value: user.phone }) : t("settings.notSet")}</p>
          {phoneDone ? (
            <div className="flex items-center gap-2 py-2" style={{ color: "#10b981" }}>
              <CheckCircle2 size={16} /><span className="text-sm font-medium">{t("settings.phoneUpdated")}</span>
            </div>
          ) : (
            <>
              <div>
                <label className={labelClass}>{t("settings.newPhoneNumber")}</label>
                <input type="tel" value={phoneForm.newPhone} onChange={e => { setPhoneForm({ newPhone: e.target.value }); setPhoneError(null); }}
                  placeholder="+1 555 000 0000" data-testid="input-new-phone" className={inputClass} style={inputStyle} />
              </div>
              {phoneError && <p className={errorClass} style={{ color: "#d4608a" }}>{phoneError}</p>}
              <button onClick={() => phoneMutation.mutate()} disabled={!phoneForm.newPhone || phoneMutation.isPending}
                data-testid="button-save-phone" className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}>
                {phoneMutation.isPending ? t("settings.savingEllipsis") : t("settings.updatePhone")}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

function SubScreenShell({ title, onBack, testId, children }: { title: string; onBack: () => void; testId: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0d0618" }}>
      <div className="flex items-center gap-3 px-5 pt-12 pb-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
        <button onClick={onBack} data-testid={testId} className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronLeft size={18} color="rgba(253,248,240,0.7)" />
        </button>
        <h1 className="font-serif text-xl text-gold">{title}</h1>
      </div>
      {children}
    </div>
  );
}

function FaqSubScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);
  const faqs = Array.from({ length: 8 }, (_, idx) => ({
    q: t(`faq.q${idx + 1}`),
    a: t(`faq.a${idx + 1}`),
  }));
  return (
    <SubScreenShell title={t("settings.faq")} onBack={onBack} testId="button-back-faq">
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-16 space-y-3">
        {faqs.map((item, i) => (
          <div key={i} className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,255,255,0.03)" }}>
            <button
              data-testid={`faq-item-${i}`}
              className="w-full flex items-center gap-3 px-4 py-4 text-left"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span className="flex-1 text-sm font-medium" style={{ color: "rgba(253,248,240,0.85)" }}>{item.q}</span>
              <ChevronRight size={15} color="rgba(253,248,240,0.25)" style={{ transform: open === i ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s" }} />
            </button>
            {open === i && (
              <div className="px-4 pb-4">
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} className="pt-3">
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(253,248,240,0.55)" }}>{item.a}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </SubScreenShell>
  );
}

function FeatureRequestSubScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/support/feature-request", { text: text.trim() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? "Failed to send");
      }
    },
    onSuccess: () => {
      setSent(true);
      toast({ title: "Feature request sent!", description: "Thanks! Our team will review your idea." });
    },
    onError: (e: Error) => toast({ title: "Could not send", description: e.message, variant: "destructive" }),
  });

  return (
    <SubScreenShell title={t("settings.featureRequest")} onBack={onBack} testId="button-back-feature-request">
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-16 flex flex-col gap-4">
        {sent ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "rgba(201,168,76,0.12)", border: "2px solid rgba(201,168,76,0.3)" }}>
              <Lightbulb size={28} color="#c9a84c" />
            </div>
            <p className="text-center text-lg font-serif text-cream">Request received!</p>
            <p className="text-center text-sm text-cream/50 leading-relaxed px-4">
              Your idea has been sent directly to our team. We review every suggestion — thank you!
            </p>
            <button
              onClick={onBack}
              className="mt-2 px-6 py-2.5 rounded-full text-sm font-semibold"
              style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.25)" }}
            >
              Back to Settings
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.15)" }}>
              <Lightbulb size={18} color="#c9a84c" className="flex-shrink-0 mt-0.5" />
              <p className="text-sm text-cream/60 leading-relaxed">{t("settings.featureRequestPlaceholder")}</p>
            </div>
            <textarea
              data-testid="input-feature-request-text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Describe the feature you'd like to see..."
              rows={7}
              className="w-full px-4 py-3.5 rounded-2xl text-sm placeholder-cream/20 outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(201,168,76,0.2)", color: "#fdf8f0" }}
            />
            <button
              data-testid="button-send-feature-request"
              onClick={() => sendMutation.mutate()}
              disabled={!text.trim() || sendMutation.isPending}
              className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
            >
              <Send size={15} />
              {sendMutation.isPending ? "Sending…" : "Send Feature Request"}
            </button>
            <p className="text-center text-xs" style={{ color: "rgba(253,248,240,0.3)" }}>
              Your request goes directly to our team at support@gustilk.com
            </p>
          </>
        )}
      </div>
    </SubScreenShell>
  );
}

function FeedbackSubScreen({ title, icon: Icon, placeholder, messagePrefix, supportMatch, onBack, onNavigate }: {
  title: string;
  icon: any;
  placeholder: string;
  messagePrefix: string;
  supportMatch: any;
  onBack: () => void;
  onNavigate: (url: string) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [text, setText] = useState("");

  const sendMutation = useMutation({
    mutationFn: async () => {
      let matchId = supportMatch?.id as string | undefined;
      if (!matchId) {
        const r = await apiRequest("POST", "/api/support/start");
        const d = await r.json();
        matchId = d.matchId as string;
      }
      await apiRequest("POST", `/api/messages/${matchId}`, { text: `${messagePrefix}${text.trim()}` });
      return matchId as string;
    },
    onSuccess: (matchId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({ title: "Message sent!", description: "We'll get back to you in the support chat." });
      onNavigate(`/chat/${matchId}?support=1&from=settings`);
    },
    onError: () => toast({ title: "Could not send", description: "Please try again.", variant: "destructive" }),
  });

  return (
    <SubScreenShell title={title} onBack={onBack} testId={`button-back-${title.toLowerCase().replace(/ /g, "-")}`}>
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-16 flex flex-col gap-4">
        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.15)" }}>
          <Icon size={18} color="#c9a84c" className="flex-shrink-0 mt-0.5" />
          <p className="text-sm text-cream/60 leading-relaxed">{placeholder}</p>
        </div>
        <textarea
          data-testid="input-feedback-text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t("settings.feedbackPlaceholder")}
          rows={7}
          className="w-full px-4 py-3.5 rounded-2xl text-sm placeholder-cream/20 outline-none resize-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(201,168,76,0.2)", color: "#fdf8f0" }}
        />
        <button
          data-testid="button-send-feedback"
          onClick={() => sendMutation.mutate()}
          disabled={!text.trim() || sendMutation.isPending}
          className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
        >
          <Send size={15} />
          {sendMutation.isPending ? t("settings.feedbackSending") : t("settings.feedbackSend")}
        </button>
        <p className="text-center text-xs" style={{ color: "rgba(253,248,240,0.3)" }}>
          {t("settings.feedbackFooter")}
        </p>
      </div>
    </SubScreenShell>
  );
}

function SubscriptionTermsSubScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <SubScreenShell title={t("settings.subscriptionTerms")} onBack={onBack} testId="button-back-sub-terms">
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-16 space-y-4">
        {[
          { title: "Billing & Payment", body: "Gûstîlk Premium is billed on a monthly basis. Payment is charged to your selected payment method at the start of each billing period. All prices are shown in USD and may vary by region." },
          { title: "Auto-Renewal", body: "Your subscription renews automatically unless you cancel at least 24 hours before the end of the current period. You can manage or cancel your subscription at any time through the Manage Subscription option in Settings." },
          { title: "Free Trial", body: "Where a free trial is offered, it will be clearly stated at the time of sign-up. Any unused portion of a free trial will be forfeited when a paid subscription is purchased." },
          { title: "Refund Policy", body: "Except as required by applicable law, payments are non-refundable. If you believe you were charged in error, please contact us via Help & Support within 14 days of the charge." },
          { title: "Cancellation", body: "You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period; you retain access to Premium features until that date." },
          { title: "Price Changes", body: "Gûstîlk may change subscription pricing with at least 30 days' notice. Continued use of the service after a price change constitutes acceptance of the new pricing." },
          { title: "Iraq Free Premium", body: "Users connecting from Iraq are eligible for a complimentary Premium membership while this promotion is active. This offer is subject to change and is verified by server-side IP geolocation to prevent abuse." },
          { title: "Contact", body: "For billing questions or disputes, open Help & Support in Settings and our team will assist you as quickly as possible." },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.1)" }}>
            <p className="text-gold text-sm font-semibold mb-1.5">{s.title}</p>
            <p className="text-cream/55 text-sm leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </SubScreenShell>
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
  const { t } = useTranslation();
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
          <h1 className="font-serif text-2xl text-gold">{t("settings.blockedUsersTitle")}</h1>
          <p className="text-cream/40 text-xs mt-0.5">
            {isLoading ? t("common.loading") : t(blockedUsers.length === 1 ? "settings.blockedCount_one" : "settings.blockedCount_other", { count: blockedUsers.length })}
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
            <p className="text-cream/40 text-sm text-center">{t("settings.noneBlocked")}</p>
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
                  {t("settings.unblock")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
