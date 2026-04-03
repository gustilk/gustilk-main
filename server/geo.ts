import type { Request } from "express";

export function getClientIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const parts = raw.split(",").map(s => s.trim()).filter(Boolean);
    // Read the LAST entry — this is appended by the trusted reverse proxy (Railway/Nginx)
    // and cannot be forged by the client, unlike the first entry which the client controls.
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return req.socket?.remoteAddress ?? null;
}

function isPrivateIp(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.") ||
    ip.startsWith("::ffff:127.") ||
    ip.startsWith("fc") ||
    ip.startsWith("fd")
  );
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
