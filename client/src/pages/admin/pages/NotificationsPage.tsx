import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bell, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

export default function NotificationsPage({ user }: { user: User }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState<"all" | "premium" | "free">("all");

  const sendMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/admin/notifications/send", { title, body, segment })).json(),
    onSuccess: () => {
      toast({ title: "Notification sent" });
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
        <p className="text-cream/40 text-xs mt-0.5">Send in-app notifications to user segments</p>
      </div>

      <div className="rounded-2xl p-5 mb-4" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,215,0,0.15)" }}>
        <div className="mb-4">
          <label className="text-cream/60 text-xs font-semibold mb-1.5 block">Target Segment</label>
          <div className="flex gap-2">
            {SEGMENTS.map(s => (
              <button key={s.value} onClick={() => setSegment(s.value as any)}
                data-testid={`segment-${s.value}`}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: segment === s.value ? "rgba(255,215,0,0.2)" : "rgba(255,255,255,0.12)",
                  color: segment === s.value ? "#FFD700" : "rgba(255,255,255,0.5)",
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
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.1)" }} />
        </div>
        <div className="mb-4">
          <label className="text-cream/60 text-xs font-semibold mb-1.5 block">Message</label>
          <textarea value={body} onChange={e => setBody(e.target.value)}
            placeholder="Notification body…" data-testid="input-notification-body"
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-cream placeholder-cream/30 outline-none resize-none"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.1)" }} />
        </div>
        <button onClick={() => title.trim() && body.trim() && sendMutation.mutate()}
          disabled={sendMutation.isPending || !title.trim() || !body.trim()}
          data-testid="button-send-notification"
          className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: "rgba(255,215,0,0.2)", color: "#FFD700", border: "1px solid rgba(255,215,0,0.3)" }}>
          <Send size={14} /> Send Notification
        </button>
      </div>

      <div className="p-4 rounded-2xl text-cream/40 text-xs" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.12)" }}>
        Push notification delivery requires a connected push service (Firebase/OneSignal). Currently notifications are logged in the audit trail only.
      </div>
    </div>
  );
}
