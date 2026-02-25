import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Star, Check, Eye, Heart, MessageCircle, Users } from "lucide-react";
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

export default function PremiumPage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [method, setMethod] = useState("card");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(false);

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
      title: "Payment setup required",
      description: "Payment integration requires API keys. Contact us to complete setup.",
    });
  };

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "#0d0618" }}>
      {/* Header */}
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
        {/* Hero */}
        <div className="text-center py-4">
          <div className="flex justify-center mb-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse-ring"
              style={{ border: "2px solid #c9a84c" }}
            >
              <Star size={36} fill="#c9a84c" color="#c9a84c" />
            </div>
          </div>
          <h2 className="font-serif text-3xl text-gold mb-1">Go Premium</h2>
          <p className="text-cream/50 text-sm">Unlock unlimited connections</p>
          <div className="mt-4">
            <span className="font-serif text-5xl text-gold">$5</span>
            <span className="text-cream/40 text-sm">/month</span>
          </div>
          <p className="text-cream/30 text-xs mt-1">Free for users in Iraq</p>
        </div>

        {/* Benefits */}
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
              <span className="text-cream/80 text-sm" data-testid={`benefit-${text.replace(/\s+/g, '-')}`}>{text}</span>
              <Check size={14} className="ml-auto flex-shrink-0" color="rgba(16,185,129,0.7)" />
            </div>
          ))}
        </div>

        {/* Payment Method */}
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

        <button
          onClick={handlePay}
          disabled={loading}
          data-testid="button-pay"
          className="w-full py-4 rounded-xl font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "white", boxShadow: "0 8px 24px rgba(245,158,11,0.3)" }}
        >
          <Star size={17} fill="white" />
          {loading ? "Processing…" : "Subscribe for $5/month"}
        </button>

        <p className="text-center text-cream/25 text-xs">
          Cancel anytime. Payments processed securely.
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
