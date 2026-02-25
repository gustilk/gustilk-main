import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[DEV SMS] To: ${to}\n${body}`);
    return true;
  }
  try {
    const client = twilio(accountSid, authToken);
    await client.messages.create({ from: fromNumber, to, body });
    return true;
  } catch (err: any) {
    console.error("[Twilio]", err.message);
    return false;
  }
}
