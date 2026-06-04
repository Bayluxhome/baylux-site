import Link from "next/link";
import CategoryGrid from "@/components/CategoryGrid";
import Hero from "@/components/Hero";
import HomeExplore from "@/components/HomeExplore";
import FreshListings from "@/components/FreshListings";
import RealtorsStrip from "@/components/RealtorsStrip";
import NewsStrip from "@/components/NewsStrip";
import { getBuildingsList, getAllUnits } from "@/data/source";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const revalidate = 300;

export default async function HomePage() {
  const BUILDINGS = await getBuildingsList();
  const allUnits = await getAllUnits();
  const freshUnits = allUnits.slice(0, 24);
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
        <FreshListings units={freshUnits} />
      </section>

      <section className="services wrap" id="services">
        <div className="sec-head"><div><h2>{t("who_h")}</h2><p>{t("who_p")}</p></div></div>
        <div className="who-grid">
          <Link href="/catalog" className="who"><img src="/icons/audience-buy.png" alt="" width={60} height={60} loading="lazy" /><h3>{t("who_buy_h")}</h3><p>{t("who_buy_p")}</p><span>{t("who_buy_btn")}</span></Link>
          <Link href="/add" className="who"><img src="/icons/audience-sell.png" alt="" width={60} height={60} loading="lazy" /><h3>{t("who_sell_h")}</h3><p>{t("who_sell_p")}</p><span>{t("who_sell_btn")}</span></Link>
          <Link href="/contacts" className="who"><img src="/icons/audience-manage.png" alt="" width={60} height={60} loading="lazy" /><h3>{t("who_mng_h")}</h3><p>{t("who_mng_p")}</p><span>{t("who_mng_btn")}</span></Link>
          <Link href="/realtors" className="who"><img src="/icons/audience-realtor.png" alt="" width={60} height={60} loading="lazy" /><h3>{t("who_rlt_h")}</h3><p>{t("who_rlt_p")}</p><span>{t("who_rlt_btn")}</span></Link>
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
