import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { RequestHandler } from "express";

const clients = new Map<string, WebSocket>();

export function setupWs(httpServer: Server, sessionMiddleware: RequestHandler) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("error", (err) => {
    console.error("[ws] server error:", err.message);
  });

  wss.on("connection", (ws, req) => {
    // Authenticate via session cookie — do not trust any userId sent by the client
    sessionMiddleware(req as any, {} as any, () => {
      const userId: string | undefined = (req as any).session?.userId;

      if (!userId) {
        ws.close(4401, "Unauthorized");
        return;
      }

      clients.set(userId, ws);

      ws.on("error", (err) => {
        console.error("[ws] client error:", err.message);
      });

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());

          const targetId = String(msg.to);
          const target = clients.get(targetId);
          if (target && target.readyState === WebSocket.OPEN) {
            target.send(JSON.stringify({ ...msg, from: userId }));
          }
        } catch {}
      });

      ws.on("close", () => {
        clients.delete(userId);
      });
    });
  });
}
