import Link from "next/link";
import MapView from "@/components/MapView";
import CategoryGrid from "@/components/CategoryGrid";
import BuildingCard from "@/components/BuildingCard";
import PropertyCard from "@/components/PropertyCard";
import { buildingPriceFrom } from "@/data/data";
import HeroSearch from "@/components/HeroSearch";
import { getBuildingsList, getAllUnits } from "@/data/source";

export const revalidate = 300;

export default async function HomePage() {
  const BUILDINGS = await getBuildingsList();
  const mapBuildings = BUILDINGS.map((b) => ({
    slug: b.slug, name: b.name, district: b.district, kind: b.kind,
    lat: b.lat, lng: b.lng, priceFrom: buildingPriceFrom(b), units: b.units,
  }));
  const freshUnits = (await getAllUnits()).slice(0, 6);

  return (
    <>
      <section className="hero">
        <div className="wrap hero-inner">
          <h1>Недвижимость в <span className="accent">Батуми</span> —<br />купить, продать, снять или сдать</h1>
          <p>
            Проверенные квартиры, дома и апартаменты у моря — без дублей и фейков. Прозрачные цены,
            честные условия и помощь местной команды на каждом шаге сделки.
          </p>
          <HeroSearch />
          <div className="stat-row">
            <div className="stat"><b>100%</b><span>проверенные объекты</span></div>
            <div className="stat"><b>0%</b><span>скрытых комиссий</span></div>
            <div className="stat"><b>24/7</b><span>ответ в WhatsApp</span></div>
            <div className="stat"><b>3</b><span>языка: RU · EN · GE</span></div>
          </div>
        </div>
      </section>

      <CategoryGrid />

      <section className="explore wrap">
        <div className="sec-head">
          <div>
            <h2>Жилые комплексы и дома на карте</h2>
            <p>Один пин — один дом. Откройте здание и посмотрите все квартиры, что в нём продаются и сдаются.</p>
          </div>
          <Link className="btn btn-ghost" href="/catalog">Открыть каталог с фильтрами →</Link>
        </div>
        <div className="split">
          <div className="cards">
            {BUILDINGS.map((b) => <BuildingCard key={b.slug} building={b} />)}
          </div>
          <MapView buildings={mapBuildings} className="map-home" />
        </div>
      </section>

      <section className="wrap" style={{ paddingBlock: "10px 30px" }}>
        <div className="sec-head"><div><h2>Свежие объекты</h2><p>Последние квартиры и апартаменты в базе Baylux.</p></div></div>
        <div className="cards three">
          {freshUnits.map((u) => <PropertyCard key={u.id} unit={u} />)}
        </div>
      </section>

      <section className="services wrap" id="services">
        <div className="sec-head"><div><h2>Что мы делаем</h2><p>Не просто витрина объявлений — полный цикл работы с недвижимостью в Грузии.</p></div></div>
        <div className="svc-grid">
          <div className="svc"><div className="ic">🔑</div><h3>Управление</h3><p>Доверьте нам квартиру — займёмся гостями, уборкой, ремонтом и отчётами. Вы получаете доход, мы берём рутину.</p><Link href="/contacts">Отдать в управление →</Link></div>
          <div className="svc"><div className="ic">🏠</div><h3>Аренда</h3><p>Посуточно для гостей города и долгосрочно для тех, кто переезжает. Честные цены, проверенные объекты, договор.</p><Link href="/catalog?deal=rent">Снять или сдать →</Link></div>
          <div className="svc"><div className="ic">📈</div><h3>Продажа и инвестиции</h3><p>Поможем купить квартиру для жизни или вложиться в новостройку у моря. Сопровождаем сделку от показа до ключей.</p><Link href="/catalog?deal=sale">Купить или продать →</Link></div>
        </div>
      </section>

      <section className="why">
        <div className="wrap why-grid">
          <div className="why-i"><b>Местные</b><p>Команда в Батуми — приедем, покажем, поможем на месте.</p></div>
          <div className="why-i"><b>Без дублей</b><p>Чистая база: один объект — одно объявление, без мусора.</p></div>
          <div className="why-i"><b>Прозрачно</b><p>Реальные цены и условия. Без скрытых комиссий.</p></div>
          <div className="why-i"><b>Быстро</b><p>Заявка и бронь через сайт или WhatsApp — за минуту.</p></div>
        </div>
      </section>
    </>
  );
}
