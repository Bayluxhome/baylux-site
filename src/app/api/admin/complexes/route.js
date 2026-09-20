// Админка новостроек: CRUD жилых комплексов и планировок. Право — «Новостройки» (complexes).
// POST {action:"create", ...поля}            → { ok, item }
// POST {action:"update", id, ...поля}        → { ok, item }
// POST {action:"status", id, status}         → draft / published / hidden
// POST {action:"delete", id}
// POST {action:"unit_add", complexId, ...}   / {action:"unit_update", id, ...} / {action:"unit_remove", id}
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifySession, can } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { COMPLEX_STATUSES, adminGetComplex, uniqueSlug, normalizeComplexInput, normalizeUnitInput } from "@/lib/complexes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function refresh(slug) {
  try {
    revalidatePath("/novostroyki");
    if (slug) revalidatePath(`/novostroyki/${slug}`);
    revalidatePath("/sitemap.xml");
  } catch (e) { /* не критично */ }
}

export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!can(session, "complexes")) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false, error: "not_configured" }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const action = String(b.action || "");
  const who = session.email || (session.id != null ? `tg:${session.id}` : null);

  if (action === "create") {
    const row = normalizeComplexInput(b);
    if (!row.name) return Response.json({ ok: false, error: "name" }, { status: 400 });
    row.slug = await uniqueSlug(row.name);
    row.created_by = who;
    const { data, error } = await supa.from("complexes").insert(row).select("*").single();
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    refresh(data.slug);
    return Response.json({ ok: true, item: data });
  }

  if (action === "update") {
    if (!b.id) return Response.json({ ok: false, error: "id" }, { status: 400 });
    const cur = await adminGetComplex(b.id);
    if (!cur) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    const row = normalizeComplexInput(b);
    if (!row.name) return Response.json({ ok: false, error: "name" }, { status: 400 });
    // Slug меняем только если поменялось название — чтобы не ломать уже разосланные ссылки.
    row.slug = row.name !== cur.name ? await uniqueSlug(row.name, cur.id) : cur.slug;
    row.updated_at = new Date().toISOString();
    const { data, error } = await supa.from("complexes").update(row).eq("id", b.id).select("*").single();
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    refresh(cur.slug); if (data.slug !== cur.slug) refresh(data.slug);
    return Response.json({ ok: true, item: data });
  }

  if (action === "status") {
    if (!b.id || !COMPLEX_STATUSES.includes(b.status)) return Response.json({ ok: false, error: "bad" }, { status: 400 });
    const { data, error } = await supa.from("complexes").update({ status: b.status, updated_at: new Date().toISOString() }).eq("id", b.id).select("slug").single();
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    refresh(data?.slug);
    return Response.json({ ok: true });
  }

  if (action === "delete") {
    if (!b.id) return Response.json({ ok: false, error: "id" }, { status: 400 });
    const cur = await adminGetComplex(b.id);
    if (!cur) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    // Фото в storage не удаляем: те же URL могут использоваться в других местах; чистка — отдельно.
    const { error } = await supa.from("complexes").delete().eq("id", b.id);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    refresh(cur.slug);
    return Response.json({ ok: true });
  }

  if (action === "unit_add") {
    if (!b.complexId) return Response.json({ ok: false, error: "complexId" }, { status: 400 });
    const cur = await adminGetComplex(b.complexId);
    if (!cur) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    const row = { ...normalizeUnitInput(b), complex_id: b.complexId };
    const { data, error } = await supa.from("complex_units").insert(row).select("*").single();
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    refresh(cur.slug);
    return Response.json({ ok: true, item: data });
  }

  if (action === "unit_update" || action === "unit_remove") {
    if (!b.id) return Response.json({ ok: false, error: "id" }, { status: 400 });
    const { data: u } = await supa.from("complex_units").select("id, complex_id").eq("id", b.id).maybeSingle();
    if (!u) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    const cur = await adminGetComplex(u.complex_id);
    if (action === "unit_remove") {
      const { error } = await supa.from("complex_units").delete().eq("id", b.id);
      if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
      refresh(cur?.slug);
      return Response.json({ ok: true });
    }
    const { data, error } = await supa.from("complex_units").update(normalizeUnitInput(b)).eq("id", b.id).select("*").single();
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    refresh(cur?.slug);
    return Response.json({ ok: true, item: data });
  }

  return Response.json({ ok: false, error: "bad_action" }, { status: 400 });
}
