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
import BottomNav from "@/components/BottomNav";
import type { SafeUser } from "@shared/schema";

export type AuthUser = SafeUser;

function useAuth() {
  return useQuery<{ user: AuthUser } | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}

function AppShell({ user }: { user: AuthUser }) {
  const [location] = useLocation();
  const isChat = location.startsWith("/chat/");
  const isEventDetail = location.startsWith("/events/") && location !== "/events";

  return (
    <div className="flex flex-col min-h-screen bg-ink" style={{ fontFamily: "'Open Sans', sans-serif" }}>
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
          <Route path="/" component={() => <Redirect to="/discover" />} />
        </Switch>
      </main>
      {!isChat && !isEventDetail && <BottomNav />}
    </div>
  );
}

function Router() {
  const { data, isLoading } = useAuth();

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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
