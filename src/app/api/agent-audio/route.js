// 11.11: передача голосовых из браузера агенту в облако (задачи по расписанию не видят папки ноутбука).
//   GET  ?token=1 (админ-сессия)        → {ok, token} — одноразовый пропуск на 15 минут для вкладок Telegram/WhatsApp Web
//   POST multipart {audio: File}         → {ok, url, path}; доступ: админ-сессия ИЛИ заголовок x-agent-token
//   DELETE ?path=agent-audio/…           → удалить сразу после расшифровки (персданные: не храним)
// CORS разрешён только для web.telegram.org и web.whatsapp.com (оттуда агент берёт голосовое).
import crypto from "crypto";
import { cookies } from "next/headers";
import { verifySession, isAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const BUCKET = "listing-photos";
const ORIGINS = ["https://web.telegram.org", "https://web.whatsapp.com"];
const TTL_MS = 15 * 60 * 1000;

function key() {
  return crypto.createHash("sha256").update("agent-audio:" + (process.env.TELEGRAM_BOT_TOKEN || "")).digest();
}
function makeToken() {
  const exp = String(Date.now() + TTL_MS);
  return exp + "." + crypto.createHmac("sha256", key()).update(exp).digest("hex");
}
function tokenOk(t) {
  if (!t || !process.env.TELEGRAM_BOT_TOKEN) return false;
  const [exp, sig] = String(t).split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = crypto.createHmac("sha256", key()).update(exp).digest("hex");
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
}
function cors(req) {
  const o = req.headers.get("origin") || "";
  return ORIGINS.includes(o)
    ? { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS", "Access-Control-Allow-Headers": "x-agent-token", "Vary": "Origin" }
    : {};
}
function sessionOk() {
  return isAdmin(verifySession(cookies().get("bx_session")?.value));
}
const json = (req, body, status = 200) => Response.json(body, { status, headers: cors(req) });

export async function OPTIONS(req) {
  return new Response(null, { status: 204, headers: cors(req) });
}

export async function GET(req) {
  if (!sessionOk()) return json(req, { ok: false, error: "forbidden" }, 403);
  return json(req, { ok: true, token: makeToken() });
}

export async function POST(req) {
  if (!sessionOk() && !tokenOk(req.headers.get("x-agent-token"))) return json(req, { ok: false, error: "forbidden" }, 403);
  if (!supa) return json(req, { ok: false }, 500);
  const form = await req.formData();
  const f = form.get("audio");
  if (!f || typeof f.arrayBuffer !== "function") return json(req, { ok: false, error: "no_file" }, 400);
  const buf = Buffer.from(await f.arrayBuffer());
  if (buf.length > 15 * 1024 * 1024) return json(req, { ok: false, error: "size" }, 413);
  const ct = (f.type || "audio/ogg").split(";")[0];
  if (!/^(audio|video)\//.test(ct) && ct !== "application/octet-stream") return json(req, { ok: false, error: "type" }, 415);
  const ext = /mp4|m4a|aac/.test(ct) ? "m4a" : /mpeg|mp3/.test(ct) ? "mp3" : /webm/.test(ct) ? "webm" : "ogg";
  const path = `agent-audio/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const up = await supa.storage.from(BUCKET).upload(path, buf, { contentType: ct });
  if (up.error) return json(req, { ok: false, error: up.error.message });
  return json(req, { ok: true, path, url: supa.storage.from(BUCKET).getPublicUrl(path).data.publicUrl });
}

export async function DELETE(req) {
  if (!sessionOk() && !tokenOk(req.headers.get("x-agent-token"))) return json(req, { ok: false, error: "forbidden" }, 403);
  const path = new URL(req.url).searchParams.get("path") || "";
  if (!/^agent-audio\/[\w.-]+$/.test(path)) return json(req, { ok: false, error: "path" }, 400);
  const { error } = await supa.storage.from(BUCKET).remove([path]);
  return json(req, { ok: !error, error: error?.message });
}
