// Read-only аудит базы объявлений (задачи: карта/координаты, классификация, смешение языков).
// GET /api/admin/audit?kind=geo|class|lang[&status=approved|all][&city=Батуми][&samples=30]
// Только суперадмин. НИЧЕГО не пишет — считает статистику и отдаёт примеры id/причин.
// Идемпотентен: повторный вызов даёт тот же отчёт для тех же данных.
import { cookies } from "next/headers";
import { verifySession, isSuperAdmin } from "@/lib/session";
import { supa, fetchAll } from "@/lib/supabase";
import { unitCat } from "@/data/data";
import { assessCoords } from "@/lib/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SELECT = "id, status, deal, type, price, price_num, per, currency, district, lat, lng, geo_ok, building_name, name_ru, name_en, name_ka, about, desc_ru, desc_en, desc_ka, lang, tg_username, owner_email, source_ref, created_at, managed_by_baylux";

const KA = /[Ⴀ-ჿ]/, CYR = /[Ѐ-ӿ]/, LAT = /[A-Za-z]/;
const scripts = (s) => ({ ka: KA.test(s || ""), cyr: CYR.test(s || ""), lat: LAT.test(s || "") });
const shortId = (r) => ({ id: r.id, name: String(r.building_name || "").slice(0, 40), district: r.district });

function counter() {
  const m = new Map();
  return { add: (k) => m.set(k, (m.get(k) || 0) + 1), obj: () => Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1])) };
}
function bucket(max) {
  const b = { count: 0, samples: [] };
  return { push: (x) => { b.count++; if (b.samples.length < max) b.samples.push(x); }, get: () => b };
}

function auditGeo(rows, max) {
  const reasons = counter();
  const buckets = {};
  const byCityMismatch = counter();
  let ok = 0;
  for (const r of rows) {
    const a = assessCoords(r);
    if (a.ok) { ok++; continue; }
    reasons.add(a.reason);
    (buckets[a.reason] ||= bucket(max)).push({ ...shortId(r), lat: r.lat, lng: r.lng, km: a.km, src: r.tg_username === "bayluxhome" ? "parser" : "user" });
    if (a.reason === "city_mismatch") byCityMismatch.add(r.district || "?");
  }
  return { total: rows.length, valid: ok, invalid: rows.length - ok, reasons: reasons.obj(), cityMismatchByCity: byCityMismatch.obj(), samples: Object.fromEntries(Object.entries(buckets).map(([k, b]) => [k, b.get().samples])) };
}

function auditClass(rows, max) {
  const dealRaw = counter(), typeRaw = counter(), cat = counter(), src = counter();
  const flags = {};
  const flag = (k, r, extra) => (flags[k] ||= bucket(max)).push({ ...shortId(r), deal: r.deal, type: r.type, price: r.price, ...extra });
  for (const r of rows) {
    dealRaw.add(r.deal == null ? "<null>" : r.deal === "" ? "<empty>" : String(r.deal));
    typeRaw.add(r.type == null ? "<null>" : r.type === "" ? "<empty>" : String(r.type).trim());
    const c = unitCat(r.type);
    cat.add(c);
    src.add(r.tg_username === "bayluxhome" ? "parser" : r.managed_by_baylux ? "managed" : "user");
    const deal = r.deal || "";
    const p = r.price_num != null ? Number(r.price_num) : parseInt(String(r.price || "").replace(/[^\d]/g, ""), 10) || null;
    const text = `${r.about || ""} ${r.desc_ru || ""}`.toLowerCase();
    if (!["sale", "rent", "daily"].includes(deal)) flag("deal_unknown", r);
    if (!r.type) flag("type_empty", r);
    if (c === "other") flag("type_unmapped", r);
    if (deal === "sale" && p != null && p < 5000) flag("sale_price_low", r, { p });
    if (deal === "rent" && p != null && p > 15000) flag("rent_price_high", r, { p });
    if (deal === "daily" && p != null && p > 1500) flag("daily_price_high", r, { p });
    if ((deal === "rent" || deal === "daily") && !r.per) flag("rent_no_period", r);
    if (deal === "sale" && /\b(сдам|сдаю|сдается|сдаётся|в аренду|аренда)\b/.test(text) && !/прода/.test(text)) flag("sale_text_says_rent", r);
    if (deal !== "sale" && /\b(продам|продаю|продается|продаётся|продажа)\b/.test(text) && !/(сдам|аренд)/.test(text)) flag("rent_text_says_sale", r);
    if (c === "apartment" && /\b(офис|склад|коммерч)/.test(String(r.type || "").toLowerCase())) flag("type_conflict", r);
    if (p == null) flag("price_missing", r);
  }
  return { total: rows.length, dealValues: dealRaw.obj(), typeValues: typeRaw.obj(), categories: cat.obj(), sources: src.obj(), flags: Object.fromEntries(Object.entries(flags).map(([k, b]) => [k, b.get()])) };
}

function auditLang(rows, max) {
  const flags = {};
  const flag = (k, r, v) => (flags[k] ||= bucket(max)).push({ ...shortId(r), value: String(v || "").slice(0, 60) });
  let fullName = 0, fullDesc = 0;
  for (const r of rows) {
    const nr = scripts(r.name_ru), ne = scripts(r.name_en), nk = scripts(r.name_ka);
    if (!r.name_ru || !r.name_en || !r.name_ka) flag("name_missing_locale", r, `${r.name_ru ? "ru" : "-"}/${r.name_en ? "en" : "-"}/${r.name_ka ? "ka" : "-"}`); else fullName++;
    if (nr.ka) flag("name_ru_has_georgian", r, r.name_ru);
    if (ne.cyr || ne.ka) flag("name_en_has_cyr_or_ka", r, r.name_en);
    if (nk.cyr) flag("name_ka_has_cyrillic", r, r.name_ka);
    if (r.name_ru && r.name_ru === r.name_en && r.name_en === r.name_ka) flag("name_same_all_locales", r, r.name_ru);
    if (scripts(r.building_name).ka) flag("raw_address_georgian", r, r.building_name);
    if (!r.desc_ru || !r.desc_en || !r.desc_ka) flag("desc_missing_locale", r, `${r.desc_ru ? "ru" : "-"}/${r.desc_en ? "en" : "-"}/${r.desc_ka ? "ka" : "-"}`); else fullDesc++;
    if (!r.lang) flag("source_lang_missing", r, "");
  }
  return { total: rows.length, nameAllLocales: fullName, descAllLocales: fullDesc, flags: Object.fromEntries(Object.entries(flags).map(([k, b]) => [k, b.get()])) };
}

export async function GET(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isSuperAdmin(session)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false, error: "not_configured" }, { status: 503 });
  const u = new URL(req.url);
  const kind = u.searchParams.get("kind") || "geo";
  const status = u.searchParams.get("status") || "approved";
  const city = u.searchParams.get("city") || "";
  const max = Math.min(parseInt(u.searchParams.get("samples") || "30", 10) || 30, 200);

  const rows = await fetchAll("listings", SELECT, (q) => {
    let x = q.order("id", { ascending: true });
    if (status !== "all") x = x.eq("status", status);
    if (city) x = x.eq("district", city);
    return x;
  });

  const report = kind === "class" ? auditClass(rows, max) : kind === "lang" ? auditLang(rows, max) : auditGeo(rows, max);
  return Response.json({ ok: true, kind, status, city: city || null, dryRun: true, generatedAt: new Date().toISOString(), ...report });
}
