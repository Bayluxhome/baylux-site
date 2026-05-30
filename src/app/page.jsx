import Link from "next/link";
import MapView from "@/components/MapView";
import BuildingCard from "@/components/BuildingCard";
import PropertyCard from "@/components/PropertyCard";
import { buildingPriceFrom } from "@/data/data";
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
          <div className="tabs">
            <Link className="tab active" href="/catalog?deal=sale">Продажа</Link>
            <Link className="tab" href="/catalog?deal=rent">Аренда</Link>
            <Link className="tab" href="/catalog?type=new">Новостройки</Link>
            <Link className="tab" href="/catalog?deal=daily">Посуточно</Link>
          </div>
          <form className="searchbar" action="/catalog">
            <div className="field">
              <label>Район</label>
              <select name="district">
                <option value="">Любой район</option>
                <option>Старый Батуми</option><option>Новый бульвар</option>
                <option>Аэропорт</option><option>Гонио</option>
              </select>
            </div>
            <div className="field">
              <label>Тип</label>
              <select name="type">
                <option value="">Любой тип</option>
                <option>Квартира</option><option>Дом</option><option>Коммерция</option><option>Новостройка</option>
              </select>
            </div>
            <div className="field"><label>Цена до, $</label><input name="max" defaultValue="150 000" /></div>
            <button className="btn btn-gold" style={{ padding: "0 26px" }} type="submit">Показать объекты</button>
          </form>
          <div className="stat-row">
            <div className="stat"><b>248</b><span>проверенных объектов</span></div>
            <div className="stat"><b>0%</b><span>скрытых комиссий</span></div>
            <div className="stat"><b>4.9★</b><span>оценка клиентов</span></div>
            <div className="stat"><b>24/7</b><span>ответ в WhatsApp</span></div>
          </div>
        </div>
      </section>

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

      <section className="wrap" style={{ padding: "10px 0 30px" }}>
        <div className="sec-head"><div><h2>Свежие объекты</h2><p>Последние квартиры и апартаменты в базе Baylux.</p></div></div>
        <div className="cards three">
          {freshUnits.map((u) => <PropertyCard key={u.id} unit={u} />)}
        </div>
      </section>

      <section className="services wrap" id="services">
        <div className="sec-head"><div><h2>Что мы делаем</h2><p>Не просто витрина объявлений — полный цикл работы с недвижимостью в Грузии.</p></div></div>
        <div className="svc-grid">
          <div className="svc"><div className="ic">🔑</div><h3>Управление</h3><p>Доверьте нам квартиру — займёмся гостями, уборкой, ремонтом и отчётами. Вы получаете доход, мы берём рутину.</p><a href="#">Отдать в управление →</a></div>
          <div className="svc"><div className="ic">🏠</div><h3>Аренда</h3><p>Посуточно для гостей города и долгосрочно для тех, кто переезжает. Честные цены, проверенные объекты, договор.</p><a href="#">Снять или сдать →</a></div>
          <div className="svc"><div className="ic">📈</div><h3>Продажа и инвестиции</h3><p>Поможем купить квартиру для жизни или вложиться в новостройку у моря. Сопровождаем сделку от показа до ключей.</p><a href="#">Купить или продать →</a></div>
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
