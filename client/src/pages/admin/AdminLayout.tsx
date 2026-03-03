import { useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import {
  LayoutDashboard, Users, UserCheck, Flag, Shield, Ban, Copy,
  BarChart2, CreditCard, Tag, Share2, Bell, Megaphone, Mail, MessageSquare,
  Layers, Calendar, Heart, Globe, Settings, Star, Download, Server, Database,
  FileText, ChevronRight, Menu, X, LogOut, Hash,
} from "lucide-react";
import type { User } from "@shared/schema";

import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import UserDetailPage from "./pages/UserDetailPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import ReportsPage from "./pages/ReportsPage";
import ModerationPage from "./pages/ModerationPage";
import VerificationQueuePage from "./pages/VerificationQueuePage";
import BlacklistPage from "./pages/BlacklistPage";
import DuplicatesPage from "./pages/DuplicatesPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import PaymentsPage from "./pages/PaymentsPage";
import PromoCodesPage from "./pages/PromoCodesPage";
import ReferralsPage from "./pages/ReferralsPage";
import NotificationsPage from "./pages/NotificationsPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import EmailTemplatesPage from "./pages/EmailTemplatesPage";
import FeedbackPage from "./pages/FeedbackPage";
import CastePage from "./pages/CastePage";
import EventsManagementPage from "./pages/EventsManagementPage";
import SuccessStoriesPage from "./pages/SuccessStoriesPage";
import TranslationsPage from "./pages/TranslationsPage";
import TeamPage from "./pages/TeamPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import AppSettingsPage from "./pages/AppSettingsPage";
import AppStorePage from "./pages/AppStorePage";
import ExportPage from "./pages/ExportPage";
import SystemPage from "./pages/SystemPage";
import BackupsPage from "./pages/BackupsPage";

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    title: "Users",
    items: [
      { label: "All Users", path: "/admin/users", icon: Users },
      { label: "Approvals", path: "/admin/approvals", icon: UserCheck },
      { label: "Verification", path: "/admin/verification", icon: Shield },
    ],
  },
  {
    title: "Safety",
    items: [
      { label: "Reports", path: "/admin/reports", icon: Flag },
      { label: "Moderation", path: "/admin/moderation", icon: Shield },
      { label: "Blacklist", path: "/admin/blacklist", icon: Ban },
      { label: "Duplicates", path: "/admin/duplicates", icon: Copy },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Analytics", path: "/admin/analytics", icon: BarChart2 },
    ],
  },
  {
    title: "Payments",
    items: [
      { label: "Revenue", path: "/admin/payments", icon: CreditCard },
      { label: "Promo Codes", path: "/admin/promo-codes", icon: Tag },
      { label: "Referrals", path: "/admin/referrals", icon: Share2 },
    ],
  },
  {
    title: "Communication",
    items: [
      { label: "Notifications", path: "/admin/notifications", icon: Bell },
      { label: "Announcements", path: "/admin/announcements", icon: Megaphone },
      { label: "Email Templates", path: "/admin/email-templates", icon: Mail },
      { label: "Feedback", path: "/admin/feedback", icon: MessageSquare },
    ],
  },
  {
    title: "Community",
    items: [
      { label: "Caste Management", path: "/admin/caste", icon: Hash },
      { label: "Events", path: "/admin/events", icon: Calendar },
      { label: "Success Stories", path: "/admin/success-stories", icon: Heart },
      { label: "Translations", path: "/admin/translations", icon: Globe },
    ],
  },
  {
    title: "Team",
    items: [
      { label: "Team Members", path: "/admin/team", icon: Users },
      { label: "Audit Logs", path: "/admin/logs", icon: FileText },
    ],
  },
  {
    title: "App",
    items: [
      { label: "Settings", path: "/admin/settings", icon: Settings },
      { label: "App Store", path: "/admin/app-store", icon: Star },
      { label: "Export", path: "/admin/export", icon: Download },
      { label: "System", path: "/admin/system", icon: Server },
      { label: "Backups", path: "/admin/backups", icon: Database },
    ],
  },
];

