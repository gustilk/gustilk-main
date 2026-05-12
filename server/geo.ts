import type { Request } from "express";

export function getClientIp(req: Request): string | null {
  // Railway sets x-real-ip to the actual client IP — prefer it over x-forwarded-for
  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    const ip = (Array.isArray(realIp) ? realIp[0] : realIp).trim();
    if (ip) return ip;
  }

  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const parts = raw.split(",").map(s => s.trim()).filter(Boolean);
    // Use the first non-private entry — the original client IP before any proxy IPs
    for (const ip of parts) {
      if (!isPrivateIp(ip)) return ip;
    }
  }
  return req.socket?.remoteAddress ?? null;
}

function isPrivateIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("::ffff:127.")) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
  // 172.16.0.0 – 172.31.255.255 only (not all of 172.x which includes public IPs)
  const m = ip.match(/^172\.(\d+)\./);
  if (m) {
    const b = parseInt(m[1], 10);
    if (b >= 16 && b <= 31) return true;
  }
  return false;
}

type GeoResult = { countryCode: string; countryName: string; ip: string };

export async function lookupIpCountry(ip: string): Promise<GeoResult | null> {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { "User-Agent": "Gustilk/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    if (!data.country_code || data.error) return null;
    return { countryCode: data.country_code, countryName: data.country_name, ip };
  } catch {
    return null;
  }
}

export async function verifyCountryFromRequest(req: Request, claimedCountry: string): Promise<{
  allowed: boolean;
  reason?: string;
  detectedCountry?: string;
}> {
  const isDev = process.env.NODE_ENV !== "production";

  const ip = getClientIp(req);

  if (!ip || isPrivateIp(ip)) {
    if (isDev) {
      return { allowed: true };
    }
    return { allowed: false, reason: "Could not verify your location. Please use a direct connection." };
  }

  const geo = await lookupIpCountry(ip);
  if (!geo) {
    if (isDev) {
      return { allowed: true };
    }
    return { allowed: false, reason: "Location verification failed. Please try again." };
  }

  const COUNTRY_CODE_MAP: Record<string, string> = {
    US: "USA", CA: "Canada", AU: "Australia", DE: "Germany",
    NL: "Holland", SE: "Sweden", BE: "Belgium", FR: "France",
    TR: "Turkey", IQ: "Iraq", AM: "Armenia", GE: "Georgia",
    RU: "Russia", GB: "UK",
  };

  const detected = COUNTRY_CODE_MAP[geo.countryCode] ?? geo.countryName;

  if (detected.toLowerCase() !== claimedCountry.toLowerCase()) {
    return {
      allowed: false,
      reason: `Your IP location (${geo.countryName}) does not match the selected country (${claimedCountry}).`,
      detectedCountry: detected,
    };
  }

  return { allowed: true, detectedCountry: detected };
}

export async function verifyIraqFromRequest(req: Request): Promise<{
  isIraq: boolean;
  reason?: string;
}> {
  const isDev = process.env.NODE_ENV !== "production";

  const ip = getClientIp(req);

  if (!ip || isPrivateIp(ip)) {
    if (isDev) {
      return { isIraq: true };
    }
    return { isIraq: false, reason: "Could not verify your location for the free Iraq membership." };
  }

  const geo = await lookupIpCountry(ip);
  if (!geo) {
    if (isDev) {
      return { isIraq: true };
    }
    return { isIraq: false, reason: "Location verification failed. Please try again." };
  }

  if (geo.countryCode !== "IQ") {
    return {
      isIraq: false,
      reason: `Free membership is only available from Iraq. Your connection appears to be from ${geo.countryName}.`,
    };
  }

  return { isIraq: true };
}
