// Приём клика по кнопке «Связаться в WhatsApp» и пересылка события в BAYLUX CRM.
// Секрет и адрес CRM — только серверные переменные, в клиент/бандл не попадают.
// Клиента и сделку не создаёт, номер посетителя не собирает.
// Ошибка CRM не влияет на пользователя: WhatsApp открывается на клиенте независимо,
// клиент даже не ждёт ответа этого endpoint (fetch keepalive без await).
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.BAYLUX_CRM_WEBHOOK_SECRET || "";
const CRM_URL = process.env.BAYLUX_CRM_WHATSAPP_CLICK_URL || "";
const MAX = 400;        // предел длины строкового поля
const MAX_BODY = 4000;  // предел размера тела запроса

const s = (v) => (typeof v === "string" ? v : "").slice(0, MAX);

export async function POST(req) {
  const raw = await req.text();
  if (!raw || raw.length > MAX_BODY) return Response.json({ ok: false, error: "bad body" }, { status: 400 });

  let body;
  try { body = JSON.parse(raw); } catch { return Response.json({ ok: false, error: "bad json" }, { status: 400 }); }
  if (!body || typeof body !== "object") return Response.json({ ok: false, error: "bad body" }, { status: 400 });

  const eventId = s(body.eventId);
  const propertyId = s(body.propertyId);
  const propertyUrl = s(body.propertyUrl);
  const clickedAt = s(body.clickedAt);
  if (!eventId || !propertyId || !propertyUrl || !clickedAt) {
    return Response.json({ ok: false, error: "missing fields" }, { status: 400 });
  }
  // propertyUrl принимаем только со своего домена.
  if (!/^https:\/\/([a-z0-9-]+\.)*bayluxhome\.(com|ge)(\/|$)/i.test(propertyUrl)) {
    return Response.json({ ok: false, error: "bad url" }, { status: 400 });
  }

  // По возможности сверяем propertyId с базой сайта. Если объявления нет — событие
  // всё равно принимаем (id может быть slug дома), но помечаем это для CRM.
  let known = null;
  if (supa && /^[0-9a-f-]{36}$/i.test(propertyId)) {
    try {
      const { data } = await supa.from("listings").select("id").eq("id", propertyId).maybeSingle();
      known = !!data;
    } catch (e) { /* проверка необязательна */ }
  }

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
  if (known !== null) payload.propertyKnown = known;

  if (!SECRET || !CRM_URL) return Response.json({ ok: true, forwarded: false });

  try {
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(CRM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-baylux-webhook-secret": SECRET },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(tm);
    // Ответ CRM, её URL и секрет клиенту не раскрываем. 201 — создано, 200 — уже было.
    return Response.json({ ok: true, forwarded: r.ok, created: r.status === 201 });
  } catch (e) {
    // Логируем только тип ошибки — без payload, секрета и URL.
    console.error("crm whatsapp-click forward failed:", e && e.name ? e.name : "error");
    return Response.json({ ok: true, forwarded: false, retry: true });
  }
}

export function GET() { return Response.json({ ok: false, error: "method not allowed" }, { status: 405 }); }
