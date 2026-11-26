// Автопубликация объявлений (20.10.2026).
// Объявление публикуется сразу, если нет подозрений; иначе — на ручную модерацию (как раньше).
// Подозрения:
//   dup_photo  — совпадает хотя бы одно фото (SHA-256) с уже существующим объявлением;
//   dup_fields — тот же адрес + площадь + комнаты + цена (как «возможный дубль» в админке);
//   no_photos  — нет фото (без фото объявление на сайте всё равно не показывается);
//   price      — цена ниже правдоподобного порога для сделки (lib/classify.MIN_OK_PRICE).
// Сотрудники с правом «Модерация» публикуют сразу, как и раньше — для них проверка не нужна.
import { supa } from "@/lib/supabase";
import { priceTooLow } from "@/lib/classify";
import { translateDescriptions, translateNames } from "@/lib/translate";
import { pickChannel, postToChannel, CH_BATUMI, CH_TBILISI } from "@/lib/tgChannel";
import { revalidateListings } from "@/lib/cache";
import { photoVerdict, textVerdict } from "@/lib/contentCheck";

// ai_error блокирует: без работающей проверки фото не публикуем (24.11: ключ LaoZhang 401).
const BLOCKING = new Set(["nsfw", "bad_text", "repeat", "foreign_wm", "dup_photo", "dup_fields", "ai_error"]);

export const REASON_RU = {
  dup_photo: "совпадают фото с другим объявлением",
  dup_fields: "тот же адрес, площадь, комнаты и цена",
  no_photos: "нет фото",
  price: "подозрительно низкая цена",
  nsfw: "⛔ на фото возможна обнажёнка/насилие",
  not_property: "фото не похожи на недвижимость",
  foreign_wm: "на фото чужой водяной знак/логотип агентства",
  bad_text: "в тексте мат/ссылки/интим",
  ai_error: "автопроверка фото не сработала — проверьте вручную",
  repeat: "у автора уже 2+ отклонённых объявления",
  dup_parser: "есть копия с парсинга — опубликован собственник, копия снята",
};

// row — строка listings ДО вставки (или после, тогда excludeId = её id).
export async function moderationVerdict(row, excludeId = null) {
  const reasons = [];
  const dupRows = [];
  // 26.11 (Дмитрий): к собственникам — максимально лояльно. Собственник = подал сам (не массовая загрузка/парсинг).
  const isOwner = !row.batch_id && !row.source_url;
  const photos = Array.isArray(row.photos) ? row.photos.filter(Boolean) : [];
  if (!photos.length) reasons.push("no_photos");
  if (priceTooLow(row.deal, Number(row.price_num), row.currency)) reasons.push("price");
  if (supa) {
    try {
      const hashes = Array.isArray(row.photo_hashes) ? row.photo_hashes.filter(Boolean) : [];
      if (hashes.length) {
        let q = supa.from("listings").select("id,batch_id,source_url").overlaps("photo_hashes", hashes).in("status", ["approved", "pending"]).limit(10);
        if (excludeId) q = q.neq("id", excludeId);
        const { data } = await q;
        if (data && data.length) { reasons.push("dup_photo"); dupRows.push(...data); }
      }
      if (!reasons.includes("dup_photo") && row.building_name && Number(row.area) > 0) {
        // 24.11: мягче — тот же адрес (без регистра) + комнаты + площадь ±1 м², цена может отличаться
        // (переподача с новой ценой — тоже дубль); сравниваем только с живыми (approved/pending), не со снятыми.
        const a = Number(row.area);
        let q = supa.from("listings").select("id,batch_id,source_url")
          .ilike("building_name", String(row.building_name).trim().replace(/[%_]/g, ""))
          .gte("area", a - 1).lte("area", a + 1)
          .eq("rooms", Number(row.rooms) || 0).in("status", ["approved", "pending"]).limit(10);
        if (excludeId) q = q.neq("id", excludeId);
        const { data } = await q;
        if (data && data.length) { reasons.push("dup_fields"); dupRows.push(...data); }
      }
    } catch (e) {
      // Проверка дублей не удалась — безопасный вариант: на ручную модерацию.
      console.error("dup check:", e?.message);
      reasons.push("dup_photo");
    }
  }
  // 06.11: проверка содержимого (фото — Google Vision, текст — стоп-слова) и «рецидивисты».
  reasons.push(...textVerdict(row.about, row.building_name, row.complex));
  if (photos.length) reasons.push(...(await photoVerdict(photos)));
  // 24.11: «рецидивист» не применяется к массовой загрузке сотрудником (парсинг идёт от bayluxhome@yahoo.com,
  // у этого адреса сотни снятых объявлений → раньше ВСЁ с парсинга уходило в pending).
  if (supa && !row.batch_id && !isOwner && (row.tg_user_id != null || row.owner_email)) {
    try {
      let q = supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "rejected");
      q = row.tg_user_id != null ? q.eq("tg_user_id", row.tg_user_id) : q.eq("owner_email", row.owner_email);
      const { count } = await q;
      if ((count || 0) >= 2) reasons.push("repeat");
    } catch (e) { console.error("repeat check:", e?.message); }
  }
  // 24.11 (решение Дмитрия, вариант 1): публикацию останавливает только опасное, чужой знак и дубли.
  // Цена, «не похоже на недвижимость», нет фото, сбой проверки — только пометка, объявление публикуется.
  // 26.11: собственник. Дубль только со спарсенными/партнёрскими объявлениями — НЕ блок: публикуем собственника,
  // а копии с парсинга снимаются в publishApproved (старшинство собственник > партнёр > парсинг). «Рецидивист» не применяется.
  if (isOwner) {
    const others = dupRows.filter((d) => !d.batch_id && !d.source_url);
    if (!others.length && (reasons.includes("dup_photo") || reasons.includes("dup_fields"))) {
      const i1 = reasons.indexOf("dup_photo"); if (i1 >= 0) reasons.splice(i1, 1);
      const i2 = reasons.indexOf("dup_fields"); if (i2 >= 0) reasons.splice(i2, 1);
      reasons.push("dup_parser");
    }
  }
  return { approve: !reasons.some((r) => BLOCKING.has(r)), reasons };
}

