import Link from "next/link";
import { getLang } from "@/lib/serverLang";
import { t as tr, cityLabel } from "@/lib/dict";
import { withLang } from "@/lib/i18nPath";
import { COMPANY, SOCIAL, fmtPhone } from "@/config";
import CookieLink from "@/components/CookieLink";

export default function Footer() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  // Все внутренние ссылки — в языковую ветку (/ru/…), чтобы обходиться без редиректа.
  const A = ({ href, ...p }) => <Link href={withLang(lang, href)} {...p} />;
  return (
    <footer className="site">
      <div className="wrap">
        <div className="fgrid">
          <div>
            <AclassName="logo" href="/"><img src="/baylux_logo_white.svg" alt="Baylux" /></A>
            <p style={{ marginTop: 14, fontSize: 14, maxWidth: 300 }}>{t("foot_about")}</p>
            <div className="fsocial">
              {SOCIAL.instagram && (
                <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="20" height="20" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>
                </a>
              )}
              {SOCIAL.facebook && (
                <a href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.13 22 16.99 22 12z"/></svg>
                </a>
              )}
            </div>
          </div>
          <div>
            <h4>{t("foot_realty")}</h4>
            {/* Общие категории по всей Грузии — без городского фильтра (город в cookie не хранится, каталог берёт его только из URL) */}
            <Ahref="/catalog?deal=sale">{t("nav_sale")}</A>
            <Ahref="/catalog?deal=rent">{t("nav_rent")}</A>
            <Ahref="/novostroyki">{t("nav_new")}</A>
            <Ahref="/catalog?deal=daily">{t("nav_daily")}</A>
            <Ahref="/catalog?cat=apartment">{t("ft_apart")}</A>
          </div>
          <div>
            <h4>{t("nav_services")}</h4>
            <Ahref="/property-management">{t("foot_mgmt")}</A><Ahref="/cleaning">{t("foot_cleaning")}</A><Ahref="/realtors">{t("foot_realtors")}</A>
          </div>
          <div>
            <h4>{t("foot_company")}</h4>
            <Ahref="/about">{t("foot_about_l")}</A><Ahref="/blog">{t("blog_h")}</A><Ahref="/news">{t("foot_news")}</A><Ahref="/contacts">{t("foot_contacts")}</A><Ahref="/terms">{t("foot_terms")}</A><Ahref="/privacy">{t("foot_privacy")}</A><Ahref="/cookies">{t("ck_title")}</A><Ahref="/rules">{t("rl_title")}</A><CookieLink />
          </div>
        </div>
        {/* Публично — бренд и контакты из COMPANY; оператор ПД (физлицо) — в Политике конфиденциальности («Юридическая информация») */}
        <div className="fbar" style={{ flexWrap: "wrap", gap: 6 }}>
          <span className="fbar-contacts">
            {COMPANY.publicName}
            {COMPANY.officeAddress ? <> · {COMPANY.officeAddress}, {cityLabel(lang, COMPANY.officeCity)}</> : null}
            {" · "}<a href={"tel:+" + COMPANY.phone}>{fmtPhone(COMPANY.phone)}</a>
            {" · "}<a href={"mailto:" + COMPANY.email}>{COMPANY.email}</a>
            {" · "}<Ahref="/privacy">{t("foot_legal")}</A>
          </span>
          <span>© Baylux Home 2026 · Batumi, Georgia</span>
        </div>
      </div>
    </footer>
  );
}
