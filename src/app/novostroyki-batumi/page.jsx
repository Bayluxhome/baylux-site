import SeoLanding from "@/components/SeoLanding";
import { getAllUnits } from "@/data/source";
import { unitIsNew } from "@/data/data";

export const revalidate = 300;

export const metadata = {
  title: "Новостройки Батуми — квартиры от застройщиков, цены и рассрочка",
  description:
    "Новостройки в Батуми: квартиры и апартаменты от застройщиков с рассрочкой. Цены, сроки сдачи, проверка договора — Baylux.",
  alternates: { canonical: "/novostroyki-batumi" },
  openGraph: {
    title: "Новостройки Батуми — Baylux",
    description: "Квартиры от застройщиков: цены, рассрочка, проверка договора.",
    type: "website",
    url: "https://bayluxhome.com/novostroyki-batumi",
    images: ["/hero-batumi.jpg"],
  },
};

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
