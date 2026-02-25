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
import VerificationPage from "@/pages/VerificationPage";
import PendingVerificationPage from "@/pages/PendingVerificationPage";
import SocialSetupPage from "@/pages/SocialSetupPage";
import LanguageSelectPage from "@/pages/LanguageSelectPage";
import BottomNav from "@/components/BottomNav";
import VideoCallPage, { IncomingCallBanner } from "@/pages/VideoCallPage";
import { VideoCallContext, useVideoCallProvider } from "@/hooks/useVideoCall";
import type { User } from "@shared/schema";

function useGustilkUser() {
  return useQuery<{ user: User } | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}

function profileIsComplete(user: User): boolean {
  return !!(
    user.caste &&
    user.city &&
    user.country &&
    user.age &&
    user.gender &&
    user.photos &&
    user.photos.length >= 3
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

  return (
    <VideoCallContext.Provider value={callCtx}>
      <div className="flex flex-col min-h-screen bg-ink" style={{ fontFamily: "'Open Sans', sans-serif" }}>
        {/* Incoming call banner — shown on top of everything except an active call */}
        {callCtx.incomingCall && !isInCall && <IncomingCallBanner />}

        {/* Full-screen call overlay */}
        {isInCall && <VideoCallPage />}

        <main className="flex-1 overflow-hidden">
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
  const { data, isLoading } = useGustilkUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ink">
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
  const [langChosen, setLangChosen] = useState<boolean>(
    () => !!localStorage.getItem("gustilk_language")
  );

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
