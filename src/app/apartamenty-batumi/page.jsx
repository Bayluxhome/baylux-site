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
    title: t("ap_mt"),
    description: t("ap_md"),
    alternates: { canonical: "/apartamenty-batumi" },
    openGraph: { title: t("ap_mt"), description: t("ap_md"), type: "website", url: "https://bayluxhome.com/apartamenty-batumi", images: ["/hero-batumi.jpg"] },
  };
}

export default async function Page() {
  const all = await getAllUnits();
  let units = all.filter((u) => /апарт|apart/i.test(u.type || "") && u.building?.district === "Батуми");
  if (!units.length) units = all.filter((u) => u.deal === "sale" && unitCat(u.type) === "apartment" && u.building?.district === "Батуми");
  return (
    <SeoLanding
      prefix="ap"
      slug="apartamenty-batumi"
      units={units}
      catalogHref="/catalog?cat=apartment"
      crumbLk="crumb_catalog"
      extraHref="/property-management"
      extraLk="foot_mgmt"
    />
  );
}
