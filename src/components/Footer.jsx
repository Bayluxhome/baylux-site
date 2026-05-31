import Link from "next/link";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

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
            <a href="/#services">{t("foot_mgmt")}</a><a href="/#services">{t("foot_cleaning")}</a><a href="/#services">{t("foot_realtors")}</a>
          </div>
          <div>
            <h4>{t("foot_company")}</h4>
            <Link href="/about">{t("foot_about_l")}</Link><Link href="/contacts">{t("foot_contacts")}</Link><Link href="/terms">{t("foot_terms")}</Link><Link href="/privacy">{t("foot_privacy")}</Link>
          </div>
        </div>
        <div className="fbar"><span>© Baylux 2026 · Batumi, Georgia</span><span>WhatsApp · Instagram · Telegram</span></div>
      </div>
    </footer>
  );
}
