import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import fs from "fs";

const CRASH_LOG = "/tmp/gustilk-crash.log";

function appendCrashLog(msg: string) {
  try {
    fs.appendFileSync(CRASH_LOG, `${new Date().toISOString()} ${msg}\n`);
  } catch {}
}

process.on("exit", (code) => {
  appendCrashLog(`[EXIT] code=${code}`);
  console.error(`[EXIT] process exiting with code=${code}`);
});

process.on("uncaughtException", (err) => {
  appendCrashLog(`[CRASH] uncaughtException: ${err?.stack ?? err}`);
  console.error("[CRASH] uncaughtException:", err);
});

process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.stack : String(reason);
  appendCrashLog(`[CRASH] unhandledRejection: ${msg}`);
  console.error("[CRASH] unhandledRejection:", reason);
});

process.on("SIGTERM", () => {
  appendCrashLog("[CRASH] SIGTERM received");
  console.error("[CRASH] SIGTERM received — process being killed externally");
  process.exit(143);
});

process.on("SIGINT", () => {
  appendCrashLog("[CRASH] SIGINT received");
  console.error("[CRASH] SIGINT received");
  process.exit(130);
});

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "10mb" }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);
  const { seedDatabase } = await import("./seed");
  await seedDatabase();

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      appendCrashLog(`[START] server listening on port ${port}`);

      let heartbeatCount = 0;
      const heartbeat = setInterval(() => {
        heartbeatCount++;
        const msg = `[HEARTBEAT] #${heartbeatCount} alive at T+${heartbeatCount * 5}s`;
        appendCrashLog(msg);
        console.log(msg);
      }, 5000);
      heartbeat.unref();
    },
  );
})();
