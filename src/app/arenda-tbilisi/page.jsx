import SeoLanding from "@/components/SeoLanding";
import { getAllUnits } from "@/data/source";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const revalidate = 300;

export async function generateMetadata() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return {
    title: t("at_mt"),
    description: t("at_md"),
    alternates: { canonical: "/arenda-tbilisi" },
    openGraph: { title: t("at_mt"), description: t("at_md"), type: "website", url: "https://bayluxhome.com/arenda-tbilisi", images: ["/hero-tbilisi.webp"] },
  };
}

export default async function Page() {
  let units = await getAllUnits();
  units = units.filter((u) => u.deal === "rent" && u.building?.district === "Тбилиси");
  return (
    <SeoLanding
      prefix="at"
      slug="arenda-tbilisi"
      units={units}
      catalogHref="/catalog?deal=rent&city=Тбилиси"
      crumbLk="nav_rent"
      extraHref="/posutochno-tbilisi"
      extraLk="pt_foot"
    />
  );
}
