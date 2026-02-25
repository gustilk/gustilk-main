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
      model: "gpt-5-mini",
      max_completion_tokens: 10,
      messages: [
        {
          role: "system",
          content:
            "You are a strict content moderation system. Your only job is to detect explicit sexual content in images. You must reply with exactly one word.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: base64DataUrl, detail: "low" },
            },
            {
              type: "text",
              text: "Does this image contain any of the following: nudity, bare genitalia, bare female breasts, explicit sexual acts, or pornographic content? Reply with exactly one word: SAFE or UNSAFE",
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
    if (!answer.includes("SAFE")) {
      console.warn(`[moderation] unexpected response: "${answer}" — treating as UNSAFE`);
      return { safe: false, reason: "Content could not be verified as safe" };
    }
    return { safe: true };
  } catch (err: any) {
    console.error("[moderation] scan failed:", err?.message ?? err);
    return { safe: false, reason: "Photo could not be scanned — please try again" };
  }
}

export async function moderatePhotos(photos: string[]): Promise<ModerationResult> {
  for (const photo of photos) {
    if (!photo || !photo.startsWith("data:image")) continue;
    const result = await moderateImage(photo);
    if (!result.safe) return result;
  }
  return { safe: true };
}
