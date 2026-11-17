// Чат-подборщик (T-20261118-02): выполнение инструментов на сервере.
//   search_listings   — публичная выдача каталога (getAllUnits + stripPrivate), без контактов;
//   create_collection — подборка в таблице collections (lib/collections.js), ссылка /c/<token>;
//   create_lead       — заявка тем же путём, что /api/lead: запись в leads → deliverLead (Telegram).
//   telegram_subscribe — подписка на подборки в Telegram (lib/chat/subscribe.js), кнопка с deep link в виджете.
import { supa } from "@/lib/supabase";
import { getAllUnits } from "@/data/source";
import { stripPrivate } from "@/lib/privacy";
import { newToken, itemSnapshot } from "@/lib/collections";
import { deliverLead, listingForLead } from "@/lib/leads";
import { getUsdGel } from "@/lib/rate";
import { SITE_URL } from "@/config";
import { searchUnits } from "./search";
import { createSubscription } from "./subscribe";

const DEDUP_MIN = 10;

async function publicUnits() {
  // getAllUnits() уже очищена; stripPrivate ещё раз — страховка, если выдачу когда-то поменяют.
  return (await getAllUnits()).map(stripPrivate);
}

export async function runSearch(input, ctx) {
  const rate = await getUsdGel();
  const res = searchUnits(await publicUnits(), input, { rate });
  res.items = res.items.map((c) => ({ ...c, url: SITE_URL + c.url }));
  if (res.catalog_url) res.catalog_url = SITE_URL + res.catalog_url;
  // id найденных объектов запоминаем: подборку можно собрать только из того, что реально показали.
  res.items.forEach((c) => ctx.shownIds.add(c.id));
  return res;
}

export async function runCollection(input, ctx) {
  if (!supa) return { ok: false, error: "not_configured" };
  const ids = [...new Set((Array.isArray(input.listing_ids) ? input.listing_ids : []).map(String))].slice(0, 10);
  if (!ids.length) return { ok: false, error: "no_ids" };
  const byId = new Map((await publicUnits()).map((u) => [String(u.id), u]));
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

export async function runTool(name, input, ctx) {
  try {
    if (name === "search_listings") return await runSearch(input || {}, ctx);
    if (name === "create_collection") return await runCollection(input || {}, ctx);
    if (name === "create_lead") return await runLead(input || {}, ctx);
    if (name === "telegram_subscribe") return await createSubscription(supa, input || {}, ctx);
    return { ok: false, error: "unknown_tool" };
  } catch (e) {
    console.error("chat tool", name, e?.message);
    return { ok: false, error: "tool_failed" };
  }
}
