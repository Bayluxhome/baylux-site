// Единый builder JSON-LD (Schema.org) для сайта.
// Правила: только достоверные и видимые на странице данные; пустые поля выбрасываются,
// а не заполняются нулями; все абсолютные URL — от SITE_URL (смена домена — в одном месте);
// сериализация безопасна для вставки в <script> (экранируем «<» и U+2028/2029).
import { SITE_URL, PHONE_DISPLAY, SOCIAL, OPERATOR } from "@/config";
import { unitCat } from "@/data/data";
import { t as tr, typeLabel, cityLabel, translitAddress } from "@/lib/dict";

export const ORG_ID = `${SITE_URL}/#organization`;
const PLACEHOLDER = /placeholder/i;
// Координаты-заглушка из source.js (объект без координат) — в разметку не попадают.
const FALLBACK_LAT = 41.64, FALLBACK_LNG = 41.63;

// Сделка → BusinessFunction (Schema.org ссылается на URI GoodRelations, схема http).
const BUSINESS_FN = {
  sale: "http://purl.org/goodrelations/v1#Sell",
  rent: "http://purl.org/goodrelations/v1#LeaseOut",
  daily: "http://purl.org/goodrelations/v1#LeaseOut",
};
// Период цены аренды → UN/CEFACT unit code для UnitPriceSpecification.
const PERIOD_UNIT = { rent: "MON", daily: "DAY" };

// Внутренняя категория (unitCat) → наиболее точный тип Schema.org.
// Для коммерции/участков точного подтипа Accommodation нет — используем общий Place, не выдумывая.
const SCHEMA_TYPE = {
  apartment: "Apartment",
  house: "House",
  office: "Place",
  commercial: "Place",
  warehouse: "Place",
  land: "Place",
  garage: "Place",
  other: "Accommodation",
};

// Рекурсивно убираем undefined/null/""/NaN и пустые массивы.
export function prune(v) {
  if (Array.isArray(v)) {
    const a = v.map(prune).filter((x) => x !== undefined);
    return a.length ? a : undefined;
  }
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, x] of Object.entries(v)) {
      const p = prune(x);
      if (p !== undefined) o[k] = p;
    }
    return Object.keys(o).length ? o : undefined;
  }
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number" && !Number.isFinite(v)) return undefined;
  return v;
}

// Безопасная строка для dangerouslySetInnerHTML внутри <script type="application/ld+json">.
export function serializeJsonLd(obj) {
  const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
  return JSON.stringify(prune(obj) || {})
    .split(LS).join("\\u2028")
    .split(PS).join("\\u2029")
    .replace(/</g, "\\u003c");
}

