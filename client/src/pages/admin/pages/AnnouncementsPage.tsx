import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Megaphone, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { User, Announcement } from "@shared/schema";

export default function AnnouncementsPage({ user }: { user: User }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data, isLoading } = useQuery<{ announcements: Announcement[] }>({
    queryKey: ["/api/admin/announcements"],
    queryFn: async () => (await fetch("/api/admin/announcements", { credentials: "include" })).json(),
  });

  const createMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/admin/announcements", { title, content, active: true })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      setTitle(""); setContent(""); setShowForm(false);
      toast({ title: "Announcement created" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      (await apiRequest("PATCH", `/api/admin/announcements/${id}`, { active })).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/admin/announcements/${id}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      toast({ title: "Announcement deleted" });
    },
  });

  const items = data?.announcements ?? [];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-serif text-xl text-gold font-bold">Announcements</h1>
          <p className="text-cream/40 text-xs mt-0.5">In-app banners shown to all users</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} data-testid="button-create-announcement"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
          style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.25)" }}>
          <Plus size={13} /> New
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)" }}>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Announcement title…" data-testid="input-announcement-title"
            className="w-full px-3 py-2 rounded-xl text-sm text-cream placeholder-cream/30 outline-none mb-2"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="Announcement content…" data-testid="input-announcement-content"
            rows={3}
            className="w-full px-3 py-2 rounded-xl text-sm text-cream placeholder-cream/30 outline-none resize-none mb-3"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <button onClick={() => title.trim() && content.trim() && createMutation.mutate()}
            disabled={createMutation.isPending} data-testid="button-submit-announcement"
            className="w-full py-2.5 rounded-xl text-xs font-bold"
            style={{ background: "rgba(201,168,76,0.2)", color: "#c9a84c" }}>
            Publish Announcement
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-cream/40 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <Megaphone size={32} color="rgba(201,168,76,0.3)" />
          <p className="text-cream/40 text-sm">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} data-testid={`announcement-${item.id}`}
              className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${item.active ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.07)"}`, opacity: item.active ? 1 : 0.6 }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-cream text-sm font-semibold">{item.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: item.active ? "rgba(16,185,129,0.15)" : "rgba(107,114,128,0.15)", color: item.active ? "#10b981" : "#6b7280" }}>
                      {item.active ? "Active" : "Hidden"}
                    </span>
                  </div>
                  <p className="text-cream/60 text-xs">{item.content}</p>
                  {item.createdAt && (
                    <p className="text-cream/30 text-[10px] mt-1">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => toggleMutation.mutate({ id: item.id, active: !item.active })}
                    data-testid={`button-toggle-announcement-${item.id}`}
                    title={item.active ? "Hide" : "Show"}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)", color: item.active ? "#10b981" : "#6b7280" }}>
                    {item.active ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                  <button onClick={() => { if (confirm("Delete this announcement?")) deleteMutation.mutate(item.id); }}
                    data-testid={`button-delete-announcement-${item.id}`}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
