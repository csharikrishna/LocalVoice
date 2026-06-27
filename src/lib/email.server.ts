import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn(
        "SMTP credentials are not fully set (SMTP_HOST, SMTP_USER, SMTP_PASS). Email notifications will be disabled.",
      );
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
const MAX_RETRIES = 3;

/**
 * Helper to send email with exponential backoff retry.
 */
async function sendWithRetry(mailOptions: nodemailer.SendMailOptions, attempt = 1): Promise<void> {
  const mailer = getTransporter();
  if (!mailer) return;

  try {
    const info = await mailer.sendMail(mailOptions);
    console.log(
      `[Email Success] Subject: "${mailOptions.subject}" | To: ${mailOptions.to || mailOptions.bcc} | ID: ${info.messageId}`,
    );
  } catch (error: any) {
    if (attempt < MAX_RETRIES) {
      const backoff = Math.pow(2, attempt) * 1000;
      console.warn(
        `[Email Retry] Attempt ${attempt} failed for subject "${mailOptions.subject}". Retrying in ${backoff}ms...`,
      );
      await new Promise((res) => setTimeout(res, backoff));
      return sendWithRetry(mailOptions, attempt + 1);
    } else {
      console.error(
        `[Email Error] Failed to send email after ${MAX_RETRIES} attempts. Subject: "${mailOptions.subject}"`,
        error,
      );
      throw error;
    }
  }
}

export async function sendResolutionEmail(
  emails: string[],
  complaintId: string,
  location: string,
  category: string,
) {
  if (!emails || emails.length === 0) return;

  const appUrl = process.env.VITE_APP_URL || "https://localvoice.app";
  const trackUrl = `${appUrl}/track?token=${complaintId}`;

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
    await sendWithRetry({
      from: FROM_EMAIL,
      to: [],
      bcc: emails,
      subject: "✅ Issue Resolved: " + category,
      html,
    });
  } catch (error) {
    // Already logged in sendWithRetry
  }
}

export async function sendSubmissionEmail(
  email: string,
  token: string,
  location: string,
  category: string,
  photoURL: string | null,
  attachmentBase64?: string,
) {
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

  await sendWithRetry({
    from: FROM_EMAIL,
    to: email,
    subject: "✅ Report Received: " + category,
    html,
    attachments,
  });
}

export async function sendStaffInvitationEmail(
  email: string,
  role: string,
  department: string | null,
  inviteLink: string,
) {
  const html = `
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background-color: #f1f5f9; border-radius: 50%; margin-bottom: 16px;">
          <span style="font-size: 24px;">🏢</span>
        </div>
        <h2 style="color: #0f172a; margin: 0; font-size: 24px;">Invitation to LocalVoice</h2>
      </div>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        Welcome! You have been invited to join the <strong>LocalVoice Admin Portal</strong> as a staff member.
      </p>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 16px;">Your Role Details</h3>
        <p style="margin: 0 0 12px 0; color: #334155; font-size: 15px;"><strong>Role:</strong> ${role.replace("_", " ")}</p>
        ${department ? `<p style="margin: 0; color: #334155; font-size: 15px;"><strong>Department:</strong> ${department}</p>` : ""}
      </div>

      <div style="margin-bottom: 32px;">
        <h3 style="color: #0f172a; font-size: 18px; margin-bottom: 16px;">Next Steps to Get Started:</h3>
        <ol style="color: #475569; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0;">
          <li style="margin-bottom: 8px;"><strong>Click the Invitation Link</strong> below to begin the onboarding process.</li>
          <li style="margin-bottom: 8px;"><strong>Create your account</strong> using this exact email address (${email}).</li>
          <li style="margin-bottom: 8px;"><strong>Set a secure password</strong> to protect your administrative access.</li>
          <li style="margin-bottom: 8px;"><strong>Complete your profile</strong> with any required information.</li>
          <li><strong>Log in</strong> to the platform to access your dashboard.</li>
        </ol>
      </div>

      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${inviteLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Accept Invitation & Get Started
        </a>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center;">
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">
          LocalVoice Admin Team
        </p>
      </div>
    </div>
  `;

  await sendWithRetry({
    from: FROM_EMAIL,
    to: email,
    subject: "Action Required: Your Invitation to LocalVoice Admin Portal",
    html,
  });
}

export async function sendRevokeEmail(
  email: string,
  role: string,
  department: string | null,
  reason: "mistake" | "revoked",
) {
  const isMistake = reason === "mistake";

  const title = isMistake ? "Invitation Sent by Mistake" : "Access Revoked";
  const icon = isMistake ? "⚠️" : "❌";
  const bgColor = isMistake ? "#fef3c7" : "#fee2e2";

  const messageBody = isMistake
    ? `We are writing to apologize and inform you that the recent invitation to join the <strong>LocalVoice Admin Portal</strong> as a ${role.replace("_", " ")} was sent in error.`
    : `We are writing to inform you that your invitation and access to the <strong>LocalVoice Admin Portal</strong> as a ${role.replace("_", " ")} has been permanently revoked.`;

  const nextSteps = isMistake
    ? `Please disregard the previous email. No further action is required from you, and no account has been created on your behalf. We apologize for any confusion this may have caused.`
    : `Your access link is no longer valid. If you believe this was done in error or you need further clarification, please reach out to your department supervisor or the central administration team.`;

  const html = `
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background-color: ${bgColor}; border-radius: 50%; margin-bottom: 16px;">
          <span style="font-size: 24px;">${icon}</span>
        </div>
        <h2 style="color: #0f172a; margin: 0; font-size: 24px;">${title}</h2>
      </div>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        ${messageBody}
      </p>
      
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
        <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
          ${nextSteps}
        </p>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center;">
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">
          LocalVoice Admin Team
        </p>
      </div>
    </div>
  `;

  try {
    await sendWithRetry({
      from: FROM_EMAIL,
      to: email,
      subject: title + " - LocalVoice",
      html,
    });
  } catch (error) {
    // Don't throw for revokes so admin operations don't fail, but it's logged.
  }
}

export async function sendSuspensionEmail(email: string, role: string, department: string | null) {
  const html = `
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background-color: #fef08a; border-radius: 50%; margin-bottom: 16px;">
          <span style="font-size: 24px;">🔒</span>
        </div>
        <h2 style="color: #0f172a; margin: 0; font-size: 24px;">Account Suspended</h2>
      </div>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        We are writing to notify you that your administrative access to the <strong>LocalVoice Admin Portal</strong> has been temporarily suspended.
      </p>
      
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 16px;">What does this mean?</h3>
        <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
          While your account is suspended, you will not be able to log in to the dashboard, manage complaints, or perform any administrative actions.
        </p>
      </div>

      <div style="margin-bottom: 32px;">
        <h3 style="color: #0f172a; font-size: 16px; margin-bottom: 12px;">Next Steps:</h3>
        <ul style="color: #475569; font-size: 15px; line-height: 1.6; padding-left: 20px; margin: 0;">
          <li style="margin-bottom: 8px;">Please contact the central dispatch or your department administrator for more details regarding this suspension.</li>
          <li>Once the issue is resolved, an administrator will need to manually reactivate your account before you can log in again.</li>
        </ul>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center;">
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">
          LocalVoice Admin Team
        </p>
      </div>
    </div>
  `;

  try {
    await sendWithRetry({
      from: FROM_EMAIL,
      to: email,
      subject: "Account Suspended - LocalVoice",
      html,
    });
  } catch (error) {
    // Don't throw for suspensions, just log
  }
}
