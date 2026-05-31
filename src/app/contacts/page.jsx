import { WA_PHONE, waLink } from "@/config";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const metadata = {
  title: "Контакты",
  description: "Связаться с Baylux: WhatsApp, Telegram, e-mail. Недвижимость в Батуми — продажа, аренда, управление.",
};

export default function ContactsPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return (
    <div className="wrap cms">
      <h1>{t("co_title")}</h1>
      <p>{t("co_p")}</p>

      <div className="contact-row">
        <a href={waLink("Здравствуйте! Пишу с сайта Baylux.")} target="_blank" rel="noopener">💬 WhatsApp: +{WA_PHONE}</a>
        <a href="https://t.me/baylux_leads_bot" target="_blank" rel="noopener">✈️ Telegram: @baylux_leads_bot</a>
        <a href="mailto:bayluxhome@yahoo.com">✉️ E-mail: bayluxhome@yahoo.com</a>
      </div>

      <h2>{t("co_h_where")}</h2>
      <p>{t("co_where")}</p>

      <h2>{t("co_h_post")}</h2>
      <p>{t("co_post")}</p>

      <p className="muted" style={{ marginTop: 18 }}>{t("co_foot")}</p>
    </div>
  );
}
