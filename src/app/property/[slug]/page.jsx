import Link from "next/link";
import { notFound } from "next/navigation";
import MapView from "@/components/MapView";
import Gallery from "@/components/Gallery";
import AdminEdit from "@/components/AdminEdit";
import { DEAL_LABEL, fmtMoney } from "@/data/data";
import { findUnit } from "@/data/source";
import LeadButton from "@/components/LeadButton";
import { waLink, TG_CONTACT } from "@/config";
import { getLang } from "@/lib/serverLang";
import { t as tr, typeLabel, amenLabel, translitAddress } from "@/lib/dict";

// Язык страницы зависит от посетителя (cookies/headers через getLang) → рендерим по запросу (SSR).
// Пре-рендера нет → сборка быстрая. ISR-кэш здесь нельзя: он несовместим с динамическими данными запроса.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const u = await findUnit(params.slug);
  if (!u) return { title: "Объект не найден" };
  const photo = (u.photos && u.photos[0]) || u.img || "/hero-batumi.jpg";
  return {
    title: `${u.type}, ${u.area} м² — ${u.building.district}, Батуми · ${u.price}`,
    description: `${DEAL_LABEL[u.deal]}: ${u.type}${u.rooms ? `, ${u.rooms} комн.` : ""}, ${u.area} м² в ${u.building.name}, район ${u.building.district}, Батуми. Цена ${u.price}.`,
    alternates: { canonical: `/property/${u.slug}` },
    openGraph: {
      title: `${u.type}, ${u.area} м² — ${u.building.district}, Батуми`,
      description: `${DEAL_LABEL[u.deal]}: ${u.type}, ${u.area} м² в ${u.building.name}, Батуми. Цена ${u.price}.`,
      images: [photo.startsWith("http") ? photo : `https://bayluxhome.com${photo}`],
      type: "website",
    },
  };
}

