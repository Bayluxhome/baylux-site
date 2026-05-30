import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "auth" }, { status: 401 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  const form = await req.formData();
  const f = form.get("photo");
  if (!f || typeof f.arrayBuffer !== "function") return Response.json({ ok: false });
  const buf = Buffer.from(await f.arrayBuffer());
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const up = await supa.storage.from("listing-photos").upload(name, buf, { contentType: f.type || "image/jpeg" });
  if (up.error) return Response.json({ ok: false });
  return Response.json({ ok: true, url: supa.storage.from("listing-photos").getPublicUrl(name).data.publicUrl });
}
