"use client";
import { useLang } from "@/components/LangContext";

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

// Единый текст сообщения об объекте для мессенджеров (задача №05): название, цена с валютой
// и периодом, устойчивый ID и абсолютная ссылка на карточку. Тот же формат — в Telegram-кнопке
// и в подборках (№07). encodeURIComponent корректно кодирует переносы, кириллицу, грузинский и ₾/$.
export function buildPropertyMessage(t, { propertyTitle, price, propertyId, propertyUrl }) {
  const lines = [`${t("tg_msg_h")} «${propertyTitle}»${price ? ` · ${price}` : ""}`];
  if (propertyId) lines.push(`ID: ${propertyId}`);
  if (propertyUrl) lines.push(propertyUrl);
  return lines.join("\n");
}

// Кнопка «Связаться в WhatsApp». Открывает wa.me с подготовленным текстом — отправляет
// сообщение сам пользователь в мессенджере; «Отправлено» здесь не показываем и не считаем.
//   phone — получатель (цифры, без +): контакт из объявления либо номер Baylux (правило не меняем);
//   href  — готовая ссылка для случаев без объекта (страница контактов); если задан — текст не собираем.
export default function WhatsAppContactButton({
  href,
  phone = "",
  price = "",
  propertyId = "",
  propertyTitle = "",
  propertyUrl = "",
  className = "btn btn-wa",
  children,
}) {
  const { t } = useLang();
  const finalHref = href || (phone
    ? `https://wa.me/${String(phone).replace(/\D/g, "")}?text=${encodeURIComponent(buildPropertyMessage(t, { propertyTitle, price, propertyId, propertyUrl }))}`
    : "#");
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
    <a className={className} href={finalHref} target="_blank" rel="noopener" onClick={track}>
      {children}
    </a>
  );
}
