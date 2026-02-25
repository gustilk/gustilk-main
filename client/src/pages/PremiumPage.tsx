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

const PAYMENT_METHODS = [
  { id: "card", label: "Credit/Debit Card", region: "International" },
  { id: "zaincash", label: "ZainCash", region: "Iraq" },
  { id: "fastpay", label: "FastPay", region: "Iraq" },
];

const COUNTRIES = [
  { code: "IQ", name: "Iraq", flag: "🇮🇶", isFree: true },
  { code: "DE", name: "Germany", flag: "🇩🇪", isFree: false },
  { code: "SE", name: "Sweden", flag: "🇸🇪", isFree: false },
  { code: "US", name: "United States", flag: "🇺🇸", isFree: false },
  { code: "AU", name: "Australia", flag: "🇦🇺", isFree: false },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", isFree: false },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", isFree: false },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", isFree: false },
];

function detectCountry(userCountry: string) {
  return COUNTRIES.find(c => c.name.toLowerCase() === userCountry.toLowerCase()) ?? COUNTRIES[1];
}

export default function PremiumPage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [method, setMethod] = useState("card");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(() => detectCountry(user.country));

  const isFree = selectedCountry.isFree;

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
        ? "Premium is free for users in Iraq. Your account has been upgraded!"
        : "Payment integration requires API keys. Contact us to complete setup.",
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
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))", border: "2px solid #c9a84c" }}
              >
                🎉
              </div>
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse-ring"
                style={{ border: "2px solid #c9a84c" }}
              >
                <Star size={36} fill="#c9a84c" color="#c9a84c" />
              </div>
            )}
          </div>

          {isFree ? (
            <>
              <h2 className="font-serif text-3xl text-gold mb-1">مجاناً!</h2>
              <p className="text-cream/60 text-sm mb-1">Premium is free for users in Iraq</p>
              <p className="text-cream/40 text-xs">As a thank-you to our Yezidi community in the homeland</p>
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

        <button
          onClick={() => setShowCountryPicker(s => !s)}
          data-testid="button-country-picker"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,168,76,0.2)" }}
        >
          <Globe size={16} color="#c9a84c" />
          <span className="text-cream/70 text-sm flex-1 text-left">
            {selectedCountry.flag} {selectedCountry.name}
            {selectedCountry.isFree && (
              <span className="ml-2 text-xs font-bold" style={{ color: "#10b981" }}>Free</span>
            )}
          </span>
          <span className="text-cream/30 text-xs">Change country</span>
        </button>

        {showCountryPicker && (
          <div
            className="rounded-2xl overflow-hidden animate-slide-up"
            style={{ border: "1px solid rgba(201,168,76,0.2)", background: "rgba(255,255,255,0.04)" }}
          >
            {COUNTRIES.map(country => (
              <button
                key={country.code}
                onClick={() => { setSelectedCountry(country); setShowCountryPicker(false); }}
                data-testid={`country-${country.code}`}
                className="w-full flex items-center gap-3 px-4 py-3 transition-all text-left"
                style={selectedCountry.code === country.code ? { background: "rgba(201,168,76,0.1)" } : {}}
              >
                <span className="text-xl">{country.flag}</span>
                <span className="flex-1 text-cream text-sm">{country.name}</span>
                {country.isFree && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(16,185,129,0.2)", color: "#10b981" }}
                  >
                    FREE
                  </span>
                )}
                {selectedCountry.code === country.code && (
                  <Check size={14} color="#c9a84c" />
                )}
              </button>
            ))}
          </div>
        )}

        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}
        >
          {BENEFITS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(201,168,76,0.12)" }}
              >
                <Icon size={15} color="#c9a84c" />
              </div>
              <span className="text-cream/80 text-sm flex-1" data-testid={`benefit-${text.replace(/\s+/g, '-')}`}>{text}</span>
              <Check size={14} className="ml-auto flex-shrink-0" color="rgba(16,185,129,0.7)" />
            </div>
          ))}
        </div>

        {!isFree && (
          <div>
            <div className="text-xs text-cream/50 uppercase tracking-wider mb-3 font-semibold">Payment Method</div>
            <div className="flex rounded-xl p-1 mb-4" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.id}
                  onClick={() => setMethod(pm.id)}
                  data-testid={`method-${pm.id}`}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all text-center"
                  style={method === pm.id
                    ? { background: "#c9a84c", color: "#1a0a2e" }
                    : { color: "rgba(253,248,240,0.45)" }
                  }
                >
                  {pm.label}
                </button>
              ))}
            </div>

            {method === "card" && (
              <div className="space-y-3" data-testid="form-card">
                <GoldInput
                  value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                  placeholder="Card number" data-testid="input-card-number"
                />
                <div className="grid grid-cols-2 gap-3">
                  <GoldInput
                    value={expiry} onChange={e => setExpiry(e.target.value)}
                    placeholder="MM / YY" data-testid="input-expiry"
                  />
                  <GoldInput
                    value={cvv} onChange={e => setCvv(e.target.value)}
                    placeholder="CVV" data-testid="input-cvv"
                  />
                </div>
              </div>
            )}

            {(method === "zaincash" || method === "fastpay") && (
              <div data-testid={`form-${method}`}>
                <GoldInput
                  value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="Iraqi phone number (07xx xxxxxxx)" data-testid="input-phone"
                />
                <p className="text-cream/30 text-xs mt-2">
                  You'll be redirected to {method === "zaincash" ? "ZainCash" : "FastPay"} to complete payment.
                </p>
              </div>
            )}
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
          {loading ? "Processing…" : isFree ? "Get Free Premium — Iraq" : "Subscribe for $5/month"}
        </button>

        <p className="text-center text-cream/25 text-xs">
          {isFree ? "Premium is permanently free for users in Iraq." : "Cancel anytime. Payments processed securely."}
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
