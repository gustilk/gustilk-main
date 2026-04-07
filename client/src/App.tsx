import { useState, useEffect, lazy, Suspense, useRef } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "@/pages/LandingPage";
import DiscoverPage from "@/pages/DiscoverPage";
import MatchesPage from "@/pages/MatchesPage";
import ChatPage from "@/pages/ChatPage";
import ProfilePage from "@/pages/ProfilePage";
import EditProfilePage from "@/pages/EditProfilePage";
import PremiumPage from "@/pages/PremiumPage";
import EventsPage from "@/pages/EventsPage";
import EventDetailPage from "@/pages/EventDetailPage";
import SettingsPage from "@/pages/SettingsPage";
import ActivityPage from "@/pages/ActivityPage";
import ViewUserProfilePage from "@/pages/ViewUserProfilePage";
import VerificationPage from "@/pages/VerificationPage";
import PendingVerificationPage from "@/pages/PendingVerificationPage";
import PendingApprovalPage from "@/pages/PendingApprovalPage";
import SocialSetupPage from "@/pages/SocialSetupPage";
import LanguageSelectPage from "@/pages/LanguageSelectPage";
import BottomNav from "@/components/BottomNav";
import VideoCallPage, { IncomingCallBanner } from "@/pages/VideoCallPage";
import { VideoCallContext, useVideoCallProvider } from "@/hooks/useVideoCall";
import TermsPage from "@/pages/TermsPage";
import RefundPage from "@/pages/RefundPage";
import PrivacyPage from "@/pages/PrivacyPage";
import GuidelinesPage from "@/pages/GuidelinesPage";
import CookiePolicyPage from "@/pages/CookiePolicyPage";
import GdprPage from "@/pages/GdprPage";
import SafetyTipsPage from "@/pages/SafetyTipsPage";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { Clock, X } from "lucide-react";
import type { User } from "@shared/schema";
import type { PhotoSlot } from "@shared/schema";
import { initPurchases } from "@/lib/purchases";
import { initPushNotifications } from "@/lib/pushNotifications";

function PendingReviewBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5"
      style={{ background: "linear-gradient(90deg, rgba(244,196,48,0.13) 0%, rgba(123,63,160,0.1) 100%)", borderBottom: "1px solid rgba(244,196,48,0.2)" }}>
      <Clock size={14} style={{ color: "#F4C430", flexShrink: 0 }} />
      <p className="text-xs flex-1 leading-snug" style={{ color: "rgba(51,51,51,0.7)" }}>
        Your profile is <span style={{ color: "#F4C430", fontWeight: 600 }}>under review</span> — you can browse freely while we check your account. You'll be notified once approved.
      </p>
      <button onClick={() => setDismissed(true)} data-testid="button-dismiss-review-banner"
        className="flex-shrink-0 p-0.5 rounded" style={{ color: "rgba(51,51,51,0.3)" }}>
        <X size={13} />
      </button>
    </div>
  );
}

// Lazy-load admin panel so regular users never download admin code
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));

// Stable wrapper component — must be defined outside AppShell so its
// reference never changes between renders, preventing wouter from
// unmounting/remounting the admin layout on every sub-page navigation.
function AdminRoute({ user }: { user: User }) {
  if (!user.isAdmin) return <Redirect to="/matches" />;
  return (
    <Suspense fallback={<AdminSpinner />}>
      <AdminLayout user={user} />
    </Suspense>
  );
}

function AdminSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#F9F9F9" }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(244,196,48,0.6) transparent transparent transparent" }} />
    </div>
  );
}

const PUBLIC_POLICY_ROUTES: Record<string, React.ComponentType> = {
  "/terms": TermsPage,
  "/terms-of-service": TermsPage,
  "/refund": RefundPage,
  "/refunds": RefundPage,
  "/refund-policy": RefundPage,
  "/privacy": PrivacyPage,
  "/privacy-policy": PrivacyPage,
  "/policy": PrivacyPage,
  "/guidelines": GuidelinesPage,
  "/community-guidelines": GuidelinesPage,
  "/cookie-policy": CookiePolicyPage,
  "/gdpr": GdprPage,
  "/safety-tips": SafetyTipsPage,
  "/safety": SafetyTipsPage,
};

function useGustilkUser() {
  return useQuery<{ user: User } | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}

function profileIsComplete(user: User): boolean {
  if (user.isAdmin || (user as any).isSystemAccount) return true;
  const slots = (user as any).photoSlots as PhotoSlot[] | null ?? [];
  const hasPhoto = slots.some(s => s.status === "approved" || s.status === "pending");
  return !!(
    user.caste &&
    user.city &&
    user.country &&
    user.age &&
    user.gender &&
    hasPhoto
  );
}

