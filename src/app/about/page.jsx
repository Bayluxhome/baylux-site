import Link from "next/link";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";
import { SITE_URL } from "@/config";

export async function generateMetadata() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return {
    title: { absolute: t("ab_meta_t") },
    description: t("ab_meta_d"),
    alternates: { canonical: "/about" },
    openGraph: { title: t("ab_meta_t"), description: t("ab_meta_d"), type: "website", url: `${SITE_URL}/about` },
  };
}

export default function AboutPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return (
    <div className="wrap cms">
      <h1>{t("ab_title")}</h1>
      <p>{t("ab_p1")}</p>
      <p>{t("ab_p2")}</p>

      <h2>{t("ab_h_do")}</h2>
      <ul>
        <li>{t("ab_do1")}</li>
        <li>{t("ab_do2")}</li>
        <li>{t("ab_do3")}</li>
        <li>{t("ab_do4")}</li>
        <li>{t("ab_do5")}</li>
      </ul>

      <h2>{t("ab_h_geo")}</h2>
      <p>{t("ab_geo_p")}</p>

      <h2>{t("ab_h_why")}</h2>
      <ul>
        <li>{t("ab_why1")}</li>
        <li>{t("ab_why2")}</li>
        <li>{t("ab_why3")}</li>
        <li>{t("ab_why4")}</li>
      </ul>

      <p>{t("ab_cta_p")}</p>
      <p style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Link className="btn btn-gold" href="/catalog" style={{ padding: "11px 20px" }}>{t("ab_btn_catalog")}</Link>
        <Link className="btn btn-ghost" href="/add" style={{ padding: "11px 18px" }}>{t("ab_btn_add")}</Link>
        <Link className="btn btn-ghost" href="/contacts" style={{ padding: "11px 18px" }}>{t("ab_btn_contacts")}</Link>
      </p>
    </div>
  );
}
