import { cache } from "react";
import { supa } from "@/lib/supabase";
import { getAllUnits } from "@/data/source";

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

export async function getRealtorFor(unit) {
  return matchRealtor(await getRealtors(), unit);
}

export async function getRealtorById(id) {
  const list = await getRealtors();
  return list.find((r) => String(r.id) === String(id)) || null;
}

// Объекты риелтора — из общей выдачи сайта (та же дедупликация/архив, что и в каталоге).
export async function getRealtorUnits(realtor) {
  if (!realtor) return [];
  const units = await getAllUnits();
  const tg = realtor.tg_user_id;
  const em = emailKey(realtor.email);
  return units.filter((u) => {
    if (tg != null && u.tg_user_id != null && String(u.tg_user_id) === String(tg)) return true;
    if (em && emailKey(u.owner_email) === em) return true;
    return false;
  });
}
