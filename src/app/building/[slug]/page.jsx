import Link from "next/link";
import { notFound } from "next/navigation";
import MapView from "@/components/MapView";
import { DEAL_LABEL } from "@/data/data";
import { getBuildingsList, findBuilding } from "@/data/source";

export const revalidate = 300;

export async function generateStaticParams() {
  const bs = await getBuildingsList();
  return bs.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }) {
  const b = await findBuilding(params.slug);
  if (!b) return { title: "Объект не найден" };
  return {
    title: `${b.name} — ${b.district}, Батуми`,
    description: `${b.name}: ${b.units.length} объект(ов) на продажу и аренду в районе ${b.district}, Батуми. ${b.about.slice(0, 120)}`,
  };
}

export default async function BuildingPage({ params }) {
  const b = await findBuilding(params.slug);
  if (!b) notFound();

  const gallery = [0, 1, 2, 3, 4].map((i) => `https://picsum.photos/seed/${b.slug}-${i}/900/600`);
  const point = [{ lat: b.lat, lng: b.lng, jk: b.kind === "complex", label: b.name.replace("ЖК ", ""), popup: b.name }];

  return (
    <div className="wrap">
      <div className="crumbs">
        <Link href="/">Главная</Link> · <Link href="/catalog">Каталог Батуми</Link> · <span>{b.name}</span>
      </div>

      <div className="pp-head">
        <div>
          <h1>{b.name}</h1>
          <div className="cdistrict" style={{ fontSize: 15, marginTop: 8 }}>
            📍 Батуми · {b.district}{b.developer ? ` · застройщик ${b.developer}` : ""}{b.yearBuilt ? ` · ${b.yearBuilt} г.` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="unit-tag">{b.units.length} объект(ов) в продаже и аренде</div>
        </div>
      </div>

      <div className="gallery">
        {gallery.map((u, i) => <div key={i} style={{ backgroundImage: `url('${u}')` }} />)}
      </div>

      <div className="pp-grid">
        <div>
          <div className="pp-desc">
            <h3>О {b.kind === "complex" ? "комплексе" : "доме"}</h3>
            <p>{b.about}</p>
          </div>

          <h3 style={{ color: "var(--navy)", margin: "24px 0 4px", fontSize: 21 }}>Объекты в этом доме</h3>
          <div className="units">
            <div className="urow uhead">
              <div>Объект</div><div>Площадь</div><div>Этаж</div><div>Сделка</div><div>Цена</div>
            </div>
            {b.units.map((u) => (
              <Link key={u.id} href={`/property/${u.slug}`} className="urow" style={{ color: "var(--ink)" }}>
                <div><b>{u.type}</b>{u.rooms ? `, ${u.rooms} комн.` : ""}</div>
                <div>{u.area} м²</div>
                <div>{u.floor}</div>
                <div>{DEAL_LABEL[u.deal]}</div>
                <div className="uprice">{u.price}</div>
              </Link>
            ))}
          </div>

          <div className="map-sm"><MapView points={point} className="map-sm" center={[b.lat, b.lng]} zoom={15} /></div>
        </div>

        <aside>
          <div className="cta-card">
            <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: 18 }}>Интересует объект в «{b.name}»?</div>
            <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: "8px 0 4px" }}>Подберём квартиру под бюджет и задачу, организуем просмотр.</p>
            <button className="btn btn-gold">Оставить заявку</button>
            <button className="btn btn-wa">Написать в WhatsApp</button>
            <button className="btn btn-ghost">Сдать квартиру здесь в управление</button>
            <div className="agent">
              <div className="av" />
              <div><div style={{ fontWeight: 700, color: "var(--navy)" }}>Команда Baylux</div><div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Ответим за 5 минут · RU / EN / KA</div></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
