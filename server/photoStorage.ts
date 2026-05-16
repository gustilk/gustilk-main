import crypto from "crypto";

let _client: import("@replit/object-storage").Client | null = null;
let _clientInitialized = false;

function getClient(): import("@replit/object-storage").Client | null {
  if (_clientInitialized) return _client;
  _clientInitialized = true;
  try {
    const { Client } = require("@replit/object-storage");
    _client = new Client();
  } catch {
    _client = null;
  }
  return _client;
}

/**
 * Upload a Base64 data URI to Replit Object Storage.
 * Returns the app-relative URL that Express serves via GET /api/photos/*.
 * Throws if object storage is unavailable (caller should fall back to raw Base64).
 */
export async function uploadBase64Photo(dataUri: string, userId: string): Promise<string> {
  const client = getClient();
  if (!client) throw new Error("Object storage not available in this environment");
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
 * Returns null if the object does not exist or storage is unavailable.
 */
export async function downloadPhoto(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const client = getClient();
  if (!client) return null;
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
