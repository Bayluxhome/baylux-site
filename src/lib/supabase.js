import { createClient } from "@supabase/supabase-js";

// Серверный клиент (service_role) — только на сервере, ключ не уходит в браузер.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supa = url && key
  ? createClient(url, key, { auth: { persistSession: false } })
  : null;

// Supabase МОЛЧА обрезает любую выборку до 1000 строк (лимит PostgREST по умолчанию).
// Без явной постраничной выборки админка показывала 1000 объявлений из 2000+, и это
// выглядело как «всё на месте». Используйте эту функцию везде, где нужна ВСЯ таблица.
//   build — функция, которая получает запрос и навешивает фильтры/сортировку:
//   fetchAll("listings", "*", (q) => q.eq("status", "approved").order("created_at"))
export async function fetchAll(table, select = "*", build = (q) => q, maxPages = 20) {
  if (!supa) return [];
  const PAGE = 1000;
  const all = [];
  for (let p = 0; p < maxPages; p++) {
    const { data, error } = await build(supa.from(table).select(select)).range(p * PAGE, p * PAGE + PAGE - 1);
    if (error || !data || !data.length) break;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}
