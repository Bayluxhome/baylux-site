"use client";

// Кнопка «Связаться в WhatsApp» с трекингом клика в CRM.
// ВАЖНО: ссылку не формируем и не меняем — href приходит готовым (waLink/waHref),
// поэтому номер, схема ссылки и подставляемый текст остаются ровно те же, что и были.
// Открытие WhatsApp идёт штатно по href в том же клике; трекинг его не блокирует.

const uuid = () => (typeof window !== "undefined" && window.crypto && crypto.randomUUID)
  ? crypto.randomUUID()
  : String(Date.now()) + Math.random().toString(16).slice(2);

// Тот же анонимный ID сессии, что у Telegram-кликов и визитов — события связываются между собой.
function getSessionId() {
  try {
    let sid = sessionStorage.getItem("bx_sid");
    if (!sid) { sid = uuid(); sessionStorage.setItem("bx_sid", sid); }
    return sid;
  } catch { return ""; }
}

// UTM фиксируются при первом входе в сессию (тем же ключом, что и в остальных интеграциях).
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

export default function WhatsAppContactButton({
  href,
  propertyId = "",
  propertyTitle = "",
  propertyUrl = "",
  className = "btn btn-wa",
  children,
}) {
  function track() {
    // keepalive — чтобы запрос дошёл, даже когда вкладка уходит в WhatsApp.
    // Никакого await и preventDefault: переход по href происходит в том же клике.
    try {
      let ref = "";
      try {
        const r = document.referrer || "";
        if (r && new URL(r).hostname !== window.location.hostname) ref = r;
      } catch (e) { /* некорректный referrer */ }

      const payload = {
        eventId: uuid(),
        propertyId,
        propertyTitle,
        propertyUrl: propertyUrl || window.location.origin + window.location.pathname,
        clickedAt: new Date().toISOString(),
        sessionId: getSessionId(),
        referrer: ref,
        ...getFirstTouchUtm(),
      };
      fetch("/api/crm/whatsapp-click", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch { /* трекинг не должен мешать открытию WhatsApp */ }
  }

  return (
    <a className={className} href={href} target="_blank" rel="noopener" onClick={track}>
      {children}
    </a>
  );
}
