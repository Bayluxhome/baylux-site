// Приём заявок: уведомление в Telegram. Безопасно работает и без настроенного бота.
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

    if (!phone && !name) {
      return Response.json({ ok: false, error: "empty" }, { status: 400 });
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
