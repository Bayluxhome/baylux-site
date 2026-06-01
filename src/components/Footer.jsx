import Link from "next/link";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";
import { OPERATOR, SOCIAL } from "@/config";
import CookieLink from "@/components/CookieLink";

export default function Footer() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return (
    <footer className="site">
      <div className="wrap">
        <div className="fgrid">
          <div>
            <Link className="logo" href="/"><img src="/baylux_logo_white.svg" alt="Baylux" /></Link>
            <p style={{ marginTop: 14, fontSize: 14, maxWidth: 300 }}>{t("foot_about")}</p>
            <div className="fsocial">
              {SOCIAL.instagram && (
                <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="20" height="20" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>
                </a>
              )}
              {SOCIAL.facebook && (
                <a href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M14 8.5h2.2V5.4c-.38-.05-1.3-.16-2.36-.16-2.34 0-3.94 1.43-3.94 4.05V12H7v3.3h2.9V24h3.5v-8.7h2.78L16.6 12h-3.2V9.6c0-.8.22-1.1 1.1-1.1z"/></svg>
                </a>
              )}
            </div>
          </div>
          <div>
            <h4>{t("foot_realty")}</h4>
            <Link href="/catalog?deal=sale">{t("nav_sale")}</Link>
            <Link href="/catalog?deal=rent">{t("nav_rent")}</Link>
            <Link href="/catalog?new=1">{t("nav_new")}</Link>
            <Link href="/catalog?deal=daily">{t("nav_daily")}</Link>
          </div>
          <div>
            <h4>{t("nav_services")}</h4>
            <a href="/#services">{t("foot_mgmt")}</a><a href="/#services">{t("foot_cleaning")}</a><a href="/realtors">{t("foot_realtors")}</a>
          </div>
          <div>
            <h4>{t("foot_company")}</h4>
            <Link href="/about">{t("foot_about_l")}</Link><Link href="/news">{t("foot_news")}</Link><Link href="/contacts">{t("foot_contacts")}</Link><Link href="/terms">{t("foot_terms")}</Link><Link href="/privacy">{t("foot_privacy")}</Link><Link href="/cookies">{t("ck_title")}</Link><Link href="/rules">{t("rl_title")}</Link><CookieLink />
          </div>
        </div>
        <div className="fbar" style={{ flexWrap: "wrap", gap: 6 }}>
          <span>{t("foot_operator")}: {OPERATOR.name} · {OPERATOR.email} · {OPERATOR.phone}</span>
          <span>© Baylux 2026 · Batumi, Georgia</span>
        </div>
      </div>
    </footer>
  );
}
