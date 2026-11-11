// 11.11: передача голосовых из браузера агенту в облако (задачи по расписанию не видят папки ноутбука).
//   POST multipart {audio: File}   → {ok, url, path}  (временный файл в storage)
//   DELETE ?path=agent-audio/…      → удалить сразу после расшифровки (персданные: не храним)
// Доступ: только админ-сессия сайта.
import { cookies } from "next/headers";
import { verifySession, isAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const BUCKET = "listing-photos";

function guard() {
  return isAdmin(verifySession(cookies().get("bx_session")?.value));
}

export async function POST(req) {
  if (!guard()) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  const form = await req.formData();
  const f = form.get("audio");
  if (!f || typeof f.arrayBuffer !== "function") return Response.json({ ok: false, error: "no_file" }, { status: 400 });
  const buf = Buffer.from(await f.arrayBuffer());
  if (buf.length > 15 * 1024 * 1024) return Response.json({ ok: false, error: "size" }, { status: 413 });
  const ct = (f.type || "audio/ogg").split(";")[0];
  if (!/^(audio|video)\//.test(ct) && ct !== "application/octet-stream") return Response.json({ ok: false, error: "type" }, { status: 415 });
  const ext = /mp4|m4a|aac/.test(ct) ? "m4a" : /mpeg|mp3/.test(ct) ? "mp3" : /webm/.test(ct) ? "webm" : "ogg";
  const path = `agent-audio/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const up = await supa.storage.from(BUCKET).upload(path, buf, { contentType: ct });
  if (up.error) return Response.json({ ok: false, error: up.error.message });
  return Response.json({ ok: true, path, url: supa.storage.from(BUCKET).getPublicUrl(path).data.publicUrl });
}

export async function DELETE(req) {
  if (!guard()) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  const path = new URL(req.url).searchParams.get("path") || "";
  if (!/^agent-audio\/[\w.-]+$/.test(path)) return Response.json({ ok: false, error: "path" }, { status: 400 });
  const { error } = await supa.storage.from(BUCKET).remove([path]);
  return Response.json({ ok: !error, error: error?.message });
}
