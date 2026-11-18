import crypto from "crypto";
import sharp from "sharp";
import { supa } from "@/lib/supabase";

// Хранилище фото объявлений (T-20261118-05).
// Если в окружении заданы ВСЕ переменные R2_* — фото пережимаются в WebP и кладутся в Cloudflare R2
// (+ превью 400 px с суффиксом _400.webp). Если хоть одной нет — работает как раньше:
// исходный файл как есть в Supabase Storage (bucket listing-photos).
// SHA-256 для дедупа здесь НЕ считаем: его считают клиент и парсер по ОРИГИНАЛУ до сжатия
// (photo_hashes сверяются с файлами парсера) — сжатие на сервере дедуп не ломает.
//
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL (https://photos.bayluxhome.com)
//   PHOTO_MAX_DIM  — длинная сторона, по умолчанию 1280
//   PHOTO_TARGET_KB — цель по весу, по умолчанию 100 (качество подбирается от 82 вниз до 50)
//   PHOTO_THUMB    — off, чтобы не делать превью 400 px

const env = (k) => (process.env[k] || "").trim();

export function r2Enabled() {
  return ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"].every((k) => env(k));
}

export function r2PublicBase() {
  return env("R2_PUBLIC_URL").replace(/\/+$/, "");
}

// Наш ли это URL фото (Supabase или R2) — для фильтров вроде photo-report.
export function isOurPhotoUrl(u) {
  if (typeof u !== "string") return false;
  if (u.includes("/storage/v1/object/public/listing-photos/")) return true;
  const base = r2PublicBase();
  return !!base && u.startsWith(base + "/");
}

const sha256hex = (d) => crypto.createHash("sha256").update(d).digest("hex");
const hmac = (k, d) => crypto.createHmac("sha256", k).update(d).digest();
const encKey = (key) => key.split("/").map((s) => encodeURIComponent(s)).join("/");

// Временные сбои R2/сети (5xx, 429, обрыв) — повторяем; 4xx (ключи/подпись) — сразу ошибка.
export const isTransientErr = (e) => /^(r2|download) (5\d\d|429|408)\b|fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket|network|aborted|timeout/i.test(String(e?.message || e));

// PUT в R2 с повторами (T-20261118-09: перенос встал на трёх «r2 500 InternalError» подряд).
export async function r2Put(key, body, contentType) {
  let last;
  for (let a = 0; a < 4; a++) {
    if (a) await new Promise((r) => setTimeout(r, 600 * 3 ** (a - 1))); // 0,6 / 1,8 / 5,4 с
    try { return await r2PutOnce(key, body, contentType, new Date()); } catch (e) { last = e; if (!isTransientErr(e)) throw e; }
  }
  throw last;
}

// PUT объекта в R2 через S3 API с подписью AWS SigV4 (без внешних зависимостей).
async function r2PutOnce(key, body, contentType, now = new Date()) {
  const host = `${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`;
  const path = `/${encodeURIComponent(env("R2_BUCKET"))}/${encKey(key)}`;
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const day = amzDate.slice(0, 8);
  const payloadHash = sha256hex(body);
  const headers = {
    "cache-control": "public, max-age=31536000, immutable",
    "content-type": contentType,
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  const names = Object.keys(headers).sort();
  const canonical = ["PUT", path, "", names.map((n) => `${n}:${headers[n]}\n`).join(""), names.join(";"), payloadHash].join("\n");
  const scope = `${day}/auto/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256hex(canonical)].join("\n");
  const kSign = hmac(hmac(hmac(hmac("AWS4" + env("R2_SECRET_ACCESS_KEY"), day), "auto"), "s3"), "aws4_request");
  const sig = crypto.createHmac("sha256", kSign).update(toSign).digest("hex");
  const auth = `AWS4-HMAC-SHA256 Credential=${env("R2_ACCESS_KEY_ID")}/${scope}, SignedHeaders=${names.join(";")}, Signature=${sig}`;
  const { host: _h, ...send } = headers;
  const res = await fetch(`https://${host}${path}`, { method: "PUT", headers: { ...send, authorization: auth }, body });
  if (!res.ok) throw new Error(`r2 ${res.status} ${(await res.text()).slice(0, 200)}`);
  return `${r2PublicBase()}/${encKey(key)}`;
}

// Пережать в WebP: длинная сторона maxDim, качество подбираем под targetKB.
export async function toWebp(input, { maxDim = Number(env("PHOTO_MAX_DIM")) || 1280, targetKB = Number(env("PHOTO_TARGET_KB")) || 100 } = {}) {
  const base = await sharp(input).rotate().resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true }).toBuffer();
  let q = 82, out;
  do {
    out = await sharp(base).webp({ quality: q, effort: 4 }).toBuffer();
    q -= 8;
  } while (out.length > targetKB * 1024 && q >= 50);
  const thumb = env("PHOTO_THUMB") === "off" ? null
    : await sharp(base).resize({ width: 400, height: 400, fit: "inside", withoutEnlargement: true }).webp({ quality: 70 }).toBuffer();
  return { full: out, thumb };
}

// Сохранить фото. buf — уже проверенный растровый файл (JPEG/PNG/WebP), kind — {mime, ext}.
// Возвращает { url, thumb? } или null.
export async function storePhoto(buf, kind) {
  const stem = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (r2Enabled()) {
    try {
      const { full, thumb } = await toWebp(buf);
      const url = await r2Put(`${stem}.webp`, full, "image/webp");
      let thumbUrl = null;
      if (thumb) { try { thumbUrl = await r2Put(`${stem}_400.webp`, thumb, "image/webp"); } catch (e) { console.error("r2 thumb:", e?.message); } }
      return { url, thumb: thumbUrl };
    } catch (e) {
      console.error("r2 upload, fallback to supabase:", e?.message); // не теряем фото — падаем в старый путь
    }
  }
  if (!supa) return null;
  const name = `${stem}.${kind.ext}`;
  const up = await supa.storage.from("listing-photos").upload(name, buf, { contentType: kind.mime });
  if (up.error) return null;
  return { url: supa.storage.from("listing-photos").getPublicUrl(name).data.publicUrl };
}
