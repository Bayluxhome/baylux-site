// T-20261118-08: фото для Telegram. Фото в R2 хранятся в WebP — Telegram по ссылке надёжно принимает
// как «фото» только JPEG/PNG, поэтому R2/WebP-ссылки для бота отдаём через /api/photo-jpg (JPEG на лету).
// Ссылки Supabase (JPEG) и прочие — без изменений.
import { SITE_URL } from "@/config";

const R2_BASE = (process.env.R2_PUBLIC_URL || "").trim().replace(/\/+$/, "");

export function tgPhotoUrl(u) {
  if (typeof u !== "string" || !u) return u;
  const isR2 = (R2_BASE && u.startsWith(R2_BASE + "/")) || /\.webp(\?|$)/i.test(u);
  return isR2 ? `${SITE_URL}/api/photo-jpg?u=${encodeURIComponent(u)}` : u;
}
