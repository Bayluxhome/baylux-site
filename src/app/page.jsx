import Link from "next/link";
import CategoryGrid from "@/components/CategoryGrid";
import PropertyCard from "@/components/PropertyCard";
import Hero from "@/components/Hero";
import HomeExplore from "@/components/HomeExplore";
import RealtorsStrip from "@/components/RealtorsStrip";
import NewsStrip from "@/components/NewsStrip";
import { getBuildingsList, getAllUnits } from "@/data/source";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const revalidate = 300;

export default async function HomePage() {
  const BUILDINGS = await getBuildingsList();
  const allUnits = await getAllUnits();
  const freshUnits = allUnits.slice(0, 6);
  const lang = getLang();
  const t = (k) => tr(lang, k);

  return (
    <>
      <Hero count={allUnits.length} />

      <CategoryGrid />

      <section className="explore wrap">
        <div className="sec-head">
          <div>
            <h2>{t("home_map_h")}</h2>
            <p>{t("home_map_p")}</p>
          </div>
          <Link className="btn btn-ghost" href="/catalog">{t("home_map_btn")}</Link>
        </div>
        <HomeExplore buildings={BUILDINGS} />
      </section>

      <section className="wrap" style={{ paddingBlock: "10px 30px" }}>
        <div className="sec-head"><div><h2>{t("home_fresh_h")}</h2><p>{t("home_fresh_p")}</p></div></div>
        <div className="cards three">
          {freshUnits.map((u) => <PropertyCard key={u.id} unit={u} />)}
        </div>
      </section>

      <section className="services wrap" id="services">
        <div className="sec-head"><div><h2>{t("svc_h")}</h2><p>{t("svc_p")}</p></div></div>
        <div className="svc-grid">
          <div className="svc"><div className="ic">🔑</div><h3>{t("svc_mgmt_h")}</h3><p>{t("svc_mgmt_p")}</p><Link href="/contacts">{t("svc_mgmt_btn")}</Link></div>
          <div className="svc"><div className="ic">🏠</div><h3>{t("svc_rent_h")}</h3><p>{t("svc_rent_p")}</p><Link href="/catalog?deal=rent">{t("svc_rent_btn")}</Link></div>
          <div className="svc"><div className="ic">📈</div><h3>{t("svc_sale_h")}</h3><p>{t("svc_sale_p")}</p><Link href="/catalog?deal=sale">{t("svc_sale_btn")}</Link></div>
        </div>
      </section>

      <RealtorsStrip />

      <NewsStrip />

      <section className="why">
        <div className="wrap why-grid">
          <div className="why-i"><b>{t("why_local_h")}</b><p>{t("why_local_p")}</p></div>
          <div className="why-i"><b>{t("why_nodup_h")}</b><p>{t("why_nodup_p")}</p></div>
          <div className="why-i"><b>{t("why_clear_h")}</b><p>{t("why_clear_p")}</p></div>
          <div className="why-i"><b>{t("why_fast_h")}</b><p>{t("why_fast_p")}</p></div>
        </div>
      </section>

      <section className="wrap" style={{ paddingBlock: "30px 50px" }}>
        <h2 style={{ color: "var(--navy)", fontSize: 22, marginBottom: 10 }}>{t("seo_home_h")}</h2>
        <p style={{ color: "var(--ink-soft)", lineHeight: 1.7, maxWidth: 820 }}>{t("seo_home_p")}</p>
      </section>
    </>
  );
}
