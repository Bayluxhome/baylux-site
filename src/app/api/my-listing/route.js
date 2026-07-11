import { cookies } from "next/headers";
import { verifySession, owns } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "auth" }, { status: 401 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ ok: false }); }
  const { id, ids, action } = body || {};

  // Пакетное удаление: ids[] — удаляем только то, что принадлежит вошедшему пользователю.
  if (action === "delete" && Array.isArray(ids) && ids.length) {
    const list = ids.slice(0, 500);
    const { data: rows } = await supa.from("listings").select("id,tg_user_id,owner_email,photos").in("id", list);
    const owned = (rows || []).filter((r) => owns(session, r));
    const ownedIds = owned.map((r) => r.id);
    if (!ownedIds.length) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    try {
      const names = owned.flatMap((r) => (r.photos || []).map((u) => String(u).split("/listing-photos/")[1]).filter(Boolean));
      if (names.length) await supa.storage.from("listing-photos").remove(names);
    } catch (e) { /* ignore */ }
    await supa.from("listings").delete().in("id", ownedIds);
    return Response.json({ ok: true, deleted: ownedIds });
  }

  if (!id) return Response.json({ ok: false });

  // проверяем, что объявление принадлежит вошедшему пользователю
  const { data: row } = await supa.from("listings").select("id,tg_user_id,owner_email,photos").eq("id", id).single();
  if (!owns(session, row)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });

  if (action === "delete") {
    try {
      const names = (row.photos || []).map((u) => String(u).split("/listing-photos/")[1]).filter(Boolean);
      if (names.length) await supa.storage.from("listing-photos").remove(names);
    } catch (e) { /* ignore */ }
    await supa.from("listings").delete().eq("id", id);
  } else if (action === "unpublish") {
    await supa.from("listings").update({ status: "rejected" }).eq("id", id);
  } else if (action === "bump") {
    // «Поднять» — обновляем дату свежести: объявление снова висит 60 дней. Сбрасываем флаг уведомления.
    await supa.from("listings").update({ bumped_at: new Date().toISOString(), archive_notified: false }).eq("id", id);
  } else {
    return Response.json({ ok: false, error: "bad_action" });
  }
  return Response.json({ ok: true });
}
