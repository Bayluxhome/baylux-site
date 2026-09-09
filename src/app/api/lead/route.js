// Приём заявок с сайта (задача №03).
//
// Порядок: записать в БД → уведомить в Telegram → ответить клиенту.
// Клиент видит «отправлено» ТОЛЬКО если заявка записана: если БД недоступна — отвечаем
// ошибкой, и форма предлагает повторить (раньше ошибка глоталась, и заявка могла исчезнуть).
// Сбой Telegram заявку не теряет: она в базе с notify_error, крон дошлёт.
// Повторное нажатие (тот же телефон + объект за 10 минут) — дубль не создаём.
import { supa } from "@/lib/supabase";
import { deliverLead, listingForLead, LEAD_TYPES } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEDUP_MIN = 10;

export async function POST(req) {
  try {
    const data = await req.json().catch(() => ({}));
    const name = (data.name || "").toString().trim().slice(0, 200);
    const phone = (data.phone || "").toString().trim().slice(0, 100);
    const comment = (data.comment || "").toString().trim().slice(0, 1000);
    const type = (data.type || "").toString().slice(0, 100);          // подпись на языке посетителя (для истории)
    const typeKey = LEAD_TYPES[data.typeKey] ? String(data.typeKey) : "other"; // машинный тип
    const object = (data.object || "").toString().slice(0, 200);
    const listingId = (data.listingId || "").toString().slice(0, 100);
    const source = (data.source || "").toString().slice(0, 40);

    if (!phone) return Response.json({ ok: false, error: "empty" }, { status: 400 });
    if (!supa) return Response.json({ ok: false, error: "not_configured" }, { status: 503 });

    // Дубль: тот же телефон и объект за последние минуты → возвращаем существующую.
    const since = new Date(Date.now() - DEDUP_MIN * 60e3).toISOString();
    let dq = supa.from("leads").select("id, notified_at").eq("phone", phone).gte("created_at", since);
    dq = listingId ? dq.eq("listing_id", listingId) : dq.is("listing_id", null);
    const { data: dup } = await dq.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (dup) return Response.json({ ok: true, id: dup.id, duplicate: true });

    const listing = await listingForLead(listingId);

    const row = {
      name: name || null,
      phone,
      comment: comment || null,
      type: type || null,
      type_key: typeKey,
      object_title: object || null,
      listing_id: listingId || null,
      owner_email: listing?.owner_email || null,
      owner_tg: listing?.tg_user_id ?? null,
      // Ответственный: для объектов в управлении — назначенный сотрудник.
      assigned_email: listing?.managed_by_baylux ? (listing.responsible_email || null) : null,
      assigned_tg: listing?.managed_by_baylux ? (listing.responsible_tg ?? null) : null,
      source: source || null,
      utm_source: (data.utmSource || "").toString().slice(0, 100) || null,
      utm_medium: (data.utmMedium || "").toString().slice(0, 100) || null,
      utm_campaign: (data.utmCampaign || "").toString().slice(0, 100) || null,
    };
    const { data: ins, error } = await supa.from("leads").insert(row).select("*").single();
    if (error || !ins) {
      console.error("lead save failed:", error?.message);
      return Response.json({ ok: false, error: "save_failed" }, { status: 500 });
    }

    // Уведомление. Его сбой не делает заявку «неотправленной» — она уже в базе.
    const res = await deliverLead(ins, listing);
    if (res.errors.length) console.error("lead notify:", res.errors.join("; "));

    return Response.json({ ok: true, id: ins.id, notified: res.delivered > 0 });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
