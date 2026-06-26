import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn("SMTP credentials are not fully set (SMTP_HOST, SMTP_USER, SMTP_PASS). Email notifications will be disabled.");
      return null;
    }

    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }
  return transporter;
}

const FROM_EMAIL = process.env.FROM_EMAIL || "LocalVoice <updates@localvoice.app>"; // Default or env var

export async function sendResolutionEmail(emails: string[], complaintId: string, location: string, category: string) {
  const mailer = getTransporter();
  if (!mailer) return;

  if (!emails || emails.length === 0) return;

  const appUrl = process.env.VITE_APP_URL || "https://localvoice.app"; // Default app URL
  const trackUrl = `${appUrl}/track?token=${complaintId}`; // We use ID here, which might be the token or ID based on logic. Wait, let's use ID in URL if track allows ID. Actually track uses token, but we passed complaintId here. Wait, earlier code passed complaintId. Let's keep it as is.

  const html = `
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background-color: #dcfce7; border-radius: 50%; margin-bottom: 16px;">
          <span style="font-size: 24px;">✅</span>
        </div>
        <h2 style="color: #0f172a; margin: 0; font-size: 24px;">Issue Resolved</h2>
      </div>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        Great news! The local issue you reported or subscribed to has been officially marked as <strong>resolved</strong> by the administration.
      </p>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #f1f5f9;">
        <p style="margin: 0 0 12px 0; color: #334155; font-size: 15px;"><strong>Category:</strong> <span style="text-transform: capitalize;">${category}</span></p>
        <p style="margin: 0; color: #334155; font-size: 15px;"><strong>Location:</strong> ${location}</p>
      </div>

      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 32px;">
        Thank you for being an active part of the community and helping make our city better! Your voice made a difference.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${trackUrl}" style="background-color: #0f172a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
          View Issue Details
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
      
      <p style="margin: 0; font-size: 13px; color: #94a3b8; text-align: center;">
        You received this email because you subscribed to updates for this issue on LocalVoice.
      </p>
    </div>
  `;

  try {
    const info = await mailer.sendMail({
      from: FROM_EMAIL,
      to: [], // We use bcc for privacy when sending to multiple people
      bcc: emails,
      subject: "✅ Issue Resolved: " + category,
      html,
    });

    console.log(`Resolution email sent successfully for complaint ${complaintId} to ${emails.length} recipients. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error("Error sending email via Nodemailer:", error);
  }
}

export async function sendSubmissionEmail(email: string, token: string, location: string, category: string, photoURL: string | null, attachmentBase64?: string) {
  const mailer = getTransporter();
  if (!mailer) return;

  const appUrl = process.env.VITE_APP_URL || "https://localvoice.app"; 
  const trackUrl = `${appUrl}/track?token=${token}`;

  const html = `
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background-color: #f1f5f9; border-radius: 50%; margin-bottom: 16px;">
          <span style="font-size: 24px;">📢</span>
        </div>
        <h2 style="color: #0f172a; margin: 0; font-size: 24px;">Report Submitted Successfully</h2>
      </div>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        Thank you for reporting an issue to LocalVoice! We've received your submission and have securely attached your Official Report Receipt to this email.
      </p>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #f1f5f9;">
        <p style="margin: 0 0 12px 0; color: #334155; font-size: 15px;"><strong>Category:</strong> <span style="text-transform: capitalize;">${category}</span></p>
        <p style="margin: 0 0 12px 0; color: #334155; font-size: 15px;"><strong>Location:</strong> ${location}</p>
        <p style="margin: 0; color: #334155; font-size: 15px;"><strong>Tracking Token:</strong> <code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${token}</code></p>
      </div>

      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 32px;">
        You can track the status of your issue using your tracking token at any time by clicking the link below:
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${trackUrl}" style="background-color: #0f172a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
          Track Your Issue
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
      
      <p style="margin: 0; font-size: 13px; color: #94a3b8; text-align: center;">
        You received this email because you provided it when submitting a report on LocalVoice.
      </p>
    </div>
  `;

  const attachments: any[] = [];
  if (attachmentBase64) {
    const base64Data = attachmentBase64.split(",")[1] || attachmentBase64;
    attachments.push({
      filename: `civicscan-receipt-${token}.png`,
      content: base64Data,
      encoding: "base64",
    });
  }

  try {
    const info = await mailer.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "✅ Report Received: " + category,
      html,
      attachments,
    });

    console.log(`Submission email sent successfully to ${email}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error("Error sending submission email:", error);
    throw error;
  }
}

export async function sendStaffInvitationEmail(email: string, role: string, department: string | null, inviteLink: string) {
  const mailer = getTransporter();
  if (!mailer) return;

  const html = `
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background-color: #f1f5f9; border-radius: 50%; margin-bottom: 16px;">
          <span style="font-size: 24px;">🏢</span>
        </div>
        <h2 style="color: #0f172a; margin: 0; font-size: 24px;">Invitation to LocalVoice</h2>
      </div>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        You have been invited to join the <strong>LocalVoice Admin Portal</strong> as a staff member.
      </p>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #f1f5f9;">
        <p style="margin: 0 0 12px 0; color: #334155; font-size: 15px;"><strong>Role:</strong> ${role.replace("_", " ")}</p>
        ${department ? `<p style="margin: 0; color: #334155; font-size: 15px;"><strong>Department:</strong> ${department}</p>` : ''}
      </div>

      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 32px;">
        Please review the details and choose to accept or decline this offer using the link below.
      </p>

      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${inviteLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 16px;">Review Invitation</a>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center;">
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">
          LocalVoice Admin Team
        </p>
      </div>
    </div>
  `;

  try {
    const info = await mailer.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "Invitation to LocalVoice Staff Portal",
      html,
    });
    console.log(`Staff invitation email sent successfully to ${email}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error("Error sending staff invitation email:", error);
    throw error;
  }
}

export async function sendRevokeEmail(email: string, role: string, department: string | null) {
  const mailer = getTransporter();
  if (!mailer) return;

  const html = `
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background-color: #fee2e2; border-radius: 50%; margin-bottom: 16px;">
          <span style="font-size: 24px;">❌</span>
        </div>
        <h2 style="color: #0f172a; margin: 0; font-size: 24px;">Invitation Revoked</h2>
      </div>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        We are writing to inform you that your invitation to join the <strong>LocalVoice Admin Portal</strong> as a ${role.replace("_", " ")} has been revoked and is no longer valid.
      </p>
      
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 32px;">
        If you believe this was a mistake, please reach out to the central administration team. Otherwise, no further action is required from you.
      </p>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center;">
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">
          LocalVoice Admin Team
        </p>
      </div>
    </div>
  `;

  try {
    const info = await mailer.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "Invitation Revoked - LocalVoice",
      html,
    });
    console.log(`Staff revocation email sent successfully to ${email}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error("Error sending staff revocation email:", error);
    // Don't throw here, just log, since the invite is already deleted in DB
  }
}
