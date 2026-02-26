import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

const clients = new Map<string, WebSocket>();

export function setupWs(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("error", (err) => {
    console.error("[ws] server error:", err.message);
  });

  wss.on("connection", (ws) => {
    let userId: string | null = null;

    ws.on("error", (err) => {
      console.error("[ws] client error:", err.message);
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "register") {
          userId = String(msg.userId);
          clients.set(userId, ws);
          return;
        }

        if (!userId) return;

        const targetId = String(msg.to);
        const target = clients.get(targetId);
        if (target && target.readyState === WebSocket.OPEN) {
          target.send(JSON.stringify({ ...msg, from: userId }));
        }
      } catch {}
    });

    ws.on("close", () => {
      if (userId) clients.delete(userId);
    });
  });
}