export const reasonsText = (reasons) => reasons.map((r) => REASON_RU[r] || r).join("; ");

// То же, что кнопка «Опубликовать» в боте: перевод описания/адреса, пост в канал, сброс кэша.
// Вызывается для уже вставленного объявления со статусом approved.
export async function publishApproved(id) {
  if (!supa) return;
  const { data: row } = await supa.from("listings").select("*").eq("id", id).maybeSingle();
  if (!row || row.status !== "approved") return;
  // 26.11: объявление собственника снимает живые копии этого же объекта с парсинга (те же фото или адрес+комнаты+площадь ±1).
  if (!row.batch_id && !row.source_url) {
    try {
      const ids = new Set();
      const hashes = Array.isArray(row.photo_hashes) ? row.photo_hashes.filter(Boolean) : [];
      if (hashes.length) {
        const { data } = await supa.from("listings").select("id").overlaps("photo_hashes", hashes).eq("status", "approved").not("batch_id", "is", null).neq("id", id).limit(20);
        (data || []).forEach((d) => ids.add(d.id));
      }
      if (row.building_name && Number(row.area) > 0) {
        const a = Number(row.area);
        const { data } = await supa.from("listings").select("id").ilike("building_name", String(row.building_name).trim().replace(/[%_]/g, ""))
          .gte("area", a - 1).lte("area", a + 1).eq("rooms", Number(row.rooms) || 0).eq("status", "approved").not("batch_id", "is", null).neq("id", id).limit(20);
        (data || []).forEach((d) => ids.add(d.id));
      }
      if (ids.size) await supa.from("listings").update({ status: "rejected" }).in("id", [...ids]);
    } catch (e) { console.error("owner dedupe:", e?.message); }
  }
  try {
    const upd = {};
    if (row.about && (!row.desc_ru || !row.desc_en || !row.desc_ka)) Object.assign(upd, await translateDescriptions(row.about, row.lang || "ru"));
    if (row.building_name && (!row.name_ru || !row.name_en || !row.name_ka)) Object.assign(upd, await translateNames(row.building_name, row.lang || "ru"));
    if (Object.keys(upd).length) { await supa.from("listings").update(upd).eq("id", id); Object.assign(row, upd); }
  } catch (e) { console.error("auto translate:", e?.message); }
  if ((CH_BATUMI || CH_TBILISI) && !row.tg_post_id) {
    const ch = pickChannel(row);
    const ids = await postToChannel(row, ch);
    if (ids.length) await supa.from("listings").update({ tg_post_id: ids.join(","), tg_channel: ch }).eq("id", id);
  }
  revalidateListings();
}
