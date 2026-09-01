"use client";
import { useEffect } from "react";

// Один анонимный визит на браузерную сессию (не на каждый переход по сайту).
// Отправляется только при согласии на аналитику — как и GA4: иначе мы спрашивали бы
// разрешение в баннере cookies, уже начав считать.
const SENT = "bx_visit_sent";
const SID = "bx_sid";       // тот же анонимный ID сессии, что и в трекинге Telegram-кликов
const EID = "bx_visit_eid"; // eventId сохраняем, чтобы ретрай не создал второй визит

function hasAnalyticsConsent() {
  try {
    const m = document.cookie.match(/(?:^|; )cookie_consent=([^;]*)/);
    if (!m) return false;
    const c = JSON.parse(decodeURIComponent(m[1]));
    return !!(c && c.analytics);
  } catch (e) {
    return false;
  }
}

const uuid = () => (window.crypto && crypto.randomUUID)
  ? crypto.randomUUID()
  : String(Date.now()) + Math.random().toString(16).slice(2);

function deviceType() {
  const w = window.innerWidth || 0;
  const touch = (navigator.maxTouchPoints || 0) > 1;
  if (touch && w < 768) return "MOBILE";
  if (touch && w < 1180) return "TABLET";
  if (w >= 768) return "DESKTOP";
  return "OTHER";
}

export default function VisitTracker() {
  useEffect(() => {
    let cancelled = false;

    async function send() {
      if (cancelled) return;
      try { if (sessionStorage.getItem(SENT)) return; } catch (e) { return; }
      if (!hasAnalyticsConsent()) return;

      let sid = "", eid = "";
      try {
        sid = sessionStorage.getItem(SID) || uuid();
        sessionStorage.setItem(SID, sid);
        eid = sessionStorage.getItem(EID) || uuid();
        sessionStorage.setItem(EID, eid);
      } catch (e) { return; }

      const q = new URLSearchParams(window.location.search);
      // Внешний referrer: переходы внутри сайта источником не считаем.
      let ref = "";
      try {
        const r = document.referrer || "";
        if (r && new URL(r).hostname !== window.location.hostname) ref = r;
      } catch (e) { /* некорректный referrer */ }

      const body = JSON.stringify({
        eventId: eid,
        visitedAt: new Date().toISOString(),
        sessionId: sid,
        pageUrl: window.location.origin + window.location.pathname,
        referrer: ref,
        utmSource: q.get("utm_source") || "",
        utmMedium: q.get("utm_medium") || "",
        utmCampaign: q.get("utm_campaign") || "",
        utmContent: q.get("utm_content") || "",
        utmTerm: q.get("utm_term") || "",
        deviceType: deviceType(),
        language: navigator.language || "",
      });

      // До двух попыток с тем же eventId — сетевой сбой не должен терять визит,
      // а повтор не создаст дубль (сервер отсекает по eventId).
      for (let i = 0; i < 2; i++) {
        try {
          const r = await fetch("/api/crm/visit", {
            method: "POST", keepalive: true,
            headers: { "Content-Type": "application/json" },
            body,
          });
          const j = await r.json().catch(() => ({}));
          if (r.ok && !j.retry) { try { sessionStorage.setItem(SENT, "1"); } catch (e) {} return; }
        } catch (e) { /* пробуем ещё раз */ }
        await new Promise((res) => setTimeout(res, 2000));
      }
    }

    // Небольшая задержка, чтобы не мешать загрузке страницы.
    const t = setTimeout(send, 1500);
    // Если согласие дали позже — отправим сразу после выбора в баннере.
    window.addEventListener("bx:consent", send);
    return () => { cancelled = true; clearTimeout(t); window.removeEventListener("bx:consent", send); };
  }, []);

  return null;
}
