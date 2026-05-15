import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bell, Send, CheckCircle, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export default function NotificationsPage({ user }: { user: User }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState<"all" | "premium" | "free">("all");
  const [result, setResult] = useState<{ tokens: number; sent: number; noKey: boolean } | null>(null);

  const sendMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/admin/notifications/send", { title, body, segment })).json(),
    onSuccess: (data) => {
      setResult(data);
      setTitle(""); setBody("");
    },
  });

  const SEGMENTS = [
    { value: "all", label: "All Users" },
    { value: "premium", label: "Premium Only" },
    { value: "free", label: "Free Users Only" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">Push Notifications</h1>
        <p className="text-cream/40 text-xs mt-0.5">Send push notifications to user segments</p>
      </div>

      <div className="rounded-2xl p-5 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}>
        <div className="mb-4">
          <label className="text-cream/60 text-xs font-semibold mb-1.5 block">Target Segment</label>
          <div className="flex gap-2">
            {SEGMENTS.map(s => (
              <button key={s.value} onClick={() => setSegment(s.value as any)}
                data-testid={`segment-${s.value}`}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: segment === s.value ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.06)",
                  color: segment === s.value ? "#c9a84c" : "rgba(253,248,240,0.5)",
                }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-3">
          <label className="text-cream/60 text-xs font-semibold mb-1.5 block">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Notification title…" data-testid="input-notification-title"
            className="w-full px-3 py-2.5 rounded-xl text-sm text-cream placeholder-cream/30 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
        </div>
        <div className="mb-4">
          <label className="text-cream/60 text-xs font-semibold mb-1.5 block">Message</label>
          <textarea value={body} onChange={e => setBody(e.target.value)}
            placeholder="Notification body…" data-testid="input-notification-body"
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-cream placeholder-cream/30 outline-none resize-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
        </div>
        <button onClick={() => title.trim() && body.trim() && sendMutation.mutate()}
          disabled={sendMutation.isPending || !title.trim() || !body.trim()}
          data-testid="button-send-notification"
          className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: "rgba(201,168,76,0.2)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)" }}>
          <Send size={14} /> {sendMutation.isPending ? "Sending…" : "Send Notification"}
        </button>
      </div>

      {result && (
        <div className="p-4 rounded-2xl mb-4"
          style={{ background: result.noKey ? "rgba(251,191,36,0.08)" : "rgba(16,185,129,0.08)", border: `1px solid ${result.noKey ? "rgba(251,191,36,0.2)" : "rgba(16,185,129,0.2)"}` }}>
          {result.noKey ? (
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} color="#fbbf24" className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold" style={{ color: "#fbbf24" }}>No Firebase key configured</p>
                <p className="text-xs text-cream/50 mt-0.5">
                  Set <code className="text-gold">FIREBASE_SERVER_KEY</code> env var to enable real push delivery.
                  Found <span className="text-cream/70 font-medium">{result.tokens}</span> device token{result.tokens !== 1 ? "s" : ""}.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <CheckCircle size={14} color="#10b981" className="flex-shrink-0 mt-0.5" />
              <p className="text-xs" style={{ color: "#10b981" }}>
                Sent to <span className="font-bold">{result.sent}</span> / {result.tokens} device{result.tokens !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="p-4 rounded-2xl text-cream/40 text-xs" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <p className="font-semibold text-cream/50 mb-1">Setup</p>
        Requires <code className="text-gold/70">FIREBASE_SERVER_KEY</code> (legacy FCM server key from Firebase Console → Project Settings → Cloud Messaging). Users must have opened the app at least once with notifications enabled.
      </div>
    </div>
  );
}
