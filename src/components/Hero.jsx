"use client";
import HeroSearch from "./HeroSearch";
import { useFilter } from "./FilterContext";
import { useLang } from "./LangContext";

const CITY_IMG = { "Батуми": "/hero-batumi.webp", "Тбилиси": "/hero-tbilisi.webp" };

export default function Hero({ count }) {
  const { f } = useFilter();
  const { t } = useLang();
  const city = f.city;
  const img = CITY_IMG[city] || "/hero-georgia.webp";
  const place = city || t("georgia");
  return (
    <section className="hero">
      <div
        className="hero-photo"
        style={{ backgroundImage: `linear-gradient(100deg, rgba(1,29,60,.94) 0%, rgba(1,29,60,.72) 46%, rgba(1,39,80,.46) 100%), url(${img})` }}
      />
      <div className="wrap hero-inner">
        <h1>{t("hero_pre")} <span className="accent">{place}</span><br />{t("hero_post")}</h1>
        <p>{t("hero_sub")}</p>
        <HeroSearch />
        <div className="stat-row">
          {count > 0 && <div className="stat"><b>{count}</b><span>{t("st_objects")}</span></div>}
          <div className="stat"><b>0%</b><span>{t("st_commission")}</span></div>
          <div className="stat"><b>24/7</b><span>{t("st_support")}</span></div>
          <div className="stat"><b>3</b><span>{t("st_langs")}</span></div>
        </div>
      </div>
    </section>
  );
}
