import { cookies } from "next/headers";
import { verifySession, can, isResponsible } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Публикация фотоотчёта по объекту. Доступно ответственному за объект или админу с правом managed.
export async function POST(req) {
  const s = verifySession(cookies().get("bx_session")?.value);
  if (!s) return Response.json({ ok: false, error: "auth" }, { status: 401 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false }); }

  // Принимаем только ссылки из нашего хранилища (загруженные через /api/upload-photo) — не произвольные URL.
  const photos = Array.isArray(b.photos)
    ? b.photos.filter((u) => typeof u === "string" && u.includes("/storage/v1/object/public/listing-photos/")).slice(0, 20)
    : [];
  const note = (b.note || "").toString().trim().slice(0, 1000);
  if (!b.listingId || (!photos.length && !note)) return Response.json({ ok: false, error: "empty" }, { status: 400 });

  const { data: r } = await supa.from("listings").select("id, managed_by_baylux, responsible_tg, responsible_email").eq("id", b.listingId).single();
  if (!r) return Response.json({ ok: false }, { status: 404 });

  const canManage = (can(s, "managed") || isResponsible(s, r)) && !!r.managed_by_baylux;
  if (!canManage) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });

  const author = s.email || s.username || (s.id != null ? String(s.id) : "");
  const { data: ins, error } = await supa.from("photo_reports").insert({ listing_id: String(r.id), photos, note: note || null, created_by: author }).select("id, created_at").single();
  if (error) return Response.json({ ok: false });
  return Response.json({ ok: true, id: ins.id, at: ins.created_at });
}
