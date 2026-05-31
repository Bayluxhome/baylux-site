import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import MapView from "@/components/MapView";
import { DEAL_LABEL, buildingPriceFrom, fmtMoney } from "@/data/data";
import { getBuildingsList, findBuilding } from "@/data/source";
import LeadButton from "@/components/LeadButton";
import { waLink } from "@/config";
import { getLang } from "@/lib/serverLang";
import { t as tr, typeLabel } from "@/lib/dict";

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
  const lang = getLang();
  const t = (k) => tr(lang, k);

  const gallery = Array(5).fill(b.image || "/placeholder-baylux.jpg");
  const mapBuildings = [{ slug: b.slug, name: b.name, district: b.district, kind: b.kind, lat: b.lat, lng: b.lng, priceFrom: buildingPriceFrom(b), units: b.units }];

  return (
    <div className="wrap">
      <div className="crumbs">
        <Link href="/">{t("crumb_home")}</Link> · <Link href="/catalog">{t("crumb_catalog")}</Link> · <span>{b.name}</span>
      </div>

      <div className="pp-head">
        <div>
          <h1>{b.name}</h1>
          <div className="cdistrict" style={{ fontSize: 15, marginTop: 8 }}>
            📍 {b.district}{b.developer ? ` · ${b.developer}` : ""}{b.yearBuilt ? ` · ${b.yearBuilt}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="unit-tag">{b.units.length} {t("bld_objects_here")}</div>
        </div>
      </div>

      <div className="gallery">
        {gallery.map((g, i) => <div key={i}><Image src={g} alt={`${b.name} — фото ${i + 1}`} fill sizes="(max-width:560px) 100vw, 50vw" style={{ objectFit: "cover" }} /></div>)}
      </div>

      <div className="pp-grid">
        <div>
          <div className="pp-desc">
            <h3>{b.kind === "complex" ? t("bld_about_complex") : t("bld_about_house")}</h3>
            <p>{b["desc_" + lang] || b.about}</p>
          </div>

          <h3 style={{ color: "var(--navy)", margin: "24px 0 4px", fontSize: 21 }}>{t("bld_units_here")}</h3>
          <div className="units">
            <div className="urow uhead">
              <div>{t("th_object")}</div><div>{t("th_area")}</div><div>{t("th_floor")}</div><div>{t("th_deal")}</div><div>{t("th_price")}</div>
            </div>
            {b.units.map((u) => (
              <Link key={u.id} href={`/property/${u.slug}`} className="urow" style={{ color: "var(--ink)" }}>
                <div><b>{typeLabel(lang, u.type)}</b>{u.rooms ? `, ${u.rooms} ${t("rooms_short")}` : ""}</div>
                <div>{u.area} м²</div>
                <div>{u.floor}</div>
                <div>{t("deal_" + u.deal)}</div>
                <div className="uprice">
                  {u.priceNum ? <span className="bx-price" data-num={u.priceNum} data-cur={u.currency}>{fmtMoney(u.priceNum, u.currency)}</span> : u.price}
                  {u.deal === "sale" && u.perM2 ? <div className="perm"><span className="bx-price" data-num={u.perM2} data-cur={u.currency}>{fmtMoney(u.perM2, u.currency)}</span> /м²</div> : null}
                </div>
              </Link>
            ))}
          </div>

          <div className="map-sm"><MapView buildings={mapBuildings} className="map-sm" center={[b.lat, b.lng]} zoom={15} /></div>
        </div>

        <aside>
          <div className="cta-card">
            <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: 18 }}>{t("bld_cta_title")} «{b.name}»?</div>
            <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: "8px 0 4px" }}>{t("bld_cta_sub")}</p>
            <LeadButton className="btn btn-gold" type="Заявка по ЖК" object={b.name} title={`Заявка — ${b.name}`}>{t("bld_lead")}</LeadButton>
            <a className="btn btn-wa" href={waLink(`Здравствуйте! Интересует ${b.name} в Батуми.`)} target="_blank" rel="noopener">💬 WhatsApp</a>
            <LeadButton className="btn btn-ghost" type="Управление" object={b.name} title="Отдать квартиру в управление">{t("bld_mgmt")}</LeadButton>
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
