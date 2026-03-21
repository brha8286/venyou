import { prisma } from "./prisma";
import nodemailer from "nodemailer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let twilioClient: any = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.log("[notifications] Twilio not configured, SMS will be skipped");
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const twilio = require("twilio");
    twilioClient = twilio(accountSid, authToken);
    return twilioClient;
  } catch (error) {
    console.error("[notifications] Failed to initialize Twilio client:", error);
    return null;
  }
}

function getMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.log("[notifications] SMTP not configured, emails will be skipped");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: port ? parseInt(port, 10) : 587,
    secure: port === "465",
    auth: { user, pass },
  });
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "venyou@subculture.audio",
        to,
        subject,
        html,
      }),
    });

    if (res.ok) {
      console.log(`[notifications] Email sent via Resend to ${to}: ${subject}`);
      return true;
    }

    const errorBody = await res.text();
    console.error(
      `[notifications] Resend API error (${res.status}):`,
      errorBody
    );
    return false;
  } catch (error) {
    console.error(`[notifications] Resend request failed:`, error);
    return false;
  }
}

async function sendViaSmtp(
  to: string,
  subject: string,
  body: string,
  html?: string
): Promise<boolean> {
  const transporter = getMailTransporter();
  if (!transporter) return false;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text: body,
      ...(html ? { html } : {}),
    });
    console.log(`[notifications] Email sent via SMTP to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error(`[notifications] SMTP send failed to ${to}:`, error);
    return false;
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  html?: string
): Promise<boolean> {
  // Try Resend first if HTML is provided and API key exists
  if (html && process.env.RESEND_API_KEY) {
    const resendResult = await sendViaResend(to, subject, html);
    if (resendResult) return true;
    console.log(`[notifications] Resend failed, falling back to SMTP for ${to}`);
  }

  // Fall back to SMTP
  const smtpResult = await sendViaSmtp(to, subject, body, html);
  if (smtpResult) return true;

  console.log(`[notifications] Would send email to ${to}: ${subject}`);
  return false;
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  const client = getTwilioClient();
  if (!client) {
    console.log(`[notifications] Would send SMS to ${to}: ${body}`);
    return false;
  }

  try {
    await (client as any).messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    console.log(`[notifications] SMS sent to ${to}`);
    return true;
  } catch (error) {
    console.error(`[notifications] Failed to send SMS to ${to}:`, error);
    return false;
  }
}

export async function sendPendingNotifications() {
  const now = new Date();

  const pendingNotifications = await prisma.taskNotification.findMany({
    where: {
      status: "pending",
      scheduledFor: { lte: now },
    },
    include: {
      task: {
        include: {
          event: true,
        },
      },
      user: true,
    },
  });

  console.log(
    `[notifications] Processing ${pendingNotifications.length} pending notifications`
  );

  for (const notification of pendingNotifications) {
    const { task, user } = notification;
    const subject = `[Subculture] ${notification.notificationType.replace("_", " ")}: ${task.name}`;
    const body = [
      `Task: ${task.name}`,
      `Event: ${task.event.title}`,
      `Due: ${task.dueDate.toLocaleDateString()}`,
      task.description ? `Details: ${task.description}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    let success = false;
    let errorMessage: string | null = null;

    try {
      if (notification.channel === "email" && user.emailEnabled) {
        success = await sendEmail(user.email, subject, body);
      } else if (
        notification.channel === "sms" &&
        user.smsEnabled &&
        user.phone
      ) {
        success = await sendSms(user.phone, body);
      } else {
        // Channel disabled or missing contact info, mark as sent to avoid retrying
        success = true;
      }
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : "Unknown error";
    }

    await prisma.taskNotification.update({
      where: { id: notification.id },
      data: {
        status: success ? "sent" : "failed",
        sentAt: success ? new Date() : undefined,
        errorMessage,
      },
    });
  }
}
