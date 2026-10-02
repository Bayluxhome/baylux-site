import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import MapView from "@/components/MapView";
import Gallery from "@/components/Gallery";
import AdminEdit from "@/components/AdminEdit";
import PropertyCard from "@/components/PropertyCard";
import { buildingPriceFrom } from "@/data/data";
import { findBuilding, legacyBuildingSlug } from "@/data/source";
import { getRealtorForSlug } from "@/data/realtors";
import LeadButton from "@/components/LeadButton";
import TelegramContactButton from "@/components/TelegramContactButton";
import WhatsAppContactButton from "@/components/WhatsAppContactButton";
import { PHONE, WA_PHONE, TG_CONTACT, SITE_URL } from "@/config";
import { getLang } from "@/lib/serverLang";
import { t as tr, typeLabel, translitAddress, cityLabel } from "@/lib/dict";
import { altFor, withLang } from "@/lib/i18nPath";

// Язык страницы зависит от посетителя (cookies/headers через getLang) → рендерим по запросу (SSR).
export const dynamic = "force-dynamic";

// Название дома: «ЖК, адрес» — с 02.10.2026 дома делятся по ЖК, и одного адреса мало
// (у разных ЖК района Адлиа форма подставляла один и тот же адрес).
function displayName(b, lang) {
  const addr = translitAddress(b["name_" + lang] || b.name, lang, b.kind);
  return b.complex ? `${b.complex}, ${addr}` : addr;
}

// Телефон продавца из объявления (как на карточке объекта).
const unitPhone = (u) => (u.phone || (/^\+?\d[\d\s()\-]{6,}$/.test(u.contact || "") ? u.contact : "")).replace(/[^\d]/g, "");
const isAgency = (p) => !p || p === PHONE || p.endsWith(PHONE.slice(-9));

export async function generateMetadata({ params }) {
  const b = await findBuilding(params.slug);
  const lang = getLang();
  const t = (k) => tr(lang, k);
  if (!b) return { title: t("prop_nf") };
  const photo = b.facade_photo || (b.units && b.units[0] && b.units[0].photos && b.units[0].photos[0]) || "/hero-batumi.jpg";
  const bname = displayName(b, lang);
  const city = cityLabel(lang, b.district || "Батуми");
  const title = `${bname} — ${city}`;
  const desc = `${bname}: ${b.units.length} ${t("map_objects")} · ${city}. ${(b["desc_" + lang] || b.about || "").slice(0, 120)}`.trim();
  return {
    title,
    description: desc,
    alternates: altFor(lang, `/building/${b.slug}`),
    openGraph: { title, description: desc, images: [photo.startsWith("http") ? photo : `${SITE_URL}${photo}`], type: "website", url: withLang(lang, `/building/${b.slug}`) },
  };
}

