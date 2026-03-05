import { ChevronLeft, ShieldCheck } from "lucide-react";

const SECTIONS = [
  {
    num: "1",
    title: "Who We Are (Data Controller)",
    body: "Gûstîlk operates this dating platform for the Yezidi community. We are the data controller responsible for your personal data. Contact: privacy@gustilk.com · www.gustilk.com",
  },
  {
    num: "2",
    title: "What Personal Data We Collect",
    body: "We collect: identity data (full name, date of birth, gender, caste/tribe affiliation); contact data (email address, phone number); profile data (photos, biography, occupation, location, languages spoken); usage data (matches, messages, app interactions, device and browser information); payment data (handled securely by Stripe — we never store full card details); and verification data (identity document images, verification selfies).",
  },
  {
    num: "3",
    title: "Special Category Data",
    body: "As a community platform for Yezidi users, we process special category data under Article 9 GDPR — specifically religious or philosophical beliefs and ethnic origin — when you choose to provide caste or tribal affiliation on your profile. We process this data on the basis of your explicit consent and because it is manifestly made public by you.",
  },
  {
    num: "4",
    title: "Legal Bases for Processing",
    body: "We process your data under the following legal bases: (a) Contract performance — to provide our matching and messaging services; (b) Legitimate interests — to prevent fraud, ensure platform safety, and improve our services; (c) Consent — for marketing communications, analytics cookies, and special category data; (d) Legal obligation — to comply with applicable laws.",
  },
  {
    num: "5",
    title: "How We Use Your Data",
    body: "We use your data to: create and manage your account; provide our matchmaking and community features; process payments for Premium subscriptions; send transactional notifications (matches, messages, alerts); verify your identity and prevent fraud; improve our services through analytics; and comply with legal obligations.",
  },
  {
    num: "6",
    title: "Data Sharing",
    body: "We do not sell your personal data. We share data only with: service providers (hosting, payment processing, analytics) bound by data processing agreements; law enforcement when legally required; and other Gûstîlk users (your profile information, to the extent you make it visible).",
  },
  {
    num: "7",
    title: "International Data Transfers",
    body: "Your data may be processed outside the European Economic Area (EEA). Where transfers occur, we use appropriate safeguards including Standard Contractual Clauses (SCCs) approved by the European Commission.",
  },
  {
    num: "8",
    title: "Data Retention",
    body: "We retain your personal data for as long as your account is active, or as long as needed to provide services. Account data is deleted within 30 days of account closure, except where we are required to retain it longer by law. Backup copies may persist for up to 90 days.",
  },
  {
    num: "9",
    title: "Your Rights Under GDPR",
    body: "Under the GDPR, you have the right to: access your personal data (Article 15); rectify inaccurate data (Article 16); erasure / 'right to be forgotten' (Article 17); restrict processing (Article 18); data portability (Article 20); object to processing (Article 21); withdraw consent at any time without affecting prior processing; and lodge a complaint with your local Data Protection Authority (DPA). To exercise any of these rights, contact us at privacy@gustilk.com.",
  },
  {
    num: "10",
    title: "Automated Decision-Making",
    body: "Our matching algorithm uses automated processing to suggest compatible profiles based on your preferences and community affiliation. This is not solely automated decision-making with legal effect — you retain full control over whom you like or message.",
  },
  {
    num: "11",
    title: "Security",
    body: "We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, disclosure, alteration, or destruction, including TLS encryption, access controls, and regular security assessments.",
  },
  {
    num: "12",
    title: "Cookies",
    body: "We use cookies and similar technologies. For full details, please see our Cookie Policy in Settings > Legal & Safety > Cookie Policy.",
  },
  {
    num: "13",
    title: "Changes to This Notice",
    body: "We will notify you of material changes via in-app notification or email at least 14 days before changes take effect. Continued use of Gûstîlk after that date constitutes acceptance.",
  },
  {
    num: "14",
    title: "Contact & Complaints",
    body: "Data Protection Enquiries: privacy@gustilk.com\nWebsite: www.gustilk.com\n\nIf you are not satisfied with our response, you have the right to lodge a complaint with your national Data Protection Authority.",
  },
];

export default function GdprPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0d0618" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
        <button
          onClick={() => window.history.back()}
          data-testid="button-back-gdpr"
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ChevronLeft size={18} color="rgba(253,248,240,0.7)" />
        </button>
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} color="#c9a84c" />
          <h1 className="font-serif text-xl text-gold">GDPR Privacy Notice</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-16 space-y-4 max-w-2xl w-full mx-auto">
        <div className="rounded-2xl p-4" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}>
          <p className="text-gold text-sm font-semibold">Gûstîlk — GDPR Privacy Notice</p>
          <p className="text-cream/40 text-xs mt-1">Effective Date: March 5, 2026 · For users in the European Economic Area and United Kingdom</p>
        </div>

        <div className="rounded-2xl p-4" style={{ background: "rgba(123,63,160,0.08)", border: "1px solid rgba(123,63,160,0.25)" }}>
          <p className="text-cream/70 text-xs leading-relaxed">
            This GDPR Privacy Notice explains how Gûstîlk collects, uses, and protects your personal data in accordance with the EU General Data Protection Regulation (Regulation 2016/679) and, where applicable, the UK GDPR.
          </p>
        </div>

        {SECTIONS.map((s) => (
          <div key={s.num} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.1)" }}>
            <p className="text-gold text-sm font-semibold mb-1.5">
              {s.num}. {s.title}
            </p>
            <p className="text-cream/60 text-sm leading-relaxed whitespace-pre-line">{s.body}</p>
          </div>
        ))}

        <p className="text-center text-xs pb-4" style={{ color: "rgba(253,248,240,0.2)" }}>
          © 2026 Gûstîlk · www.gustilk.com
        </p>
      </div>
    </div>
  );
}
