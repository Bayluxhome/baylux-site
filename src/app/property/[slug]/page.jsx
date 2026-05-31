import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import MapView from "@/components/MapView";
import { DEAL_LABEL } from "@/data/data";
import { getBuildingsList, findUnit } from "@/data/source";
import LeadButton from "@/components/LeadButton";
import { waLink } from "@/config";

export const revalidate = 300;

export async function generateStaticParams() {
  const bs = await getBuildingsList();
  return bs.flatMap((b) => b.units.map((u) => ({ slug: u.slug })));
}

export async function generateMetadata({ params }) {
  const u = await findUnit(params.slug);
  if (!u) return { title: "Объект не найден" };
  return {
    title: `${u.type}, ${u.area} м² — ${u.building.district}, Батуми · ${u.price}`,
    description: `${DEAL_LABEL[u.deal]}: ${u.type}${u.rooms ? `, ${u.rooms} комн.` : ""}, ${u.area} м² в ${u.building.name}, район ${u.building.district}, Батуми. Цена ${u.price}.`,
  };
}

export default async function PropertyPage({ params }) {
  const u = await findUnit(params.slug);
  if (!u) notFound();
  const b = u.building;

  const photos = (u.photos && u.photos.length) ? u.photos : [u.img || "/placeholder-baylux.jpg"];
  const gallery = Array.from({ length: 5 }, (_, i) => photos[i % photos.length]);
  const mapBuildings = [{ slug: b.slug, name: b.name, district: b.district, kind: b.kind, lat: b.lat, lng: b.lng, priceFrom: u.price, units: [{ slug: u.slug, deal: u.deal, type: u.type, rooms: u.rooms, area: u.area, price: u.price, per: u.per }] }];
  const ctaMain = u.deal === "daily" ? "Забронировать даты" : u.deal === "rent" ? "Снять — оставить заявку" : "Забронировать просмотр";
  const specs = [["Тип", u.type], ["Площадь", u.area + " м²"], ["Комнат", u.rooms || "—"]];
  if (u.bathrooms) specs.push(["Санузлов", u.bathrooms]);
  specs.push(["Этаж", u.floor]);
  if (u.year) specs.push(["Год постройки", u.year]);
  specs.push(["Район", b.district], ["Сделка", DEAL_LABEL[u.deal]]);
  if (u.complex) specs.push(["ЖК / дом", u.complex]);
  // Контакт продавца (из объявления): телефон и/или Telegram-ник
  const cleanPhone = (u.phone || (/^\+?\d[\d\s()\-]{6,}$/.test(u.contact || "") ? u.contact : "")).replace(/[^\d]/g, "");
  const tgUser = (u.tg_username || (String(u.contact || "").trim().startsWith("@") ? u.contact.trim().slice(1) : "")).replace(/[^A-Za-z0-9_]/g, "");
  const inquiry = `Здравствуйте! Интересует объект: ${u.type}, ${u.area} м² — ${b.name} (${u.price})`;
  const waHref = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(inquiry)}` : waLink(inquiry);

  return (
    <div className="wrap">
      <div className="crumbs">
        <Link href="/">Главная</Link> · <Link href="/catalog">Каталог Батуми</Link> ·{" "}
        <Link href={`/building/${b.slug}`}>{b.name}</Link> · <span>{u.type}, {u.area} м²</span>
      </div>

      <div className="pp-head">
        <div>
          <h1>{u.type}{u.rooms ? `, ${u.rooms} комн.` : ""}, {u.area} м²</h1>
          <div className="cdistrict" style={{ marginTop: 8, fontSize: 15 }}>
            📍 Батуми · {b.district} · <Link href={`/building/${b.slug}`} style={{ color: "var(--gold-dk)", fontWeight: 600 }}>{b.name}</Link> · {DEAL_LABEL[u.deal]}
          </div>
          {u.boost > 0 && <span className="boost-badge" style={{ marginTop: 8, display: "inline-block" }}>⭐ Продвигается</span>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="pp-price">{u.priceNum ? <span className="bx-price" data-num={u.priceNum} data-cur={u.currency}>{u.price}</span> : u.price}</div>
          <div className="perm">{u.per}</div>
        </div>
      </div>

      <div className="gallery">
        {gallery.map((g, i) => <div key={i}><Image src={g} alt={`${u.type} — фото ${i + 1}`} fill sizes="(max-width:560px) 100vw, 50vw" style={{ objectFit: "cover" }} /></div>)}
      </div>

      <div className="pp-grid">
        <div>
          <div className="spec">
            {specs.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}
          </div>
          {((u.amenities && u.amenities.length) || u.noCommission) && (
            <div className="amen-row pp-amen">
              {u.noCommission && <span className="amen-tag on amen-nc">✓ Без комиссии</span>}
              {(u.amenities || []).map((a) => <span key={a} className="amen-tag">{a}</span>)}
            </div>
          )}
          <div className="pp-desc">
            <h3>Об объекте</h3>
            <p>{u.type}, {u.area} м²{u.rooms ? `, ${u.rooms} комн.` : ""}, этаж {u.floor}. {DEAL_LABEL[u.deal]} в «{b.name}», район «{b.district}». Готов к заселению, актуальные документы. Подходит как для проживания, так и под сдачу гостям.</p>
            <h3>Что рядом</h3>
            <p>Море и набережная в пешей доступности, рядом кафе, магазины и транспорт. Развитая инфраструктура района — всё для жизни и для сдачи гостям.</p>
            <h3>Почему через Baylux</h3>
            <p>Объект проверен нашей командой: документы, реальные фото, честная цена. Поможем с просмотром и сделкой, а при желании возьмём квартиру в управление, чтобы она приносила доход.</p>
          </div>
          <div className="map-sm"><MapView buildings={mapBuildings} className="map-sm" center={[b.lat, b.lng]} zoom={15} /></div>
        </div>

        <aside>
          <div className="cta-card">
            <div className="price">{u.priceNum ? <span className="bx-price" data-num={u.priceNum} data-cur={u.currency}>{u.price}</span> : u.price}</div>
            <div className="perm" style={{ marginBottom: 6 }}>{u.per}</div>
            <LeadButton className="btn btn-gold" type={DEAL_LABEL[u.deal]} object={`${u.type}, ${u.area} м² — ${b.name}`} title={ctaMain}>{ctaMain}</LeadButton>
            {cleanPhone && <a className="seller-phone" href={`tel:+${cleanPhone}`}>📞 +{cleanPhone}</a>}
            <div className="contact-btns">
              <a className="btn btn-wa" href={waHref} target="_blank" rel="noopener">💬 WhatsApp</a>
              {tgUser && <a className="btn btn-tg" href={`https://t.me/${tgUser}`} target="_blank" rel="noopener">✈️ Telegram</a>}
            </div>
            <LeadButton className="btn btn-ghost" type="Управление" object={b.name} title="Отдать квартиру в управление">Отдать похожую в управление</LeadButton>
            <Link href={`/building/${b.slug}`} className="btn btn-ghost" style={{ width: "100%", marginTop: 10 }}>Все объекты в «{b.name}»</Link>
            <div className="agent">
              <div className="av" />
              <div><div style={{ fontWeight: 700, color: "var(--navy)" }}>Команда Baylux</div><div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Ответим за 5 минут · RU / EN / GE</div></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