function AppShell({ user }: { user: User }) {
  const [location, setLocation] = useLocation();
  const isChat = location.startsWith("/chat/");
  const isEventDetail = location.startsWith("/events/") && location !== "/events";
  const isVerifyPage = location === "/verify" || location === "/pending-verification";
  const isSettings = location === "/settings";
  const isProfileView = /^\/profile\/[^/]+$/.test(location);
  const isAdminRoute = location.startsWith("/admin");

  const callCtx = useVideoCallProvider(user.id, !!user.isPremium);
  const isInCall = callCtx.callState === "active" || callCtx.callState === "calling" || callCtx.callState === "ringing";

  // Initialise native services once per authenticated session
  const nativeInitDone = useRef(false);
  useEffect(() => {
    if (nativeInitDone.current) return;
    nativeInitDone.current = true;

    // RevenueCat — IAP for premium subscriptions
    initPurchases();

    // Push notifications — register device token + handle tap-to-open
    initPushNotifications(setLocation);

    // Android hardware back button
    import("@capacitor/app").then(({ App }) => {
      App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else App.exitApp();
      });
    }).catch(() => {});
  }, []);

  if (!profileIsComplete(user) && location !== "/complete-profile") {
    return <SocialSetupPage user={user} />;
  }

  const vs = user.verificationStatus;
  const isRegularUser = !user.isAdmin && !(user as any).isSystemAccount;

  // Rejected and banned users are fully blocked — they see the PendingApprovalPage
  // which handles re-application (rejected) or a permanent ban screen (banned).
  // Exception: rejected users may navigate to /profile/edit to replace their photos
  // before re-submitting, and to /profile to view their current photo slots.
  const allowedForRejected = vs === "rejected" && (location === "/profile/edit" || location === "/profile");
  if (isRegularUser && (vs === "rejected" || vs === "banned") && !allowedForRejected) {
    return <PendingApprovalPage user={user} />;
  }

  const isPending = isRegularUser && vs === "pending";

  return (
    <VideoCallContext.Provider value={callCtx}>
      <div className="flex flex-col min-h-screen" style={{ background: "#F9F9F9", fontFamily: "'Open Sans', sans-serif" }}>
        {isPending && !isAdminRoute && !isInCall && <PendingReviewBanner />}
        {callCtx.incomingCall && !isInCall && <IncomingCallBanner />}
        {isInCall && <VideoCallPage />}

        {/* Admin panel rendered outside Switch so wouter never creates a nested
            routing context that strips /admin from useLocation/useRoute */}
        {isAdminRoute && <AdminRoute user={user} />}

        <main className="flex-1 overflow-hidden" style={{ background: "#F9F9F9" }}>
          {!isAdminRoute && (
            <Switch>
              <Route path="/discover" component={() => <DiscoverPage user={user} />} />
              <Route path="/matches" component={() => <MatchesPage user={user} />} />
              <Route path="/chat/:matchId" component={({ params }) => <ChatPage user={user} matchId={params.matchId} />} />
              <Route path="/profile/edit" component={() => <EditProfilePage user={user} />} />
              <Route path="/profile" component={() => <ProfilePage user={user} />} />
              <Route path="/premium" component={() => <PremiumPage user={user} />} />
              <Route path="/events/:eventId" component={({ params }) => <EventDetailPage user={user} eventId={params.eventId} />} />
              <Route path="/events" component={() => <EventsPage user={user} />} />
              <Route path="/activity" component={() => user.isAdmin ? <Redirect to="/admin" /> : <ActivityPage user={user} />} />
              <Route path="/profile/:userId" component={({ params }) => <ViewUserProfilePage viewer={user} userId={params.userId} />} />
              <Route path="/settings" component={() => <SettingsPage user={user} />} />
              <Route path="/verify" component={() => <VerificationPage user={user} />} />
              <Route path="/pending-verification" component={() => <PendingVerificationPage user={user} />} />
              <Route path="/complete-profile" component={() => <SocialSetupPage user={user} />} />
              <Route path="/" component={() => <Redirect to={user.isAdmin ? "/admin" : "/discover"} />} />
            </Switch>
          )}
        </main>
        {!isChat && !isEventDetail && !isVerifyPage && !isInCall && !isSettings && !isAdminRoute && <BottomNav />}
      </div>
    </VideoCallContext.Provider>
  );
}

function Router() {
  const [location] = useLocation();
  const { data, isLoading } = useGustilkUser();

  const PolicyComponent = PUBLIC_POLICY_ROUTES[location];
  if (PolicyComponent) return <PolicyComponent />;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#F9F9F9" }}>
        <div className="text-center">
          <div className="font-serif text-4xl text-gold mb-3">Gûstîlk</div>
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!data?.user) {
    return (
      <>
        <LandingPage />
        <CookieConsentBanner />
      </>
    );
  }

  return (
    <>
      <AppShell user={data.user} />
      <CookieConsentBanner />
    </>
  );
}

const ALL_POLICY_PATHS = Object.keys(PUBLIC_POLICY_ROUTES);

export default function App() {
  const [langChosen, setLangChosen] = useState<boolean>(() => {
    if (ALL_POLICY_PATHS.includes(window.location.pathname)) return true;
    return !!localStorage.getItem("gustilk_language");
  });

  useEffect(() => {
    const handler = () => {
      localStorage.removeItem("gustilk_language");
      setLangChosen(false);
    };
    window.addEventListener("gustilk:pick-language", handler);
    return () => window.removeEventListener("gustilk:pick-language", handler);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {langChosen ? (
          <Router />
        ) : (
          <LanguageSelectPage onSelect={() => setLangChosen(true)} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
