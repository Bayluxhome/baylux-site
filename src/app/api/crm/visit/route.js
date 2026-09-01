// Анонимный визит на сайт → раздел «Визиты на сайт» в BAYLUX CRM.
// Клиента/сделку не создаёт. Секрет и адрес CRM — только серверные переменные.
// Персональные данные не собираются и не пересылаются: ни IP, ни полный User-Agent,
// ни fingerprint, ни рекламные идентификаторы — только то, что перечислено в payload ниже.
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.BAYLUX_CRM_WEBHOOK_SECRET || "";
const CRM_URL = process.env.BAYLUX_CRM_WEBSITE_VISIT_URL || "";
const MAX = 500;           // предел длины строкового поля
const MAX_BODY = 4000;     // предел размера тела запроса

const s = (v) => (typeof v === "string" ? v : "").slice(0, MAX);
const DEVICES = new Set(["DESKTOP", "MOBILE", "TABLET", "OTHER"]);

export async function POST(req) {
  // Ограничиваем размер тела — защита от мусорных запросов.
  const raw = await req.text();
  if (!raw || raw.length > MAX_BODY) return Response.json({ ok: false, error: "bad body" }, { status: 400 });

  let body;
  try { body = JSON.parse(raw); } catch { return Response.json({ ok: false, error: "bad json" }, { status: 400 }); }
  if (!body || typeof body !== "object") return Response.json({ ok: false, error: "bad body" }, { status: 400 });

  const eventId = s(body.eventId);
  const visitedAt = s(body.visitedAt);
  const pageUrl = s(body.pageUrl);
  if (!eventId || !visitedAt || !pageUrl) return Response.json({ ok: false, error: "missing fields" }, { status: 400 });
  // pageUrl принимаем только со своего домена.
  if (!/^https:\/\/([a-z0-9-]+\.)*bayluxhome\.(com|ge)(\/|$)/i.test(pageUrl)) {
    return Response.json({ ok: false, error: "bad url" }, { status: 400 });
  }

  const device = String(body.deviceType || "").toUpperCase();
  const payload = {
    eventId,
    visitedAt,
    sessionId: s(body.sessionId),
    pageUrl,
    referrer: s(body.referrer),
    utmSource: s(body.utmSource),
    utmMedium: s(body.utmMedium),
    utmCampaign: s(body.utmCampaign),
    utmContent: s(body.utmContent),
    utmTerm: s(body.utmTerm),
    deviceType: DEVICES.has(device) ? device : "OTHER",
    language: s(body.language).slice(0, 20),
  };

  // Защита от повторной обработки одного визита: если такой eventId уже был —
  // отвечаем duplicate и в CRM повторно не шлём (клиент может ретраить при сбое сети).
  if (supa) {
    try {
      const { data: seen } = await supa.from("site_visits").select("event_id").eq("event_id", eventId).maybeSingle();
      if (seen) return Response.json({ ok: true, duplicate: true });
      await supa.from("site_visits").insert({
        event_id: eventId,
        visited_at: visitedAt,
        session_id: payload.sessionId || null,
        page_url: pageUrl,
        referrer: payload.referrer || null,
        utm_source: payload.utmSource || null,
        utm_medium: payload.utmMedium || null,
        utm_campaign: payload.utmCampaign || null,
        utm_content: payload.utmContent || null,
        utm_term: payload.utmTerm || null,
        device_type: payload.deviceType,
        language: payload.language || null,
      });
    } catch (e) {
      // Таблицы может не быть (миграция не применена) — визит всё равно уйдёт в CRM.
      console.error("visit store failed:", e && e.message ? e.message : "error");
    }
  }

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
    // 201 — новый визит, 200 — уже обработанный. Ответ CRM клиенту не раскрываем.
    return Response.json({ ok: true, forwarded: r.ok, created: r.status === 201 });
  } catch (e) {
    console.error("crm visit forward failed:", e && e.name ? e.name : "error");
    return Response.json({ ok: true, forwarded: false, retry: true });
  }
}

export function GET() { return Response.json({ ok: false, error: "method not allowed" }, { status: 405 }); }
