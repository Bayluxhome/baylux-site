import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Сигнатуры форматов: JPEG, PNG, WebP. Всё остальное (SVG, HTML, PDF) — отказ.
function sniff(b) {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: "image/png", ext: "png" };
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "auth" }, { status: 401 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  const form = await req.formData();
  const f = form.get("photo");
  if (!f || typeof f.arrayBuffer !== "function") return Response.json({ ok: false });
  // Только растровые изображения и не больше 10 МБ. Тип определяем по СОДЕРЖИМОМУ (первые байты),
  // а не по Content-Type от клиента: иначе можно было залить SVG со скриптом под видом картинки,
  // и он отдавался бы с публичного CDN как image/svg+xml.
  if (typeof f.size === "number" && f.size > 10 * 1024 * 1024) return Response.json({ ok: false, error: "size" }, { status: 413 });
  const buf = Buffer.from(await f.arrayBuffer());
  if (buf.length > 10 * 1024 * 1024) return Response.json({ ok: false, error: "size" }, { status: 413 });
  const kind = sniff(buf);
  if (!kind) return Response.json({ ok: false, error: "type" }, { status: 415 });
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${kind.ext}`;
  const up = await supa.storage.from("listing-photos").upload(name, buf, { contentType: kind.mime });
  if (up.error) return Response.json({ ok: false });
  return Response.json({ ok: true, url: supa.storage.from("listing-photos").getPublicUrl(name).data.publicUrl });
}
