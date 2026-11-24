// 24.11.2026: разовая чистка чужих водяных знаков (решение Дмитрия 24.11 17:42).
// Только модераторы (право «moderate»). Ничего не удаляет.
// GET  ?offset=0&limit=12 — проверить одобренные объявления (по 2 первых фото, сортировка по дате создания),
//      ответ: { checked, next, total, found:[{id, building_name, price, source, reasons}] }. Статусы НЕ меняются.
// POST { action:"recheck_pending", limit:10 } — прогнать висящие pending (сначала старые) через автопроверку
//      с новыми правилами; чистые → approved + publishApproved (как кнопка «Опубликовать»), остальные остаются pending.
// POST { ids:[...] } — снять (status=rejected, обратимо кнопкой «Опубликовать») перечисленные объявления.
import { cookies } from "next/headers";
import { supa } from "@/lib/supabase";
import { verifySession, can } from "@/lib/session";
import { photoVerdict } from "@/lib/contentCheck";
import { moderationVerdict, publishApproved } from "@/lib/autoModeration";
import { revalidateListings } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function ok(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  return !!session && can(session, "moderate");
}

export async function GET(req) {
  if (!ok(req)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  const u = new URL(req.url);
  const offset = Math.max(0, parseInt(u.searchParams.get("offset") || "0", 10) || 0);
  const limit = Math.min(30, Math.max(1, parseInt(u.searchParams.get("limit") || "12", 10) || 12));
  const { data: rows, error, count } = await supa.from("listings")
    .select("id, building_name, price, source_url, photos", { count: "exact" })
    .eq("status", "approved").order("created_at", { ascending: true }).range(offset, offset + limit - 1);
  if (error) return Response.json({ ok: false, error: error.message });
  const found = [], errors = [];
  const list = rows || [];
  for (let i = 0; i < list.length; i += 4) {
    await Promise.all(list.slice(i, i + 4).map(async (r) => {
      const photos = (Array.isArray(r.photos) ? r.photos : []).filter(Boolean).slice(0, 2);
      if (!photos.length) return;
      const reasons = await photoVerdict(photos);
      if (reasons.includes("foreign_wm")) found.push({ id: r.id, building_name: r.building_name, price: r.price, source_url: r.source_url, reasons });
      else if (reasons.includes("ai_error")) errors.push(r.id);
    }));
  }
  return Response.json({ ok: true, checked: list.length, next: offset + list.length, total: count, found, errors });
}

export async function POST(req) {
  if (!ok(req)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  const body = await req.json().catch(() => ({}));
  if (body.action === "recheck_pending") {
    const lim = Math.min(15, Math.max(1, parseInt(body.limit, 10) || 10));
    const skip = (Array.isArray(body.skip) ? body.skip : []).map(String);
    let q = supa.from("listings").select("*").eq("status", "pending").order("created_at", { ascending: true }).limit(lim);
    if (skip.length) q = q.not("id", "in", `(${skip.join(",")})`);
    const { data: rows, error } = await q;
    if (error) return Response.json({ ok: false, error: error.message });
    const results = [];
    for (const row of rows || []) {
      let reasons = [], approve = false;
      try { const v = await moderationVerdict(row, row.id); reasons = v.reasons; approve = v.approve; } catch (e) { reasons = ["ai_error"]; }
      let decision = "pending";
      if (approve) {
        const { data: upd } = await supa.from("listings").update({ status: "approved" }).eq("id", row.id).eq("status", "pending").select("id");
        if (upd && upd.length) { decision = "published"; try { await publishApproved(row.id); } catch (e) { console.error("recheck publish:", e?.message); } }
      }
      results.push({ id: row.id, building_name: row.building_name, decision, reasons });
    }
    return Response.json({ ok: true, results });
  }
  const ids = (Array.isArray(body.ids) ? body.ids : []).map(String).slice(0, 500);
  if (!ids.length) return Response.json({ ok: false, error: "ids" }, { status: 400 });
  const { data, error } = await supa.from("listings").update({ status: "rejected" }).in("id", ids).eq("status", "approved").select("id");
  if (error) return Response.json({ ok: false, error: error.message });
  revalidateListings();
  return Response.json({ ok: true, unpublished: (data || []).length });
}
