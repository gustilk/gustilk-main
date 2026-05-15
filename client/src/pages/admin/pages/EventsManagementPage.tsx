import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Plus, Trash2, Edit2, X, CheckCircle, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { User, Event } from "@shared/schema";

const EMPTY_FORM = { title: "", description: "", type: "cultural" as const, date: "", location: "", country: "", organizer: "", imageUrl: "" };

export default function EventsManagementPage({ user }: { user: User }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tab, setTab] = useState<"approved" | "pending">("pending");

  const { data, isLoading } = useQuery<{ events: Event[] }>({
    queryKey: ["/api/admin/events"],
    queryFn: async () => (await fetch("/api/admin/events", { credentials: "include" })).json(),
  });

  const createMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/admin/events", form)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      setForm(EMPTY_FORM); setShowForm(false);
      toast({ title: "Event created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => (await apiRequest("PATCH", `/api/admin/events/${editId}`, form)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      setEditId(null); setForm(EMPTY_FORM); setShowForm(false);
      toast({ title: "Event updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/admin/events/${id}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      toast({ title: "Event deleted" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("PATCH", `/api/admin/events/${id}/approve`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      toast({ title: "Event approved" });
    },
  });

  const allEvents = data?.events ?? [];
  const events = tab === "pending"
    ? allEvents.filter(e => !(e as any).isApproved)
    : allEvents.filter(e => (e as any).isApproved);
  const pendingCount = allEvents.filter(e => !(e as any).isApproved).length;

  const startEdit = (e: Event) => {
    setEditId(e.id);
    setForm({
      title: e.title, description: e.description, type: e.type as any,
      date: e.date ? new Date(e.date).toISOString().slice(0, 16) : "",
      location: e.location, country: e.country, organizer: e.organizer, imageUrl: e.imageUrl ?? "",
    });
    setShowForm(true);
  };

  const f = (key: keyof typeof form, val: string) => setForm(p => ({ ...p, [key]: val }));

  const EventForm = () => (
    <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-cream text-sm font-semibold">{editId ? "Edit Event" : "New Event"}</span>
        <button onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); }}>
          <X size={14} className="text-cream/40" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <input value={form.title} onChange={e => f("title", e.target.value)} placeholder="Event title…" data-testid="input-event-title"
          className="px-3 py-2 rounded-xl text-sm text-cream placeholder-cream/30 outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
        <textarea value={form.description} onChange={e => f("description", e.target.value)} placeholder="Description…" data-testid="input-event-description" rows={2}
          className="px-3 py-2 rounded-xl text-sm text-cream placeholder-cream/30 outline-none resize-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
        <div className="grid grid-cols-2 gap-2">
          <select value={form.type} onChange={e => f("type", e.target.value)} data-testid="select-event-type"
            className="px-3 py-2 rounded-xl text-sm text-cream outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <option value="cultural">Cultural</option>
            <option value="meetup">Meetup</option>
            <option value="online">Online</option>
          </select>
          <input type="datetime-local" value={form.date} onChange={e => f("date", e.target.value)} data-testid="input-event-date"
            className="px-3 py-2 rounded-xl text-sm text-cream outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input value={form.location} onChange={e => f("location", e.target.value)} placeholder="Location / Venue" data-testid="input-event-location"
            className="px-3 py-2 rounded-xl text-sm text-cream placeholder-cream/30 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <input value={form.country} onChange={e => f("country", e.target.value)} placeholder="Country" data-testid="input-event-country"
            className="px-3 py-2 rounded-xl text-sm text-cream placeholder-cream/30 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
        </div>
        <input value={form.organizer} onChange={e => f("organizer", e.target.value)} placeholder="Organizer" data-testid="input-event-organizer"
          className="px-3 py-2 rounded-xl text-sm text-cream placeholder-cream/30 outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
        <input value={form.imageUrl} onChange={e => f("imageUrl", e.target.value)} placeholder="Image URL (optional)" data-testid="input-event-image"
          className="px-3 py-2 rounded-xl text-sm text-cream placeholder-cream/30 outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
        <button onClick={() => editId ? updateMutation.mutate() : createMutation.mutate()}
          disabled={createMutation.isPending || updateMutation.isPending}
          data-testid="button-submit-event"
          className="py-2.5 rounded-xl text-xs font-bold"
          style={{ background: "rgba(201,168,76,0.2)", color: "#c9a84c" }}>
          {editId ? "Save Changes" : "Create Event"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-serif text-xl text-gold font-bold">Events</h1>
          <p className="text-cream/40 text-xs mt-0.5">{allEvents.length} total</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY_FORM); }} data-testid="button-create-event"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
          style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.25)" }}>
          <Plus size={13} /> Create Event
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("pending")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={tab === "pending"
            ? { background: "rgba(251,191,36,0.18)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }
            : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Clock size={11} />
          Pending Review
          {pendingCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#fbbf24", color: "#0d0618" }}>
              {pendingCount}
            </span>
          )}
        </button>
        <button onClick={() => setTab("approved")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={tab === "approved"
            ? { background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }
            : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <CheckCircle size={11} />
          Approved
        </button>
      </div>

      {showForm && <EventForm />}

      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-cream/40 text-sm">Loading…</div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <Calendar size={32} color="rgba(201,168,76,0.3)" />
          <p className="text-cream/40 text-sm">{tab === "pending" ? "No events pending review" : "No approved events yet"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <div key={event.id} data-testid={`event-card-${event.id}`}
              className="flex items-start gap-3 p-4 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              {event.imageUrl && (
                <img src={event.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex-1">
                  <div className="text-cream font-semibold text-sm">{event.title}</div>
                  <div className="text-cream/40 text-xs mt-0.5">
                    {event.date ? format(new Date(event.date), "PPp") : ""} · {event.location}, {event.country}
                  </div>
                  <div className="text-cream/30 text-[10px]">{event.organizer} · {event.attendeeCount ?? 0} attendees</div>
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                {!(event as any).isApproved && (
                  <button onClick={() => approveMutation.mutate(event.id)} data-testid={`button-approve-event-${event.id}`}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                    <CheckCircle size={12} />
                  </button>
                )}
                <button onClick={() => startEdit(event)} data-testid={`button-edit-event-${event.id}`}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c" }}>
                  <Edit2 size={12} />
                </button>
                <button onClick={() => { if (confirm("Delete this event?")) deleteMutation.mutate(event.id); }}
                  data-testid={`button-delete-event-${event.id}`}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
