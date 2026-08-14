// Приём заявок: сохраняем в БД (для кабинета риелтора) и уведомляем в Telegram.
// Безопасно работает и без настроенного бота, и без Supabase.
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const data = await req.json().catch(() => ({}));
    const name = (data.name || "").toString().slice(0, 200);
    const phone = (data.phone || "").toString().slice(0, 100);
    const comment = (data.comment || "").toString().slice(0, 1000);
    const type = (data.type || "").toString().slice(0, 100);
    const object = (data.object || "").toString().slice(0, 200);
    const listingId = (data.listingId || "").toString().slice(0, 100);
    const source = (data.source || "").toString().slice(0, 40);

    if (!phone && !name) {
      return Response.json({ ok: false, error: "empty" }, { status: 400 });
    }

    // Сохраняем заявку. Если она пришла с карточки объекта — находим владельца объявления,
    // чтобы риелтор увидел обращение в своём кабинете.
    if (supa) {
      try {
        let ownerEmail = null, ownerTg = null;
        if (listingId) {
          const { data: l } = await supa
            .from("listings")
            .select("owner_email, tg_user_id")
            .eq("id", listingId)
            .maybeSingle();
          if (l) { ownerEmail = l.owner_email || null; ownerTg = l.tg_user_id ?? null; }
        }
        await supa.from("leads").insert({
          name: name || null,
          phone: phone || null,
          comment: comment || null,
          type: type || null,
          object_title: object || null,
          listing_id: listingId || null,
          owner_email: ownerEmail,
          owner_tg: ownerTg,
          source: source || null,
          utm_source: (data.utmSource || "").toString().slice(0, 100) || null,
          utm_medium: (data.utmMedium || "").toString().slice(0, 100) || null,
          utm_campaign: (data.utmCampaign || "").toString().slice(0, 100) || null,
        });
      } catch (e) {
        // Падение записи в БД не должно ломать приём заявки — уведомление уйдёт всё равно.
        console.error("lead save failed:", e.message);
      }
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chat = process.env.TELEGRAM_CHAT_ID;
    const text =
      "🔔 Новая заявка с сайта Baylux\n" +
      "Тип: " + (type || "—") + "\n" +
      "Объект: " + (object || "—") + "\n" +
      "Имя: " + (name || "—") + "\n" +
      "Телефон: " + (phone || "—") + "\n" +
      "Комментарий: " + (comment || "—");

    if (token && chat) {
      const r = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text }),
      });
      if (!r.ok) console.error("Telegram error", await r.text());
    } else {
      console.log("LEAD (Telegram not configured):", text);
    }

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
