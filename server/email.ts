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

export async function sendAccountDeletedEmail(to: string, name: string, wasPremium: boolean): Promise<void> {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: "Gûstîlk <noreply@gustilk.com>",
      to,
      subject: "Your Gûstîlk account has been removed",
      html: emailShell(`
        <h2 style="margin:0 0 12px;font-size:20px;color:#fdf8f0;font-weight:normal;">Account Removed</h2>
        <p style="margin:0 0 20px;font-size:14px;color:rgba(253,248,240,0.6);line-height:1.7;">
          Hi ${name}, your Gûstîlk account has been permanently removed by an administrator.
          All your profile data, photos, matches, and messages have been deleted.
        </p>
        ${wasPremium ? `
        <div style="margin:0 0 24px;padding:16px;background:rgba(201,168,76,0.08);border-radius:12px;border:1px solid rgba(201,168,76,0.2);">
          <p style="margin:0 0 6px;font-size:12px;color:rgba(201,168,76,0.7);text-transform:uppercase;letter-spacing:1px;">Premium Subscription</p>
          <p style="margin:0;font-size:14px;color:rgba(253,248,240,0.7);line-height:1.6;">
            Your active premium subscription has been cancelled immediately.
            If you believe you are owed a refund, please contact us at
            <a href="mailto:support@gustilk.com" style="color:#c9a84c;">support@gustilk.com</a>.
          </p>
        </div>` : ""}
        <p style="margin:0 0 12px;font-size:14px;color:rgba(253,248,240,0.4);line-height:1.7;">
          If you believe this was a mistake, please contact our support team.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr><td style="border-radius:12px;background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.3);">
            <a href="mailto:support@gustilk.com" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#c9a84c;text-decoration:none;border-radius:12px;font-family:sans-serif;">
              Contact Support
            </a>
          </td></tr>
        </table>
      `),
    });
  } catch {
  }
}

export async function sendSupportMessageAlertEmail(userDisplayName: string, messagePreview: string, matchId: string): Promise<void> {
  try {
    const resend = getResend();
    const preview = messagePreview.length > 200 ? messagePreview.slice(0, 200) + "…" : messagePreview;
    await resend.emails.send({
      from: "Gûstîlk <noreply@gustilk.com>",
      to: "support@gustilk.com",
      subject: `New support message from ${userDisplayName}`,
      html: emailShell(`
        <h2 style="margin:0 0 12px;font-size:20px;color:#fdf8f0;font-weight:normal;">New Support Message</h2>
        <p style="margin:0 0 8px;font-size:13px;color:rgba(253,248,240,0.4);text-transform:uppercase;letter-spacing:1px;">From</p>
        <p style="margin:0 0 20px;font-size:15px;color:#c9a84c;font-weight:bold;">${userDisplayName}</p>
        <p style="margin:0 0 8px;font-size:13px;color:rgba(253,248,240,0.4);text-transform:uppercase;letter-spacing:1px;">Message</p>
        <div style="margin:0 0 28px;padding:16px;background:rgba(255,255,255,0.04);border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
          <p style="margin:0;font-size:14px;color:rgba(253,248,240,0.8);line-height:1.7;">${preview}</p>
        </div>
        <p style="margin:0 0 8px;font-size:13px;color:rgba(253,248,240,0.35);line-height:1.6;">
          The AI assistant has already sent an automatic reply. Log in as the support account to respond manually if needed.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
          <tr><td style="border-radius:12px;background:linear-gradient(135deg,#c9a84c,#e8c97a);">
            <a href="https://www.gustilk.com/chat/${matchId}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:bold;color:#1a0a2e;text-decoration:none;border-radius:12px;font-family:sans-serif;">
              Open Conversation
            </a>
          </td></tr>
        </table>
      `),
    });
  } catch {
  }
}

export async function sendAdminApprovalNeededEmail(
  adminEmail: string,
  applicantName: string,
  applicantEmail: string,
  adminPanelUrl = "https://www.gustilk.com/admin"
): Promise<void> {
  if (!adminEmail) return;
  try {
    const resend = getResend();
    await resend.emails.send({
      from: "Gûstîlk <noreply@gustilk.com>",
      to: adminEmail,
      subject: `New profile pending approval — ${applicantName}`,
      html: emailShell(`
        <h2 style="margin:0 0 12px;font-size:20px;color:#fdf8f0;font-weight:normal;">New Profile Awaiting Approval</h2>
        <p style="margin:0 0 8px;font-size:13px;color:rgba(253,248,240,0.4);text-transform:uppercase;letter-spacing:1px;">Applicant</p>
        <p style="margin:0 0 6px;font-size:16px;color:#c9a84c;font-weight:bold;">${applicantName}</p>
        <p style="margin:0 0 24px;font-size:13px;color:rgba(253,248,240,0.5);">${applicantEmail}</p>
        <p style="margin:0 0 20px;font-size:14px;color:rgba(253,248,240,0.6);line-height:1.7;">
          A new member has submitted their profile and selfie for review.
          Please visit the admin panel to approve or reject the application.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
          <tr><td style="border-radius:12px;background:linear-gradient(135deg,#c9a84c,#e8c97a);">
            <a href="${adminPanelUrl}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:bold;color:#1a0a2e;text-decoration:none;border-radius:12px;font-family:sans-serif;">
              Review in Admin Panel
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
