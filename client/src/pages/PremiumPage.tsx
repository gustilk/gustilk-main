import newLogo from "@assets/IMG_1901_transparent.png";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { ArrowLeft, Star, Check, Eye, Heart, MessageCircle, Users, Globe, CreditCard, Smartphone } from "lucide-react";
import { SiPaypal, SiApplepay, SiGooglepay, SiVenmo, SiKlarna } from "react-icons/si";
import type { SafeUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isNative, purchasePremium } from "@/lib/purchases";


interface Props { user: SafeUser }


type FieldDef = { key: string; label: string; placeholder: string; type?: string };

type Method = {
  id: string;
  label: string;
  icon: React.ReactNode;
  fields: FieldDef[];
  redirectOnly?: boolean;
};

const CARD_FIELDS: FieldDef[] = [
  { key: "card", label: "Card Number", placeholder: "4242 4242 4242 4242" },
  { key: "expiry", label: "MM / YY", placeholder: "12 / 27" },
  { key: "cvv", label: "CVV", placeholder: "123", type: "password" },
];

const METHODS: Record<string, Method> = {
  card:      { id: "card",      label: "Card",          icon: <CreditCard size={18} />,     fields: CARD_FIELDS },
  paypal:    { id: "paypal",    label: "PayPal",         icon: <SiPaypal size={18} />,       fields: [{ key: "email", label: "PayPal Email", placeholder: "your@paypal.com", type: "email" }] },
  apple_pay: { id: "apple_pay", label: "Apple Pay",      icon: <SiApplepay size={20} />,     fields: [], redirectOnly: true },
  google_pay:{ id: "google_pay",label: "Google Pay",     icon: <SiGooglepay size={20} />,    fields: [], redirectOnly: true },
  venmo:     { id: "venmo",     label: "Venmo",          icon: <SiVenmo size={18} />,        fields: [{ key: "handle", label: "Venmo Username", placeholder: "@your-username" }] },
  klarna:    { id: "klarna",    label: "Klarna",         icon: <SiKlarna size={18} />,       fields: [{ key: "email", label: "Email", placeholder: "your@email.com", type: "email" }] },
  sepa:      { id: "sepa",      label: "SEPA",           icon: <span className="text-xs font-bold">â‚¬</span>, fields: [{ key: "iban", label: "IBAN", placeholder: "DE89 3704 0044 0532 0130 00" }, { key: "bic", label: "BIC", placeholder: "COBADEFFXXX" }] },
  giropay:   { id: "giropay",   label: "Giropay",        icon: <span className="text-xs font-bold">GP</span>,fields: [{ key: "iban", label: "IBAN", placeholder: "DE89 3704 0044 0532 0130 00" }, { key: "bic", label: "BIC", placeholder: "COBADEFFXXX" }] },
  ideal:     { id: "ideal",     label: "iDEAL",          icon: <span className="text-xs font-bold">iD</span>,fields: [{ key: "bank", label: "Bank", placeholder: "ABN AMRO / ING / Rabobank" }] },
  swish:     { id: "swish",     label: "Swish",          icon: <Smartphone size={16} />,     fields: [{ key: "phone", label: "Phone", placeholder: "+46 70 000 0000", type: "tel" }] },
  bancontact:{ id: "bancontact",label: "Bancontact",     icon: <span className="text-xs font-bold">BC</span>,fields: [{ key: "card", label: "Card Number", placeholder: "6703 xxxx xxxx xxxx" }, { key: "expiry", label: "MM / YY", placeholder: "12 / 27" }] },
  interac:   { id: "interac",   label: "Interac",        icon: <span className="text-xs font-bold">INT</span>,fields: [{ key: "email", label: "Email", placeholder: "your@email.com", type: "email" }] },
  bpay:      { id: "bpay",      label: "BPAY",           icon: <span className="text-xs font-bold">BP</span>,fields: [{ key: "biller", label: "Biller Code", placeholder: "12345" }, { key: "ref", label: "Reference", placeholder: "00000000" }] },
  mir:       { id: "mir",       label: "MIR",            icon: <span className="text-xs font-bold">ÐœÐ˜Ð </span>,fields: CARD_FIELDS },
  idram:     { id: "idram",     label: "IDram",          icon: <Smartphone size={16} />,     fields: [{ key: "phone", label: "Phone", placeholder: "+374 XX XXX XXX", type: "tel" }] },
  bog_pay:   { id: "bog_pay",   label: "BOG Pay",        icon: <Smartphone size={16} />,     fields: [], redirectOnly: true },
  lyf_pay:   { id: "lyf_pay",   label: "Lyf Pay",        icon: <Smartphone size={16} />,     fields: [], redirectOnly: true },
};

