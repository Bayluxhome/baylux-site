// Счётчик просмотров объявления. Пишется агрегатом по дням (см. sql/017_leads_views.sql),
// поэтому таблица остаётся компактной, а в кабинете строится график за 30 дней.
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!supa) return Response.json({ ok: true, counted: false });
  let id = "";
  try {
    const b = await req.json();
    id = (b && b.id ? String(b.id) : "").slice(0, 100);
  } catch { return Response.json({ ok: false }, { status: 400 }); }
  if (!id) return Response.json({ ok: false }, { status: 400 });

  try {
    await supa.rpc("bump_listing_view", { p_listing: id });
    return Response.json({ ok: true, counted: true });
  } catch (e) {
    console.error("view count failed:", e.message);
    return Response.json({ ok: true, counted: false }); // счётчик не должен ломать страницу
  }
}
