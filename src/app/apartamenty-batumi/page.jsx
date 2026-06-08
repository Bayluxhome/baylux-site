import SeoLanding from "@/components/SeoLanding";
import { getAllUnits } from "@/data/source";
import { unitCat } from "@/data/data";

export const revalidate = 300;

export const metadata = {
  title: "Апартаменты в Батуми — купить или снять у моря, цены и фото",
  description:
    "Апартаменты в Батуми у моря: продажа и аренда в новых комплексах. Проверенные объекты с фото и ценами, помощь в сделке и управление от Baylux.",
  alternates: { canonical: "/apartamenty-batumi" },
  openGraph: {
    title: "Апартаменты в Батуми — Baylux",
    description: "Апартаменты у моря: купить, снять или передать в управление.",
    type: "website",
    url: "https://bayluxhome.com/apartamenty-batumi",
    images: ["/hero-batumi.jpg"],
  },
};

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
