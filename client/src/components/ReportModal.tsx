import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Flag } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ReportModalProps {
  reportedUserId: string;
  reportedUserName: string;
  onClose: () => void;
}

const REASONS = [
  "Fake profile",
  "Inappropriate behavior",
  "Misrepresentation of caste",
  "Harassment",
  "Offensive content",
  "Other",
];

export default function ReportModal({ reportedUserId, reportedUserName, onClose }: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reports", {
        reportedUserId,
        reason,
        description,
      });
      return res.json();
    },
    onSuccess: () => {
      onClose();
    },
    onError: () => {
      setSubmitError("Failed to submit report. Please try again.");
    },
  });

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
      data-testid="report-modal"
    >
      <div
        className="w-full max-w-sm rounded-t-3xl p-6 animate-slide-up"
        style={{ background: "#150826", border: "1px solid rgba(201,168,76,0.2)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Flag size={18} color="#d4608a" />
            <h3 className="font-serif text-lg text-cream">Report {reportedUserName}</h3>
          </div>
          <button onClick={onClose} data-testid="button-close-report">
            <X size={20} color="rgba(253,248,240,0.4)" />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          <p className="text-cream/50 text-xs uppercase tracking-wider font-semibold">Reason</p>
          {REASONS.map(r => (
            <button
              key={r}
              onClick={() => setReason(r)}
              data-testid={`reason-${r.replace(/\s+/g, '-')}`}
              className="w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all"
              style={reason === r
                ? { background: "rgba(212,96,138,0.15)", color: "#d4608a", border: "1px solid rgba(212,96,138,0.3)" }
                : { background: "rgba(255,255,255,0.04)", color: "rgba(253,248,240,0.6)", border: "1px solid rgba(255,255,255,0.06)" }
              }
            >
              {r}
            </button>
          ))}
        </div>

        <div className="mb-5">
          <p className="text-cream/50 text-xs uppercase tracking-wider font-semibold mb-2">Additional details (optional)</p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the issue…"
            rows={3}
            data-testid="input-report-description"
            className="w-full px-4 py-3 rounded-xl text-sm text-cream placeholder-cream/25 outline-none resize-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(201,168,76,0.2)" }}
          />
        </div>

        {submitError && (
          <p className="text-xs mb-3 font-medium text-center" style={{ color: "#d4608a" }}>{submitError}</p>
        )}
        <button
          onClick={() => { setSubmitError(null); reportMutation.mutate(); }}
          disabled={!reason || reportMutation.isPending}
          data-testid="button-submit-report"
          className="w-full py-3.5 rounded-xl font-bold text-sm disabled:opacity-50 transition-all"
          style={{ background: "linear-gradient(135deg, #b91c1c, #ef4444)", color: "white" }}
        >
          {reportMutation.isPending ? "Submitting…" : "Submit Report"}
        </button>
        <p className="text-center text-cream/25 text-xs mt-3">
          False reports may result in account suspension.
        </p>
      </div>
    </div>
  );
}
