import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CalendarDays, MapPin, Users, ChevronLeft, ChevronRight, Plus, Edit2, Trash2 } from "lucide-react";
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

const EMPTY_FORM = {
  title: "",
  description: "",
  type: "meetup" as "meetup" | "cultural" | "online",
  date: "",
  location: "",
  country: "",
  organizer: "",
  imageUrl: "",
};

type FormData = typeof EMPTY_FORM;

export default function EventsPage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [activeType, setActiveType] = useState("all");
  const [formView, setFormView] = useState<"list" | "create" | "edit">("list");
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
      if (isAttending) return (await apiRequest("DELETE", `/api/events/${eventId}/attend`)).json();
      return (await apiRequest("POST", `/api/events/${eventId}/attend`)).json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/events"] }),
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => (await apiRequest("POST", "/api/events", data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setFormView("list");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: FormData & { id: string }) =>
      (await apiRequest("PATCH", `/api/events/${id}`, data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setEditingEvent(null);
      setFormView("list");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/events/${id}`)).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/events"] }),
  });

  const allEvents = data?.events ?? [];
  const filtered = activeType === "all" ? allEvents : allEvents.filter(e => e.type === activeType);

  if (formView === "create" || formView === "edit") {
    return (
      <EventFormScreen
        initial={editingEvent ? {
          title: editingEvent.title,
          description: editingEvent.description,
          type: editingEvent.type as FormData["type"],
          date: format(new Date(editingEvent.date), "yyyy-MM-dd'T'HH:mm"),
          location: editingEvent.location,
          country: editingEvent.country,
          organizer: editingEvent.organizer,
          imageUrl: editingEvent.imageUrl ?? "",
        } : { ...EMPTY_FORM, organizer: user.fullName ?? user.firstName ?? "" }}
        isEditing={formView === "edit"}
        isPending={createMutation.isPending || updateMutation.isPending}
        onBack={() => { setFormView("list"); setEditingEvent(null); }}
        onSubmit={(data) => {
          if (formView === "edit" && editingEvent) {
            updateMutation.mutate({ id: editingEvent.id, ...data });
          } else {
            createMutation.mutate(data);
          }
        }}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "#060612" }}>
      <div className="pt-12 pb-4 px-5">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-3xl font-bold text-gold">{t("events.title")}</h1>
          </div>
          {(user.isAdmin || user.isPremium) && (
            <button
              onClick={() => setFormView("create")}
              data-testid="button-create-event"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: "linear-gradient(135deg, #7b3fa0, #d4608a)", color: "white" }}
            >
              <Plus size={14} />
              Create
            </button>
          )}
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
              user={user}
              onAttend={() => attendMutation.mutate({ eventId: event.id, isAttending: event.isAttending })}
              onOpen={() => setLocation(`/events/${event.id}`)}
              onEdit={() => { setEditingEvent(event); setFormView("edit"); }}
              onDelete={() => deleteMutation.mutate(event.id)}
              isPending={attendMutation.isPending || deleteMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Full-screen form ──────────────────────────────────────────────────────

function EventFormScreen({ initial, isEditing, isPending, onBack, onSubmit }: {
  initial: FormData;
  isEditing: boolean;
  isPending: boolean;
  onBack: () => void;
  onSubmit: (data: FormData) => void;
}) {
  const [form, setForm] = useState<FormData>(initial);

  function set(key: keyof FormData, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  const isValid = !!(form.title && form.description && form.date && form.location && form.country && form.organizer);

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1.5px solid rgba(201,168,76,0.2)",
    color: "#fdf8f0",
  };
  const inputCls = "w-full px-4 py-3 rounded-2xl text-sm outline-none placeholder-cream/20 transition-all";
  const labelCls = "block text-cream/50 text-xs font-semibold mb-2 uppercase tracking-widest";
  const sectionCls = "rounded-2xl overflow-hidden mb-4" as string;
  const sectionStyle = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.1)" };
  const rowCls = "px-4 py-3 flex flex-col gap-1";
  const dividerStyle = { height: "1px", background: "rgba(201,168,76,0.08)", margin: "0 16px" };

  const typeOptions: { value: FormData["type"]; label: string; emoji: string; color: string }[] = [
    { value: "meetup", label: "Meetup", emoji: "🤝", color: "#d4608a" },
    { value: "cultural", label: "Cultural", emoji: "🏛", color: "#c9a84c" },
    { value: "online", label: "Online", emoji: "💻", color: "#9b6bd4" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "#060612" }}>
      {/* Native-style nav bar */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 48px)", paddingBottom: "12px", borderBottom: "1px solid rgba(201,168,76,0.12)" }}
      >
        <button
          onClick={onBack}
          data-testid="button-back-event-form"
          className="flex items-center gap-1 text-sm font-medium"
          style={{ color: "rgba(253,248,240,0.55)" }}
        >
          <ChevronLeft size={20} />
          Events
        </button>
        <h1 className="font-serif text-lg text-gold absolute left-1/2 -translate-x-1/2">
          {isEditing ? "Edit Event" : "New Event"}
        </h1>
        <button
          onClick={() => isValid && onSubmit(form)}
          disabled={!isValid || isPending}
          data-testid="button-submit-event"
          className="text-sm font-bold transition-all disabled:opacity-30"
          style={{ color: isValid && !isPending ? "#c9a84c" : "rgba(201,168,76,0.3)" }}
        >
          {isPending ? "Saving…" : isEditing ? "Save" : "Create"}
        </button>
      </div>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto px-4 pt-6" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 40px)" }}>

        {/* Event type selector */}
        <p className={labelCls}>Event Type</p>
        <div className="flex gap-2 mb-5">
          {typeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => set("type", opt.value)}
              data-testid={`type-${opt.value}`}
              className="flex-1 flex flex-col items-center py-3 rounded-2xl gap-1 transition-all"
              style={form.type === opt.value
                ? { background: `${opt.color}22`, border: `1.5px solid ${opt.color}66`, color: opt.color }
                : { background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)", color: "rgba(253,248,240,0.3)" }
              }
            >
              <span className="text-xl">{opt.emoji}</span>
              <span className="text-[11px] font-semibold">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Basic info */}
        <p className={labelCls}>Basic Info</p>
        <div className={sectionCls} style={sectionStyle}>
          <div className={rowCls}>
            <label className="text-cream/40 text-xs">Title</label>
            <input
              className={inputCls}
              style={{ ...inputStyle, border: "none", background: "transparent", padding: "0" }}
              placeholder="Give your event a name…"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              data-testid="input-event-title"
            />
          </div>
          <div style={dividerStyle} />
          <div className={rowCls}>
            <label className="text-cream/40 text-xs">Description</label>
            <textarea
              className={inputCls}
              style={{ ...inputStyle, border: "none", background: "transparent", padding: "0", resize: "none" }}
              placeholder="What is this event about?"
              rows={4}
              value={form.description}
              onChange={e => set("description", e.target.value)}
              data-testid="input-event-description"
            />
          </div>
        </div>

        {/* Date & Location */}
        <p className={labelCls}>When & Where</p>
        <div className={sectionCls} style={sectionStyle}>
          <div className={rowCls}>
            <label className="text-cream/40 text-xs">Date & Time</label>
            <input
              type="datetime-local"
              className={inputCls}
              style={{ ...inputStyle, border: "none", background: "transparent", padding: "0" }}
              value={form.date}
              onChange={e => set("date", e.target.value)}
              data-testid="input-event-date"
            />
          </div>
          <div style={dividerStyle} />
          <div className={rowCls}>
            <label className="text-cream/40 text-xs">Location / Link</label>
            <input
              className={inputCls}
              style={{ ...inputStyle, border: "none", background: "transparent", padding: "0" }}
              placeholder="Address or online link…"
              value={form.location}
              onChange={e => set("location", e.target.value)}
              data-testid="input-event-location"
            />
          </div>
          <div style={dividerStyle} />
          <div className={rowCls}>
            <label className="text-cream/40 text-xs">Country</label>
            <input
              className={inputCls}
              style={{ ...inputStyle, border: "none", background: "transparent", padding: "0" }}
              placeholder="e.g. Iraq, Germany…"
              value={form.country}
              onChange={e => set("country", e.target.value)}
              data-testid="input-event-country"
            />
          </div>
        </div>

        {/* Organizer */}
        <p className={labelCls}>Organizer</p>
        <div className={sectionCls} style={sectionStyle}>
          <div className={rowCls}>
            <label className="text-cream/40 text-xs">Name or Organization</label>
            <input
              className={inputCls}
              style={{ ...inputStyle, border: "none", background: "transparent", padding: "0" }}
              placeholder="Your name or org"
              value={form.organizer}
              onChange={e => set("organizer", e.target.value)}
              data-testid="input-event-organizer"
            />
          </div>
        </div>

        {/* Bottom create button (secondary, for users who scroll to bottom) */}
        <button
          onClick={() => isValid && onSubmit(form)}
          disabled={!isValid || isPending}
          data-testid="button-submit-event-bottom"
          className="w-full py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"
          style={{ background: isValid ? "linear-gradient(135deg, #7b3fa0, #d4608a)" : "rgba(255,255,255,0.06)", color: "white" }}
        >
          {isPending ? "Saving…" : isEditing ? "Save Changes" : "Create Event"}
        </button>
      </div>
    </div>
  );
}

// ─── Event card ────────────────────────────────────────────────────────────

function EventCard({ event, user, onAttend, onOpen, onEdit, onDelete, isPending }: {
  event: EventWithAttendance;
  user: SafeUser;
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

  const canManage = user.isAdmin || event.isCreator;

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
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ background: typeStyle.bg, color: typeStyle.text, border: `1px solid ${typeStyle.border}` }}
            >
              {event.type}
            </span>
          </div>
          <div className="absolute bottom-3 right-3 flex items-center gap-1">
            <Users size={11} color="rgba(253,248,240,0.6)" />
            <span className="text-[11px] text-cream/60 font-medium">{event.attendeeCount ?? 0}</span>
          </div>
        </div>
        <div className="p-4 pb-3">
          <h3 className="font-serif text-base text-cream font-semibold leading-snug mb-2">{event.title}</h3>
          <div className="flex items-center gap-1.5 mb-1">
            <CalendarDays size={11} color="rgba(201,168,76,0.7)" />
            <span className="text-cream/50 text-xs">{dateLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={11} color="rgba(201,168,76,0.7)" />
            <span className="text-cream/50 text-xs truncate">{event.location} · {event.country}</span>
          </div>
        </div>
      </button>

      <div className="px-4 pb-4 flex items-center gap-2">
        <button
          onClick={onAttend}
          disabled={isPending}
          data-testid={`button-attend-${event.id}`}
          className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          style={event.isAttending
            ? { background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)" }
            : { background: "linear-gradient(135deg, #7b3fa0, #d4608a)", color: "white" }
          }
        >
          {event.isAttending ? `✓ ${t("events.attending")}` : t("events.attend")}
        </button>
        <button
          onClick={onOpen}
          data-testid={`button-open-${event.id}`}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(253,248,240,0.4)" }}
        >
          <ChevronRight size={16} />
        </button>
        {canManage && (
          <>
            <button
              onClick={onEdit}
              data-testid={`button-edit-${event.id}`}
              className="p-2.5 rounded-xl transition-all"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(201,168,76,0.5)" }}
            >
              <Edit2 size={14} />
            </button>
            {confirmDelete ? (
              <button
                onClick={() => { onDelete(); setConfirmDelete(false); }}
                data-testid={`button-confirm-delete-${event.id}`}
                className="px-3 py-2 rounded-xl text-xs font-bold"
                style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444" }}
              >
                Delete?
              </button>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                data-testid={`button-delete-${event.id}`}
                className="p-2.5 rounded-xl transition-all"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(239,68,68,0.4)" }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
