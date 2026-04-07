import { ChevronLeft, ShieldAlert, Phone, AlertTriangle, Heart, Eye, Lock, UserX, MapPin, MessageCircle } from "lucide-react";

const SECTIONS = [
  {
    icon: Eye,
    color: "#c8000e",
    title: "Protect Your Personal Information",
    tips: [
      "Never share your full name, home address, workplace, or daily routine with someone you have just met online.",
      "Use Gûstîlk's in-app messaging rather than sharing your personal phone number or email until you fully trust someone.",
      "Avoid sharing photos that reveal identifiable details — home address, car registration plate, school or workplace name.",
      "Be cautious about sharing financial information with anyone you have not met in person.",
    ],
  },
  {
    icon: MessageCircle,
    color: "#9b0010",
    title: "Recognise Red Flags",
    tips: [
      "Be wary of anyone who quickly professes love or an unusually strong emotional connection before meeting you.",
      "Watch out for people who refuse to video call, avoid meeting in person, or always have an excuse to delay.",
      "Be suspicious if someone asks for money, gifts, or financial assistance — this is a common scam pattern.",
      "Trust your instincts. If something feels wrong or too good to be true, it probably is.",
    ],
  },
  {
    icon: MapPin,
    color: "#22c55e",
    title: "Meeting in Person Safely",
    tips: [
      "Always meet in a public place for the first several meetings — a café, restaurant, or busy community venue.",
      "Tell a trusted friend or family member where you are going, who you are meeting, and when you plan to return.",
      "Arrange your own transportation to and from the meeting. Do not accept rides from someone you do not yet know well.",
      "Keep your phone charged and with you at all times. Have the number of a trusted contact ready.",
      "Do not feel pressured to stay if you feel uncomfortable — you can always leave.",
    ],
  },
  {
    icon: Lock,
    color: "#e03050",
    title: "Keep Your Account Secure",
    tips: [
      "Use a strong, unique password for your Gûstîlk account and never share it with anyone.",
      "Enable biometric login (Face ID / fingerprint) if your device supports it.",
      "Log out of shared devices after each session.",
      "If you suspect your account has been compromised, change your password immediately and contact us.",
    ],
  },
  {
    icon: Heart,
    color: "#ef4444",
    title: "Respect & Consent",
    tips: [
      "Treat all members with respect. Harassment, threats, or inappropriate content will result in immediate account suspension.",
      "Consent is essential at every stage of any relationship. Never pressure someone to share photos, meet up, or take any action they are not comfortable with.",
      "Block and report any user who makes you feel unsafe — our moderation team reviews all reports promptly.",
      "Remember that everyone deserves to feel safe and respected on Gûstîlk.",
    ],
  },
  {
    icon: UserX,
    color: "#f97316",
    title: "Spotting Fake Profiles",
    tips: [
      "Be cautious of profiles with very few photos or photos that look professionally taken or heavily filtered.",
      "You can reverse-image-search profile photos using Google Images to check if they appear elsewhere online.",
      "Look out for profiles with very generic bios or bios copied from other sources.",
      "Gûstîlk's verification system helps identify genuine members. Look for the verified badge.",
    ],
  },
  {
    icon: AlertTriangle,
    color: "#fbbf24",
    title: "Report Concerns",
    tips: [
      "Use the 'Report' button on any profile or message to flag suspicious activity to our moderation team.",
      "Reports are confidential — the reported user will not be notified who reported them.",
      "Our team reviews all reports and takes appropriate action, which may include warnings, suspension, or permanent banning.",
      "You can also block any user at any time from their profile. Blocked users cannot see your profile or contact you.",
    ],
  },
  {
    icon: Phone,
    color: "#67e8f9",
    title: "Emergency Resources",
    tips: [
      "If you are in immediate danger, call your local emergency services (112 in the EU, 999 in the UK, 911 in the US).",
      "If you experience online abuse, threats, or harassment, you can report it to your national police or cybercrime unit.",
      "Victim support organisations can also provide guidance: Victim Support (UK): 0808 168 9111 · RAINN (US): 1-800-656-4673.",
      "Contact Gûstîlk directly at safety@gustilk.com for urgent safety concerns related to our platform.",
    ],
  },
];

export default function SafetyTipsPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0d0002" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(200,0,14,0.12)" }}>
        <button
          onClick={() => window.history.back()}
          data-testid="button-back-safety-tips"
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ChevronLeft size={18} color="rgba(253,248,240,0.7)" />
        </button>
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} color="#c8000e" />
          <h1 className="font-serif text-xl text-gold">Safety Tips</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-16 space-y-4 max-w-2xl w-full mx-auto">

        <div className="rounded-2xl p-4" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} color="#ef4444" className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-cream text-sm font-semibold">Your Safety Matters</p>
              <p className="text-cream/55 text-xs mt-1 leading-relaxed">
                Gûstîlk is designed to be a safe space for our community. Please read these tips to help protect yourself while using our platform.
              </p>
            </div>
          </div>
        </div>

        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,0,14,0.1)" }}>
              {/* Section header */}
              <div className="flex items-center gap-3 px-4 py-3"
                style={{ background: `${section.color}10`, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${section.color}18` }}>
                  <Icon size={15} color={section.color} />
                </div>
                <p className="text-sm font-semibold" style={{ color: section.color }}>{section.title}</p>
              </div>
              {/* Tips */}
              <div className="px-4 py-3 space-y-2.5">
                {section.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: section.color, opacity: 0.6 }} />
                    <p className="text-cream/60 text-sm leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Emergency contact card */}
        <div className="rounded-2xl p-4" style={{ background: "rgba(200,0,14,0.06)", border: "1px solid rgba(200,0,14,0.2)" }}>
          <p className="text-gold text-sm font-semibold mb-2">Contact Gûstîlk Safety Team</p>
          <p className="text-cream/50 text-xs leading-relaxed">
            Report safety concerns: <span className="text-gold/80">safety@gustilk.com</span>{"\n"}
            General enquiries: <span className="text-gold/80">privacy@gustilk.com</span>{"\n"}
            Website: <span className="text-gold/80">www.gustilk.com</span>
          </p>
        </div>

        <p className="text-center text-xs pb-4" style={{ color: "rgba(253,248,240,0.2)" }}>
          © 2026 Gûstîlk · www.gustilk.com
        </p>
      </div>
    </div>
  );
}
