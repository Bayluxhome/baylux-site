import { cookies } from "next/headers";
import { verifySession, can } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { revalidateListings } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Удаление/одобрение любого объявления (модерация площадки).
// Право — конкретное «Модерация объявлений», а не «любой сотрудник»: раньше isAdmin()
// пропускал всех, у кого есть хоть одна галочка, и сотрудник с правом «Новости»
// мог удалить любое объявление напрямую через API (интерфейс кнопку прятал, сервер — нет).
export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!can(session, "moderate")) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ ok: false }); }
  const { id, action } = body || {};
  if (!id) return Response.json({ ok: false });

  const { data: row } = await supa.from("listings").select("id,photos").eq("id", id).single();
  if (!row) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

  if (action === "approve") {
    // Публикация админом: объект становится виден на сайте (source.js показывает approved).
    // Постинг в Telegram-канал здесь НЕ делаем (это отдельный поток бота).
    await supa.from("listings").update({ status: "approved" }).eq("id", id);
  } else if (action === "unpublish") {
    await supa.from("listings").update({ status: "rejected" }).eq("id", id);
  } else {
    // удаление с очисткой фото из storage
    try {
      const names = (row.photos || []).map((u) => String(u).split("/listing-photos/")[1]).filter(Boolean);
      if (names.length) await supa.storage.from("listing-photos").remove(names);
    } catch (e) { /* ignore */ }
    await supa.from("listings").delete().eq("id", id);
  }
  revalidateListings();
  return Response.json({ ok: true });
}
