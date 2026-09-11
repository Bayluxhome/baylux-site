import Link from "next/link";
import { notFound } from "next/navigation";
import MapView from "@/components/MapView";
import Gallery from "@/components/Gallery";
import AdminEdit from "@/components/AdminEdit";
import { DEAL_LABEL, fmtMoney, isCoast } from "@/data/data";
import { findUnit } from "@/data/source";
import { getRealtorForSlug } from "@/data/realtors";
import LeadButton from "@/components/LeadButton";
import TelegramContactButton from "@/components/TelegramContactButton";
import WhatsAppContactButton from "@/components/WhatsAppContactButton";
import ViewCounter from "@/components/ViewCounter";
import { PHONE, WA_PHONE, TG_CONTACT, SITE_URL } from "@/config";
import { getLang } from "@/lib/serverLang";
import { t as tr, typeLabel, amenLabel, translitAddress, cityLabel } from "@/lib/dict";
import { propertyJsonLd, serializeJsonLd } from "@/lib/jsonld";

// Язык страницы зависит от посетителя (cookies/headers через getLang) → рендерим по запросу (SSR).
// Пре-рендера нет → сборка быстрая. ISR-кэш здесь нельзя: он несовместим с динамическими данными запроса.
export const dynamic = "force-dynamic";

// Title/description — на языке посетителя и с реальным городом объекта
// (раньше «Батуми» было зашито, и карточки Тбилиси назывались «Тбилиси, Батуми»).
export async function generateMetadata({ params }) {
  const u = await findUnit(params.slug);
  const lang = getLang();
  const t = (k) => tr(lang, k);
  if (!u) return { title: t("prop_nf") };
  const b = u.building;
  const photo = (u.photos && u.photos[0]) || u.img || "/hero-batumi.jpg";
  const ty = typeLabel(lang, u.type);
  const city = cityLabel(lang, b.district || "Батуми");
  const bname = translitAddress(b["name_" + lang] || b.name, lang, b.kind);
  const deal = t("deal_" + u.deal);
  const title = `${ty}, ${u.area} ${t("sqm")} — ${bname}, ${city}`;
  const desc = `${deal}: ${ty}${u.rooms ? `, ${u.rooms} ${t("rooms_short")}` : ""}, ${u.area} ${t("sqm")}, ${bname}, ${city}. ${t("prop_price_w")}: ${u.price}.`;
  return {
    title: `${title} · ${u.price}`,
    description: desc,
    alternates: { canonical: `/property/${u.slug}` },
    openGraph: {
      title,
      description: desc,
      images: [photo.startsWith("http") ? photo : `${SITE_URL}${photo}`],
      type: "website",
    },
  };
}

