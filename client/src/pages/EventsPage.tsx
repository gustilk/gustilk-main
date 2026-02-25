import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CalendarDays, MapPin, Users, ChevronRight } from "lucide-react";
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

export default function EventsPage({ user }: Props) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [activeType, setActiveType] = useState("all");

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const allEvents = data?.events ?? [];
  const filtered = activeType === "all" ? allEvents : allEvents.filter(e => e.type === activeType);

  return (
    <div className="flex flex-col min-h-screen pb-20" style={{ background: "#0d0618" }}>
      <div className="pt-12 pb-4 px-5">
        <h1 className="font-serif text-2xl text-gold">{t("events.title")}</h1>
        <p className="text-cream/40 text-sm mt-0.5">{t("events.subtitle")}</p>
      </div>

      <div className="flex gap-2 px-5 mb-5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveType(t.id)}
            data-testid={`filter-${t.id}`}
            className="px-4 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition-all"
            style={activeType === t.id
              ? { background: "#c9a84c", color: "#1a0a2e" }
              : { background: "rgba(255,255,255,0.06)", color: "rgba(253,248,240,0.45)", border: "1px solid rgba(201,168,76,0.15)" }
            }
          >
            {t.label}
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
              isPending={attendMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, onAttend, onOpen, isPending }: {
  event: EventWithAttendance;
  onAttend: () => void;
  onOpen: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
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
      <button
        onClick={onOpen}
        className="w-full text-left"
      >
        <div
          className="h-32 relative flex items-center justify-center"
          style={{ background: bgGradient }}
        >
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-5xl">{emoji}</span>
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(13,6,24,0.8) 0%, transparent 60%)" }} />
          <div className="absolute top-3 left-3">
            <span
              className="px-2.5 py-1 rounded-full text-[11px] font-bold capitalize"
              style={{ background: typeStyle.bg, color: typeStyle.text, border: `1px solid ${typeStyle.border}` }}
            >
              {event.type}
            </span>
          </div>
          <div className="absolute bottom-3 right-3 flex items-center gap-1">
            <Users size={12} color="rgba(253,248,240,0.6)" />
            <span className="text-white/60 text-xs">{event.attendeeCount}</span>
          </div>
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

      <div className="px-4 pb-4 flex items-center gap-3">
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
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs text-cream/50 transition-all"
          style={{ border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {t("events.details")}
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