export default function AdminLayout({ user }: { user: User }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [onUserDetail, userDetailParams] = useRoute("/admin/users/:userId");
  const [onUsers] = useRoute("/admin/users");
  const [onApprovals] = useRoute("/admin/approvals");
  const [onVerification] = useRoute("/admin/verification");
  const [onReports] = useRoute("/admin/reports");
  const [onModeration] = useRoute("/admin/moderation");
  const [onBlacklist] = useRoute("/admin/blacklist");
  const [onDuplicates] = useRoute("/admin/duplicates");
  const [onAnalytics] = useRoute("/admin/analytics");
  const [onPayments] = useRoute("/admin/payments");
  const [onPromoCodes] = useRoute("/admin/promo-codes");
  const [onReferrals] = useRoute("/admin/referrals");
  const [onNotifications] = useRoute("/admin/notifications");
  const [onAnnouncements] = useRoute("/admin/announcements");
  const [onEmailTemplates] = useRoute("/admin/email-templates");
  const [onFeedback] = useRoute("/admin/feedback");
  const [onCaste] = useRoute("/admin/caste");
  const [onEvents] = useRoute("/admin/events");
  const [onSuccessStories] = useRoute("/admin/success-stories");
  const [onTranslations] = useRoute("/admin/translations");
  const [onTeam] = useRoute("/admin/team");
  const [onLogs] = useRoute("/admin/logs");
  const [onSettings] = useRoute("/admin/settings");
  const [onAppStore] = useRoute("/admin/app-store");
  const [onExport] = useRoute("/admin/export");
  const [onSystem] = useRoute("/admin/system");
  const [onBackups] = useRoute("/admin/backups");

  function resolvePage() {
    if (onUserDetail && userDetailParams?.userId) return <UserDetailPage user={user} userId={userDetailParams.userId} />;
    if (onUsers) return <UsersPage user={user} />;
    if (onApprovals) return <ApprovalsPage user={user} />;
    if (onVerification) return <VerificationQueuePage user={user} />;
    if (onReports) return <ReportsPage user={user} />;
    if (onModeration) return <ModerationPage user={user} />;
    if (onBlacklist) return <BlacklistPage user={user} />;
    if (onDuplicates) return <DuplicatesPage user={user} />;
    if (onAnalytics) return <AnalyticsPage user={user} />;
    if (onPayments) return <PaymentsPage user={user} />;
    if (onPromoCodes) return <PromoCodesPage user={user} />;
    if (onReferrals) return <ReferralsPage user={user} />;
    if (onNotifications) return <NotificationsPage user={user} />;
    if (onAnnouncements) return <AnnouncementsPage user={user} />;
    if (onEmailTemplates) return <EmailTemplatesPage user={user} />;
    if (onFeedback) return <FeedbackPage user={user} />;
    if (onCaste) return <CastePage user={user} />;
    if (onEvents) return <EventsManagementPage user={user} />;
    if (onSuccessStories) return <SuccessStoriesPage user={user} />;
    if (onTranslations) return <TranslationsPage user={user} />;
    if (onTeam) return <TeamPage user={user} />;
    if (onLogs) return <AuditLogsPage user={user} />;
    if (onSettings) return <AppSettingsPage user={user} />;
    if (onAppStore) return <AppStorePage user={user} />;
    if (onExport) return <ExportPage user={user} />;
    if (onSystem) return <SystemPage user={user} />;
    if (onBackups) return <BackupsPage user={user} />;
    return <DashboardPage user={user} />;
  }

  const isActive = (path: string) => {
    if (path === "/admin") return location === "/admin";
    return location.startsWith(path);
  };

  const sidebar = (
    <div className="flex flex-col h-full" style={{ background: "linear-gradient(180deg, #1a0b2e 0%, #0d0618 100%)" }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "rgba(201,168,76,0.15)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-serif text-sm font-bold text-gold"
          style={{ background: "linear-gradient(135deg, #7b3fa0, #c9a84c)" }}>G</div>
        <div>
          <div className="font-serif text-gold text-sm font-bold leading-none">Gûstîlk</div>
          <div className="text-cream/40 text-[10px] mt-0.5">Admin Panel</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map(group => (
          <div key={group.title} className="mb-4">
            <div className="text-[9px] font-bold uppercase tracking-widest px-3 py-1 mb-1" style={{ color: "rgba(201,168,76,0.4)" }}>
              {group.title}
            </div>
            {group.items.map(item => {
              const active = isActive(item.path);
              return (
                <Link key={item.path} href={item.path}
                  onClick={() => setSidebarOpen(false)}
                  data-testid={`nav-admin-${item.path.replace("/admin/", "").replace("/admin", "dashboard")}`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-[13px] font-medium transition-all"
                  style={{
                    color: active ? "#c9a84c" : "rgba(253,248,240,0.6)",
                    background: active ? "rgba(201,168,76,0.12)" : "transparent",
                  }}>
                  <item.icon size={14} />
                  {item.label}
                  {active && <ChevronRight size={12} className="ml-auto opacity-60" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User info */}
      <div className="px-3 py-3 border-t" style={{ borderColor: "rgba(201,168,76,0.15)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-gold"
            style={{ background: "linear-gradient(135deg, #2d0f4a, #7b3fa0)" }}>
            {(user.fullName ?? user.email ?? "A").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-cream text-[11px] font-medium truncate">{user.fullName ?? "Admin"}</div>
            <div className="text-cream/40 text-[10px] truncate">{user.email}</div>
          </div>
        </div>
        <Link href="/profile" className="flex items-center gap-1.5 mt-2 px-2 py-1.5 rounded-lg text-[11px] text-cream/50 hover:text-cream/80 transition-colors">
          <LogOut size={11} /> Exit Admin
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0d0618" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-52 flex-shrink-0 border-r" style={{ borderColor: "rgba(201,168,76,0.15)" }}>
        {sidebar}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-56 flex flex-col flex-shrink-0 border-r" style={{ borderColor: "rgba(201,168,76,0.15)" }}>
            {sidebar}
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "rgba(201,168,76,0.15)" }}>
          <button onClick={() => setSidebarOpen(true)} className="text-cream/60 hover:text-cream" data-testid="button-admin-menu">
            <Menu size={20} />
          </button>
          <span className="font-serif text-gold text-sm">Gûstîlk Admin</span>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {resolvePage()}
        </main>
      </div>
    </div>
  );
}
