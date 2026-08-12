// Приём клика по кнопке «Связаться в Telegram» и пересылка события в BAYLUX CRM.
// Секрет и URL CRM — ТОЛЬКО серверные переменные окружения, в клиент/бандл не попадают.
// Ошибка CRM не мешает пользователю: Telegram открывается независимо на клиенте, а клиент
// даже не ждёт ответа этого endpoint (fetch keepalive без await).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.BAYLUX_CRM_WEBHOOK_SECRET || "";
const CRM_URL = process.env.BAYLUX_CRM_TELEGRAM_CLICK_URL || "";
const MAX = 400; // предел длины строковых полей — защита от мусора

const s = (v) => (typeof v === "string" ? v : "").slice(0, MAX);

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: "bad json" }, { status: 400 }); }
  if (!body || typeof body !== "object") return Response.json({ ok: false, error: "bad body" }, { status: 400 });

  // Обязательные поля
  const eventId = s(body.eventId);
  const propertyId = s(body.propertyId);
  const propertyUrl = s(body.propertyUrl);
  const clickedAt = s(body.clickedAt);
  if (!eventId || !propertyId || !propertyUrl || !clickedAt) {
    return Response.json({ ok: false, error: "missing fields" }, { status: 400 });
  }
  // propertyUrl принимаем только со своего домена (bayluxhome.com/.ge и поддомены)
  if (!/^https:\/\/([a-z0-9-]+\.)*bayluxhome\.(com|ge)(\/|$)/i.test(propertyUrl)) {
    return Response.json({ ok: false, error: "bad url" }, { status: 400 });
  }

  // Нормализованный payload — пересылаем только провалидированное, не доверяя клиенту.
  const payload = {
    eventId, propertyId, propertyUrl, clickedAt,
    propertyTitle: s(body.propertyTitle),
    sessionId: s(body.sessionId),
    referrer: s(body.referrer),
    utmSource: s(body.utmSource),
    utmMedium: s(body.utmMedium),
    utmCampaign: s(body.utmCampaign),
    utmContent: s(body.utmContent),
  };

  // CRM не настроена (нет секрета/URL) — тихо принимаем, ничего не ломаем.
  if (!SECRET || !CRM_URL) return Response.json({ ok: true, forwarded: false });

  try {
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), 4000); // таймаут исходящего запроса
    const r = await fetch(CRM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-baylux-webhook-secret": SECRET },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(tm);
    // Ответ CRM, её URL и секрет клиенту не раскрываем.
    return Response.json({ ok: true, forwarded: r.ok });
  } catch (e) {
    // Логируем ТОЛЬКО тип ошибки — без секрета и URL.
    console.error("crm telegram-click forward failed:", e && e.name ? e.name : "error");
    return Response.json({ ok: true, forwarded: false });
  }
}

// Остальные методы запрещены.
export function GET() { return Response.json({ ok: false, error: "method not allowed" }, { status: 405 }); }
