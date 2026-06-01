import { cookies } from "next/headers";
import { verifySession, isAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Создание / обновление новости (только админ).
export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isAdmin(session)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });

  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false }); }

  const row = {
    title_ru: (b.title_ru || "").toString().trim() || null,
    title_en: (b.title_en || "").toString().trim() || null,
    title_ka: (b.title_ka || "").toString().trim() || null,
    body_ru: (b.body_ru || "").toString() || null,
    body_en: (b.body_en || "").toString() || null,
    body_ka: (b.body_ka || "").toString() || null,
    image: (b.image || "").toString() || null,
    published: b.published !== false,
  };
  if (!row.title_ru && !row.title_en && !row.title_ka) return Response.json({ ok: false, error: "title" }, { status: 400 });

  if (b.id) await supa.from("news").update(row).eq("id", b.id);
  else await supa.from("news").insert(row);
  return Response.json({ ok: true });
}

// Удаление новости (только админ).
export async function DELETE(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isAdmin(session)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false }); }
  if (!b.id) return Response.json({ ok: false });
  await supa.from("news").delete().eq("id", b.id);
  return Response.json({ ok: true });
}
