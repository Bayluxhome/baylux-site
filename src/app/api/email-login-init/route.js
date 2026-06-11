import { randomUUID } from "crypto";
import { supa } from "@/lib/supabase";
import { sendMagicLink, mailerReady } from "@/lib/mailer";
import { DOC_VERSION } from "@/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = "https://bayluxhome.com";

export async function POST(req) {
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  if (!mailerReady()) return Response.json({ ok: false, error: "mail_off" }, { status: 503 });
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false }); }
  const email = String(b.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ ok: false, error: "email" }, { status: 400 });
  const lang = ["ru", "en", "ka"].includes(b.lang) ? b.lang : "ru";
  // Фиксируем согласие (явное, при запросе входа): обработка ПД + опционально маркетинг
  try {
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
    const consents = [{ email, consent_type: "privacy", doc_version: DOC_VERSION, ip }];
    if (b.marketing) consents.push({ email, consent_type: "marketing", doc_version: DOC_VERSION, ip });
    await supa.from("user_consents").insert(consents);
  } catch (e) { console.error("consent log:", e?.message); }

  const token = randomUUID().replace(/-/g, "");
  const { error } = await supa.from("login_tokens").insert({ token, email });
  if (error) return Response.json({ ok: false }, { status: 500 });
  try {
    await sendMagicLink(email, `${SITE}/api/email-login-verify?token=${token}`, lang);
  } catch (e) {
    console.error("magic link send:", e?.message);
    return Response.json({ ok: false, error: "send", detail: (e?.message || "").slice(0, 300) }, { status: 500 });
  }
  return Response.json({ ok: true });
}
