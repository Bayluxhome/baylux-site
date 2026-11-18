// Чат-подборщик (T-20261118-02): выполнение инструментов на сервере.
//   search_listings   — публичная выдача каталога (getAllUnits + stripPrivate), без контактов;
//   create_collection — подборка в таблице collections (lib/collections.js), ссылка /c/<token>;
//   create_lead       — заявка тем же путём, что /api/lead: запись в leads → deliverLead (Telegram).
//   telegram_subscribe — подписка на подборки в Telegram (lib/chat/subscribe.js), кнопка с deep link в виджете.
import { supa } from "@/lib/supabase";
import { getUnitsForSearch, invalidateBuildingsIfBad } from "@/data/source";
import { stripPrivate } from "@/lib/privacy";
import { newToken, itemSnapshot } from "@/lib/collections";
import { deliverLead, listingForLead } from "@/lib/leads";
import { getUsdGel } from "@/lib/rate";
import { SITE_URL } from "@/config";
import { searchUnits } from "./search";
import { createSubscription } from "./subscribe";
import { searchComplexes } from "./newbuild";
import { getPublishedComplexes } from "@/lib/complexes";

const DEDUP_MIN = 10;

// ── Каталог для поиска (fix8, тест Мозга 18.11 04:25) ──
// Под 20 параллельными диалогами загрузка базы из Supabase падала, снимок получался пустым, поиск
// возвращал total 0, и Hanna говорила ложное «нет» (в chat_logs: все шаги расширения = 0, вплоть до
// «аренда в Батуми до $500»). Теперь:
//  • свой кэш на инстанс (5 минут, одна общая загрузка на всех) поверх снимка сайта;
//  • загрузка считается удачной, только если снимок полный (meta.ok) и в нём не меньше MIN_UNITS объектов;
//  • неудача → сброс неполного снимка и ещё одна попытка; затем — последний удачный список (до 1 часа);
//  • ничего нет → ошибка CatalogUnavailable: инструмент отдаёт error, а НЕ total 0.
const CAT_TTL = 5 * 60e3, CAT_STALE_MAX = 60 * 60e3;
const MIN_UNITS = 200; // на сайте ~1600 объектов; меньше 200 — это сбой загрузки, а не реальная база
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let cat = { at: 0, list: null, p: null };
class CatalogUnavailable extends Error {}

async function loadCatalog() {
  let why = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) { invalidateBuildingsIfBad(); await sleep(1200); }
    try {
      const { units, meta } = await getUnitsForSearch();
      if (meta.ok !== false && !meta.local && units.length >= MIN_UNITS) {
        // getUnitsForSearch уже очищена; stripPrivate ещё раз — страховка, если выдачу когда-то поменяют.
        const list = units.map(stripPrivate);
        // Снимок «stale» (последний полный, Supabase сейчас не отвечает) — проверим снова через минуту.
        cat = { at: meta.stale ? Date.now() - CAT_TTL + 60e3 : Date.now(), list, p: null, stale: !!meta.stale };
        return cat;
      }
      why = `incomplete: ok=${meta.ok} local=${!!meta.local} units=${units.length}`;
    } catch (e) { why = e?.message || "load error"; }
  }
  console.error("chat catalog unavailable:", why);
  if (cat.list && Date.now() - cat.at < CAT_STALE_MAX) return { ...cat, stale: true };
  throw new CatalogUnavailable(why);
}

async function catalogList(ctx) {
  if (!(cat.list && Date.now() - cat.at < CAT_TTL)) {
    if (!cat.p) cat.p = loadCatalog().finally(() => { cat.p = null; });
    const c = await cat.p;
    if (c.stale && ctx) ctx.flags?.push("catalog:stale");
    return c.list;
  }
  return cat.list;
}
const publicUnits = (ctx) => catalogList(ctx);

const SEARCH_ERROR_NOTE = "Технический сбой поиска (это НЕ отсутствие вариантов). Не говори клиенту, что вариантов нет. Повтори этот же поиск ещё раз. Если снова ошибка: скажи, что поиск сейчас перегружен, попроси подождать минуту, дай ссылку на каталог https://bayluxhome.com/catalog и предложи оставить контакт, чтобы менеджер подобрал вручную.";