export default async function PropertyPage({ params }) {
  const u = await findUnit(params.slug);
  if (!u) notFound();
  const b = u.building;
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const ty = typeLabel(lang, u.type);
  const bname = translitAddress(b["name_" + lang] || b.name, lang, b.kind);
  const sqm = t("sqm");
  const priceSuffix = u.deal === "rent" ? t("ps_rent") : u.deal === "daily" ? t("ps_daily") : "";

  const photos = (u.photos && u.photos.length) ? u.photos : [u.img || "/placeholder-baylux.jpg"];
  const mapBuildings = [{ slug: b.slug, name: b.name, district: b.district, kind: b.kind, lat: b.lat, lng: b.lng, priceFrom: u.price, units: [{ slug: u.slug, deal: u.deal, type: u.type, rooms: u.rooms, area: u.area, price: u.price, per: u.per, img: (u.photos && u.photos[0]) || u.img || "" }] }];
  const ctaMain = u.deal === "daily" ? t("cta_daily") : u.deal === "rent" ? t("cta_rent") : t("cta_view");
  const specs = [[t("sp_type"), ty], [t("sp_area"), u.area + " " + sqm], [t("sp_rooms"), u.rooms || "—"]];
  if (u.bathrooms) specs.push([t("sp_bath"), u.bathrooms]);
  specs.push([t("sp_floor"), u.floor]);
  if (u.year) specs.push([t("sp_year"), u.year]);
  specs.push([t("sp_district"), b.district], [t("sp_deal"), t("deal_" + u.deal)]);
  if (u.complex) specs.push([t("sp_complex"), u.complex]);
  // Контакт продавца (из объявления): телефон и/или Telegram-ник
  const cleanPhone = (u.phone || (/^\+?\d[\d\s()\-]{6,}$/.test(u.contact || "") ? u.contact : "")).replace(/[^\d]/g, "");
  const tgUser = (u.tg_username || (String(u.contact || "").trim().startsWith("@") ? u.contact.trim().slice(1) : "")).replace(/[^A-Za-z0-9_]/g, "");
  const inquiry = `Здравствуйте! Интересует объект: ${u.type}, ${u.area} м² — ${b.name} (${u.price})`;
  const waHref = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(inquiry)}` : waLink(inquiry);

  const resType = /house|cottage|вилл|дом/i.test(`${u.type} ${u.category || ""}`) ? "House" : "Apartment";
  const ldJson = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    url: `https://bayluxhome.com/property/${u.slug}`,
    name: `${ty}, ${u.area} ${sqm} — ${bname}, ${b.district}`,
    description: u["desc_" + lang] || u.about || `${t("deal_" + u.deal)}: ${ty}, ${u.area} ${sqm}, ${bname}, ${b.district}.`,
    image: photos.map((p) => (p.startsWith("http") ? p : `https://bayluxhome.com${p}`)),
    ...(u.priceNum
      ? {
          offers: {
            "@type": "Offer",
            price: u.priceNum,
            priceCurrency: u.currency || "USD",
            availability: "https://schema.org/InStock",
            url: `https://bayluxhome.com/property/${u.slug}`,
          },
        }
      : {}),
    about: {
      "@type": resType,
      name: `${ty}, ${u.area} ${sqm}`,
      ...(u.rooms ? { numberOfRooms: Number(u.rooms) || u.rooms } : {}),
      floorSize: { "@type": "QuantitativeValue", value: u.area, unitCode: "MTK" },
      address: {
        "@type": "PostalAddress",
        streetAddress: bname,
        addressLocality: b.district,
        addressRegion: "Adjara",
        addressCountry: "GE",
      },
    },
  };
  const breadcrumbJson = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: "https://bayluxhome.com" },
      { "@type": "ListItem", position: 2, name: "Каталог", item: "https://bayluxhome.com/catalog" },
      { "@type": "ListItem", position: 3, name: bname, item: `https://bayluxhome.com/building/${b.slug}` },
      { "@type": "ListItem", position: 4, name: `${ty}, ${u.area} м²`, item: `https://bayluxhome.com/property/${u.slug}` },
    ],
  };

  return (
    <div className="wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJson) }} />
      <div className="crumbs">
        <Link href="/">{t("crumb_home")}</Link> · <Link href="/catalog">{t("crumb_catalog")}</Link> ·{" "}
        <Link href={`/building/${b.slug}`}>{bname}</Link> · <span>{ty}, {u.area} {sqm}</span>
      </div>

      <AdminEdit items={[{ id: u.id, label: "Редактировать объявление" }]} />

      <div className="pp-head">
        <div>
          <h1>{ty}{u.rooms ? `, ${u.rooms} ${t("rooms_short")}` : ""}, {u.area} {sqm}</h1>
          <div className="cdistrict" style={{ marginTop: 8, fontSize: 15 }}>
            📍 {b.district} · <Link href={`/building/${b.slug}`} style={{ color: "var(--gold-dk)", fontWeight: 600 }}>{bname}</Link> · {t("deal_" + u.deal)}
          </div>
          {u.boost > 0 && <span className="boost-badge" style={{ marginTop: 8, display: "inline-block" }}>{t("boost_badge")}</span>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="pp-price">{u.priceNum ? <><span className="bx-price" data-num={u.priceNum} data-cur={u.currency}>{fmtMoney(u.priceNum, u.currency)}</span>{priceSuffix}</> : u.price}</div>
          <div className="perm">{u.deal === "sale" && u.perM2 ? <><span className="bx-price" data-num={u.perM2} data-cur={u.currency}>{fmtMoney(u.perM2, u.currency)}</span> {t("per_m2")}</> : u.per}</div>
        </div>
      </div>

      <Gallery photos={photos} alt={u.type} />

      {u.dupeCount > 0 && u.dupes?.length > 0 && (
        <div style={{ margin: "18px 0 4px" }}>
          <h3 style={{ color: "var(--navy)", margin: "0 0 10px" }}>{t("dupes_h").replace("{n}", u.dupeCount)}</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {u.dupes.map((d, i) => (
              <div key={d.id || i} style={{ position: "relative", width: 120, height: 90, borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)", flex: "0 0 auto" }}>
                {d.photo && <img src={d.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "rgba(1,29,60,.72)", color: "#fff", fontSize: 12, padding: "2px 6px" }}>{d.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pp-grid">
        <div>
          <div className="spec">
            {specs.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}
          </div>
          {((u.amenities && u.amenities.length) || u.noCommission) && (
            <div className="amen-row pp-amen">
              {u.noCommission && <span className="amen-tag on amen-nc">✓ {t("f_noCommission")}</span>}
              {(u.amenities || []).map((a) => <span key={a} className="amen-tag">{amenLabel(lang, a)}</span>)}
            </div>
          )}
          <div className="pp-desc">
            <h3>{t("about_h")}</h3>
            {u["desc_" + lang] || u.about
              ? <p style={{ whiteSpace: "pre-line" }}>{u["desc_" + lang] || u.about}</p>
              : <p>{ty}, {u.area} {sqm}{u.rooms ? `, ${u.rooms} ${t("rooms_short")}` : ""}, {u.floor}. {t("about_p")}</p>}
            <h3>{t("near_h")}</h3>
            <p>{t("near_p")}</p>
            <h3>{t("why_h")}</h3>
            <p>{t("why_p")}</p>
          </div>
          <div className="map-sm"><MapView buildings={mapBuildings} className="map-sm" center={[b.lat, b.lng]} zoom={15} /></div>
        </div>

        <aside>
          <div className="cta-card">
            <div className="price">{u.priceNum ? <><span className="bx-price" data-num={u.priceNum} data-cur={u.currency}>{fmtMoney(u.priceNum, u.currency)}</span>{priceSuffix}</> : u.price}</div>
            <div className="perm" style={{ marginBottom: 6 }}>{u.deal === "sale" && u.perM2 ? <><span className="bx-price" data-num={u.perM2} data-cur={u.currency}>{fmtMoney(u.perM2, u.currency)}</span> {t("per_m2")}</> : u.per}</div>
            <LeadButton className="btn btn-gold" type={t("deal_" + u.deal)} object={`${u.type}, ${u.area} м² — ${b.name}`} title={ctaMain}>{ctaMain}</LeadButton>
            {cleanPhone && <a className="seller-phone" href={`tel:+${cleanPhone}`}>📞 +{cleanPhone}</a>}
            <div className="contact-btns">
              <a className="btn btn-wa" href={waHref} target="_blank" rel="noopener">💬 WhatsApp</a>
              <a className="btn btn-tg" href={`https://t.me/${tgUser || TG_CONTACT}`} target="_blank" rel="noopener">✈️ Telegram</a>
            </div>
            <LeadButton className="btn btn-ghost" type="Управление" object={b.name} title="Отдать квартиру в управление">{t("mgmt_btn")}</LeadButton>
            <Link href={`/building/${b.slug}`} className="btn btn-ghost" style={{ width: "100%", marginTop: 10 }}>{t("all_in")} «{bname}»</Link>
            <div className="agent">
              <div className="av" />
              <div><div style={{ fontWeight: 700, color: "var(--navy)" }}>{t("team")}</div><div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{t("team_sub")}</div></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
