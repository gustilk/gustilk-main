import { Resend } from "resend";

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(apiKey);
}

function emailShell(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Gûstîlk</title>
</head>
<body style="margin:0;padding:0;background:#060612;font-family:'Georgia',serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060612;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;">

        <!-- Logo / Header -->
        <tr><td align="center" style="padding-bottom:28px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:0 12px 0 0;vertical-align:middle;">
                <!-- Decorative peacock-feather divider left -->
                <div style="width:40px;height:1px;background:linear-gradient(to right,transparent,rgba(201,168,76,0.5));"></div>
              </td>
              <td align="center" style="vertical-align:middle;">
                <p style="margin:0;font-size:30px;font-weight:bold;letter-spacing:2px;color:#c9a84c;font-family:'Georgia',serif;">Gûstîlk</p>
                <p style="margin:2px 0 0;font-size:10px;color:rgba(201,168,76,0.45);letter-spacing:4px;text-transform:uppercase;font-family:Arial,sans-serif;">Yezidi Community</p>
              </td>
              <td style="padding:0 0 0 12px;vertical-align:middle;">
                <div style="width:40px;height:1px;background:linear-gradient(to left,transparent,rgba(201,168,76,0.5));"></div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Card -->
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(160deg,#12062a 0%,#0d0520 100%);border-radius:24px;overflow:hidden;border:1px solid rgba(201,168,76,0.18);box-shadow:0 8px 40px rgba(0,0,0,0.5);">

            <!-- Gold top accent bar -->
            <tr><td style="height:3px;background:linear-gradient(to right,#7b3fa0,#c9a84c,#d4608a);font-size:0;">&nbsp;</td></tr>

            <!-- Body content -->
            <tr><td style="padding:36px 36px 32px;">
              ${body}
            </td></tr>

            <!-- Footer -->
            <tr><td style="padding:20px 36px 28px;border-top:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.15);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;font-size:11px;color:rgba(253,248,240,0.25);line-height:1.7;font-family:Arial,sans-serif;">
                      Need help? <a href="mailto:support@gustilk.com" style="color:rgba(201,168,76,0.6);text-decoration:none;">support@gustilk.com</a>
                    </p>
                    <p style="margin:0;font-size:10px;color:rgba(253,248,240,0.15);font-family:Arial,sans-serif;">
                      © ${new Date().getFullYear()} Gûstîlk · <a href="https://www.gustilk.com" style="color:rgba(201,168,76,0.35);text-decoration:none;">www.gustilk.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>

          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendActivationCodeEmail(to: string, firstName: string, code: string): Promise<void> {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: "Gûstîlk <noreply@gustilk.com>",
      to,
      subject: `Your Gûstîlk activation code: ${code}`,
      html: emailShell(`
        <h2 style="margin:0 0 12px;font-size:20px;color:#ffffff;font-weight:normal;">Verify your email</h2>
        <p style="margin:0 0 24px;font-size:14px;color:#ffffff;line-height:1.7;">
          Hi ${firstName}, enter the code below to activate your Gûstîlk account.
          This code expires in <strong style="color:#c9a84c;">15 minutes</strong>.
        </p>
        <div style="margin:0 auto 28px;max-width:220px;text-align:center;padding:20px 28px;background:rgba(201,168,76,0.1);border-radius:16px;border:1.5px solid rgba(201,168,76,0.35);">
          <p style="margin:0;font-size:38px;font-weight:bold;letter-spacing:10px;color:#c9a84c;font-family:monospace;">${code}</p>
        </div>
        <p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.6);line-height:1.6;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      `),
    });
  } catch {
  }
}

