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
    title: t("kb_mt"),
    description: t("kb_md"),
    alternates: altFor(lang, "/kupit-kvartiru-batumi"),
    openGraph: { title: t("kb_mt"), description: t("kb_md"), type: "website", url: withLang(lang, "/kupit-kvartiru-batumi"), images: ["/hero-batumi.jpg"] },
  };
}

export default async function Page() {
  let units = await getAllUnits();
  units = units.filter((u) => u.deal === "sale" && unitCat(u.type) === "apartment" && u.building?.district === "Батуми");
  return (
    <SeoLanding
      prefix="kb"
      slug="kupit-kvartiru-batumi"
      units={units}
      catalogHref="/catalog?deal=sale&cat=apartment"
      crumbLk="nav_sale"
      extraHref="/novostroyki-batumi"
      extraLk="nav_new"
    />
  );
}
