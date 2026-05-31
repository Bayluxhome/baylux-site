import { randomUUID } from "crypto";
import { supa } from "@/lib/supabase";
import { sendMagicLink, mailerReady } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = "https://baylux-site.vercel.app";

export async function POST(req) {
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  if (!mailerReady()) return Response.json({ ok: false, error: "mail_off" }, { status: 503 });
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false }); }
  const email = String(b.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ ok: false, error: "email" }, { status: 400 });
  const lang = ["ru", "en", "ka"].includes(b.lang) ? b.lang : "ru";
  const token = randomUUID().replace(/-/g, "");
  const { error } = await supa.from("login_tokens").insert({ token, email });
  if (error) return Response.json({ ok: false }, { status: 500 });
  try {
    await sendMagicLink(email, `${SITE}/api/email-login-verify?token=${token}`, lang);
  } catch (e) {
    console.error("magic link send:", e?.message);
    return Response.json({ ok: false, error: "send" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
