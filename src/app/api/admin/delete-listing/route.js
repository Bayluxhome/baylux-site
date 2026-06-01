import { cookies } from "next/headers";
import { verifySession, isAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Удаление любого объявления администратором (модерация площадки).
export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isAdmin(session)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ ok: false }); }
  const { id, action } = body || {};
  if (!id) return Response.json({ ok: false });

  const { data: row } = await supa.from("listings").select("id,photos").eq("id", id).single();
  if (!row) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

  if (action === "unpublish") {
    await supa.from("listings").update({ status: "rejected" }).eq("id", id);
  } else {
    // удаление с очисткой фото из storage
    try {
      const names = (row.photos || []).map((u) => String(u).split("/listing-photos/")[1]).filter(Boolean);
      if (names.length) await supa.storage.from("listing-photos").remove(names);
    } catch (e) { /* ignore */ }
    await supa.from("listings").delete().eq("id", id);
  }
  return Response.json({ ok: true });
}
