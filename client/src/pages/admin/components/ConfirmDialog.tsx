import { useEffect } from "react";
import { AlertTriangle, Trash2, CheckCircle, XCircle, Ban } from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "success";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: ConfirmVariant;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_CONFIG: Record<ConfirmVariant, { icon: React.ReactNode; confirmBg: string; confirmColor: string; confirmBorder: string; iconBg: string }> = {
  danger: {
    icon: <Trash2 size={20} color="#ef4444" />,
    iconBg: "rgba(239,68,68,0.12)",
    confirmBg: "rgba(239,68,68,0.18)",
    confirmColor: "#ef4444",
    confirmBorder: "1px solid rgba(239,68,68,0.4)",
  },
  warning: {
    icon: <AlertTriangle size={20} color="#fbbf24" />,
    iconBg: "rgba(251,191,36,0.12)",
    confirmBg: "rgba(251,191,36,0.18)",
    confirmColor: "#fbbf24",
    confirmBorder: "1px solid rgba(251,191,36,0.4)",
  },
  success: {
    icon: <CheckCircle size={20} color="#10b981" />,
    iconBg: "rgba(16,185,129,0.12)",
    confirmBg: "rgba(16,185,129,0.18)",
    confirmColor: "#10b981",
    confirmBorder: "1px solid rgba(16,185,129,0.4)",
  },
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "danger",
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cfg = VARIANT_CONFIG[variant];

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onCancel()}
      data-testid="confirm-dialog"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{
          background: "#130820",
          border: "1px solid rgba(200,0,14,0.2)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Icon */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: cfg.iconBg }}
          >
            {cfg.icon}
          </div>
          <div>
            <h3 className="font-serif text-base text-gold font-bold">{title}</h3>
            <p className="text-cream/55 text-sm mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-1">
          <button
            onClick={onCancel}
            disabled={isPending}
            data-testid="confirm-dialog-cancel"
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(253,248,240,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            data-testid="confirm-dialog-confirm"
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40"
            style={{ background: cfg.confirmBg, color: cfg.confirmColor, border: cfg.confirmBorder }}
          >
            {isPending ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
