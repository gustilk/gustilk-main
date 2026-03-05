import { useLocation } from "wouter";
import { ChevronLeft, Cookie } from "lucide-react";

const SECTIONS = [
  {
    num: "1",
    title: "What Are Cookies?",
    body: "Cookies are small text files stored on your device when you visit our website or use our app. They help us recognize you, remember your preferences, and improve your experience on Gûstîlk.",
  },
  {
    num: "2.1",
    title: "Essential Cookies",
    body: "These cookies are strictly necessary for the app and website to function. They enable core features such as user authentication and login sessions, security and fraud prevention, and remembering your cookie preferences. You cannot opt out of essential cookies as the service cannot function without them.",
  },
  {
    num: "2.2",
    title: "Analytics Cookies",
    body: "We use analytics cookies to understand how users interact with Gûstîlk, including pages and features visited most frequently, time spent on the app, and error tracking and performance monitoring. This helps us improve the app experience. Analytics data is collected in aggregate and does not personally identify you.",
  },
  {
    num: "2.3",
    title: "Functional Cookies",
    body: "These cookies remember your preferences and settings, such as language and region preferences, notification settings, and display preferences.",
  },
  {
    num: "2.4",
    title: "Marketing & Advertising Cookies",
    body: "We may use cookies to show relevant advertisements and measure the effectiveness of our marketing campaigns. These cookies may track your activity across other websites.",
  },
  {
    num: "3",
    title: "Third-Party Cookies",
    body: "Some cookies on Gûstîlk are set by third-party services we use, including: Google Analytics (website and app performance tracking), Firebase (app functionality and crash reporting), Stripe / payment processors (secure payment processing), and social login providers (authentication). These third parties have their own privacy and cookie policies. We encourage you to review them.",
  },
  {
    num: "4",
    title: "Cookie Duration",
    body: "Cookies on Gûstîlk may be session cookies (deleted when you close your browser or app) or persistent cookies (remain on your device for a set period — days, months, or years).",
  },
  {
    num: "5",
    title: "Managing Your Cookie Preferences",
    body: "You have the right to accept or reject non-essential cookies. You can manage your preferences by using our Cookie Preference Center within the app settings, adjusting your browser settings to block or delete cookies, or using your mobile device settings to limit ad tracking. Please note that disabling certain cookies may affect your experience and some features may not work correctly.",
  },
  {
    num: "6",
    title: "Cookie Preference Center",
    body: "When you first use Gûstîlk, you will be presented with a cookie consent banner. You can update your preferences at any time by visiting Settings > Legal & Safety > Cookie Policy within the app.",
  },
  {
    num: "7",
    title: "Changes to This Policy",
    body: "We may update this Cookie Policy from time to time. We will notify you of significant changes via the app or by email. Continued use of Gûstîlk after changes constitutes your acceptance of the updated policy.",
  },
  {
    num: "8",
    title: "Contact Us",
    body: "If you have questions about our use of cookies, please contact us at privacy@gustilk.com or visit www.gustilk.com.",
  },
];

export default function CookiePolicyPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0d0618" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
        <button
          onClick={() => window.history.back()}
          data-testid="button-back-cookie-policy"
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ChevronLeft size={18} color="rgba(253,248,240,0.7)" />
        </button>
        <div className="flex items-center gap-2">
          <Cookie size={18} color="#c9a84c" />
          <h1 className="font-serif text-xl text-gold">Cookie Policy</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-16 space-y-4 max-w-2xl w-full mx-auto">
        <div className="rounded-2xl p-4" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}>
          <p className="text-gold text-sm font-semibold">Gûstîlk — Cookie Policy</p>
          <p className="text-cream/40 text-xs mt-1">Effective Date: March 5, 2026</p>
        </div>

        {SECTIONS.map((s) => (
          <div key={s.num} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.1)" }}>
            <p className="text-gold text-sm font-semibold mb-1.5">
              {s.num}. {s.title}
            </p>
            <p className="text-cream/60 text-sm leading-relaxed">{s.body}</p>
          </div>
        ))}

        <p className="text-center text-xs pb-4" style={{ color: "rgba(253,248,240,0.2)" }}>
          © 2026 Gûstîlk · www.gustilk.com
        </p>
      </div>
    </div>
  );
}