// «2+1», «1+1» (формат N+1 на любом языке): так же считает сайт — парсер пишет rooms=N
// (N спален + гостиная). Модель иногда передавала N+1 (по-русски «2+1» = 3 комнаты), а для турецкого N:
// приводим к одному правилу. Только если в сообщении ровно один такой формат.
export function plusRooms(text) {
  const found = [...String(text || "").matchAll(/(?<![\d+])([1-5])\s*\+\s*1(?![\d])/g)].map((m) => Number(m[1]));
  const uniq = [...new Set(found)];
  return uniq.length === 1 ? uniq[0] : null;
}

export async function runSearch(input, ctx) {
  let units;
  try { units = await publicUnits(ctx); }
  catch (e) {
    ctx.flags?.push("catalog:unavailable");
    return { ok: false, error: "catalog_unavailable", total: null, items: [], note: SEARCH_ERROR_NOTE };
  }
  const pr = plusRooms(ctx.userText);
  let roomsNote = null;
  if (pr != null) {
    const r = input.rooms != null && input.rooms !== "" ? Number(input.rooms) : null;
    if (r === pr + 1 || r === null) input = { ...input, rooms: pr };
    if (Number(input.rooms) === pr) roomsNote = `${pr}+1 = ${pr} ${pr === 1 ? "спальня" : "спальни"} + гостиная; на сайте это rooms=${pr}. Скажи клиенту, как поняла.`;
  }
  const rate = await getUsdGel();
  const res = searchUnits(units, input, { rate, lang: ctx.lang });
  if (roomsNote) res.rooms_note = roomsNote;
  res.items = res.items.map((c) => ({ ...c, url: SITE_URL + c.url }));
  if (res.catalog_url) res.catalog_url = SITE_URL + res.catalog_url;
  // id найденных объектов запоминаем: подборку можно собрать только из того, что реально показали.
  res.items.forEach((c) => ctx.shownIds.add(c.id));
  return res;
}

// Новостройки (раздел /novostroyki): опубликованные ЖК, кэш 5 минут на инстанс (fix7).
let cxCache = { at: 0, list: null, p: null };
async function publishedComplexes() {
  if (cxCache.list && Date.now() - cxCache.at < 5 * 60e3) return cxCache.list;
  if (!cxCache.p) cxCache.p = getPublishedComplexes().then((l) => { cxCache = { at: Date.now(), list: Array.isArray(l) ? l : [], p: null }; return cxCache.list; }).catch((e) => { cxCache.p = null; throw e; });
  return cxCache.p;
}

export async function runNewBuildings(input, ctx) {
  const list = await publishedComplexes();
  if (!list.length) return { ok: false, error: "catalog_unavailable", note: "Раздел новостроек сейчас не загрузился. Не говори, что новостроек нет: предложи ссылку https://bayluxhome.com/novostroyki или контакт." };
  const res = searchComplexes(list, input, { lang: ctx.lang });
  res.items = res.items.map((c) => ({ ...c, url: SITE_URL + c.url }));
  res.catalog_url = SITE_URL + res.catalog_url;
  return res;
}

export async function runCollection(input, ctx) {
  if (!supa) return { ok: false, error: "not_configured" };
  const ids = [...new Set((Array.isArray(input.listing_ids) ? input.listing_ids : []).map(String))].slice(0, 10);
  if (!ids.length) return { ok: false, error: "no_ids" };
  let all;
  try { all = await publicUnits(ctx); } catch { return { ok: false, error: "catalog_unavailable", note: "Технический сбой, подборку собрать не получилось. Предложи повторить через минуту или оставить контакт." }; }
  const byId = new Map(all.map((u) => [String(u.id), u]));
  // Только опубликованные и только реально найденные в этом ответе/диалоге.
  const items = ids.filter((id) => byId.has(id) && (ctx.shownIds.has(id) || ctx.allowAnyPublished)).map((id) => itemSnapshot(byId.get(id)));
  if (!items.length) return { ok: false, error: "no_valid_listings" };
  const row = {
    token: newToken(),
    title: String(input.title || "Подборка Baylux").trim().slice(0, 120),
    note: "Создано чатом-подборщиком на сайте",
    owner_email: null, // без владельца: править может только супер-админ, смотреть — по ссылке
    owner_tg: null,
    items,
  };
  const { data, error } = await supa.from("collections").insert(row).select("token").single();
  if (error || !data) return { ok: false, error: "db" };
  ctx.collectionToken = data.token; // для подписки в Telegram (telegram_subscribe)
  return { ok: true, url: `${SITE_URL}/c/${data.token}`, count: items.length };
}

