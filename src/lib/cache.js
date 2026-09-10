// Сброс кэша публичной выдачи объявлений (см. data/source.js).
// Зовём после любого изменения listings, которое влияет на сайт: публикация, модерация,
// снятие, удаление, правка, пересчёт координат. Дешёвая операция — можно вызывать смело.
//
// Сбрасываем две вещи: кэш сборки в памяти этого инстанса и ISR-кэш главной (она
// пре-рендерится на 5 минут). Другие тёплые инстансы Vercel обновятся сами по TTL (90 с).
import { revalidatePath, revalidateTag } from "next/cache";
import { invalidateBuildings } from "@/data/source";

export function revalidateListings() {
  try { invalidateBuildings(); } catch (e) { console.error("invalidate buildings:", e?.message); }
  try { revalidatePath("/"); } catch (e) { console.error("revalidate home:", e?.message); }
  try { revalidateTag("city-counts"); } catch (e) { console.error("revalidate counts:", e?.message); }
}
