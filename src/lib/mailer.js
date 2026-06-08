import nodemailer from "nodemailer";

// Транзакционная почта. Приоритет — Resend (отправка с домена bayluxhome.com, лучше доходит).
// Если ключа Resend нет — фолбэк на SMTP (старый вариант).
const RESEND_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || "Baylux <noreply@bayluxhome.com>";
const REPLY_TO = process.env.MAIL_REPLY_TO || "bayluxhome@gmail.com";

const HOST = process.env.SMTP_HOST;
const PORT = Number(process.env.SMTP_PORT || 587);
const USER = process.env.SMTP_USER;
const PASS = process.env.SMTP_PASS;
const FROM = process.env.SMTP_FROM || USER;

let transporter = null;
function getTransporter() {
  if (!HOST || !USER || !PASS) return null;
  if (!transporter) transporter = nodemailer.createTransport({ host: HOST, port: PORT, secure: PORT === 465, auth: { user: USER, pass: PASS } });
  return transporter;
}

export function mailerReady() {
  return !!RESEND_KEY || !!(HOST && USER && PASS);
}

async function sendViaResend({ to, subject, text, html }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, text, html, reply_to: REPLY_TO }),
  });
  if (!r.ok) throw new Error("resend_failed:" + r.status + ":" + (await r.text()).slice(0, 200));
}

export async function sendMagicLink(to, url, lang) {
  const subj = lang === "ka" ? "Baylux — შესვლის ბმული" : lang === "en" ? "Baylux — your login link" : "Baylux — ссылка для входа";
  const line = lang === "ka" ? "დააჭირეთ ბმულს შესასვლელად (მოქმედებს 30 წუთი):"
    : lang === "en" ? "Click the link to log in (valid for 30 minutes):"
    : "Нажмите на ссылку, чтобы войти (действует 30 минут):";
  const text = `${line}\n${url}`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1b2a3a"><p>${line}</p><p><a href="${url}" style="display:inline-block;background:#C9A961;color:#01274B;font-weight:700;text-decoration:none;padding:11px 20px;border-radius:10px">Baylux — войти / log in</a></p><p style="color:#7a8aa0;font-size:12px">${url}</p></div>`;

  if (RESEND_KEY) {
    await sendViaResend({ to, subject: subj, text, html });
    return;
  }
  const tr = getTransporter();
  if (!tr) throw new Error("mailer_not_configured");
  await tr.sendMail({ from: FROM, to, subject: subj, text, html, replyTo: REPLY_TO });
}
