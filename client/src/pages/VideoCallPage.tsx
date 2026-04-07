import { useEffect, useRef } from "react";
import { PhoneOff, Mic, MicOff, Video, VideoOff, Phone } from "lucide-react";
import { useVideoCallContext } from "@/hooks/useVideoCall";
import ProtectedPhoto from "@/components/ProtectedPhoto";

export default function VideoCallPage() {
  const {
    callState, endCall,
    isMuted, toggleMute,
    isCamOff, toggleCam,
    callPartnerName, callPartnerPhoto,
    localVideoRef, remoteVideoRef,
  } = useVideoCallContext();

  const remoteEl = useRef<HTMLVideoElement>(null);
  const localEl = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    remoteVideoRef.current = remoteEl.current;
    localVideoRef.current = localEl.current;
  }, [remoteVideoRef, localVideoRef]);

  const statusLabel =
    callState === "calling" ? "Calling…" :
    callState === "ringing" ? "Connecting…" :
    "Connected";

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#E30613" }}>
      {/* Remote video — full background */}
      <video
        ref={remoteEl}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        data-testid="video-remote"
      />

      {/* Dark overlay when no remote stream */}
      {callState !== "active" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
          style={{ background: "rgba(13,6,24,0.92)" }}>
          {/* Avatar */}
          <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #2d0f4a, #A0000A)", border: "3px solid rgba(255,215,0,0.4)" }}>
            {callPartnerPhoto ? (
              <ProtectedPhoto src={callPartnerPhoto} className="w-full h-full object-cover" alt={callPartnerName} />
            ) : (
              <span className="text-gold font-serif text-4xl">
                {callPartnerName.charAt(0)}
              </span>
            )}
          </div>
          <div className="text-center">
            <h2 className="font-serif text-2xl text-cream mb-1">{callPartnerName}</h2>
            <p className="text-cream/50 text-sm">{statusLabel}</p>
          </div>
          {/* Pulsing ring */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-36 h-36 rounded-full animate-ping opacity-10"
              style={{ background: "rgba(255,215,0,0.3)" }} />
          </div>
        </div>
      )}

      {/* Local video — picture-in-picture corner */}
      <div className="absolute top-16 right-4 w-28 h-40 rounded-2xl overflow-hidden shadow-xl z-10"
        style={{ border: "2px solid rgba(255,215,0,0.3)" }}
        data-testid="video-local-container">
        <video
          ref={localEl}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
          data-testid="video-local"
        />
        {isCamOff && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(13,6,24,0.85)" }}>
            <VideoOff size={22} color="rgba(255,255,255,0.4)" />
          </div>
        )}
      </div>

      {/* Partner name overlay (when active) */}
      {callState === "active" && (
        <div className="absolute top-16 left-4 px-3 py-1.5 rounded-xl z-10"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <p className="text-cream text-sm font-semibold">{callPartnerName}</p>
        </div>
      )}

      {/* Control bar */}
      <div className="absolute bottom-0 left-0 right-0 pb-10 pt-6 flex items-center justify-center gap-6"
        style={{ background: "linear-gradient(to top, rgba(13,6,24,0.95) 0%, transparent 100%)" }}>

        <CallButton
          label={isMuted ? "Unmute" : "Mute"}
          active={isMuted}
          onClick={toggleMute}
          testId="button-toggle-mute"
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </CallButton>

        {/* End call */}
        <button
          onClick={endCall}
          data-testid="button-end-call"
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: "#FFD700" }}
        >
          <PhoneOff size={26} color="white" />
        </button>

        <CallButton
          label={isCamOff ? "Camera on" : "Camera off"}
          active={isCamOff}
          onClick={toggleCam}
          testId="button-toggle-cam"
        >
          {isCamOff ? <VideoOff size={22} /> : <Video size={22} />}
        </CallButton>
      </div>
    </div>
  );
}

function CallButton({ children, label, active, onClick, testId }: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      title={label}
      className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
      style={active
        ? { background: "rgba(255,255,255,0.15)", color: "#FFD700", border: "1.5px solid rgba(255,215,0,0.4)" }
        : { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }
      }
    >
      {children}
    </button>
  );
}

export function IncomingCallBanner() {
  const { incomingCall, acceptCall, rejectCall } = useVideoCallContext();
  if (!incomingCall) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-12 pb-4 flex items-start gap-4"
      style={{ background: "rgba(13,6,24,0.96)", borderBottom: "1px solid rgba(255,215,0,0.3)" }}
      data-testid="incoming-call-banner">

      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
        style={{ border: "2px solid rgba(255,215,0,0.5)" }}>
        {incomingCall.fromPhoto ? (
          <ProtectedPhoto src={incomingCall.fromPhoto} className="w-full h-full object-cover" alt={incomingCall.fromName} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #2d0f4a, #A0000A)" }}>
            <span className="text-gold font-serif text-xl">{incomingCall.fromName.charAt(0)}</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-cream font-semibold text-sm truncate">{incomingCall.fromName}</p>
        <p className="text-cream/50 text-xs">Incoming video call…</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={rejectCall}
          data-testid="button-reject-call"
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,215,0,0.2)", border: "1px solid rgba(255,215,0,0.5)" }}
        >
          <PhoneOff size={18} color="#FFD700" />
        </button>
        <button
          onClick={acceptCall}
          data-testid="button-accept-call"
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.5)" }}
        >
          <Phone size={18} color="#22c55e" />
        </button>
      </div>
    </div>
  );
}
