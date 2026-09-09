import { cache } from "react";
import { supa } from "@/lib/supabase";
import { getAllUnitsRaw } from "@/data/source";
import { stripPrivate } from "@/lib/privacy";

// Одобренные риелторы. Связь с объявлением — по tg_user_id ИЛИ email (owner_email листинга).
export const getRealtors = cache(async () => {
  if (!supa) return [];
  const { data } = await supa.from("realtors").select("*").eq("status", "approved");
  return data || [];
});

const emailKey = (v) => String(v || "").trim().toLowerCase();

// Риелтор конкретного объекта (или null, если объявление подал не риелтор).
export function matchRealtor(realtors, unit) {
  if (!unit) return null;
  const tg = unit.tg_user_id;
  const em = emailKey(unit.owner_email);
  return (realtors || []).find((r) => {
    if (tg != null && r.tg_user_id != null && String(r.tg_user_id) === String(tg)) return true;
    if (em && emailKey(r.email) === em) return true;
    return false;
  }) || null;
}

// Автор объявления по его slug. Отдельная функция нужна потому, что в вёрстку страницы
// объекта уходит уже очищенный объект (без owner_email) — сопоставлять по нему нечем.
// Здесь берём служебную копию того же объявления и ищем риелтора по ней.
export async function getRealtorForSlug(slug) {
  if (!slug) return null;
  const u = (await getAllUnitsRaw()).find((x) => x.slug === slug);
  return u ? matchRealtor(await getRealtors(), u) : null;
}

// Число объявлений каждого риелтора (для списка /realtors). Считаем по служебной выборке,
// наружу уходят только числа.
export async function countByRealtor(rows) {
  const units = await getAllUnitsRaw();
  return (rows || []).map((r) => ({ ...r, count: units.filter((u) => matchRealtor([r], u)).length }));
}

export async function getRealtorById(id) {
  const list = await getRealtors();
  return list.find((r) => String(r.id) === String(id)) || null;
}

// Объекты риелтора — из общей выдачи сайта (та же дедупликация/архив, что и в каталоге).
export async function getRealtorUnits(realtor) {
  if (!realtor) return [];
  const units = await getAllUnitsRaw();
  const tg = realtor.tg_user_id;
  const em = emailKey(realtor.email);
  // Отбираем по служебным полям, но наружу отдаём очищенные объекты — страница риелтора
  // рендерит их карточками, и owner_email не должен попасть в HTML.
  return units
    .filter((u) => {
      if (tg != null && u.tg_user_id != null && String(u.tg_user_id) === String(tg)) return true;
      if (em && emailKey(u.owner_email) === em) return true;
      return false;
    })
    .map(stripPrivate);
}