const TYPE_BY_DEAL = { rent: "rent", daily: "daily" };

export async function runLead(input, ctx) {
  // Тестовый режим (x-hanna-test == HANNA_TEST_TOKEN): заявку не пишем и никому не отправляем.
  if (ctx.test) {
    const contact = String(input.contact || "").trim();
    if (contact.replace(/[^\d@A-Za-z]/g, "").length < 3) return { ok: false, error: "no_contact" };
    ctx.leadCreated = true;
    ctx.testLead = { deal: input.deal || "other", summary: String(input.summary || "").slice(0, 300) };
    return { ok: true, test: true };
  }
  if (!supa) return { ok: false, error: "not_configured" };
  const rawContact = String(input.contact || "").trim().slice(0, 100);
  const digits = rawContact.replace(/[^\d]/g, "");
  const phone = digits.length >= 9 && digits.length <= 15 ? "+" + digits : rawContact;
  if (!phone || phone.length < 3) return { ok: false, error: "no_contact" };
  const name = String(input.name || "").trim().slice(0, 200) || null;
  const comment = (`[Чат на сайте] ${String(input.summary || "").trim()}`).slice(0, 1000);
  const listingId = String(input.listing_id || "").slice(0, 100);

  // Те же защиты, что в /api/lead: не больше 5 заявок с контакта за 10 минут, повтор не дублируем.
  const since = new Date(Date.now() - DEDUP_MIN * 60e3).toISOString();
  const { count: recent } = await supa.from("leads").select("id", { count: "exact", head: true }).eq("phone", phone).gte("created_at", since);
  if ((recent || 0) >= 5) return { ok: false, error: "rate" };
  let dq = supa.from("leads").select("id").eq("phone", phone).gte("created_at", since);
  dq = listingId ? dq.eq("listing_id", listingId) : dq.is("listing_id", null);
  const { data: dup } = await dq.limit(1).maybeSingle();
  if (dup) return { ok: true, duplicate: true };

  const listing = await listingForLead(listingId);
  const row = {
    name, phone, comment,
    type: "Чат-подборщик",
    type_key: TYPE_BY_DEAL[input.deal] || "other",
    object_title: listing ? (listing.building_name || null) : null,
    listing_id: listing ? listingId : null,
    owner_email: listing?.owner_email || null,
    owner_tg: listing?.tg_user_id ?? null,
    assigned_email: listing?.managed_by_baylux ? (listing.responsible_email || null) : null,
    assigned_tg: listing?.managed_by_baylux ? (listing.responsible_tg ?? null) : null,
    source: "chat",
  };
  const { data: ins, error } = await supa.from("leads").insert(row).select("*").single();
  if (error || !ins) return { ok: false, error: "save_failed" };
  const res = await deliverLead(ins, listing);
  if (res.errors?.length) console.error("chat lead notify:", res.errors.join("; "));
  ctx.leadCreated = true;
  return { ok: true };
}

// Есть ли таблица chat_subscriptions (sql/034). Нет → инструмент telegram_subscribe модели не даём,
// и Hanna подписку не предлагает. Результат кэшируется на 10 минут в памяти инстанса.
let subCache = { at: 0, ok: false };
export async function subscriptionsAvailable() {
  if (!supa) return false;
  if (Date.now() - subCache.at < 10 * 60e3) return subCache.ok;
  let ok = false;
  try {
    const { error } = await supa.from("chat_subscriptions").select("token", { head: true, count: "exact" }).limit(1);
    ok = !error;
  } catch { ok = false; }
  subCache = { at: Date.now(), ok };
  return ok;
}

export async function runTool(name, input, ctx) {
  try {
    if (name === "search_listings") return await runSearch(input || {}, ctx);
    if (name === "search_new_buildings") return await runNewBuildings(input || {}, ctx);
    if (name === "create_collection") return await runCollection(input || {}, ctx);
    if (name === "create_lead") return await runLead(input || {}, ctx);
    if (name === "telegram_subscribe") return await createSubscription(supa, input || {}, ctx);
    return { ok: false, error: "unknown_tool" };
  } catch (e) {
    console.error("chat tool", name, e?.message);
    ctx.flags?.push(`tool_failed:${name}`);
    const searchy = name === "search_listings" || name === "search_new_buildings";
    return { ok: false, error: "tool_failed", ...(searchy ? { total: null, items: [], note: SEARCH_ERROR_NOTE } : {}) };
  }
}
