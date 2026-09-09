import { cookies } from "next/headers";
import { verifySession, isSuperAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Перенос контактов собственников из файла парсинга в уже опубликованные объявления.
//
// СВЯЗЬ ПО ФОТО. Единственный надёжный ключ — отпечаток фотографии: загрузчик пишет
// в объявление SHA-256 исходных файлов (photo_hashes), те же файлы лежат у парсера.
// Адрес и цену для связи не используем — они повторяются у разных лотов и меняются.
//
// БЕЗОПАСНОСТЬ. Права супер-админа. Записанные поля служебные: наружу они не уходят
// (страницы отдают очищенные данные), их видят только сотрудники с правами.
//
// РЕЖИМЫ. Без live=1 — предпросмотр: считает совпадения, НИЧЕГО не пишет.
// live=1 — запись. По умолчанию заполняются только ПУСТЫЕ поля; уже внесённые
// вручную контакты не перезатираются (overwrite=1 меняет это поведение).

async function fetchListings() {
  const all = [];
  const PAGE = 1000;
  for (let p = 0; p < 12; p++) {
    const { data, error } = await supa
      .from("listings")
      .select("id, photo_hashes, owner_phone, owner_tg_username, owner_name, source_ref, source_url")
      .order("id", { ascending: true })
      .range(p * PAGE, p * PAGE + PAGE - 1);
    if (error || !data || !data.length) break;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}

export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isSuperAdmin(session)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false, error: "not_configured" });

  const url = new URL(req.url);
  const live = url.searchParams.get("live") === "1";
  const overwrite = url.searchParams.get("overwrite") === "1";

  let body;
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: "bad_json" }, { status: 400 }); }
  const rows = Array.isArray(body?.rows) ? body.rows.slice(0, 400) : [];
  if (!rows.length) return Response.json({ ok: false, error: "no_rows" }, { status: 400 });

  const listings = await fetchListings();

  // Отпечаток → объявления. Один хэш теоретически может встретиться у нескольких
  // объявлений (перезалив того же объекта), поэтому храним список, а не одно значение.
  const byHash = new Map();
  for (const l of listings) {
    for (const h of (Array.isArray(l.photo_hashes) ? l.photo_hashes : [])) {
      if (!h) continue;
      if (!byHash.has(h)) byHash.set(h, []);
      byHash.get(h).push(l);
    }
  }

  const stats = { rows: rows.length, matched: 0, noMatch: 0, ambiguous: 0, alreadyFilled: 0, updated: 0, failed: 0 };
  const samples = [];
  const noMatchRefs = [];
  const targets = [];

  for (const r of rows) {
    const hashes = Array.isArray(r.hashes) ? r.hashes.filter(Boolean) : [];
    const phone = String(r.phone || "").trim().slice(0, 60);
    const tg = String(r.tg || "").trim().replace(/^@/, "").slice(0, 60);
    const name = String(r.name || "").trim().slice(0, 120);
    const ref = String(r.ref || "").trim().slice(0, 60);
    const link = /^https?:\/\//i.test(String(r.link || "")) ? String(r.link).trim().slice(0, 500) : "";
    if (!hashes.length || (!phone && !tg && !link)) { stats.noMatch++; continue; }

    // Сколько фото совпало с каждым объявлением — побеждает объявление с максимумом.
    const score = new Map();
    for (const h of hashes) for (const l of (byHash.get(h) || [])) score.set(l, (score.get(l) || 0) + 1);
    if (!score.size) { stats.noMatch++; if (noMatchRefs.length < 20) noMatchRefs.push(ref); continue; }

    const ranked = [...score.entries()].sort((a, b) => b[1] - a[1]);
    // Ничья на первом месте = непонятно, к какому объявлению относится контакт. Пропускаем.
    if (ranked.length > 1 && ranked[1][1] === ranked[0][1]) { stats.ambiguous++; continue; }

    const l = ranked[0][0];
    stats.matched++;

    const patch = {};
    if (phone && (overwrite || !l.owner_phone)) patch.owner_phone = phone;
    if (tg && (overwrite || !l.owner_tg_username)) patch.owner_tg_username = tg;
    if (name && (overwrite || !l.owner_name)) patch.owner_name = name;
    if (ref && (overwrite || !l.source_ref)) patch.source_ref = ref;
    if (link && (overwrite || !l.source_url)) patch.source_url = link;
    if (!Object.keys(patch).length) { stats.alreadyFilled++; continue; }

    targets.push({ id: l.id, patch });
    if (samples.length < 15) samples.push({ ref, listingId: l.id, photosMatched: ranked[0][1], patch });
  }

  if (live) {
    const CONC = 8;
    for (let i = 0; i < targets.length; i += CONC) {
      const res = await Promise.all(targets.slice(i, i + CONC).map(async (x) => {
        const { error } = await supa.from("listings").update(x.patch).eq("id", x.id);
        return !error;
      }));
      res.forEach((ok) => (ok ? stats.updated++ : stats.failed++));
    }
  }

  return Response.json({
    ok: true,
    mode: live ? "запись" : "предпросмотр (ничего не записано)",
    toUpdate: targets.length,
    ...stats,
    noMatchRefs,
    samples,
  });
}
