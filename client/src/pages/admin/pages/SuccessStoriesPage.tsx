import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Heart, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, SuccessStory } from "@shared/schema";

export default function SuccessStoriesPage({ user }: { user: User }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ names: "", story: "", photoUrl: "", visible: true });

  const { data, isLoading } = useQuery<{ stories: SuccessStory[] }>({
    queryKey: ["/api/admin/success-stories"],
    queryFn: async () => (await fetch("/api/admin/success-stories", { credentials: "include" })).json(),
  });

  const createMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/admin/success-stories", form)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/success-stories"] });
      setForm({ names: "", story: "", photoUrl: "", visible: true });
      setShowForm(false);
      toast({ title: "Story added" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) =>
      (await apiRequest("PATCH", `/api/admin/success-stories/${id}`, { visible })).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/success-stories"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/admin/success-stories/${id}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/success-stories"] });
      toast({ title: "Story deleted" });
    },
  });

  const stories = data?.stories ?? [];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-serif text-xl text-gold font-bold">Success Stories</h1>
          <p className="text-cream/40 text-xs mt-0.5">Couples who found each other on Gûstîlk</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} data-testid="button-add-story"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
          style={{ background: "rgba(224,48,80,0.15)", color: "#e03050", border: "1px solid rgba(224,48,80,0.25)" }}>
          <Plus size={13} /> Add Story
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(224,48,80,0.2)" }}>
          <input value={form.names} onChange={e => setForm(f => ({ ...f, names: e.target.value }))}
            placeholder="Names (e.g. Dilva & Renas)" data-testid="input-story-names"
            className="w-full px-3 py-2 rounded-xl text-sm text-cream placeholder-cream/30 outline-none mb-2"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <textarea value={form.story} onChange={e => setForm(f => ({ ...f, story: e.target.value }))}
            placeholder="Their story…" data-testid="input-story-text"
            rows={4}
            className="w-full px-3 py-2 rounded-xl text-sm text-cream placeholder-cream/30 outline-none resize-none mb-2"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <input value={form.photoUrl} onChange={e => setForm(f => ({ ...f, photoUrl: e.target.value }))}
            placeholder="Photo URL (optional)" data-testid="input-story-photo"
            className="w-full px-3 py-2 rounded-xl text-sm text-cream placeholder-cream/30 outline-none mb-3"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <button onClick={() => form.names.trim() && form.story.trim() && createMutation.mutate()}
            disabled={createMutation.isPending} data-testid="button-submit-story"
            className="w-full py-2.5 rounded-xl text-xs font-bold"
            style={{ background: "rgba(224,48,80,0.2)", color: "#e03050" }}>
            Publish Story
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-cream/40 text-sm">Loading…</div>
      ) : stories.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <Heart size={32} color="rgba(224,48,80,0.3)" />
          <p className="text-cream/40 text-sm">No success stories yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stories.map(story => (
            <div key={story.id} data-testid={`story-${story.id}`}
              className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(224,48,80,0.12)", opacity: story.visible ? 1 : 0.6 }}>
              <div className="flex items-start gap-3">
                {story.photoUrl && <img src={story.photoUrl} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-cream font-semibold text-sm">{story.names}</div>
                  <p className="text-cream/60 text-xs mt-1 line-clamp-2">{story.story}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleMutation.mutate({ id: story.id, visible: !story.visible })}
                    data-testid={`button-toggle-story-${story.id}`}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)", color: story.visible ? "#10b981" : "#6b7280" }}>
                    {story.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                  <button onClick={() => { if (confirm("Delete this story?")) deleteMutation.mutate(story.id); }}
                    data-testid={`button-delete-story-${story.id}`}
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
