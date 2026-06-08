import SeoLanding from "@/components/SeoLanding";
import { getAllUnits } from "@/data/source";

export const revalidate = 300;

export const metadata = {
  title: "Посуточная аренда квартир в Батуми — снять жильё посуточно у моря",
  description:
    "Снять квартиру в Батуми посуточно: проверенные квартиры и апартаменты у моря с фото и ценами. Заселение в день обращения — Baylux.",
  alternates: { canonical: "/posutochno-batumi" },
  openGraph: {
    title: "Посуточная аренда в Батуми — Baylux",
    description: "Квартиры посуточно у моря: фото, цены, быстрое заселение.",
    type: "website",
    url: "https://bayluxhome.com/posutochno-batumi",
    images: ["/hero-batumi.jpg"],
  },
};

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
