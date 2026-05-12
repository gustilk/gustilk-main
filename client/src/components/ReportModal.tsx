import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Flag, ShieldX } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

interface ReportModalProps {
  reportedUserId: string;
  reportedUserName: string;
  onClose: () => void;
  onBlocked?: () => void;
}

export default function ReportModal({ reportedUserId, reportedUserName, onClose, onBlocked }: ReportModalProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<"menu" | "report" | "block-confirm">("menu");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const REASONS = [
    { key: "fake",               label: t("report.fake") },
    { key: "misleading",         label: t("report.misleading") },
    { key: "inappropriatePhotos",label: t("report.inappropriatePhotos") },
    { key: "behavior",           label: t("report.behavior") },
    { key: "casteIssue",         label: t("report.casteIssue") },
    { key: "harassment",         label: t("report.harassment") },
    { key: "offensive",          label: t("report.offensive") },
    { key: "other",              label: t("report.other") },
  ];

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
      setSubmitError(t("report.submitError"));
    },
  });

  const blockMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/users/${reportedUserId}/block`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blocks"] });
      onBlocked ? onBlocked() : onClose();
    },
    onError: () => {
      setSubmitError(t("report.blockError"));
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
            {view === "block-confirm"
              ? <ShieldX size={18} color="#d4608a" />
              : <Flag size={18} color="#d4608a" />}
            <h3 className="font-serif text-lg text-cream">
              {view === "menu" && reportedUserName}
              {view === "report" && t("report.reportTitle", { name: reportedUserName })}
              {view === "block-confirm" && t("report.blockTitle", { name: reportedUserName })}
            </h3>
          </div>
          <button onClick={onClose} data-testid="button-close-report">
            <X size={20} color="rgba(253,248,240,0.4)" />
          </button>
        </div>

        {/* ── Menu view ── */}
        {view === "menu" && (
          <div className="space-y-2">
            <button
              onClick={() => setView("report")}
              data-testid="button-open-report"
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(253,248,240,0.75)" }}
            >
              <Flag size={16} color="#d4608a" />
              <div>
                <p className="text-sm font-medium">{t("report.title")}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(253,248,240,0.35)" }}>{t("report.menuReportSub")}</p>
              </div>
            </button>

            <button
              onClick={() => setView("block-confirm")}
              data-testid="button-open-block"
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(253,248,240,0.75)" }}
            >
              <ShieldX size={16} color="#c9a84c" />
              <div>
                <p className="text-sm font-medium">{t("report.block")}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(253,248,240,0.35)" }}>{t("report.menuBlockSub")}</p>
              </div>
            </button>
          </div>
        )}

        {/* ── Report view ── */}
        {view === "report" && (
          <>
            <div className="space-y-2 mb-4">
              <p className="text-cream/50 text-xs uppercase tracking-wider font-semibold">{t("report.reason")}</p>
              {REASONS.map(r => (
                <button
                  key={r.key}
                  onClick={() => setReason(r.key)}
                  data-testid={`reason-${r.key}`}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all"
                  style={reason === r.key
                    ? { background: "rgba(212,96,138,0.15)", color: "#d4608a", border: "1px solid rgba(212,96,138,0.3)" }
                    : { background: "rgba(255,255,255,0.04)", color: "rgba(253,248,240,0.6)", border: "1px solid rgba(255,255,255,0.06)" }
                  }
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="mb-5">
              <p className="text-cream/50 text-xs uppercase tracking-wider font-semibold mb-2">{t("report.detailsOptional")}</p>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t("report.detailsPlaceholder")}
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
              {reportMutation.isPending ? t("report.submitting") : t("report.submit")}
            </button>
            <p className="text-center text-cream/25 text-xs mt-3">
              {t("report.falseReportWarning")}
            </p>
          </>
        )}

        {/* ── Block confirm view ── */}
        {view === "block-confirm" && (
          <>
            <p className="text-sm mb-6" style={{ color: "rgba(253,248,240,0.55)", lineHeight: 1.6 }}>
              {t("report.blockWill", { name: reportedUserName })}
            </p>
            <ul className="space-y-2 mb-6">
              {[
                t("report.blockEffect1"),
                t("report.blockEffect2"),
                t("report.blockEffect3"),
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm" style={{ color: "rgba(253,248,240,0.5)" }}>
                  <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: "#c9a84c" }} />
                  {item}
                </li>
              ))}
            </ul>

            {submitError && (
              <p className="text-xs mb-3 font-medium text-center" style={{ color: "#d4608a" }}>{submitError}</p>
            )}

            <div className="space-y-2">
              <button
                onClick={() => { setSubmitError(null); blockMutation.mutate(); }}
                disabled={blockMutation.isPending}
                data-testid="button-confirm-block"
                className="w-full py-3.5 rounded-xl font-bold text-sm disabled:opacity-50 transition-all"
                style={{ background: "linear-gradient(135deg, #7b3fa0, #d4608a)", color: "white" }}
              >
                {blockMutation.isPending ? t("report.blocking") : t("report.blockConfirm", { name: reportedUserName })}
              </button>
              <button
                onClick={() => setView("menu")}
                data-testid="button-cancel-block"
                className="w-full py-3 rounded-xl text-sm font-medium"
                style={{ color: "rgba(253,248,240,0.4)" }}
              >
                {t("report.cancel")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
