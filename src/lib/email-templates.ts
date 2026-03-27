interface WeeklyTask {
  name: string;
  eventTitle: string;
  dueDate: string;
  status: string;
  phase: string;
}

interface DailyTask {
  name: string;
  eventTitle: string;
  dueDate: string;
  status: string;
  phase: string;
  eventId: string;
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

export function buildWeeklyDigestEmail(
  userName: string,
  tasks: WeeklyTask[],
  appUrl: string
): string {
  let body = "";

  if (tasks.length === 0) {
    body = `
      <tr><td style="padding:16px 24px;">
        <p style="margin:0;font-size:15px;color:${COLORS.textMuted};">You have no upcoming tasks this week.</p>
      </td></tr>`;
  } else {
    // Group tasks by event
    const grouped: Record<string, WeeklyTask[]> = {};
    for (const task of tasks) {
      if (!grouped[task.eventTitle]) grouped[task.eventTitle] = [];
      grouped[task.eventTitle].push(task);
    }

    let tableRows = "";
    for (const [eventTitle, eventTasks] of Object.entries(grouped)) {
      tableRows += `
        <tr><td colspan="3" style="padding:12px 0 4px 0;font-size:14px;font-weight:600;color:${COLORS.amber};border-bottom:1px solid ${COLORS.border};">
          ${esc(eventTitle)}
        </td></tr>`;
      for (const t of eventTasks) {
        const statusColor = t.status === "in_progress" ? COLORS.amber : COLORS.textMuted;
        tableRows += `
        <tr>
          <td style="padding:8px 8px 8px 12px;font-size:14px;color:${COLORS.text};">${esc(t.name)}</td>
          <td style="padding:8px;font-size:13px;color:${COLORS.textMuted};white-space:nowrap;">${esc(t.dueDate)}</td>
          <td style="padding:8px;font-size:13px;color:${statusColor};text-transform:capitalize;">${esc(t.status).replace("_", " ")}</td>
        </tr>`;
      }
    }

    body = `
      <tr><td style="padding:16px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.bgLight};border-radius:8px;overflow:hidden;">
          ${tableRows}
        </table>
      </td></tr>`;
  }

  const content = `
    <tr><td style="padding:24px;text-align:center;">
      <h1 style="margin:0;font-size:24px;font-weight:300;color:${COLORS.text};letter-spacing:2px;">venyou</h1>
      <p style="margin:4px 0 0;font-size:13px;color:${COLORS.amber};text-transform:uppercase;letter-spacing:1px;">Weekly Task Summary</p>
    </td></tr>
    <tr><td style="padding:0 24px;">
      <p style="margin:0;font-size:15px;color:${COLORS.text};">Hi ${esc(userName)},</p>
      <p style="margin:8px 0 0;font-size:14px;color:${COLORS.textMuted};">Here&rsquo;s your task summary for the upcoming week:</p>
    </td></tr>
    ${body}`;

  return baseWrapper(content, appUrl);
}

export function buildDailyReminderEmail(
  userName: string,
  tasks: DailyTask[],
  appUrl: string
): string {
  let taskList = "";
  for (const t of tasks) {
    taskList += `
      <tr><td style="padding:12px 16px;border-bottom:1px solid ${COLORS.border};">
        <a href="${appUrl}/events/${esc(t.eventId)}" style="font-size:15px;color:${COLORS.amber};text-decoration:none;font-weight:500;">${esc(t.name)}</a>
        <p style="margin:4px 0 0;font-size:13px;color:${COLORS.textMuted};">
          ${esc(t.eventTitle)} &middot; ${esc(t.phase)}
        </p>
      </td></tr>`;
  }

  const content = `
    <tr><td style="padding:24px;text-align:center;">
      <h1 style="margin:0;font-size:24px;font-weight:300;color:${COLORS.text};letter-spacing:2px;">venyou</h1>
      <p style="margin:4px 0 0;font-size:13px;color:${COLORS.amber};text-transform:uppercase;letter-spacing:1px;">Tomorrow&rsquo;s Tasks</p>
    </td></tr>
    <tr><td style="padding:0 24px;">
      <p style="margin:0;font-size:15px;color:${COLORS.text};">Hi ${esc(userName)},</p>
      <p style="margin:8px 0 0;font-size:14px;color:${COLORS.textMuted};">
        You have <strong style="color:${COLORS.amber};">${tasks.length}</strong> task${tasks.length === 1 ? "" : "s"} due tomorrow:
      </p>
    </td></tr>
    <tr><td style="padding:16px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.bgLight};border-radius:8px;overflow:hidden;">
        ${taskList}
      </table>
    </td></tr>`;

  return baseWrapper(content, appUrl);
}

export function buildDayOfEmail(
  userName: string,
  tasks: DailyTask[],
  appUrl: string
): string {
  let taskList = "";
  for (const t of tasks) {
    taskList += `
      <tr><td style="padding:12px 16px;border-bottom:1px solid ${COLORS.border};">
        <a href="${appUrl}/events/${esc(t.eventId)}" style="font-size:15px;color:${COLORS.amber};text-decoration:none;font-weight:500;">${esc(t.name)}</a>
        <p style="margin:4px 0 0;font-size:13px;color:${COLORS.textMuted};">
          ${esc(t.eventTitle)} &middot; ${esc(t.phase)}
        </p>
      </td></tr>`;
  }

  const content = `
    <tr><td style="padding:24px;text-align:center;">
      <h1 style="margin:0;font-size:24px;font-weight:300;color:${COLORS.text};letter-spacing:2px;">venyou</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#ef4444;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Today&rsquo;s Tasks</p>
    </td></tr>
    <tr><td style="padding:0 24px;">
      <p style="margin:0;font-size:15px;color:${COLORS.text};">Hi ${esc(userName)},</p>
      <p style="margin:8px 0 0;font-size:14px;color:${COLORS.textMuted};">
        You have <strong style="color:#ef4444;">${tasks.length}</strong> task${tasks.length === 1 ? "" : "s"} due <strong style="color:#ef4444;">today</strong>:
      </p>
    </td></tr>
    <tr><td style="padding:16px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.bgLight};border-radius:8px;overflow:hidden;">
        ${taskList}
      </table>
    </td></tr>`;

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
