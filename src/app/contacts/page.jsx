import { COMPANY, SITE_URL, WA_DISPLAY, waLink, fmtPhone } from "@/config";
import { getLang } from "@/lib/serverLang";
import { t as tr, cityLabel } from "@/lib/dict";
import ContactForm from "@/components/ContactForm";

export async function generateMetadata() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return {
    title: { absolute: t("co_meta_t") },
    description: t("co_meta_d"),
    alternates: { canonical: "/contacts" },
    openGraph: { title: t("co_meta_t"), description: t("co_meta_d"), type: "website", url: `${SITE_URL}/contacts` },
  };
}

// Контакты берутся только из COMPANY (config.js) — один источник для страницы, футера и JSON-LD.
// Адрес офиса и часы работы не подтверждены → соответствующие строки не рендерятся.
export default function ContactsPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const office = COMPANY.officeAddress
    ? `${COMPANY.officeAddress}, ${cityLabel(lang, COMPANY.officeCity)}`
    : "";
  return (
    <div className="wrap cms">
      <h1>{t("co_title")}</h1>
      <p>{t("co_p")}</p>

      <div className="co-grid">
        <div>
          <h2 style={{ marginTop: 0 }}>{t("co_h_contacts")}</h2>
          <div className="contact-row co-list">
            <div><strong>{COMPANY.publicName}</strong></div>
            {office && (
              <div>📍 {t("co_office")}: {COMPANY.officeMapUrl
                ? <a href={COMPANY.officeMapUrl} target="_blank" rel="noopener noreferrer" aria-label={t("co_route")}>{office}</a>
                : office}</div>
            )}
            <a href={"tel:+" + COMPANY.phone}>📞 {t("co_phone")}: {fmtPhone(COMPANY.phone)}</a>
            <a href={"mailto:" + COMPANY.email}>✉️ {t("co_email")}: {COMPANY.email}</a>
            <a href={waLink("Здравствуйте! Пишу с сайта Baylux.")} target="_blank" rel="noopener noreferrer">💬 WhatsApp: {WA_DISPLAY}</a>
            <a href={"https://t.me/" + COMPANY.telegram} target="_blank" rel="noopener noreferrer">✈️ Telegram: @{COMPANY.telegram}</a>
            {COMPANY.businessHours && <div>🕒 {COMPANY.businessHours}</div>}
          </div>

          <h2>{t("co_h_where")}</h2>
          <p>{t("co_where")}</p>

          <h2>{t("co_h_post")}</h2>
          <p>{t("co_post")}</p>
        </div>
        <ContactForm />
      </div>

      <p className="muted" style={{ marginTop: 18 }}>{t("co_foot")}</p>
    </div>
  );
}
