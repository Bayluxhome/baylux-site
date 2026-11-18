// T-20261118-09 п.3: бэкап оригиналов Supabase Storage (все bucket'ы) в R2 под backup/2026-11-18/<bucket>/<путь>.
// Vercel Cron каждые 5 мин (vercel.json), до ~200 с за запуск; байты как есть. Состояние/итог — photo_migration
// listing_id='__backup__' (status backup → backup_done; old_photos: файлов, байт, по bucket'ам, ошибки).
// Ничего в Supabase не удаляет и не меняет. Выключатель: STORAGE_BACKUP_CRON=off.
import { cookies } from "next/headers";
import { supa } from "@/lib/supabase";
import { verifySession, isSuperAdmin } from "@/lib/session";
import { r2Enabled } from "@/lib/photoStore";
import { tableReady, backupBatch } from "@/lib/r2Migrate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && (req.headers.get("authorization") || "") === `Bearer ${secret}`) return true;
  return isSuperAdmin(verifySession(cookies().get("bx_session")?.value));
}

export async function GET(req) {
  if (!authorized(req)) return new Response("forbidden", { status: 403 });
  if ((process.env.STORAGE_BACKUP_CRON || "on").toLowerCase() === "off") return Response.json({ ok: true, skipped: "off" });
  if (!supa || !r2Enabled()) return Response.json({ ok: false, skipped: "not_configured" });
  if (!(await tableReady())) return Response.json({ ok: false, skipped: "no_table" });
  const budget = Math.min(200000, Math.max(5000, parseInt(new URL(req.url).searchParams.get("budget") || "200000", 10) || 200000));
  try {
    const r = await backupBatch({ budgetMs: budget });
    const s = r.state || {};
    return Response.json({ ok: true, done: r.done, did: r.did || 0, ms: r.ms, files: s.files, mb: Math.round((s.bytes || 0) / 1048576), buckets: s.buckets, errors: (s.errors || []).length });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
