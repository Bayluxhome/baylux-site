import { cookies } from "next/headers";
import { verifySession, can, isResponsible } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { sendOwnerMessage } from "@/lib/mailer";
import { cleanAddress } from "@/data/sheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Публикация сообщения собственнику. Доступно управляющему (право managed) или ответственному за объект.
export async function POST(req) {
  const s = verifySession(cookies().get("bx_session")?.value);
  if (!s) return Response.json({ ok: false, error: "auth" }, { status: 401 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false }); }
  const body = (b.body || "").toString().trim().slice(0, 2000);
  if (!b.listingId || !body) return Response.json({ ok: false, error: "empty" }, { status: 400 });

  const { data: r } = await supa.from("listings")
    .select("id, managed_by_baylux, responsible_tg, responsible_email, owner_contact_email, owner_email, building_name, lang")
    .eq("id", b.listingId).single();
  if (!r) return Response.json({ ok: false }, { status: 404 });

  const canManage = (can(s, "managed") || isResponsible(s, r)) && !!r.managed_by_baylux;
  if (!canManage) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });

  const author = s.email || s.username || (s.id != null ? String(s.id) : "");
  const { error } = await supa.from("owner_messages").insert({ listing_id: String(r.id), body, created_by: author });
  if (error) return Response.json({ ok: false });

  const to = r.owner_contact_email || r.owner_email || "";
  let emailed = false;
  if (to) {
    try { await sendOwnerMessage(to, cleanAddress(r.building_name) || "Объект Baylux", body, r.lang || "ru"); emailed = true; }
    catch (e) { console.error("owner msg mail:", e?.message); }
  }
  return Response.json({ ok: true, emailed });
}