function absUrl(p) {
  if (!p) return undefined;
  if (/^https?:\/\//i.test(p)) return p;
  return `${SITE_URL}${p.startsWith("/") ? "" : "/"}${p}`;
}

/*
    .replace(/ /g, "\\u2028")
    .replace(/ /g, "\\u2029");
*/

function isoDate(s) {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

// Организация — одна сущность с устойчивым @id, переиспользуется на всех страницах.
// areaServed — вся Грузия (география работы); address — фактический офис в Батуми. Это разные свойства.
export function orgJsonLd(lang) {
  const t = (k) => tr(lang, k);
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": ORG_ID,
    name: "Baylux",
    alternateName: ["Baylux Home", "bayluxhome"],
    url: SITE_URL,
    sameAs: [SOCIAL.instagram, SOCIAL.facebook].filter(Boolean),
    logo: `${SITE_URL}/baylux_logo.svg`,
    image: `${SITE_URL}/hero-batumi.jpg`,
    description: t("foot_about"),
    areaServed: { "@type": "Country", name: "Georgia" },
    address: { "@type": "PostalAddress", addressLocality: cityLabel(lang, "Батуми"), addressCountry: "GE" },
    telephone: PHONE_DISPLAY,
    email: OPERATOR.email,
  };
}

// Страница одного объекта: RealEstateListing (страница) → Offer (предложение) → объект недвижимости.
// u — unit из findUnit (уже без приватных полей), b — его здание, lang — язык страницы.
export function propertyJsonLd(u, b, lang) {
  const t = (k) => tr(lang, k);
  const url = `${SITE_URL}/property/${u.slug}`;
  const ty = typeLabel(lang, u.type);
  const sqm = t("sqm");
  const city = cityLabel(lang, b.district || "Батуми");
  const bname = translitAddress(b["name_" + lang] || b.name, lang, b.kind);
  const name = `${ty}, ${u.area} ${sqm} — ${bname}, ${city}`;
  const description = u["desc_" + lang] || u.about || `${t("deal_" + u.deal)}: ${ty}, ${u.area} ${sqm}, ${bname}, ${city}.`;
  const cat = unitCat(u.type);
  const schemaType = SCHEMA_TYPE[cat] || "Accommodation";
  const isAccommodation = schemaType !== "Place";

  const images = (Array.isArray(u.photos) && u.photos.length ? u.photos : [u.img])
    .filter((p) => p && !PLACEHOLDER.test(p))
    .map(absUrl);

  const hasGeo = Number.isFinite(b.lat) && Number.isFinite(b.lng) && !(b.lat === FALLBACK_LAT && b.lng === FALLBACK_LNG);
  const price = Number.isFinite(u.priceNum) && u.priceNum > 0 ? u.priceNum : null;
  const currency = u.currency === "GEL" ? "GEL" : "USD";
  const rooms = Number(u.rooms) > 0 ? Number(u.rooms) : undefined;
  const area = Number(u.area) > 0 ? Number(u.area) : undefined;
  const floor = u.floor && u.floor !== "—" ? String(u.floor) : undefined;
  const year = /^\d{4}$/.test(String(u.year || "")) ? Number(u.year) : undefined;

  const property = {
    "@type": schemaType,
    "@id": `${url}#property`,
    name,
    description,
    image: images,
    address: { "@type": "PostalAddress", streetAddress: bname, addressLocality: city, addressCountry: "GE" },
    geo: hasGeo ? { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lng } : undefined,
    ...(isAccommodation
      ? {
          floorSize: area ? { "@type": "QuantitativeValue", value: area, unitCode: "MTK" } : undefined,
          numberOfRooms: rooms,
          numberOfBathroomsTotal: Number(u.bathrooms) > 0 ? Number(u.bathrooms) : undefined,
          floorLevel: floor,
          yearBuilt: year,
        }
      : {}),
  };

  const offer = price
    ? {
        "@type": "Offer",
        "@id": `${url}#offer`,
        url,
        price,
        priceCurrency: currency,
        availability: "https://schema.org/InStock",
        businessFunction: BUSINESS_FN[u.deal] || undefined,
        priceSpecification: PERIOD_UNIT[u.deal]
          ? { "@type": "UnitPriceSpecification", price, priceCurrency: currency, unitCode: PERIOD_UNIT[u.deal] }
          : undefined,
        itemOffered: { "@id": `${url}#property` },
        seller: { "@id": ORG_ID },
      }
    : undefined;

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumbs`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("crumb_home"), item: SITE_URL },
      { "@type": "ListItem", position: 2, name: t("crumb_catalog"), item: `${SITE_URL}/catalog` },
      { "@type": "ListItem", position: 3, name: bname, item: `${SITE_URL}/building/${b.slug}` },
      { "@type": "ListItem", position: 4, name: `${ty}, ${u.area} ${sqm}`, item: url },
    ],
  };

  const listing = {
    "@type": "RealEstateListing",
    "@id": `${url}#listing`,
    url,
    name,
    description,
    inLanguage: lang,
    datePosted: isoDate(u.created_at),
    image: images[0],
    mainEntity: offer ? { "@id": `${url}#offer` } : { "@id": `${url}#property` },
    breadcrumb: { "@id": `${url}#breadcrumbs` },
    publisher: { "@id": ORG_ID },
  };

  return { "@context": "https://schema.org", "@graph": [listing, offer, property, breadcrumb, orgRef()].filter(Boolean) };
}

// Краткая ссылка на организацию внутри @graph страницы (полное описание — в layout).
function orgRef() {
  return { "@type": "RealEstateAgent", "@id": ORG_ID, name: "Baylux", url: SITE_URL };
}
