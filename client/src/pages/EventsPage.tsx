import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CalendarDays, MapPin, Users, ChevronRight, Plus, Edit2, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

import type { SafeUser, EventWithAttendance } from "@shared/schema";

interface Props { user: SafeUser }

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  cultural: { bg: "rgba(201,168,76,0.12)", text: "#c9a84c", border: "rgba(201,168,76,0.25)" },
  meetup: { bg: "rgba(212,96,138,0.12)", text: "#d4608a", border: "rgba(212,96,138,0.25)" },
  online: { bg: "rgba(123,63,160,0.15)", text: "#9b6bd4", border: "rgba(123,63,160,0.3)" },
};

const TYPE_BG: Record<string, string> = {
  cultural: "linear-gradient(135deg, #3d1f00, #8b5a00)",
  meetup: "linear-gradient(135deg, #3d0020, #8b0044)",
  online: "linear-gradient(135deg, #1a0a3e, #3d1f7a)",
};

const TYPE_EMOJI: Record<string, string> = {
  cultural: "🏛",
  meetup: "🤝",
  online: "💻",
};

const EMPTY_FORM = { title: "", description: "", type: "meetup" as const, date: "", location: "", country: "", organizer: "", imageUrl: "" };

export default function EventsPage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [activeType, setActiveType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithAttendance | null>(null);

  const TYPES = [
    { id: "all", label: t("events.all") },
    { id: "cultural", label: t("events.cultural") },
    { id: "meetup", label: t("events.meetup") },
    { id: "online", label: t("events.online") },
  ];

  const { data, isLoading } = useQuery<{ events: EventWithAttendance[] }>({
    queryKey: ["/api/events"],
    refetchInterval: 30000,
  });

  const attendMutation = useMutation({
    mutationFn: async ({ eventId, isAttending }: { eventId: string; isAttending: boolean }) => {
      if (isAttending) {
        const res = await apiRequest("DELETE", `/api/events/${eventId}/attend`);
        return res.json();
      } else {
        const res = await apiRequest("POST", `/api/events/${eventId}/attend`);
        return res.json();
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/events"] }),
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof EMPTY_FORM) => {
      const res = await apiRequest("POST", "/api/events", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: typeof EMPTY_FORM & { id: string }) => {
      const res = await apiRequest("PATCH", `/api/events/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setEditingEvent(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/events/${id}`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/events"] }),
  });

  const allEvents = data?.events ?? [];
  const filtered = activeType === "all" ? allEvents : allEvents.filter(e => e.type === activeType);

  return (
    <div className="flex flex-col min-h-screen pb-20" style={{ background: "#0d0618" }}>
      <div className="pt-12 pb-4 px-5">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2.5">
            <img src="/gustilk-logo.svg" alt="" className="flex-shrink-0" style={{ width: "48px", height: "48px", objectFit: "contain", filter: "drop-shadow(0 1px 6px rgba(201,168,76,0.6))" }} />
            <h1 className="font-serif text-2xl text-gold">{t("events.title")}</h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            data-testid="button-create-event"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: "linear-gradient(135deg, #7b3fa0, #d4608a)", color: "white" }}
          >
            <Plus size={14} />
            Create
          </button>
        </div>
        <p className="text-cream/40 text-sm mt-0.5 pl-0.5">{t("events.subtitle")}</p>
      </div>

      <div className="flex gap-2 px-5 mb-5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {TYPES.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveType(tab.id)}
            data-testid={`filter-${tab.id}`}
            className="px-4 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition-all"
            style={activeType === tab.id
              ? { background: "#c9a84c", color: "#1a0a2e" }
              : { background: "rgba(255,255,255,0.06)", color: "rgba(253,248,240,0.45)", border: "1px solid rgba(201,168,76,0.15)" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-8">
          <CalendarDays size={36} color="rgba(201,168,76,0.4)" />
          <p className="text-cream/40 text-sm">{t("events.noEventsFilter")}</p>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {filtered.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onAttend={() => attendMutation.mutate({ eventId: event.id, isAttending: event.isAttending })}
              onOpen={() => setLocation(`/events/${event.id}`)}
              onEdit={() => setEditingEvent(event)}
              onDelete={() => deleteMutation.mutate(event.id)}
              isPending={attendMutation.isPending || deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {(showForm || editingEvent) && (
        <EventFormModal
          initial={editingEvent ? {
            title: editingEvent.title,
            description: editingEvent.description,
            type: editingEvent.type as any,
            date: format(new Date(editingEvent.date), "yyyy-MM-dd'T'HH:mm"),
            location: editingEvent.location,
            country: editingEvent.country,
            organizer: editingEvent.organizer,
            imageUrl: editingEvent.imageUrl ?? "",
          } : { ...EMPTY_FORM, organizer: user.fullName ?? user.firstName ?? "" }}
          isEditing={!!editingEvent}
          isPending={createMutation.isPending || updateMutation.isPending}
          onClose={() => { setShowForm(false); setEditingEvent(null); }}
          onSubmit={(data) => {
            if (editingEvent) {
              updateMutation.mutate({ id: editingEvent.id, ...data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}
    </div>
  );
}

function EventFormModal({ initial, isEditing, isPending, onClose, onSubmit }: {
  initial: typeof EMPTY_FORM;
  isEditing: boolean;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (data: typeof EMPTY_FORM) => void;
}) {
  const [form, setForm] = useState(initial);

  function set(key: keyof typeof EMPTY_FORM, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.07)",
    border: "1.5px solid rgba(201,168,76,0.25)",
    color: "#fdf8f0",
  };

  const labelCls = "block text-cream/60 text-xs font-semibold mb-1 uppercase tracking-wider";
  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm outline-none placeholder-cream/20";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-lg rounded-t-3xl overflow-y-auto" style={{ background: "#130820", border: "1px solid rgba(201,168,76,0.2)", maxHeight: "90vh" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
          <h2 className="font-serif text-lg text-gold">{isEditing ? "Edit Event" : "Create Event"}</h2>
          <button onClick={onClose} data-testid="button-close-event-form" className="text-cream/40 hover:text-cream/70">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className={labelCls}>Title</label>
            <input className={inputCls} style={inputStyle} placeholder="Event title" value={form.title} onChange={e => set("title", e.target.value)} data-testid="input-event-title" />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea className={inputCls} style={{ ...inputStyle, resize: "none" }} rows={3} placeholder="What is this event about?" value={form.description} onChange={e => set("description", e.target.value)} data-testid="input-event-description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} style={inputStyle} value={form.type} onChange={e => set("type", e.target.value)} data-testid="select-event-type">
                <option value="meetup">Meetup</option>
                <option value="cultural">Cultural</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Date & Time</label>
              <input type="datetime-local" className={inputCls} style={inputStyle} value={form.date} onChange={e => set("date", e.target.value)} data-testid="input-event-date" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input className={inputCls} style={inputStyle} placeholder="Address or link" value={form.location} onChange={e => set("location", e.target.value)} data-testid="input-event-location" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Country</label>
              <input className={inputCls} style={inputStyle} placeholder="e.g. Iraq" value={form.country} onChange={e => set("country", e.target.value)} data-testid="input-event-country" />
            </div>
            <div>
              <label className={labelCls}>Organizer</label>
              <input className={inputCls} style={inputStyle} placeholder="Your name or org" value={form.organizer} onChange={e => set("organizer", e.target.value)} data-testid="input-event-organizer" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Image URL <span className="normal-case text-cream/30">(optional)</span></label>
            <input className={inputCls} style={inputStyle} placeholder="https://..." value={form.imageUrl} onChange={e => set("imageUrl", e.target.value)} data-testid="input-event-image" />
          </div>
          <button
            onClick={() => onSubmit(form)}
            disabled={isPending || !form.title || !form.description || !form.date || !form.location || !form.country || !form.organizer}
            data-testid="button-submit-event"
            className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #c9a84c, #e8c97a)", color: "#1a0a2e" }}
          >
            {isPending ? "Saving…" : isEditing ? "Save Changes" : "Create Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, onAttend, onOpen, onEdit, onDelete, isPending }: {
  event: EventWithAttendance;
  onAttend: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const typeStyle = TYPE_COLORS[event.type] ?? TYPE_COLORS.cultural;
  const bgGradient = event.imageUrl ? undefined : TYPE_BG[event.type] ?? TYPE_BG.cultural;
  const emoji = TYPE_EMOJI[event.type] ?? "📅";

  const dateLabel = (() => {
    try { return format(new Date(event.date), "EEE, MMM d · HH:mm"); } catch { return ""; }
  })();

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(201,168,76,0.12)", background: "rgba(255,255,255,0.03)" }}
      data-testid={`event-card-${event.id}`}
    >
      <button onClick={onOpen} className="w-full text-left">
        <div className="h-32 relative flex items-center justify-center" style={{ background: bgGradient }}>
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-5xl">{emoji}</span>
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(13,6,24,0.8) 0%, transparent 60%)" }} />
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold capitalize"
              style={{ background: typeStyle.bg, color: typeStyle.text, border: `1px solid ${typeStyle.border}` }}>
              {event.type}
            </span>
          </div>
          <div className="absolute bottom-3 right-3 flex items-center gap-1">
            <Users size={12} color="rgba(253,248,240,0.6)" />
            <span className="text-white/60 text-xs">{event.attendeeCount}</span>
          </div>
          {event.isCreator && (
            <div className="absolute top-3 right-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(201,168,76,0.25)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.4)" }}>
                Your event
              </span>
            </div>
          )}
        </div>
        <div className="p-4 pb-3">
          <h3 className="font-serif text-base text-cream font-semibold leading-snug mb-2">{event.title}</h3>
          <div className="flex items-center gap-1.5 mb-1">
            <CalendarDays size={12} color="rgba(201,168,76,0.7)" />
            <span className="text-xs text-cream/50">{dateLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={12} color="rgba(201,168,76,0.7)" />
            <span className="text-xs text-cream/50">{event.location}</span>
          </div>
        </div>
      </button>

      <div className="px-4 pb-4 flex items-center gap-2">
        <button
          onClick={onAttend}
          disabled={isPending}
          data-testid={`button-attend-${event.id}`}
          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
          style={event.isAttending
            ? { background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)" }
            : { background: "linear-gradient(135deg, #7b3fa0, #d4608a)", color: "white" }
          }
        >
          {event.isAttending ? t("events.attending") : t("events.rsvp")}
        </button>
        <button
          onClick={onOpen}
          data-testid={`button-details-${event.id}`}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs text-cream/50"
          style={{ border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {t("events.details")}
          <ChevronRight size={13} />
        </button>
        {event.isCreator && (
          <>
            <button
              onClick={onEdit}
              data-testid={`button-edit-${event.id}`}
              className="p-2 rounded-xl text-cream/50 hover:text-gold transition-all"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              data-testid={`button-delete-${event.id}`}
              className="p-2 rounded-xl transition-all"
              style={{ border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.6)" }}
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 flex items-end justify-center z-50 pb-8 px-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: "#1a0a2e", border: "1px solid rgba(239,68,68,0.3)" }}>
            <h3 className="font-serif text-lg text-cream">Delete event?</h3>
            <p className="text-cream/50 text-sm">This will permanently delete <span className="text-cream/70 font-semibold">"{event.title}"</span> and remove all RSVPs.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(253,248,240,0.6)" }}>
                Cancel
              </button>
              <button onClick={() => { onDelete(); setConfirmDelete(false); }}
                data-testid={`button-confirm-delete-${event.id}`}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
