export interface SummaryTask {
  name: string;
  eventTitle: string;
  dueDate: string;
  status: string;
  phase: string;
  eventId: string;
  daysOverdue?: number;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const COLORS = {
  bg: "#18181b",
  bgLight: "#27272a",
  text: "#f4f4f5",
  textMuted: "#a1a1aa",
  amber: "#f59e0b",
  amberDark: "#d97706",
  border: "#3f3f46",
};

function baseWrapper(content: string, appUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.bg};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        ${content}
        <tr><td style="padding:24px 0;text-align:center;border-top:1px solid ${COLORS.border};">
          <p style="margin:0;font-size:13px;color:${COLORS.textMuted};">
            &mdash; <a href="${appUrl}" style="color:${COLORS.amber};text-decoration:none;">venyou</a> by (SCA)
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const RED = "#ef4444";

function renderTaskRow(t: SummaryTask, appUrl: string, accentColor: string): string {
  const overdueSuffix =
    typeof t.daysOverdue === "number" && t.daysOverdue > 0
      ? ` &middot; <span style="color:${RED};font-weight:600;">${t.daysOverdue}d overdue</span>`
      : "";
  return `
      <tr><td style="padding:12px 16px;border-bottom:1px solid ${COLORS.border};">
        <a href="${appUrl}/events/${esc(t.eventId)}" style="font-size:15px;color:${accentColor};text-decoration:none;font-weight:500;">${esc(t.name)}</a>
        <p style="margin:4px 0 0;font-size:13px;color:${COLORS.textMuted};">
          ${esc(t.eventTitle)} &middot; ${esc(t.dueDate)}${overdueSuffix}
        </p>
      </td></tr>`;
}

function renderSection(
  title: string,
  accentColor: string,
  tasks: SummaryTask[],
  appUrl: string
): string {
  if (tasks.length === 0) return "";
  const rows = tasks.map((t) => renderTaskRow(t, appUrl, accentColor)).join("");
  return `
    <tr><td style="padding:8px 24px 4px;">
      <p style="margin:16px 0 8px;font-size:12px;color:${accentColor};text-transform:uppercase;letter-spacing:1px;font-weight:600;">
        ${esc(title)} (${tasks.length})
      </p>
    </td></tr>
    <tr><td style="padding:0 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.bgLight};border-radius:8px;overflow:hidden;">
        ${rows}
      </table>
    </td></tr>`;
}

export function buildDailySummaryEmail(
  userName: string,
  pastDue: SummaryTask[],
  upcoming: SummaryTask[],
  appUrl: string
): string {
  const total = pastDue.length + upcoming.length;
  const headline =
    pastDue.length > 0
      ? `<strong style="color:${RED};">${pastDue.length}</strong> past due &middot; <strong style="color:${COLORS.amber};">${upcoming.length}</strong> upcoming`
      : `<strong style="color:${COLORS.amber};">${upcoming.length}</strong> task${upcoming.length === 1 ? "" : "s"} coming up`;

  const content = `
    <tr><td style="padding:24px;text-align:center;">
      <h1 style="margin:0;font-size:24px;font-weight:300;color:${COLORS.text};letter-spacing:2px;">venyou</h1>
      <p style="margin:4px 0 0;font-size:13px;color:${COLORS.amber};text-transform:uppercase;letter-spacing:1px;">Daily Task Summary</p>
    </td></tr>
    <tr><td style="padding:0 24px;">
      <p style="margin:0;font-size:15px;color:${COLORS.text};">Hi ${esc(userName)},</p>
      <p style="margin:8px 0 0;font-size:14px;color:${COLORS.textMuted};">
        ${total === 0 ? "You&rsquo;re all caught up." : headline}
      </p>
    </td></tr>
    ${renderSection("Past due", RED, pastDue, appUrl)}
    ${renderSection("Upcoming (next 7 days)", COLORS.amber, upcoming, appUrl)}`;

  return baseWrapper(content, appUrl);
}

export function buildMentionEmail(
  recipientName: string,
  authorName: string,
  taskName: string,
  eventTitle: string,
  eventId: string,
  taskId: string,
  commentBody: string,
  appUrl: string
): string {
  const content = `
    <tr><td style="padding:24px;text-align:center;">
      <h1 style="margin:0;font-size:24px;font-weight:300;color:${COLORS.text};letter-spacing:2px;">venyou</h1>
      <p style="margin:4px 0 0;font-size:13px;color:${COLORS.amber};text-transform:uppercase;letter-spacing:1px;font-weight:600;">You were mentioned</p>
    </td></tr>
    <tr><td style="padding:0 24px;">
      <p style="margin:0;font-size:15px;color:${COLORS.text};">Hi ${esc(recipientName)},</p>
      <p style="margin:8px 0 0;font-size:14px;color:${COLORS.textMuted};">
        <strong style="color:${COLORS.text};">${esc(authorName)}</strong> mentioned you on
        <strong style="color:${COLORS.text};">${esc(taskName)}</strong> &mdash; ${esc(eventTitle)}:
      </p>
    </td></tr>
    <tr><td style="padding:16px 24px;">
      <div style="background-color:${COLORS.bgLight};border-left:3px solid ${COLORS.amber};border-radius:4px;padding:12px 16px;">
        <p style="margin:0;font-size:14px;color:${COLORS.text};white-space:pre-wrap;">${esc(commentBody)}</p>
      </div>
    </td></tr>
    <tr><td style="padding:0 24px 24px;">
      <a href="${appUrl}/events/${esc(eventId)}#task-${esc(taskId)}" style="display:inline-block;padding:10px 20px;background-color:${COLORS.amber};color:#18181b;font-weight:600;font-size:14px;text-decoration:none;border-radius:6px;">
        View Task
      </a>
    </td></tr>`;

  return baseWrapper(content, appUrl);
}
