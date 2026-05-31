import Link from "next/link";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const metadata = {
  title: "О компании",
  description: "Baylux — продажа, аренда и управление недвижимостью в Батуми. Местная команда, проверенные объекты, прозрачные сделки.",
};

export default function AboutPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return (
    <div className="wrap cms">
      <h1>{t("ab_title")}</h1>
      <p>{t("ab_p1")}</p>

      <h2>{t("ab_h_do")}</h2>
      <ul>
        <li>{t("ab_do1")}</li>
        <li>{t("ab_do2")}</li>
        <li>{t("ab_do3")}</li>
        <li>{t("ab_do4")}</li>
      </ul>

      <h2>{t("ab_h_why")}</h2>
      <ul>
        <li>{t("ab_why1")}</li>
        <li>{t("ab_why2")}</li>
        <li>{t("ab_why3")}</li>
      </ul>

      <h2>{t("ab_h_plans")}</h2>
      <p>{t("ab_plans_p")}</p>

      <p style={{ marginTop: 22 }}>
        <Link className="btn btn-gold" href="/add" style={{ padding: "11px 20px" }}>{t("ab_btn_add")}</Link>{" "}
        <Link className="btn btn-ghost" href="/contacts" style={{ padding: "11px 18px" }}>{t("ab_btn_contacts")}</Link>
      </p>
    </div>
  );
}
