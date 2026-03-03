import { useState, useEffect } from "react";
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
import AdminPage from "@/pages/AdminPage";
import SettingsPage from "@/pages/SettingsPage";
import ActivityPage from "@/pages/ActivityPage";
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
import type { User } from "@shared/schema";
import type { PhotoSlot } from "@shared/schema";

const PUBLIC_POLICY_ROUTES: Record<string, React.ComponentType> = {
  "/terms": TermsPage,
  "/refund": RefundPage,
  "/privacy": PrivacyPage,
  "/guidelines": GuidelinesPage,
};

function useGustilkUser() {
  return useQuery<{ user: User } | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}

function profileIsComplete(user: User): boolean {
  if (user.isAdmin) return true;
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
  const [location] = useLocation();
  const isChat = location.startsWith("/chat/");
  const isEventDetail = location.startsWith("/events/") && location !== "/events";
  const isVerifyPage = location === "/verify" || location === "/pending-verification";
  const isSettings = location === "/settings";

  const callCtx = useVideoCallProvider(user.id, !!user.isPremium);
  const isInCall = callCtx.callState === "active" || callCtx.callState === "calling" || callCtx.callState === "ringing";

  if (!profileIsComplete(user) && location !== "/complete-profile") {
    return <SocialSetupPage user={user} />;
  }

  if (profileIsComplete(user) && !user.isAdmin && !user.profileVisible) {
    return <PendingApprovalPage user={user} />;
  }

  return (
    <VideoCallContext.Provider value={callCtx}>
      <div className="flex flex-col min-h-screen" style={{ background: "#0d0618", fontFamily: "'Open Sans', sans-serif" }}>
        {callCtx.incomingCall && !isInCall && <IncomingCallBanner />}
        {isInCall && <VideoCallPage />}

        <main className="flex-1 overflow-hidden" style={{ background: "#0d0618" }}>
          <Switch>
            <Route path="/discover" component={() => <DiscoverPage user={user} />} />
            <Route path="/matches" component={() => <MatchesPage user={user} />} />
            <Route path="/chat/:matchId" component={({ params }) => <ChatPage user={user} matchId={params.matchId} />} />
            <Route path="/profile/edit" component={() => <EditProfilePage user={user} />} />
            <Route path="/profile" component={() => <ProfilePage user={user} />} />
            <Route path="/premium" component={() => <PremiumPage user={user} />} />
            <Route path="/events/:eventId" component={({ params }) => <EventDetailPage user={user} eventId={params.eventId} />} />
            <Route path="/events" component={() => <EventsPage user={user} />} />
            <Route path="/admin" component={() => <AdminPage user={user} />} />
            <Route path="/activity" component={() => <ActivityPage user={user} />} />
            <Route path="/settings" component={() => <SettingsPage user={user} />} />
            <Route path="/verify" component={() => <VerificationPage user={user} />} />
            <Route path="/pending-verification" component={() => <PendingVerificationPage user={user} />} />
            <Route path="/complete-profile" component={() => <SocialSetupPage user={user} />} />
            <Route path="/" component={() => <Redirect to="/discover" />} />
          </Switch>
        </main>
        {!isChat && !isEventDetail && !isVerifyPage && !isInCall && !isSettings && <BottomNav />}
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
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#0d0618" }}>
        <div className="text-center">
          <div className="font-serif text-4xl text-gold mb-3">Gûstîlk</div>
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!data?.user) {
    return <LandingPage />;
  }

  return <AppShell user={data.user} />;
}

export default function App() {
  const [langChosen, setLangChosen] = useState<boolean>(() => {
    if (Object.keys(PUBLIC_POLICY_ROUTES).includes(window.location.pathname)) return true;
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
