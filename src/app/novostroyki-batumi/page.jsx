import SeoLanding from "@/components/SeoLanding";
import { getAllUnits } from "@/data/source";
import { unitIsNew } from "@/data/data";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const revalidate = 300;

export async function generateMetadata() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return {
    title: t("nb_mt"),
    description: t("nb_md"),
    alternates: { canonical: "/novostroyki-batumi" },
    openGraph: { title: t("nb_mt"), description: t("nb_md"), type: "website", url: "https://bayluxhome.com/novostroyki-batumi", images: ["/hero-batumi.jpg"] },
  };
}

export default async function Page() {
  let units = await getAllUnits();
  units = units.filter((u) => unitIsNew(u) && u.building?.district === "Батуми");
  return (
    <SeoLanding
      prefix="nb"
      slug="novostroyki-batumi"
      units={units}
      catalogHref="/catalog?new=1"
      crumbLk="nav_new"
      extraHref="/kupit-kvartiru-batumi"
      extraLk="kb_list_h"
    />
  );
}
