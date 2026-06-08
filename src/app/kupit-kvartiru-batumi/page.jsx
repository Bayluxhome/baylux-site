import SeoLanding from "@/components/SeoLanding";
import { getAllUnits } from "@/data/source";
import { unitCat } from "@/data/data";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const revalidate = 300;

export async function generateMetadata() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return {
    title: t("kb_mt"),
    description: t("kb_md"),
    alternates: { canonical: "/kupit-kvartiru-batumi" },
    openGraph: { title: t("kb_mt"), description: t("kb_md"), type: "website", url: "https://bayluxhome.com/kupit-kvartiru-batumi", images: ["/hero-batumi.jpg"] },
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