export async function sendMagicLinkEmail(to: string, magicLink: string): Promise<void> {
  const resend = getResend();
  await resend.emails.send({
    from: "Gûstîlk <noreply@gustilk.com>",
    to,
    subject: "Sign in to Gûstîlk",
    html: emailShell(`
      <h2 style="margin:0 0 12px;font-size:20px;color:#ffffff;font-weight:normal;">Sign in to your account</h2>
      <p style="margin:0 0 28px;font-size:14px;color:#ffffff;line-height:1.7;">
        Click the button below to sign in instantly. This link expires in <strong style="color:#c9a84c;">15 minutes</strong> and can only be used once — no password needed.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
        <tr><td style="border-radius:12px;background:linear-gradient(135deg,#c9a84c,#e8c97a);">
          <a href="${magicLink}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:bold;color:#1a0a2e;text-decoration:none;border-radius:12px;font-family:sans-serif;">
            Sign in to Gûstîlk
          </a>
        </td></tr>
      </table>
      <p style="margin:0 0 28px;font-size:12px;color:rgba(255,255,255,0.6);line-height:1.6;">
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
        <h2 style="margin:0 0 12px;font-size:20px;color:#ffffff;font-weight:normal;">Photo Approved ✓</h2>
        <p style="margin:0 0 20px;font-size:14px;color:#ffffff;line-height:1.7;">
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
        <h2 style="margin:0 0 12px;font-size:20px;color:#ffffff;font-weight:normal;">Account Removed</h2>
        <p style="margin:0 0 20px;font-size:14px;color:#ffffff;line-height:1.7;">
          Hi ${name}, your Gûstîlk account has been permanently removed by an administrator.
          All your profile data, photos, matches, and messages have been deleted.
        </p>
        ${wasPremium ? `
        <div style="margin:0 0 24px;padding:16px;background:rgba(201,168,76,0.08);border-radius:12px;border:1px solid rgba(201,168,76,0.2);">
          <p style="margin:0 0 6px;font-size:12px;color:#c9a84c;text-transform:uppercase;letter-spacing:1px;">Premium Subscription</p>
          <p style="margin:0;font-size:14px;color:#ffffff;line-height:1.6;">
            Your active premium subscription has been cancelled immediately.
            If you believe you are owed a refund, please contact us at
            <a href="mailto:support@gustilk.com" style="color:#c9a84c;">support@gustilk.com</a>.
          </p>
        </div>` : ""}
        <p style="margin:0 0 12px;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.7;">
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
        <h2 style="margin:0 0 12px;font-size:20px;color:#ffffff;font-weight:normal;">New Support Message</h2>
        <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:1px;">From</p>
        <p style="margin:0 0 20px;font-size:15px;color:#c9a84c;font-weight:bold;">${userDisplayName}</p>
        <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:1px;">Message</p>
        <div style="margin:0 0 28px;padding:16px;background:rgba(255,255,255,0.04);border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
          <p style="margin:0;font-size:14px;color:#ffffff;line-height:1.7;">${preview}</p>
        </div>
        <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.65);line-height:1.6;">
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
        <h2 style="margin:0 0 12px;font-size:20px;color:#ffffff;font-weight:normal;">New Profile Awaiting Approval</h2>
        <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:1px;">Applicant</p>
        <p style="margin:0 0 6px;font-size:16px;color:#c9a84c;font-weight:bold;">${applicantName}</p>
        <p style="margin:0 0 24px;font-size:13px;color:#ffffff;">${applicantEmail}</p>
        <p style="margin:0 0 20px;font-size:14px;color:#ffffff;line-height:1.7;">
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

export async function sendRoleAssignedEmail(to: string, name: string, role: string): Promise<void> {
  const roleLabels: Record<string, string> = {
    moderator:   "Moderator",
    admin:       "Admin",
    super_admin: "Super Admin",
  };
  const roleLabel = roleLabels[role] ?? role;
  try {
    const resend = getResend();
    await resend.emails.send({
      from: "Gûstîlk <noreply@gustilk.com>",
      to,
      subject: `You've been added to the Gûstîlk team as ${roleLabel}`,
      html: emailShell(`
        <h2 style="margin:0 0 12px;font-size:20px;color:#ffffff;font-weight:normal;">You're now a ${roleLabel}</h2>
        <p style="margin:0 0 20px;font-size:14px;color:#ffffff;line-height:1.7;">
          Hi ${name}, you've been granted <strong style="color:#c9a84c;">${roleLabel}</strong> access on Gûstîlk.
          Log in with your existing account credentials to access the admin panel.
        </p>
        <div style="margin:0 0 24px;padding:16px;background:rgba(201,168,76,0.08);border-radius:12px;border:1px solid rgba(201,168,76,0.2);">
          <p style="margin:0 0 6px;font-size:12px;color:#c9a84c;text-transform:uppercase;letter-spacing:1px;">How to access the admin panel</p>
          <p style="margin:0;font-size:14px;color:#ffffff;line-height:1.6;">
            1. Go to <strong>www.gustilk.com</strong> and log in with your existing email and password.<br>
            2. Once logged in, navigate to <strong>/admin</strong> to access the panel.
          </p>
        </div>
        <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr><td style="border-radius:12px;background:linear-gradient(135deg,#c9a84c,#e8c97a);">
            <a href="https://www.gustilk.com/admin" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:bold;color:#1a0a2e;text-decoration:none;border-radius:12px;font-family:sans-serif;">
              Open Admin Panel
            </a>
          </td></tr>
        </table>
        <p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.6);line-height:1.6;">
          If you didn't expect this or believe it was sent in error, contact support@gustilk.com.
        </p>
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
        <h2 style="margin:0 0 12px;font-size:20px;color:#ffffff;font-weight:normal;">Photo Not Approved</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#ffffff;line-height:1.7;">
          Hi ${name}, unfortunately one of your photos could not be approved.
        </p>
        ${reason ? `
        <div style="margin:0 0 20px;padding:16px;background:rgba(212,96,138,0.1);border-radius:12px;border:1px solid rgba(212,96,138,0.25);">
          <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:1px;">Reason</p>
          <p style="margin:0;font-size:14px;color:#ffffff;line-height:1.6;">${reason}</p>
        </div>` : ""}
        <p style="margin:0 0 28px;font-size:14px;color:#ffffff;line-height:1.7;">
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
