import { cookies } from "next/headers";
import { verifySession, isAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Модерация риелтора из веб-админки (только админ): approve / reject.
export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isAdmin(session)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false }); }
  if (!b.id || !["approve", "reject"].includes(b.action)) return Response.json({ ok: false, error: "bad" }, { status: 400 });
  const status = b.action === "approve" ? "approved" : "rejected";
  const { error } = await supa.from("realtors").update({ status }).eq("id", b.id);
  if (error) return Response.json({ ok: false });
  return Response.json({ ok: true, status });
}

// Удаление риелтора (только админ).
export async function DELETE(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isAdmin(session)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false }); }
  if (!b.id) return Response.json({ ok: false });
  await supa.from("realtors").delete().eq("id", b.id);
  return Response.json({ ok: true });
}
