// Maps raw server error strings to user-friendly messages
const FRIENDLY: Record<string, string> = {
  "Number must be greater than or equal to 18": "Age must be 18 years or older.",
  "You must upload at least one profile photo to complete your profile.": "Please upload at least one profile photo to continue.",
  "A verification selfie is required to complete your profile.": "Please upload a verification selfie to continue.",
  "Profile incomplete": "Please complete your profile before continuing.",
  "You cannot like yourself.": "You cannot like your own profile.",
  "Country cannot be changed": "Your country cannot be changed after signup.",
};

/**
 * Extracts a clean, user-friendly message from any API error.
 * Errors thrown by apiRequest follow the format: "STATUS: bodyText"
 */
export function parseApiError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  try {
    const raw = err instanceof Error ? err.message : String(err ?? "");
    console.error("[API Error]", raw);

    // Strip the "STATUS: " prefix added by throwIfResNotOk
    const body = raw.replace(/^\d+:\s*/, "");

    let message: string;
    try {
      const json = JSON.parse(body);
      message = json.error ?? json.message ?? body;
    } catch {
      message = body || raw;
    }

    // Return friendly override if known, otherwise return message as-is
    return FRIENDLY[message] ?? message ?? fallback;
  } catch {
    return fallback;
  }
}
