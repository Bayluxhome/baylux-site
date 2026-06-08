import SeoLanding from "@/components/SeoLanding";
import { getAllUnits } from "@/data/source";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const revalidate = 300;

export async function generateMetadata() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return {
    title: t("pt_mt"),
    description: t("pt_md"),
    alternates: { canonical: "/posutochno-tbilisi" },
    openGraph: { title: t("pt_mt"), description: t("pt_md"), type: "website", url: "https://bayluxhome.com/posutochno-tbilisi", images: ["/hero-tbilisi.webp"] },
  };
}

export default async function Page() {
  let units = await getAllUnits();
  units = units.filter((u) => u.deal === "daily" && u.building?.district === "Тбилиси");
  return (
    <SeoLanding
      prefix="pt"
      slug="posutochno-tbilisi"
      units={units}
      catalogHref="/catalog?deal=daily&city=Тбилиси"
      crumbLk="nav_daily"
      extraHref="/arenda-tbilisi"
      extraLk="at_foot"
    />
  );
}
