import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

export const VideoCallContext = createContext<VideoCallCtx | null>(null);

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export type CallState = "idle" | "calling" | "ringing" | "active";

export interface IncomingCall {
  from: string;
  fromName: string;
  fromPhoto: string | null;
  matchId: string;
}

export interface VideoCallCtx {
  callState: CallState;
  incomingCall: IncomingCall | null;
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  remoteStreamRef: React.MutableRefObject<MediaStream | null>;
  remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
  localVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
  startCall: (matchId: string, toUserId: string, toName: string, toPhoto: string | null, myName: string, myPhoto: string | null) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  isCamOff: boolean;
  toggleCam: () => void;
  callPartnerName: string;
  callPartnerPhoto: string | null;
  wsConnected: boolean;
}

export function useVideoCallContext() {
  const ctx = useContext(VideoCallContext);
  if (!ctx) throw new Error("useVideoCallContext must be used within VideoCallProvider");
  return ctx;
}

function getWsUrl() {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws`;
}

export function useVideoCallProvider(userId: string | null, isPremium: boolean): VideoCallCtx {
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const [callState, setCallState] = useState<CallState>("idle");
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callPartnerId, setCallPartnerId] = useState<string | null>(null);
  const [callPartnerName, setCallPartnerName] = useState("");
  const [callPartnerPhoto, setCallPartnerPhoto] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [reconnectCtr, setReconnectCtr] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const reconnectDelayRef = useRef(1000);
  const isPremiumRef = useRef(isPremium);
  useEffect(() => { isPremiumRef.current = isPremium; }, [isPremium]);

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const closePc = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const createPc = useCallback((partnerId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        send({ type: "call:ice", to: partnerId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      const [stream] = e.streams;
      remoteStreamRef.current = stream;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    return pc;
  }, [send]);

  const getMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  }, []);

  // ── Incoming message handler ──────────────────────────────
  const handleMessage = useCallback(async (raw: string) => {
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === "call:invite") {
      // Non-premium users cannot receive video calls — auto-reject silently
      if (!isPremiumRef.current) {
        send({ type: "call:reject", to: msg.from });
        return;
      }
      setIncomingCall({ from: msg.from, fromName: msg.fromName, fromPhoto: msg.fromPhoto ?? null, matchId: msg.matchId });
      setCallPartnerId(msg.from);
      setCallPartnerName(msg.fromName);
      setCallPartnerPhoto(msg.fromPhoto ?? null);
      setCallState("ringing");
    }

    if (msg.type === "call:accept") {
      // Caller receives accept — create and send offer
      const partnerId = msg.from;
      const stream = await getMedia();
      const pc = createPc(partnerId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send({ type: "call:offer", to: partnerId, sdp: offer });
    }

    if (msg.type === "call:reject") {
      closePc();
      setCallState("idle");
      setCallPartnerId(null);
    }

    if (msg.type === "call:offer") {
      // Callee receives offer — answer it
      const partnerId = msg.from;
      const stream = await getMedia();
      const pc = createPc(partnerId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send({ type: "call:answer", to: partnerId, sdp: answer });
      setCallState("active");
    }

    if (msg.type === "call:answer") {
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      setCallState("active");
    }

    if (msg.type === "call:ice") {
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(msg.candidate));
      } catch {}
    }

    if (msg.type === "call:end") {
      closePc();
      setCallState("idle");
      setIncomingCall(null);
      setCallPartnerId(null);
    }
  }, [send, createPc, getMedia, closePc]);

  // ── WebSocket lifecycle ───────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;
    let intentionalClose = false;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "register", userId }));
      setWsConnected(true);
      reconnectDelayRef.current = 1000;
    };

    ws.onmessage = (e) => handleMessage(e.data);

    ws.onclose = () => {
      wsRef.current = null;
      setWsConnected(false);
      if (!intentionalClose) {
        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(delay * 2, 30000);
        setTimeout(() => setReconnectCtr(c => c + 1), delay);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    return () => {
      intentionalClose = true;
      ws.close();
    };
  }, [userId, handleMessage, reconnectCtr]);

  // ── Actions ───────────────────────────────────────────────
  // toName/toPhoto = who you're calling (shown on your screen)
  // myName/myPhoto = your own info (sent to the other person so they see who's calling)
  const startCall = useCallback((
    matchId: string,
    toUserId: string,
    toName: string,
    toPhoto: string | null,
    myName: string,
    myPhoto: string | null,
  ) => {
    setCallPartnerId(toUserId);
    setCallPartnerName(toName);
    setCallPartnerPhoto(toPhoto);
    setCallState("calling");
    send({ type: "call:invite", to: toUserId, fromName: myName, fromPhoto: myPhoto, matchId });
  }, [send]);

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    send({ type: "call:accept", to: incomingCall.from });
    setIncomingCall(null);
    setCallState("calling"); // will move to "active" when offer arrives
  }, [incomingCall, send]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    send({ type: "call:reject", to: incomingCall.from });
    setIncomingCall(null);
    setCallState("idle");
    setCallPartnerId(null);
  }, [incomingCall, send]);

  const endCall = useCallback(() => {
    if (callPartnerId) send({ type: "call:end", to: callPartnerId });
    closePc();
    setCallState("idle");
    setIncomingCall(null);
    setCallPartnerId(null);
  }, [callPartnerId, send, closePc]);

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => !m);
  }, []);

  const toggleCam = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCamOff(c => !c);
  }, []);

  return {
    callState, incomingCall, localStreamRef, remoteStreamRef,
    localVideoRef, remoteVideoRef,
    startCall, acceptCall, rejectCall, endCall,
    isMuted, toggleMute, isCamOff, toggleCam,
    callPartnerName, callPartnerPhoto,
    wsConnected,
  };
}
