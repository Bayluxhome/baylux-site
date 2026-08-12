"use client";
import { useLang } from "@/components/LangContext";

const SITE = "https://bayluxhome.com";

// Анонимный ID сессии браузера (без персональных данных). Живёт в рамках вкладки/сессии.
function getSessionId() {
  try {
    let sid = sessionStorage.getItem("bx_sid");
    if (!sid) {
      sid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
      sessionStorage.setItem("bx_sid", sid);
    }
    return sid;
  } catch { return ""; }
}

// UTM фиксируем при ПЕРВОМ входе в сессию, чтобы не потерять после переходов на карточки.
function getFirstTouchUtm() {
  const empty = { utmSource: "", utmMedium: "", utmCampaign: "", utmContent: "" };
  try {
    const saved = sessionStorage.getItem("bx_utm");
    if (saved) return JSON.parse(saved);
    const q = new URLSearchParams(window.location.search);
    const utm = {
      utmSource: q.get("utm_source") || "",
      utmMedium: q.get("utm_medium") || "",
      utmCampaign: q.get("utm_campaign") || "",
      utmContent: q.get("utm_content") || "",
    };
    sessionStorage.setItem("bx_utm", JSON.stringify(utm));
    return utm;
  } catch { return empty; }
}

const uuid = () => (typeof window !== "undefined" && window.crypto && crypto.randomUUID)
  ? crypto.randomUUID()
  : String(Date.now()) + Math.random().toString(16).slice(2);

// Кнопка «Связаться в Telegram» с предзаполненным текстом об объекте и трекингом клика в CRM.
// Открытие Telegram идёт штатно по href (не блокируется трекингом); событие уходит на
// same-origin endpoint /api/crm/telegram-click, который уже пересылает его в CRM с секретом.
export default function TelegramContactButton({
  username,
  propertyId = "",
  propertyTitle = "",
  propertyPath = "",
  className = "btn btn-tg",
  children,
}) {
  const { t } = useLang();
  const url = propertyPath ? SITE + propertyPath : SITE;
  const msg = `${t("tg_msg_h")} «${propertyTitle}».\nID: ${propertyId}\n${url}`;
  const href = `https://t.me/${username}?text=${encodeURIComponent(msg)}`;

  function track() {
    // keepalive — чтобы запрос дошёл, даже когда вкладка переключается в Telegram.
    // Никакого await/preventDefault: открытие Telegram происходит по href в том же клике.
    try {
      const payload = {
        eventId: uuid(),
        propertyId,
        propertyTitle,
        propertyUrl: url,
        clickedAt: new Date().toISOString(),
        sessionId: getSessionId(),
        referrer: (typeof document !== "undefined" && document.referrer) || "",
        ...getFirstTouchUtm(),
      };
      fetch("/api/crm/telegram-click", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch { /* трекинг не должен мешать открытию Telegram */ }
  }

  return (
    <a className={className} href={href} target="_blank" rel="noopener" onClick={track}>
      {children}
    </a>
  );
}
