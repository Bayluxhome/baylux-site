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

export const REASON_RU = {
  dup_photo: "совпадают фото с другим объявлением",
  dup_fields: "тот же адрес, площадь, комнаты и цена",
  no_photos: "нет фото",
  price: "подозрительно низкая цена",
  nsfw: "⛔ на фото возможна обнажёнка/насилие",
  not_property: "фото не похожи на недвижимость",
  bad_text: "в тексте мат/ссылки/интим",
  ai_error: "автопроверка фото не сработала — проверьте вручную",
  repeat: "у автора уже 2+ отклонённых объявления",
};

// row — строка listings ДО вставки (или после, тогда excludeId = её id).
export async function moderationVerdict(row, excludeId = null) {
  const reasons = [];
  const photos = Array.isArray(row.photos) ? row.photos.filter(Boolean) : [];
  if (!photos.length) reasons.push("no_photos");
  if (priceTooLow(row.deal, Number(row.price_num), row.currency)) reasons.push("price");
  if (supa) {
    try {
      const hashes = Array.isArray(row.photo_hashes) ? row.photo_hashes.filter(Boolean) : [];
      if (hashes.length) {
        let q = supa.from("listings").select("id").overlaps("photo_hashes", hashes).limit(1);
        if (excludeId) q = q.neq("id", excludeId);
        const { data } = await q;
        if (data && data.length) reasons.push("dup_photo");
      }
      if (!reasons.includes("dup_photo") && row.building_name && Number(row.area) > 0) {
        let q = supa.from("listings").select("id")
          .eq("building_name", row.building_name).eq("area", Number(row.area))
          .eq("rooms", Number(row.rooms) || 0).eq("price", String(row.price || "")).limit(1);
        if (excludeId) q = q.neq("id", excludeId);
        const { data } = await q;
        if (data && data.length) reasons.push("dup_fields");
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
  if (supa && (row.tg_user_id != null || row.owner_email)) {
    try {
      let q = supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "rejected");
      q = row.tg_user_id != null ? q.eq("tg_user_id", row.tg_user_id) : q.eq("owner_email", row.owner_email);
      const { count } = await q;
      if ((count || 0) >= 2) reasons.push("repeat");
    } catch (e) { console.error("repeat check:", e?.message); }
  }
  return { approve: reasons.length === 0, reasons };
}

export const reasonsText = (reasons) => reasons.map((r) => REASON_RU[r] || r).join("; ");

// То же, что кнопка «Опубликовать» в боте: перевод описания/адреса, пост в канал, сброс кэша.
// Вызывается для уже вставленного объявления со статусом approved.
export async function publishApproved(id) {
  if (!supa) return;
  const { data: row } = await supa.from("listings").select("*").eq("id", id).maybeSingle();
  if (!row || row.status !== "approved") return;
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
