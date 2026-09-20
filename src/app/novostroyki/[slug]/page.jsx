import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Gallery from "@/components/Gallery";
import MapView from "@/components/MapView";
import LeadButton from "@/components/LeadButton";
import ComplexExpert from "@/components/ComplexExpert";
import { fmtDone, fmtNum } from "@/components/ComplexCard";
import { getComplexBySlug, complexTags } from "@/lib/complexes";
import { serializeJsonLd, ORG_ID } from "@/lib/jsonld";
import { supa } from "@/lib/supabase";
import { verifySession, can } from "@/lib/session";
import { SITE_URL } from "@/config";
import { getLang } from "@/lib/serverLang";
import { altFor } from "@/lib/i18nPath";
import { t as tr, cityLabel } from "@/lib/dict";

export const dynamic = "force-dynamic";

const TAG_ICON = { sea: "🌊", installment: "％", investment: "📈", renovated: "🖌", premium: "💎", eco: "🌿", completed: "✓", building: "🏗" };

export async function generateMetadata({ params }) {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const c = await getComplexBySlug(params.slug);
  if (!c) return { title: t("nb_nf") };
  const desc = (c["desc_" + lang] || c.desc_ru || "").slice(0, 160);
  const cover = c.cover || (Array.isArray(c.photos) && c.photos[0]) || "/hero-batumi.jpg";
  const title = `${c.name} — ${cityLabel(lang, c.city)}${c.price_from ? ` · ${t("nb_price_from").replace("{n}", fmtNum(c.price_from))}` : ""}`;
  return {
    title,
    description: desc || t("nb_meta_d"),
    alternates: altFor(lang, `/novostroyki/${c.slug}`),
    openGraph: { title, description: desc || t("nb_meta_d"), type: "website", url: `${SITE_URL}/${lang}/novostroyki/${c.slug}`, images: [cover.startsWith("http") ? cover : `${SITE_URL}${cover}`] },
  };
}

