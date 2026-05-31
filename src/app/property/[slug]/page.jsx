import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import MapView from "@/components/MapView";
import { DEAL_LABEL, fmtMoney, perSuffix } from "@/data/data";
import { getBuildingsList, findUnit } from "@/data/source";
import LeadButton from "@/components/LeadButton";
import { waLink } from "@/config";
import { getLang } from "@/lib/serverLang";
import { t as tr, typeLabel, amenLabel } from "@/lib/dict";

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
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const ty = typeLabel(lang, u.type);

  const photos = (u.photos && u.photos.length) ? u.photos : [u.img || "/placeholder-baylux.jpg"];
  const gallery = Array.from({ length: 5 }, (_, i) => photos[i % photos.length]);
  const mapBuildings = [{ slug: b.slug, name: b.name, district: b.district, kind: b.kind, lat: b.lat, lng: b.lng, priceFrom: u.price, units: [{ slug: u.slug, deal: u.deal, type: u.type, rooms: u.rooms, area: u.area, price: u.price, per: u.per }] }];
  const ctaMain = u.deal === "daily" ? t("cta_daily") : u.deal === "rent" ? t("cta_rent") : t("cta_view");
  const specs = [[t("sp_type"), ty], [t("sp_area"), u.area + " м²"], [t("sp_rooms"), u.rooms || "—"]];
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

  return (
    <div className="wrap">
      <div className="crumbs">
        <Link href="/">{t("crumb_home")}</Link> · <Link href="/catalog">{t("crumb_catalog")}</Link> ·{" "}
        <Link href={`/building/${b.slug}`}>{b.name}</Link> · <span>{ty}, {u.area} м²</span>
      </div>

      <div className="pp-head">
        <div>
          <h1>{ty}{u.rooms ? `, ${u.rooms} ${t("rooms_short")}` : ""}, {u.area} м²</h1>
          <div className="cdistrict" style={{ marginTop: 8, fontSize: 15 }}>
            📍 {b.district} · <Link href={`/building/${b.slug}`} style={{ color: "var(--gold-dk)", fontWeight: 600 }}>{b.name}</Link> · {t("deal_" + u.deal)}
          </div>
          {u.boost > 0 && <span className="boost-badge" style={{ marginTop: 8, display: "inline-block" }}>{t("boost_badge")}</span>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="pp-price">{u.priceNum ? <><span className="bx-price" data-num={u.priceNum} data-cur={u.currency}>{fmtMoney(u.priceNum, u.currency)}</span>{perSuffix(u.deal)}</> : u.price}</div>
          <div className="perm">{u.deal === "sale" && u.perM2 ? <><span className="bx-price" data-num={u.perM2} data-cur={u.currency}>{fmtMoney(u.perM2, u.currency)}</span> {t("per_m2")}</> : u.per}</div>
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
              {u.noCommission && <span className="amen-tag on amen-nc">✓ {t("f_noCommission")}</span>}
              {(u.amenities || []).map((a) => <span key={a} className="amen-tag">{amenLabel(lang, a)}</span>)}
            </div>
          )}
          <div className="pp-desc">
            <h3>{t("about_h")}</h3>
            <p>{ty}, {u.area} м²{u.rooms ? `, ${u.rooms} ${t("rooms_short")}` : ""}, {u.floor}. {t("about_p")}</p>
            <h3>{t("near_h")}</h3>
            <p>{t("near_p")}</p>
            <h3>{t("why_h")}</h3>
            <p>{t("why_p")}</p>
          </div>
          <div className="map-sm"><MapView buildings={mapBuildings} className="map-sm" center={[b.lat, b.lng]} zoom={15} /></div>
        </div>

        <aside>
          <div className="cta-card">
            <div className="price">{u.priceNum ? <><span className="bx-price" data-num={u.priceNum} data-cur={u.currency}>{fmtMoney(u.priceNum, u.currency)}</span>{perSuffix(u.deal)}</> : u.price}</div>
            <div className="perm" style={{ marginBottom: 6 }}>{u.deal === "sale" && u.perM2 ? <><span className="bx-price" data-num={u.perM2} data-cur={u.currency}>{fmtMoney(u.perM2, u.currency)}</span> {t("per_m2")}</> : u.per}</div>
            <LeadButton className="btn btn-gold" type={t("deal_" + u.deal)} object={`${u.type}, ${u.area} м² — ${b.name}`} title={ctaMain}>{ctaMain}</LeadButton>
            {cleanPhone && <a className="seller-phone" href={`tel:+${cleanPhone}`}>📞 +{cleanPhone}</a>}
            <div className="contact-btns">
              <a className="btn btn-wa" href={waHref} target="_blank" rel="noopener">💬 WhatsApp</a>
              {tgUser && <a className="btn btn-tg" href={`https://t.me/${tgUser}`} target="_blank" rel="noopener">✈️ Telegram</a>}
            </div>
            <LeadButton className="btn btn-ghost" type="Управление" object={b.name} title="Отдать квартиру в управление">{t("mgmt_btn")}</LeadButton>
            <Link href={`/building/${b.slug}`} className="btn btn-ghost" style={{ width: "100%", marginTop: 10 }}>{t("all_in")} «{b.name}»</Link>
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