export default async function PropertyPage({ params, searchParams }) {
  // ?c=<token> — переход со страницы подборки: заявка с этой карточки уйдёт её риелтору (№07).
  const collectionToken = /^[A-Za-z0-9_-]{8,32}$/.test(String(searchParams?.c || "")) ? String(searchParams.c) : "";
  const u = await findUnit(params.slug);
  if (!u) notFound();
  const b = u.building;
  // Автор объявления, если он — риелтор Baylux. Ищем по slug: сам объект `u` уже очищен
  // от служебных полей (owner_email), поэтому сопоставить по нему нельзя.
  const realtor = await getRealtorForSlug(params.slug);
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
  // Получатель WhatsApp — правило прежнее: контакт из объявления, иначе номер Baylux.
  // Текст сообщения собирает сама кнопка (название · цена с валютой и периодом, ID, ссылка).
  // У спарсенных объявлений в контакте стоит основной номер Baylux для звонков — WhatsApp
  // на нём не ведётся, поэтому такие клики направляем на выделенный WhatsApp-номер.
  // Личный номер риелтора остаётся его собственным.
  const waTo = cleanPhone && cleanPhone !== PHONE ? cleanPhone : WA_PHONE;
  const waPrice = u.price && u.price !== "—" ? `${u.price}${priceSuffix.trim() ? " " + priceSuffix.trim() : ""}` : "";
  const propertyUrl = `${SITE_URL}/property/${u.slug}`;

  // JSON-LD страницы: единый @graph (RealEstateListing → Offer → объект + крошки), локализован, на SITE_URL.
  const ldJson = serializeJsonLd(propertyJsonLd(u, b, lang));

  return (
    <div className="wrap">
      <ViewCounter id={u.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson }} />
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
            {/* Море — только для побережья; для Тбилиси и других городов — общий текст без моря */}
            <p>{isCoast(b.district) ? t("near_p") : t("near_p_city")}</p>
            <h3>{t("why_h")}</h3>
            <p>{t("why_p")}</p>
          </div>
          <div className="map-sm"><MapView buildings={mapBuildings} className="map-sm" center={[b.lat, b.lng]} zoom={15} /></div>
        </div>

        <aside>
          <div className="cta-card">
            <div className="price">{u.priceNum ? <><span className="bx-price" data-num={u.priceNum} data-cur={u.currency}>{fmtMoney(u.priceNum, u.currency)}</span>{priceSuffix}</> : u.price}</div>
            <div className="perm" style={{ marginBottom: 6 }}>{u.deal === "sale" && u.perM2 ? <><span className="bx-price" data-num={u.perM2} data-cur={u.currency}>{fmtMoney(u.perM2, u.currency)}</span> {t("per_m2")}</> : u.per}</div>
            <LeadButton className="btn btn-gold" type={t("deal_" + u.deal)} typeKey={u.deal === "sale" ? "viewing" : u.deal} object={`${u.type}, ${u.area} м² — ${b.name}`} title={ctaMain} listingId={u.id} source={collectionToken ? "collection" : "property"} collectionToken={collectionToken}>{ctaMain}</LeadButton>
            {cleanPhone && <a className="seller-phone" href={`tel:+${cleanPhone}`}>📞 +{cleanPhone}</a>}
            <div className="contact-btns">
              <WhatsAppContactButton className="btn btn-wa" phone={waTo} price={waPrice} propertyId={u.id || u.slug} propertyTitle={`${ty}, ${u.area} ${sqm} — ${bname}`} propertyUrl={propertyUrl}>💬 WhatsApp</WhatsAppContactButton>
              <TelegramContactButton className="btn btn-tg" username={tgUser || TG_CONTACT} propertyId={u.id || u.slug} propertyTitle={`${ty}, ${u.area} ${sqm} — ${bname}`} propertyPath={`/property/${u.slug}`}>✈️ Telegram</TelegramContactButton>
            </div>
            <LeadButton className="btn btn-ghost" type="Управление" typeKey="management" object={b.name} title={t("mgmt_btn")} listingId={u.id} source="property">{t("mgmt_btn")}</LeadButton>
            <Link href={`/building/${b.slug}`} className="btn btn-ghost" style={{ width: "100%", marginTop: 10 }}>{t("all_in")} «{bname}»</Link>
            {/* Автор объявления. Если его подал зарегистрированный риелтор — показываем его
                и ведём на страницу риелтора с его объектами. Если собственник — помечаем как
                собственника. Иначе (импорт/агентская загрузка) — прежний блок команды Baylux. */}
            {realtor ? (
              <Link href={`/realtor/${realtor.id}`} className="agent agent-link">
                <div className="av">
                  {realtor.photo ? <img src={realtor.photo} alt={realtor.name} /> : <span>{(realtor.name || "B").slice(0, 1).toUpperCase()}</span>}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--navy)" }}>{realtor.name}</div>
                  <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{t("rl_role")} · {t("rl_all_objects")} →</div>
                </div>
              </Link>
            ) : (
              <div className="agent">
                <div className="av" />
                <div>
                  <div style={{ fontWeight: 700, color: "var(--navy)" }}>{u.tg_username ? t("owner_label") : t("team")}</div>
                  <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{u.tg_username ? "@" + u.tg_username : t("team_sub")}</div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