type CountryConfig = {
  isFree: boolean;
  flag: string;
  methods: string[];
};

const COUNTRY_DATA: Record<string, CountryConfig> = {
  USA:       { isFree: false, flag: "🇺🇸", methods: ["card", "paypal", "apple_pay", "google_pay"] },
  Canada:    { isFree: false, flag: "🇨🇦", methods: ["card", "paypal", "apple_pay", "google_pay", "interac"] },
  Australia: { isFree: false, flag: "🇦🇺", methods: ["card", "paypal", "apple_pay", "google_pay", "bpay"] },
  Germany:   { isFree: false, flag: "🇩🇪", methods: ["card", "sepa", "paypal", "apple_pay", "google_pay", "klarna", "giropay"] },
  Holland:   { isFree: false, flag: "🇳🇱", methods: ["card", "ideal", "paypal", "apple_pay", "google_pay", "klarna"] },
  Sweden:    { isFree: false, flag: "🇸🇪", methods: ["card", "swish", "paypal", "apple_pay", "google_pay", "klarna"] },
  Belgium:   { isFree: false, flag: "🇧🇪", methods: ["card", "bancontact", "paypal", "apple_pay", "google_pay"] },
  France:    { isFree: false, flag: "🇫🇷", methods: ["card", "paypal", "apple_pay", "google_pay", "klarna", "lyf_pay"] },
  Turkey:    { isFree: false, flag: "🇹🇷", methods: ["card", "paypal", "apple_pay", "google_pay"] },
  Armenia:   { isFree: false, flag: "🇦🇲", methods: ["card", "paypal", "idram"] },
  Georgia:   { isFree: false, flag: "🇬🇪", methods: ["card", "paypal", "apple_pay", "google_pay", "bog_pay"] },
  Russia:    { isFree: false, flag: "🇷🇺", methods: ["card", "mir"] },
  UK:        { isFree: false, flag: "🇬🇧", methods: ["card", "paypal", "apple_pay", "google_pay", "klarna"] },
  Iraq:      { isFree: true,  flag: "🇮🇶", methods: [] },
};

function getCountryConfig(country: string): CountryConfig {
  return COUNTRY_DATA[country] ?? COUNTRY_DATA["USA"];
}

