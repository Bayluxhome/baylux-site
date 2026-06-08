import SeoLanding from "@/components/SeoLanding";
import { getAllUnits } from "@/data/source";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const revalidate = 300;

export async function generateMetadata() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return {
    title: t("pb_mt"),
    description: t("pb_md"),
    alternates: { canonical: "/posutochno-batumi" },
    openGraph: { title: t("pb_mt"), description: t("pb_md"), type: "website", url: "https://bayluxhome.com/posutochno-batumi", images: ["/hero-batumi.jpg"] },
  };
}

export default async function Page() {
  let units = await getAllUnits();
  units = units.filter((u) => u.deal === "daily" && u.building?.district === "Батуми");
  return (
    <SeoLanding
      prefix="pb"
      slug="posutochno-batumi"
      units={units}
      catalogHref="/catalog?deal=daily"
      crumbLk="nav_daily"
      extraHref="/arenda-batumi"
      extraLk="ar_foot"
    />
  );
}
