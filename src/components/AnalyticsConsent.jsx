"use client";
import { Analytics } from "@vercel/analytics/next";

// Читаем согласие из cookie (его ставит CookieConsent) синхронно — без гонки на первом просмотре.
function consentDenied() {
  try {
    const m = document.cookie.match(/(?:^|; )cookie_consent=([^;]*)/);
    if (!m) return false; // выбор ещё не сделан — Vercel Analytics cookieless, считаем посещение
    const c = JSON.parse(decodeURIComponent(m[1]));
    return c && c.analytics === false; // пользователь явно отключил аналитику
  } catch (e) {
    return false;
  }
}

export default function AnalyticsConsent() {
  return <Analytics beforeSend={(event) => (consentDenied() ? null : event)} />;
}