export default async function BuildingPage({ params }) {
  const lang = getLang();
  const b = await findBuilding(params.slug);
  if (!b) {
    // Старый адрес дома (до разделения по ЖК) → постоянный редирект на новый.
    const moved = await legacyBuildingSlug(params.slug);
    if (moved) permanentRedirect(withLang(lang, `/building/${moved}`));
    notFound();
  }
  const t = (k) => tr(lang, k);
  const bname = displayName(b, lang);

  // Галерея дома — из реальных фото всех объектов (обложка первой).
  const photoPool = [];
  const seenPhotos = new Set();
  const pushPhoto = (p) => { if (p && !seenPhotos.has(p)) { seenPhotos.add(p); photoPool.push(p); } };
  pushPhoto(b.image);
  for (const u of b.units) for (const p of (u.photos || [])) pushPhoto(p);
  if (!photoPool.length) pushPhoto("/placeholder-baylux.jpg");
  const mapBuildings = [{ slug: b.slug, name: b.name, district: b.district, kind: b.kind, lat: b.lat, lng: b.lng, priceFrom: buildingPriceFrom(b), units: b.units }];

  // ── Кто продаёт (02.10.2026) ──
  // Раньше страница дома всегда показывала телефон и команду Baylux — и объекты риелторов
  // выглядели как наши. Теперь контакт зависит от того, чьи объявления в доме:
  //  • один продавец (риелтор/собственник) → его телефон, Telegram и карточка риелтора;
  //  • только объекты агентства → контакты Baylux (как раньше);
  //  • разные продавцы → общих контактов нет, связь — в карточке каждого объекта.
  const sellerPhones = new Set();
  let hasAgency = false;
  for (const u of b.units) {
    const p = unitPhone(u);
    if (isAgency(p)) hasAgency = true; else sellerPhones.add(p);
  }
  const mode = sellerPhones.size === 0 ? "agency" : (sellerPhones.size === 1 && !hasAgency ? "seller" : "mixed");
  const sellerUnit = mode === "seller" ? b.units[0] : null;
  const sellerPhone = mode === "seller" ? [...sellerPhones][0] : "";
  const realtor = sellerUnit ? await getRealtorForSlug(sellerUnit.slug) : null;
  const sellerTg = sellerUnit
    ? b.units.map((u) => (u.tg_username || "").replace(/[^A-Za-z0-9_]/g, "")).find(Boolean) || ""
    : "";

  // Карточки объектов — как в каталоге: фото, цена, параметры (раньше была голая таблица).
  // В дом карточки кладём без списка units — иначе каждая карточка тащит в HTML весь дом.
  const bLite = { ...b, units: [] };
  const cards = b.units.map((u) => ({ ...u, building: bLite, img: u.unit_image || b.image }));

  return (
    <div className="wrap">
      <div className="crumbs">
        <Link href={withLang(lang, "/")}>{t("crumb_home")}</Link> · <Link href={withLang(lang, "/catalog")}>{t("crumb_catalog")}</Link> · <span>{bname}</span>
      </div>

      <AdminEdit items={b.units.map((u) => ({ id: u.id, label: `${typeLabel(lang, u.type)}${u.rooms ? `, ${u.rooms} ${t("rooms_short")}` : ""} · ${u.area} м²` }))} />

      <div className="pp-head">
        <div>
          <h1>{bname}</h1>
          <div className="cdistrict" style={{ fontSize: 15, marginTop: 8 }}>
            📍 {cityLabel(lang, b.district || "Батуми")}{b.developer ? ` · ${b.developer}` : ""}{b.yearBuilt ? ` · ${b.yearBuilt}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="unit-tag">{b.units.length} {t("bld_objects_here")}</div>
        </div>
      </div>

      <Gallery photos={photoPool} alt={bname} />

      <div className="pp-grid">
        <div>
          {(b["desc_" + lang] || b.about) && (
            <div className="pp-desc">
              <h3>{b.kind === "complex" ? t("bld_about_complex") : t("bld_about_house")}</h3>
              <p>{b["desc_" + lang] || b.about}</p>
            </div>
          )}

          <h3 style={{ color: "var(--navy)", margin: "24px 0 12px", fontSize: 21 }}>{t("bld_units_here")}</h3>
          <div className="cards bld-cards">
            {cards.map((u) => <PropertyCard key={u.id} unit={u} />)}
          </div>

          {Number.isFinite(b.lat) && Number.isFinite(b.lng)
            ? <div className="map-sm"><MapView buildings={mapBuildings} className="map-sm" center={[b.lat, b.lng]} zoom={15} /></div>
            : <p className="muted map-nogeo">📍 {t("map_no_geo")}</p>}
        </div>

        <aside>
          <div className="cta-card">
            {mode === "mixed" ? (
              <>
                <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: 18 }}>{t("bld_mixed_h")}</div>
                <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: "8px 0 0", lineHeight: 1.55 }}>{t("bld_mixed_p")}</p>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: 18 }}>{t("bld_cta_title")} «{bname}»?</div>
                <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: "8px 0 4px" }}>{t("bld_cta_sub")}</p>
                {/* У одного продавца заявка привязывается к его объявлению — как на карточке объекта */}
                <LeadButton className="btn btn-gold" type="Заявка по ЖК" typeKey="complex" object={bname} title={t("bld_lead")} source="building" listingId={sellerUnit ? sellerUnit.id : undefined}>{t("bld_lead")}</LeadButton>
                {mode === "seller" && sellerPhone && <a className="seller-phone" href={`tel:+${sellerPhone}`}>📞 +{sellerPhone}</a>}
                <div className="contact-btns">
                  <WhatsAppContactButton className="btn btn-wa" phone={mode === "seller" ? sellerPhone : WA_PHONE} propertyId={b.slug} propertyTitle={bname} propertyUrl={`${SITE_URL}/${lang}/building/${b.slug}`}>💬 WhatsApp</WhatsAppContactButton>
                  {(mode === "agency" || sellerTg) && (
                    <TelegramContactButton className="btn btn-tg" username={mode === "seller" ? sellerTg : TG_CONTACT} propertyId={b.slug} propertyTitle={bname} propertyPath={`/building/${b.slug}`}>✈️ Telegram</TelegramContactButton>
                  )}
                </div>
                {mode === "agency" && (
                  <LeadButton className="btn btn-ghost" type="Управление" typeKey="management" object={bname} title={t("bld_mgmt")} source="building">{t("bld_mgmt")}</LeadButton>
                )}
                {mode === "seller" && realtor ? (
                  <Link href={withLang(lang, `/realtor/${realtor.id}`)} className="agent agent-link">
                    <div className="av">
                      {realtor.photo ? <img src={realtor.photo} alt={realtor.name} /> : <span>{(realtor.name || "R").slice(0, 1).toUpperCase()}</span>}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--navy)" }}>{realtor.name}</div>
                      <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{t("rl_role")} · {t("rl_all_objects")} →</div>
                    </div>
                  </Link>
                ) : mode === "seller" ? (
                  <div className="agent">
                    <div className="av" />
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--navy)" }}>{t("owner_label")}</div>
                      <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{sellerTg ? "@" + sellerTg : "+" + sellerPhone}</div>
                    </div>
                  </div>
                ) : (
                  <div className="agent">
                    <div className="av" />
                    <div><div style={{ fontWeight: 700, color: "var(--navy)" }}>{t("team")}</div><div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{t("team_sub")}</div></div>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
