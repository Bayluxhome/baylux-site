import { supa } from "@/lib/supabase";

const DAYS = 30;

// Заявки, пришедшие с объявлений пользователя (см. sql/017_leads_views.sql).
export async function getLeadsFor(session, limit = 50) {
  if (!supa || !session) return [];
  try {
    let q = supa.from("leads").select("*").order("created_at", { ascending: false }).limit(limit);
    q = session.id != null ? q.eq("owner_tg", session.id) : q.eq("owner_email", session.email);
    const { data } = await q;
    return data || [];
  } catch (e) {
    // Таблицы ещё нет (миграция не применена) — кабинет должен работать без неё.
    return [];
  }
}

// Просмотры по дням за последние 30 дней для набора объявлений.
export async function getViewsFor(listingIds) {
  const empty = { total: 0, byDay: {}, byListing: {} };
  if (!supa || !listingIds || !listingIds.length) return empty;
  const from = new Date(Date.now() - DAYS * 864e5).toISOString().slice(0, 10);
  try {
    const { data } = await supa
      .from("listing_views")
      .select("listing_id, day, views")
      .in("listing_id", listingIds.slice(0, 500))
      .gte("day", from);
    const res = { total: 0, byDay: {}, byListing: {} };
    (data || []).forEach((r) => {
      const n = Number(r.views) || 0;
      res.total += n;
      res.byDay[r.day] = (res.byDay[r.day] || 0) + n;
      res.byListing[r.listing_id] = (res.byListing[r.listing_id] || 0) + n;
    });
    return res;
  } catch (e) {
    return empty;
  }
}

// Ряд из 30 точек (старые → новые) для графика: просмотры и обращения по дням.
export function buildSeries(viewsByDay, leads) {
  const days = [];
  const leadsByDay = {};
  (leads || []).forEach((l) => {
    const d = String(l.created_at || "").slice(0, 10);
    if (d) leadsByDay[d] = (leadsByDay[d] || 0) + 1;
  });
  for (let i = DAYS - 1; i >= 0; i--) {
    const key = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    days.push({ day: key, views: viewsByDay[key] || 0, leads: leadsByDay[key] || 0 });
  }
  return days;
}