export default async function ComplexPage({ params }) {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const c = await getComplexBySlug(params.slug);
  if (!c) notFound();

  const session = verifySession(cookies().get("bx_session")?.value);
  const canEdit = can(session, "complexes");

  let expert = null;
  if (c.expert_id && supa) {
    const { data } = await supa.from("realtors").select("id, name, photo").eq("id", c.expert_id).eq("status", "approved").maybeSingle();
    expert = data || null;
  }

  const tags = complexTags(c);
  const tagKeys = ["sea", "installment", "investment", "renovated", "premium", "eco", tags.completed ? "completed" : "building"].filter((k) => tags[k]);
  const photos = Array.isArray(c.photos) && c.photos.length ? c.photos : [c.cover || "/placeholder-baylux.jpg"];
  const cover = c.cover || photos[0];
  const desc = c["desc_" + lang] || c.desc_ru || "";
  const descFallback = !c["desc_" + lang] && lang !== "ru" && !!c.desc_ru;
  const nearby = c["nearby_" + lang] || c.nearby_ru || "";
  const amen = String(c.amenities || "").split(",").map((s) => s.trim()).filter(Boolean);
  const units = (c.units || []).slice().sort((a, b) => (a.sort_weight - b.sort_weight) || ((a.area || 0) - (b.area || 0)));
  const hasGeo = Number.isFinite(c.lat) && Number.isFinite(c.lng);
  const place = `${cityLabel(lang, c.city)}${c.district ? `, ${c.district}` : ""}`;

  const specs = [
    c.area_from ? [t("nb_lbl_area"), t("nb_area_from").replace("{n}", fmtNum(c.area_from))] : null,
    c.price_from ? [t("nb_lbl_price"), t("nb_price_from").replace("{n}", fmtNum(c.price_from))] : null,
    [t("nb_lbl_done"), fmtDone(c, t)],
    tags.installment ? [t("nb_lbl_inst"), t("nb_inst_months").replace("{n}", c.installment_months)] : null,
    c.sea_distance_m != null ? [t("nb_f_sea"), t("nb_sea_m").replace("{n}", fmtNum(c.sea_distance_m))] : null,
    c.roi_percent ? [t("nb_roi"), t("nb_roi_v").replace("{n}", c.roi_percent)] : null,
    c.developer ? [t("nb_developer"), c.developer] : null,
  ].filter(Boolean);

  // JSON-LD: жилой комплекс + крошки; цена «от» выражаем через AggregateOffer (lowPrice), а не как цену каждой квартиры.
  const url = `${SITE_URL}/${lang}/novostroyki/${c.slug}`;
  const availUnits = units.filter((u) => u.available !== false && Number(u.price) > 0);
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ApartmentComplex", "@id": `${url}#complex`, url, name: c.name, description: desc || undefined,
        image: photos.map((p) => (p.startsWith("http") ? p : `${SITE_URL}${p}`)),
        address: { "@type": "PostalAddress", streetAddress: c.address || undefined, addressLocality: cityLabel(lang, c.city), addressCountry: "GE" },
        geo: hasGeo ? { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng } : undefined,
        numberOfAccommodationUnits: units.length || undefined,
        ...(availUnits.length ? { offers: { "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: Math.min(...availUnits.map((u) => Number(u.price))), highPrice: Math.max(...availUnits.map((u) => Number(u.price))), offerCount: availUnits.length, seller: { "@id": ORG_ID } } } : {}),
      },
      { "@type": "BreadcrumbList", "@id": `${url}#breadcrumbs`, itemListElement: [
        { "@type": "ListItem", position: 1, name: t("crumb_home"), item: `${SITE_URL}/${lang}` },
        { "@type": "ListItem", position: 2, name: t("nb_crumb"), item: `${SITE_URL}/${lang}/novostroyki` },
        { "@type": "ListItem", position: 3, name: c.name, item: url },
      ] },
    ],
  };

  return (
    <div className="wrap nb nb-detail">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(ld) }} />
      <div className="crumbs"><Link href="/">{t("crumb_home")}</Link> · <Link href="/novostroyki">{t("nb_crumb")}</Link> · <span>{c.name}</span></div>
      {canEdit && <p style={{ margin: "0 0 10px" }}><a className="btn btn-ghost" href={`/admin/complexes/${c.id}`} style={{ padding: "6px 12px", fontSize: 13 }}>✏️ Редактировать ЖК</a></p>}

      <Gallery photos={photos} alt={c.name} />

      <div className="pp-grid">
        <div>
          <div className="pp-head">
            <div>
              <h1>{c.name}</h1>
              <div className="cdistrict" style={{ marginTop: 8, fontSize: 15 }}>📍 {place}{c.address ? ` · ${c.address}` : ""}</div>
              {tagKeys.length > 0 && <div className="nb-tags" style={{ marginTop: 10 }}>{tagKeys.map((k) => <span key={k}>{TAG_ICON[k]} {t("nb_tag_" + k)}</span>)}</div>}
            </div>
            {c.price_from && <div style={{ textAlign: "right" }}><div className="pp-price">{t("nb_price_from").replace("{n}", fmtNum(c.price_from))}</div></div>}
          </div>

          <div className="nb-specs">{specs.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}</div>

          {desc && (
            <section className="pp-desc">
              <h3>{t("nb_about_h")}{descFallback ? <small className="muted"> {t("nb_desc_fallback")}</small> : null}</h3>
              {desc.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
            </section>
          )}

          {units.length > 0 && (
            <section>
              <h3>{t("nb_units_h")}</h3>
              <div className="nb-units">
                <div className="nb-units-head"><span>{t("nb_u_label")}</span><span>{t("nb_u_rooms")}</span><span>{t("nb_u_area")}</span><span>{t("nb_u_price")}</span><span>{t("nb_u_floor")}</span></div>
                {units.map((u) => {
                  const perm2 = u.price && u.area ? Math.round(Number(u.price) / Number(u.area)) : null;
                  return (
                    <div key={u.id} className={"nb-unit" + (u.available === false ? " sold" : "")}>
                      <span>{u.label || (u.rooms === 0 ? t("nb_u_studio") : "—")}</span>
                      <span>{u.rooms === 0 ? t("nb_u_studio") : u.rooms ?? "—"}</span>
                      <span>{u.area ? `${u.area} ${t("sqm")}` : "—"}</span>
                      <span>{u.available === false ? <i>{t("nb_u_sold")}</i> : u.price ? <><b>${fmtNum(u.price)}</b>{perm2 ? <small> {t("nb_u_perm2").replace("{n}", fmtNum(perm2))}</small> : null}</> : "—"}</span>
                      <span>{u.floor || "—"}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {amen.length > 0 && (
            <section><h3>{t("nb_amen_h")}</h3><div className="nb-tags nb-amen">{amen.map((a) => <span key={a}>{a}</span>)}</div></section>
          )}

          {nearby && <section className="pp-desc"><h3>{t("nb_nearby_h")}</h3>{nearby.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</section>}

          <section>
            <h3>{t("nb_location_h")}</h3>
            {hasGeo
              ? <div className="map-sm"><MapView buildings={[{ slug: c.slug, name: c.name, district: place, kind: "complex", lat: c.lat, lng: c.lng, priceFrom: c.price_from ? `$${c.price_from}` : "", units: [], href: `/novostroyki/${c.slug}`, linkLabel: c.name }]} className="map-sm" center={[c.lat, c.lng]} zoom={15} fit={false} /></div>
              : <p className="muted map-nogeo">📍 {t("map_no_geo")}</p>}
          </section>
        </div>

        <aside>
          <div className="cta-card">
            <b style={{ color: "var(--navy)", fontSize: 16 }}>{t("nb_lead_h")}</b>
            <p style={{ color: "var(--ink-soft)", margin: "6px 0 12px" }}>{t("nb_lead_p")}</p>
            <LeadButton className="btn btn-gold" type={t("nb_crumb")} typeKey="complex" object={c.name} title={t("nb_lead_btn")} source="novostroyki" complexId={c.id}>{t("nb_lead_btn")}</LeadButton>
          </div>
          <ComplexExpert expert={expert} complexId={c.id} objectName={c.name} />
        </aside>
      </div>
    </div>
  );
}
