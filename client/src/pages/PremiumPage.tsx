import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Star, Check, Eye, Heart, MessageCircle, Users, Globe } from "lucide-react";
import type { SafeUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface Props { user: SafeUser }

const BENEFITS = [
  { icon: Heart, text: "Unlimited likes every day" },
  { icon: MessageCircle, text: "Send & read all messages" },
  { icon: Eye, text: "See who liked your profile" },
  { icon: Users, text: "See all your matches" },
  { icon: Star, text: "Priority profile placement" },
];

type PaymentMethod = {
  id: string;
  label: string;
  fields: PaymentField[];
};

type PaymentField = {
  key: string;
  label: string;
  placeholder: string;
  type?: string;
};

const COUNTRY_DATA: Record<string, { isFree: boolean; flag: string; payment: PaymentMethod }> = {
  Germany:     { isFree: false, flag: "🇩🇪", payment: { id: "sepa",      label: "SEPA Direct Debit",  fields: [{ key: "iban", label: "IBAN", placeholder: "DE89 3704 0044 0532 0130 00" }] } },
  Holland:     { isFree: false, flag: "🇳🇱", payment: { id: "ideal",     label: "iDEAL",              fields: [{ key: "bank", label: "Bank", placeholder: "ABN AMRO / ING / Rabobank" }] } },
  Sweden:      { isFree: false, flag: "🇸🇪", payment: { id: "klarna",    label: "Klarna",             fields: [{ key: "email", label: "Email", placeholder: "your@email.com", type: "email" }] } },
  Belgium:     { isFree: false, flag: "🇧🇪", payment: { id: "bancontact",label: "Bancontact",         fields: [{ key: "card", label: "Card number", placeholder: "6703 xxxx xxxx xxxx" }] } },
  Iraq:        { isFree: true,  flag: "🇮🇶", payment: { id: "free",      label: "Free",               fields: [] } },
  USA:         { isFree: false, flag: "🇺🇸", payment: { id: "card",      label: "Credit/Debit Card",  fields: [{ key: "card", label: "Card number", placeholder: "4242 4242 4242 4242" }, { key: "expiry", label: "MM/YY", placeholder: "12/27" }, { key: "cvv", label: "CVV", placeholder: "123", type: "password" }] } },
  Canada:      { isFree: false, flag: "🇨🇦", payment: { id: "card",      label: "Credit/Debit Card",  fields: [{ key: "card", label: "Card number", placeholder: "4242 4242 4242 4242" }, { key: "expiry", label: "MM/YY", placeholder: "12/27" }, { key: "cvv", label: "CVV", placeholder: "123", type: "password" }] } },
  Australia:   { isFree: false, flag: "🇦🇺", payment: { id: "card",      label: "Credit/Debit Card",  fields: [{ key: "card", label: "Card number", placeholder: "4242 4242 4242 4242" }, { key: "expiry", label: "MM/YY", placeholder: "12/27" }, { key: "cvv", label: "CVV", placeholder: "123", type: "password" }] } },
  France:      { isFree: false, flag: "🇫🇷", payment: { id: "card",      label: "Credit/Debit Card",  fields: [{ key: "card", label: "Card number", placeholder: "4242 4242 4242 4242" }, { key: "expiry", label: "MM/YY", placeholder: "12/27" }, { key: "cvv", label: "CVV", placeholder: "123", type: "password" }] } },
  Turkey:      { isFree: false, flag: "🇹🇷", payment: { id: "card",      label: "Credit/Debit Card",  fields: [{ key: "card", label: "Card number", placeholder: "4242 4242 4242 4242" }, { key: "expiry", label: "MM/YY", placeholder: "12/27" }, { key: "cvv", label: "CVV", placeholder: "123", type: "password" }] } },
  Armenia:     { isFree: false, flag: "🇦🇲", payment: { id: "card",      label: "Credit/Debit Card",  fields: [{ key: "card", label: "Card number", placeholder: "4242 4242 4242 4242" }, { key: "expiry", label: "MM/YY", placeholder: "12/27" }, { key: "cvv", label: "CVV", placeholder: "123", type: "password" }] } },
  Georgia:     { isFree: false, flag: "🇬🇪", payment: { id: "card",      label: "Credit/Debit Card",  fields: [{ key: "card", label: "Card number", placeholder: "4242 4242 4242 4242" }, { key: "expiry", label: "MM/YY", placeholder: "12/27" }, { key: "cvv", label: "CVV", placeholder: "123", type: "password" }] } },
  Russia:      { isFree: false, flag: "🇷🇺", payment: { id: "card",      label: "Credit/Debit Card",  fields: [{ key: "card", label: "Card number", placeholder: "4242 4242 4242 4242" }, { key: "expiry", label: "MM/YY", placeholder: "12/27" }, { key: "cvv", label: "CVV", placeholder: "123", type: "password" }] } },
  UK:          { isFree: false, flag: "🇬🇧", payment: { id: "card",      label: "Credit/Debit Card",  fields: [{ key: "card", label: "Card number", placeholder: "4242 4242 4242 4242" }, { key: "expiry", label: "MM/YY", placeholder: "12/27" }, { key: "cvv", label: "CVV", placeholder: "123", type: "password" }] } },
};


function getCountryData(country: string) {
  return COUNTRY_DATA[country] ?? COUNTRY_DATA["USA"];
}

export default function PremiumPage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [useLocalPayment, setUseLocalPayment] = useState<string | null>(null);

  const selectedCountry = user.country ?? "Germany";
  const countryInfo = getCountryData(selectedCountry);
  const isFree = countryInfo.isFree;
  const isIraq = selectedCountry === "Iraq";

  if (user.isPremium) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center pb-24 px-6 text-center" style={{ background: "#0d0618" }}>
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-pulse-ring"
          style={{ border: "3px solid #c9a84c" }}
        >
          <Star size={40} fill="#c9a84c" color="#c9a84c" />
        </div>
        <h2 className="font-serif text-3xl text-gold mb-2">Premium Active</h2>
        <p className="text-cream/50 text-sm mb-8">You have full access to all premium features.</p>
        <button
          onClick={() => setLocation("/discover")}
          data-testid="button-back-discover"
          className="px-6 py-3 rounded-xl font-semibold text-sm"
          style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
        >
          Start Discovering
        </button>
      </div>
    );
  }

  const handlePay = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    toast({
      title: isFree ? "Welcome to Premium!" : "Payment setup required",
      description: isFree
        ? "Premium is free for users in Iraq. Contact us to activate your account."
        : `${countryInfo.payment.label} integration coming soon. Contact support@gustilk.com.`,
    });
  };

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "#0d0618" }}>
      <div
        className="flex items-center gap-3 px-5 pt-12 pb-4"
        style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}
      >
        <button onClick={() => setLocation("/profile")} data-testid="button-back" className="text-cream/60">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-serif text-2xl text-gold">Premium</h1>
      </div>

      <div className="px-5 py-6 space-y-6">
        <div className="text-center py-2">
          <div className="flex justify-center mb-4">
            {isFree ? (
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                style={{ background: "rgba(201,168,76,0.08)", border: "2px solid #c9a84c" }}>
                🎉
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse-ring"
                style={{ border: "2px solid #c9a84c" }}>
                <Star size={36} fill="#c9a84c" color="#c9a84c" />
              </div>
            )}
          </div>
          {isFree ? (
            <>
              <h2 className="font-serif text-3xl text-gold mb-1">مجاناً!</h2>
              <p className="text-cream/60 text-sm">Premium is free for users in Iraq</p>
              <p className="text-cream/35 text-xs mt-1">As a thank-you to our Yezidi homeland community</p>
            </>
          ) : (
            <>
              <h2 className="font-serif text-3xl text-gold mb-1">Go Premium</h2>
              <p className="text-cream/50 text-sm">Unlock unlimited connections</p>
              <div className="mt-3">
                <span className="font-serif text-5xl text-gold">$5</span>
                <span className="text-cream/40 text-sm">/month</span>
              </div>
            </>
          )}
        </div>

        <div
          data-testid="display-country"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.12)" }}
        >
          <Globe size={16} color="#c9a84c" />
          <span className="text-cream/70 text-sm flex-1">
            {countryInfo.flag} {selectedCountry}
            {isFree && <span className="ml-2 text-xs font-bold" style={{ color: "#10b981" }}>Free</span>}
          </span>
          <span className="text-cream/30 text-xs">{countryInfo.payment.label}</span>
        </div>

        <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}>
          {BENEFITS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.12)" }}>
                <Icon size={15} color="#c9a84c" />
              </div>
              <span className="text-cream/80 text-sm flex-1" data-testid={`benefit-${text.replace(/\s+/g, '-')}`}>{text}</span>
              <Check size={14} color="rgba(16,185,129,0.7)" />
            </div>
          ))}
        </div>

        {!isFree && (
          <div>
            <div className="text-xs text-cream/50 uppercase tracking-wider mb-3 font-semibold">
              Payment — {countryInfo.payment.label}
            </div>

            {isIraq && (
              <div className="flex rounded-xl p-1 mb-4" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
                {[{ id: null, label: "ZainCash" }, { id: "fastpay", label: "FastPay" }].map(pm => (
                  <button
                    key={pm.id ?? "zaincash"}
                    onClick={() => setUseLocalPayment(pm.id)}
                    data-testid={`method-${pm.id ?? "zaincash"}`}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all text-center"
                    style={useLocalPayment === pm.id
                      ? { background: "#c9a84c", color: "#1a0a2e" }
                      : { color: "rgba(253,248,240,0.45)" }}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3" data-testid="form-payment">
              {countryInfo.payment.fields.map(field => (
                <div key={field.key}>
                  <div className="text-xs text-cream/50 mb-1.5 font-semibold">{field.label}</div>
                  <GoldInput
                    type={field.type ?? "text"}
                    value={fieldValues[field.key] ?? ""}
                    onChange={e => setFieldValues(v => ({ ...v, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    data-testid={`input-${field.key}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={loading}
          data-testid="button-pay"
          className="w-full py-4 rounded-xl font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          style={isFree
            ? { background: "linear-gradient(135deg, #10b981, #059669)", color: "white", boxShadow: "0 8px 24px rgba(16,185,129,0.3)" }
            : { background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "white", boxShadow: "0 8px 24px rgba(245,158,11,0.3)" }
          }
        >
          <Star size={17} fill="white" />
          {loading ? "Processing…" : isFree ? "Get Free Premium — Iraq" : `Subscribe via ${countryInfo.payment.label}`}
        </button>

        <p className="text-center text-cream/25 text-xs">
          {isFree ? "Premium is permanently free for users in Iraq." : "Cancel anytime. Secure payment processing."}
        </p>
      </div>
    </div>
  );
}

function GoldInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-4 py-3 rounded-xl text-sm text-cream placeholder-cream/25 outline-none"
      style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(201,168,76,0.25)" }}
      onFocus={e => (e.target.style.borderColor = "#c9a84c")}
      onBlur={e => (e.target.style.borderColor = "rgba(201,168,76,0.25)")}
    />
  );
}