export default function PremiumPage({ user }: Props) {
  const { t } = useTranslation();
  const BENEFITS = [
    { icon: Heart, text: t("premium.benefit1") },
    { icon: MessageCircle, text: t("premium.benefit2") },
    { icon: Eye, text: t("premium.benefit3") },
    { icon: Users, text: t("premium.benefit4") },
    { icon: Star, text: t("premium.benefit5") },
    { icon: Globe, text: t("premium.benefit6") },
  ];
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const selectedCountry = user.country ?? "Germany";
  const config = getCountryConfig(selectedCountry);
  const isFree = config.isFree;

  const defaultMethod = config.methods[0] ?? "card";
  const [selectedMethod, setSelectedMethod] = useState(defaultMethod);
  const method = METHODS[selectedMethod];

  if (user.isPremium) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center pb-24 px-6 text-center" style={{ background: "#060612" }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ border: "3px solid #c9a84c" }}>
          <Star size={40} fill="#c9a84c" color="#c9a84c" />
        </div>
        <h2 className="font-serif text-3xl text-gold mb-2">{t("premium.alreadyPremium")}</h2>
        <p className="text-cream/50 text-sm mb-8">{t("premium.subtitle")}</p>
        <button onClick={() => setLocation("/discover")} data-testid="button-back-discover"
          className="px-6 py-3 rounded-xl font-semibold text-sm"
          style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}>
          Start Discovering
        </button>
      </div>
    );
  }

  const handlePay = async () => {
    setLoading(true);
    if (isFree) {
      try {
        await apiRequest("POST", "/api/premium/subscribe", {});
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({ title: t("premium.title"), description: t("premium.freeIraqSub") });
        setLocation("/discover");
      } catch (err: any) {
        const raw: string = err?.message ?? "";
        const statusMatch = raw.match(/^(\d+): ([\s\S]+)$/);
        if (statusMatch) {
          const [, , bodyText] = statusMatch;
          let description = "Please try again.";
          try { description = JSON.parse(bodyText)?.error ?? bodyText; } catch { description = bodyText; }
          toast({ title: "Something went wrong", description, variant: "destructive" });
        } else {
          toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
        }
      }
    } else if (isNative()) {
      // Native app — trigger App Store / Google Play IAP sheet via RevenueCat
      const result = await purchasePremium();
      if (result.cancelled) {
        // User dismissed the sheet — do nothing
      } else if (result.success) {
        // IAP succeeded — sync premium status from our server
        try {
          await apiRequest("POST", "/api/premium/restore", {});
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          toast({ title: t("premium.title"), description: "You now have full access." });
          setLocation("/discover");
        } catch {
          toast({ title: "Purchase successful!", description: "Restart the app if premium doesn't activate immediately." });
        }
      } else {
        toast({ title: "Purchase failed", description: result.error ?? "Please try again.", variant: "destructive" });
      }
    } else {
      toast({
        title: "Payment setup required",
        description: `${method?.label ?? "Payment"} integration is coming soon. Email support@gustilk.com to get early access.`,
      });
    }
    setLoading(false);
  };

  const selectMethod = (id: string) => {
    setSelectedMethod(id);
    setFieldValues({});
  };

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "#060612" }}>
      <div className="flex items-center gap-3 px-5 pt-12 pb-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
        <button onClick={() => window.history.back()} data-testid="button-back" className="text-cream/60">
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2.5 flex-1">
          <img src={newLogo} alt="" className="flex-shrink-0" style={{ width: "64px", height: "64px", objectFit: "contain" }} />
          <h1 className="font-serif text-2xl text-gold">Premium</h1>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6">
        {/* Hero */}
        <div className="text-center py-2">
          <div className="flex justify-center mb-4">
            {isFree ? (
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                style={{ background: "rgba(201,168,76,0.08)", border: "2px solid #c9a84c" }}>🎉</div>
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ border: "2px solid #c9a84c" }}>
                <Star size={36} fill="#c9a84c" color="#c9a84c" />
              </div>
            )}
          </div>
          {isFree ? (
            <>
              <h2 className="font-serif text-3xl text-gold mb-1">Ù…Ø¬Ø§Ù†Ø§Ù‹!</h2>
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

        {/* Country badge */}
        <div data-testid="display-country"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.12)" }}>
          <Globe size={16} color="#c9a84c" />
          <span className="text-cream/70 text-sm flex-1">
            {config.flag} {selectedCountry}
            {isFree && <span className="ml-2 text-xs font-bold" style={{ color: "#10b981" }}>Free</span>}
          </span>
        </div>

        {/* Benefits */}
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

        {/* Payment section */}
        {!isFree && (
          <div className="space-y-4">
            <div className="text-xs text-cream/50 uppercase tracking-wider font-semibold">Choose payment method</div>

            {/* Method grid */}
            <div className="grid grid-cols-2 gap-2" data-testid="payment-method-grid">
              {config.methods.map(id => {
                const m = METHODS[id];
                const isSelected = selectedMethod === id;
                return (
                  <button
                    key={id}
                    onClick={() => selectMethod(id)}
                    data-testid={`method-${id}`}
                    className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl transition-all"
                    style={isSelected
                      ? { background: "rgba(201,168,76,0.18)", border: "1.5px solid #c9a84c", color: "#c9a84c" }
                      : { background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(201,168,76,0.15)", color: "rgba(253,248,240,0.5)" }
                    }
                  >
                    <span className="flex items-center justify-center" style={{ color: isSelected ? "#c9a84c" : "rgba(253,248,240,0.6)" }}>
                      {m?.icon}
                    </span>
                    <span className="text-[10px] font-semibold leading-tight text-center">{m?.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Method-specific form */}
            {method && (
              <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}>
                {method.redirectOnly ? (
                  <div className="text-center py-3">
                    <div className="flex justify-center mb-2 text-gold">{method.icon}</div>
                    <p className="text-cream/60 text-sm">
                      You'll be redirected to <span className="text-gold font-semibold">{method.label}</span> to complete payment securely.
                    </p>
                  </div>
                ) : (
                  method.fields.map(field => (
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
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* CTA button */}
        <button
          onClick={handlePay}
          disabled={loading}
          data-testid="button-pay"
          className="w-full py-4 rounded-xl font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          style={isFree
            ? { background: "linear-gradient(135deg, #10b981, #059669)", color: "white", boxShadow: "0 8px 24px rgba(16,185,129,0.3)" }
            : { background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e", boxShadow: "0 8px 24px rgba(201,168,76,0.4)" }
          }
        >
          <Star size={17} fill={isFree ? "white" : "#1a0a2e"} />
          {loading ? "Processing…" : isFree ? "Get Free Premium" : isNative() ? "Subscribe — $5 / month" : `Subscribe via ${method?.label ?? "Payment"}`}
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

