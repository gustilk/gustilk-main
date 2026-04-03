import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ModerationResult {
  safe: boolean;
  reason?: string;
}

export async function moderateImage(base64DataUrl: string): Promise<ModerationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 10,
      messages: [
        {
          role: "system",
          content:
            "You are a content moderation system. Your only job is to detect explicit sexual content in images. Normal photos of people, faces, nature, travel, or daily life are always SAFE. Only flag content that clearly shows nudity, bare genitalia, bare female breasts, explicit sexual acts, or pornographic material. When in doubt, reply SAFE. You must reply with exactly one word.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: base64DataUrl, detail: "auto" },
            },
            {
              type: "text",
              text: "Does this image clearly contain nudity, bare genitalia, bare female breasts, explicit sexual acts, or pornographic content? Reply with exactly one word: SAFE or UNSAFE",
            },
          ],
        },
      ],
    });

    const answer = (response.choices[0]?.message?.content ?? "").trim().toUpperCase();
    console.log(`[moderation] scan result: "${answer}"`);

    if (answer.includes("UNSAFE")) {
      return { safe: false, reason: "Explicit or inappropriate content detected" };
    }
    return { safe: true };
  } catch (err: any) {
    console.error("[moderation] scan failed:", err?.message ?? err);
    return { safe: true };
  }
}

export interface FaceCheckResult {
  faceDetected: boolean;
  reason?: string;
}

export async function checkFacePresent(base64DataUrl: string): Promise<FaceCheckResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 20,
      messages: [
        {
          role: "system",
          content:
            "You are a face verification system for an identity check. Determine whether a clear human face is visible and recognisable in the image. The face should be unobscured and facing roughly toward the camera. Reply with exactly one word: YES or NO.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              // "auto" lets the model choose the right tile resolution —
              // better than forcing "low" which can miss faces in complex images
              image_url: { url: base64DataUrl, detail: "auto" },
            },
            {
              type: "text",
              text: "Is there a clear, recognisable human face visible in this photo? Reply with exactly one word: YES or NO",
            },
          ],
        },
      ],
    });

    const raw = (response.choices[0]?.message?.content ?? "").trim().toUpperCase();
    console.log(`[face-check] model response: "${raw}"`);

    // Accept the result only if the model explicitly says YES.
    // Any other response (NO, empty, unexpected) is treated as no-face-detected
    // but we still fail-open on a completely blank response to avoid blocking real users.
    if (raw === "YES" || raw.startsWith("YES")) {
      return { faceDetected: true };
    }
    if (raw === "NO" || raw.startsWith("NO") || raw === "") {
      return { faceDetected: false, reason: "No clear face detected. Please take a well-lit selfie looking directly at the camera." };
    }
    // Unexpected response — fail-open (admin reviews every selfie anyway)
    console.warn(`[face-check] unexpected response "${raw}", failing open`);
    return { faceDetected: true };
  } catch (err: any) {
    console.error("[face-check] scan failed:", err?.message ?? err);
    // Fail-open on API/network errors so users aren't blocked by infrastructure issues
    return { faceDetected: true };
  }
}

