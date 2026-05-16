import { Client } from "@replit/object-storage";
import crypto from "crypto";

const client = new Client();

/**
 * Upload a Base64 data URI to Replit Object Storage.
 * Returns the app-relative URL that Express serves via GET /api/photos/*.
 */
export async function uploadBase64Photo(dataUri: string, userId: string): Promise<string> {
  const m = dataUri.match(/^data:([^;]+);base64,(.+)$/s);
  if (!m) throw new Error("Invalid image data URI");
  const contentType = m[1];
  const buffer = Buffer.from(m[2], "base64");
  const ext = (contentType.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
  const key = `${userId}/${crypto.randomUUID()}.${ext}`;
  const result = await client.uploadFromBuffer(buffer, key, { contentType });
  if (!result.ok) throw new Error(`Object storage upload failed: ${(result as any).error ?? "unknown"}`);
  return `/api/photos/${key}`;
}

/**
 * Download a photo as a Buffer by storage key.
 * Returns null if the object does not exist.
 */
export async function downloadPhoto(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const result = await client.downloadAsBuffer(key);
  if (!result.ok || !result.value) return null;
  const ext = key.split(".").pop() ?? "jpg";
  const contentTypeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  return { buffer: result.value, contentType: contentTypeMap[ext] ?? "image/jpeg" };
}

/** Returns true if the URL points to our object storage proxy endpoint. */
export function isStorageUrl(url: string): boolean {
  return url.startsWith("/api/photos/");
}
