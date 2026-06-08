import SeoLanding from "@/components/SeoLanding";
import { getAllUnits } from "@/data/source";
import { unitCat } from "@/data/data";

export const revalidate = 300;

export const metadata = {
  title: "Купить квартиру в Батуми — цены, фото, вторичка и новостройки",
  description:
    "Купить квартиру в Батуми: проверенные объявления с ценами и фото — студии, 1-3-комнатные и апартаменты у моря. Сопровождение сделки под ключ от Baylux.",
  alternates: { canonical: "/kupit-kvartiru-batumi" },
  openGraph: {
    title: "Купить квартиру в Батуми — Baylux",
    description: "Проверенные квартиры на продажу в Батуми: цены, фото, сопровождение сделки.",
    type: "website",
    url: "https://bayluxhome.com/kupit-kvartiru-batumi",
    images: ["/hero-batumi.jpg"],
  },
};

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
