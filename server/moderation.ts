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
      model: "gpt-5-nano",
      max_completion_tokens: 30,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: base64DataUrl, detail: "low" },
            },
            {
              type: "text",
              text: 'Does this image contain nudity, explicit sexual content, pornography, or genitalia? Reply with exactly one word: SAFE or UNSAFE',
            },
          ],
        },
      ],
    });

    const answer = response.choices[0]?.message?.content?.trim().toUpperCase() ?? "SAFE";
    if (answer.includes("UNSAFE")) {
      return { safe: false, reason: "Explicit or inappropriate content detected" };
    }
    return { safe: true };
  } catch (err: any) {
    console.error("[moderation] Error scanning image:", err?.message ?? err);
    return { safe: true };
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
