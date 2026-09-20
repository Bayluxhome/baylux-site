import SeoLanding from "@/components/SeoLanding";
import { getAllUnits } from "@/data/source";
import { unitCat } from "@/data/data";
import { getLang } from "@/lib/serverLang";
import { altFor, withLang } from "@/lib/i18nPath";
import { t as tr } from "@/lib/dict";

export const revalidate = 300;

export async function generateMetadata() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return {
    title: t("kt_mt"),
    description: t("kt_md"),
    alternates: altFor(lang, "/kupit-kvartiru-tbilisi"),
    openGraph: { title: t("kt_mt"), description: t("kt_md"), type: "website", url: withLang(lang, "/kupit-kvartiru-tbilisi"), images: ["/hero-tbilisi.webp"] },
  };
}

export default async function Page() {
  let units = await getAllUnits();
  units = units.filter((u) => u.deal === "sale" && unitCat(u.type) === "apartment" && u.building?.district === "Тбилиси");
  return (
    <SeoLanding
      prefix="kt"
      slug="kupit-kvartiru-tbilisi"
      units={units}
      catalogHref="/catalog?deal=sale&cat=apartment&city=Тбилиси"
      crumbLk="nav_sale"
      extraHref="/arenda-tbilisi"
      extraLk="at_foot"
    />
  );
}
