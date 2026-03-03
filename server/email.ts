import { Resend } from "resend";

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(apiKey);
}

function emailShell(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0618;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0618;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#1a0a2e;border-radius:20px;overflow:hidden;border:1px solid rgba(201,168,76,0.15);">
        <tr><td style="padding:36px 36px 0;">
          <p style="margin:0 0 4px;font-size:26px;color:#c9a84c;font-weight:bold;letter-spacing:1px;">Gûstîlk</p>
          <p style="margin:0 0 32px;font-size:12px;color:rgba(253,248,240,0.35);letter-spacing:2px;text-transform:uppercase;">Yezidi Community</p>
          ${body}
        </td></tr>
        <tr><td style="padding:20px 36px 32px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:11px;color:rgba(253,248,240,0.2);line-height:1.6;">
            Questions? Contact us at support@gustilk.com
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendMagicLinkEmail(to: string, magicLink: string): Promise<void> {
  const resend = getResend();
  await resend.emails.send({
    from: "Gûstîlk <noreply@gustilk.com>",
    to,
    subject: "Sign in to Gûstîlk",
    html: emailShell(`
      <h2 style="margin:0 0 12px;font-size:20px;color:#fdf8f0;font-weight:normal;">Sign in to your account</h2>
      <p style="margin:0 0 28px;font-size:14px;color:rgba(253,248,240,0.6);line-height:1.7;">
        Click the button below to sign in instantly. This link expires in <strong style="color:#c9a84c;">15 minutes</strong> and can only be used once — no password needed.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
        <tr><td style="border-radius:12px;background:linear-gradient(135deg,#c9a84c,#e8c97a);">
          <a href="${magicLink}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:bold;color:#1a0a2e;text-decoration:none;border-radius:12px;font-family:sans-serif;">
            Sign in to Gûstîlk
          </a>
        </td></tr>
      </table>
      <p style="margin:0 0 28px;font-size:12px;color:rgba(253,248,240,0.3);line-height:1.6;">
        Or copy and paste this link into your browser:<br>
        <span style="color:rgba(201,168,76,0.6);word-break:break-all;">${magicLink}</span>
      </p>
    `),
  });
}

export async function sendPhotoApprovedEmail(to: string, name: string): Promise<void> {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: "Gûstîlk <noreply@gustilk.com>",
      to,
      subject: "Your photo has been approved — Gûstîlk",
      html: emailShell(`
        <h2 style="margin:0 0 12px;font-size:20px;color:#fdf8f0;font-weight:normal;">Photo Approved ✓</h2>
        <p style="margin:0 0 20px;font-size:14px;color:rgba(253,248,240,0.6);line-height:1.7;">
          Hi ${name}, your photo has been reviewed and <strong style="color:#10b981;">approved</strong>. It is now visible to other members.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr><td style="border-radius:12px;background:linear-gradient(135deg,#c9a84c,#e8c97a);">
            <a href="https://www.gustilk.com" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:bold;color:#1a0a2e;text-decoration:none;border-radius:12px;font-family:sans-serif;">
              Open Gûstîlk
            </a>
          </td></tr>
        </table>
      `),
    });
  } catch {
  }
}

export async function sendPhotoRejectedEmail(to: string, name: string, reason: string): Promise<void> {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: "Gûstîlk <noreply@gustilk.com>",
      to,
      subject: "Action required: Photo rejected — Gûstîlk",
      html: emailShell(`
        <h2 style="margin:0 0 12px;font-size:20px;color:#fdf8f0;font-weight:normal;">Photo Not Approved</h2>
        <p style="margin:0 0 16px;font-size:14px;color:rgba(253,248,240,0.6);line-height:1.7;">
          Hi ${name}, unfortunately one of your photos could not be approved.
        </p>
        ${reason ? `
        <div style="margin:0 0 20px;padding:16px;background:rgba(212,96,138,0.1);border-radius:12px;border:1px solid rgba(212,96,138,0.25);">
          <p style="margin:0 0 6px;font-size:12px;color:rgba(253,248,240,0.4);text-transform:uppercase;letter-spacing:1px;">Reason</p>
          <p style="margin:0;font-size:14px;color:#fdf8f0;line-height:1.6;">${reason}</p>
        </div>` : ""}
        <p style="margin:0 0 28px;font-size:14px;color:rgba(253,248,240,0.6);line-height:1.7;">
          Please log in and upload a replacement photo that meets our community guidelines.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr><td style="border-radius:12px;background:linear-gradient(135deg,#c9a84c,#e8c97a);">
            <a href="https://www.gustilk.com/profile" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:bold;color:#1a0a2e;text-decoration:none;border-radius:12px;font-family:sans-serif;">
              Upload New Photo
            </a>
          </td></tr>
        </table>
      `),
    });
  } catch {
  }
}
