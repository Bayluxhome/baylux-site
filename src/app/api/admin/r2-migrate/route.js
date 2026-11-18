// Перенос старых фото объявлений из Supabase Storage в Cloudflare R2 (T-20261118-05, п.4).
// Только суперадмин (вход на сайте, cookie bx_session). Ключи R2 — только в переменных Vercel.
//
// GET  /api/admin/r2-migrate?limit=20           → сухой прогон: что будет перенесено, НИЧЕГО не пишет
// POST /api/admin/r2-migrate?live=1&limit=20    → перенос: до limit фото (целыми объявлениями, не больше 50)
// POST /api/admin/r2-migrate?rollback=<id|all>  → откат: вернуть старые ссылки (по журналу photo_migration)
//
// Как переносится одно объявление: каждое фото из bucket listing-photos скачивается, пережимается
// (toWebp: WebP 1280 px под PHOTO_TARGET_KB + превью _400.webp) и кладётся в R2 под ключом m/<id>/...;
// если хоть одно фото не удалось — объявление НЕ меняется. Затем строка в photo_migration
// (старые и новые ссылки), и только после неё обновляется listings.photos (и facade_photo).
// photo_hashes не трогаем: они по оригиналу, дедуп и сверка с парсером работают как раньше.
// Оригиналы в Supabase не удаляются.
import { cookies } from "next/headers";
import { verifySession, isSuperAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { r2Enabled } from "@/lib/photoStore";
import { revalidateListings } from "@/lib/cache";
import { pickListings, tableReady, migrateBatch } from "@/lib/r2Migrate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PHOTOS = 120;

async function auth() {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isSuperAdmin(session)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false, error: "not_configured" }, { status: 503 });
  return null;
}

export async function GET(req) {
  const denied = await auth(); if (denied) return denied;
  const sp = new URL(req.url).searchParams;
  const all = sp.get("all") === "1";
  // ?count=1 — сколько ВСЕГО осталось перенести (объявлений/фото), без записи
  if (sp.get("count") === "1") {
    const { list, photos } = await pickListings(1e9, all);
    return Response.json({ ok: true, dryRun: true, all, remaining: { listings: list.length, photos } });
  }
  const limit = Math.min(MAX_PHOTOS, Math.max(1, parseInt(sp.get("limit") || "20", 10) || 20));
  const { list, photos } = await pickListings(limit, all);
  const { count: migrated } = await supa.from("photo_migration").select("id", { head: true, count: "exact" }).eq("status", "done").then((x) => x, () => ({ count: null }));
  return Response.json({
    ok: true, dryRun: true, r2: r2Enabled(), table: await tableReady(), migratedListings: migrated ?? null,
    willMove: { listings: list.length, photos }, sample: list.map((r) => ({ id: r.id, name: r.building_name, photos: r.n })),
  });
}

export async function POST(req) {
  const denied = await auth(); if (denied) return denied;
  const sp = new URL(req.url).searchParams;
  if (!(await tableReady())) return Response.json({ ok: false, error: "no_table", hint: "Выполнить sql/036_photo_migration.sql" }, { status: 409 });

  // ── откат ──
  const rb = sp.get("rollback");
  if (rb) {
    let q = supa.from("photo_migration").select("*").eq("status", "done");
    if (rb !== "all") q = q.eq("id", rb);
    const { data: rows, error } = await q.order("id", { ascending: false }).limit(500);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    const done = [], skipped = [];
    for (const m of rows || []) {
      const { data: cur } = await supa.from("listings").select("photos, facade_photo").eq("id", m.listing_id).maybeSingle();
      // Возвращаем, только если ссылки не меняли после переноса (иначе затрём правку владельца).
      if (!cur || JSON.stringify(cur.photos || []) !== JSON.stringify(m.new_photos || [])) { skipped.push(m.listing_id); continue; }
      const upd = { photos: m.old_photos };
      if (m.new_facade && cur.facade_photo === m.new_facade) upd.facade_photo = m.old_facade;
      const { error: e2 } = await supa.from("listings").update(upd).eq("id", m.listing_id);
      if (e2) { skipped.push(m.listing_id); continue; }
      await supa.from("photo_migration").update({ status: "rolled_back", rolled_back_at: new Date().toISOString() }).eq("id", m.id);
      done.push(m.listing_id);
    }
    if (done.length) revalidateListings();
    return Response.json({ ok: true, rolledBack: done, skipped });
  }

  // ── перенос ──
  if (sp.get("live") !== "1") return Response.json({ ok: false, error: "need_live", hint: "POST ?live=1&limit=20" }, { status: 400 });
  if (!r2Enabled()) return Response.json({ ok: false, error: "r2_not_configured", hint: "R2_* в Vercel + Redeploy" }, { status: 409 });
  const limit = Math.min(MAX_PHOTOS, Math.max(1, parseInt(sp.get("limit") || "20", 10) || 20));
  const j = await migrateBatch({ limit, all: sp.get("all") === "1", budgetMs: 45000, par: 5 });
  if (j.moved) revalidateListings();
  return Response.json({ ok: true, ...j });
}
