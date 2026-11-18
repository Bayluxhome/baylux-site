// T-20261118-08: WebP из R2 → JPEG для Telegram (sendMediaGroup/sendPhoto по ссылке).
// Только наши ссылки R2 (R2_PUBLIC_URL) — не открытый прокси. Кэш CDN на год (фото по ключу не меняются).
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const R2_BASE = (process.env.R2_PUBLIC_URL || "").trim().replace(/\/+$/, "");

export async function GET(req) {
  const u = new URL(req.url).searchParams.get("u") || "";
  if (!R2_BASE || !u.startsWith(R2_BASE + "/") || u.includes("..")) return new Response("bad url", { status: 400 });
  try {
    const r = await fetch(u);
    if (!r.ok) return new Response("not found", { status: 404 });
    const buf = Buffer.from(await r.arrayBuffer());
    const jpg = await sharp(buf).rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    return new Response(jpg, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable" } });
  } catch (e) {
    console.error("photo-jpg:", e?.message);
    return new Response("error", { status: 502 });
  }
}
