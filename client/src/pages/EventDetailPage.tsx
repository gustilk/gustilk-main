import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, CalendarDays, MapPin, Users, Globe } from "lucide-react";
import { format } from "date-fns";
import type { SafeUser, EventWithAttendance } from "@shared/schema";

interface Props { user: SafeUser; eventId: string }

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

export default function EventDetailPage({ user, eventId }: Props) {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<{ event: EventWithAttendance }>({
    queryKey: ["/api/events", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}`, { credentials: "include" });
      return res.json();
    },
  });

  const attendMutation = useMutation({
    mutationFn: async (isAttending: boolean) => {
      if (isAttending) {
        const res = await apiRequest("DELETE", `/api/events/${eventId}/attend`);
        return res.json();
      } else {
        const res = await apiRequest("POST", `/api/events/${eventId}/attend`);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const event = data?.event;

  const dateLabel = event ? (() => {
    try { return format(new Date(event.date), "EEEE, MMMM d, yyyy · HH:mm"); } catch { return ""; }
  })() : "";

  const bgGradient = event ? (event.imageUrl ? undefined : TYPE_BG[event.type] ?? TYPE_BG.cultural) : TYPE_BG.cultural;
  const emoji = event ? TYPE_EMOJI[event.type] ?? "📅" : "📅";

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "#0d0618" }}>
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center px-4 pt-12 pb-3"
        style={{ background: "linear-gradient(to bottom, rgba(13,6,24,0.85), transparent)" }}
      >
        <button
          onClick={() => setLocation("/events")}
          data-testid="button-back"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(13,6,24,0.6)", backdropFilter: "blur(8px)" }}
        >
          <ArrowLeft size={18} color="rgba(253,248,240,0.8)" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 mt-20">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !event ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 mt-20 text-center px-8">
          <p className="text-cream/40">Event not found.</p>
          <button onClick={() => setLocation("/events")} className="text-gold text-sm">Back to Events</button>
        </div>
      ) : (
        <>
          <div
            className="h-64 relative flex items-center justify-center"
            style={{ background: bgGradient }}
          >
            {event.imageUrl ? (
              <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-8xl">{emoji}</span>
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(13,6,24,1) 0%, rgba(13,6,24,0.2) 60%, transparent 100%)" }} />
          </div>

          <div className="px-5 -mt-4 relative z-10">
            <div
              className="inline-block px-3 py-1 rounded-full text-xs font-bold capitalize mb-3"
              style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)" }}
            >
              {event.type}
            </div>
            <h1 className="font-serif text-2xl text-cream font-bold leading-tight mb-4" data-testid="text-event-title">
              {event.title}
            </h1>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(201,168,76,0.1)" }}>
                  <CalendarDays size={15} color="#c9a84c" />
                </div>
                <div>
                  <p className="text-cream/40 text-xs uppercase tracking-wider font-semibold">Date & Time</p>
                  <p className="text-cream text-sm">{dateLabel}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(201,168,76,0.1)" }}>
                  <MapPin size={15} color="#c9a84c" />
                </div>
                <div>
                  <p className="text-cream/40 text-xs uppercase tracking-wider font-semibold">Location</p>
                  <p className="text-cream text-sm">{event.location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(201,168,76,0.1)" }}>
                  <Globe size={15} color="#c9a84c" />
                </div>
                <div>
                  <p className="text-cream/40 text-xs uppercase tracking-wider font-semibold">Organizer</p>
                  <p className="text-cream text-sm">{event.organizer}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(201,168,76,0.1)" }}>
                  <Users size={15} color="#c9a84c" />
                </div>
                <div>
                  <p className="text-cream/40 text-xs uppercase tracking-wider font-semibold">Attendees</p>
                  <p className="text-cream text-sm">{event.attendeeCount} people attending</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xs text-cream/40 uppercase tracking-wider font-semibold mb-2">About this Event</h3>
              <p className="text-cream/70 text-sm leading-relaxed" data-testid="text-event-description">{event.description}</p>
            </div>

            <button
              onClick={() => attendMutation.mutate(event.isAttending)}
              disabled={attendMutation.isPending}
              data-testid="button-rsvp"
              className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={event.isAttending
                ? { background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "2px solid rgba(201,168,76,0.4)" }
                : { background: "linear-gradient(135deg, #7b3fa0, #d4608a)", color: "white", boxShadow: "0 8px 24px rgba(212,96,138,0.3)" }
              }
            >
              {attendMutation.isPending ? "…" : event.isAttending ? "✓ You're attending — Cancel RSVP" : "RSVP — I'm attending!"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
