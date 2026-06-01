"use client";
import HeroSearch from "./HeroSearch";
import { useFilter } from "./FilterContext";
import { useLang } from "./LangContext";
import { channelForCity, TG_CHANNELS } from "@/config";
import { cityLabel } from "@/lib/dict";

const CITY_IMG = { "Батуми": "/hero-batumi.webp", "Тбилиси": "/hero-tbilisi.webp" };

const TgIcon = ({ s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M21.94 4.58a1.3 1.3 0 0 0-1.32-.2L3.4 11.04c-.9.35-.88 1.64.04 1.95l4.3 1.45 1.64 5.02c.2.6.97.78 1.42.32l2.4-2.42 4.36 3.2c.5.37 1.22.1 1.36-.5l3.06-13.9a1.3 1.3 0 0 0-.44-1.3ZM9.7 14.2l8.1-5.1-6.62 6.06c-.16.15-.27.36-.3.58l-.26 1.97-1.02-3.5Z"/>
  </svg>
);

function TgButton({ url, label, lang }) {
  return (
    <a className="tg-hero-btn" href={url} target="_blank" rel="noopener">
      <TgIcon /><span>{label}</span>
    </a>
  );
}

export default function Hero({ count }) {
  const { f } = useFilter();
  const { t, lang } = useLang();
  const city = f.city;
  const img = CITY_IMG[city] || "/hero-georgia.webp";
  const place = city || t("georgia");
  const ch = city ? channelForCity(city) : null;
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

        {(TG_CHANNELS.batumi || TG_CHANNELS.tbilisi) && (
          <div className="tg-hero">
            <div className="tg-hero-txt">
              <b><TgIcon s={16} /> {ch ? t("tg_cta_city").replace("{city}", cityLabel(lang, city)) : t("tg_cta_all")}</b>
              <span>{t("tg_cta_sub")}</span>
            </div>
            <div className="tg-hero-btns">
              {ch
                ? <TgButton url={ch.url} label={t("tg_cta_btn")} lang={lang} />
                : <>
                    {TG_CHANNELS.batumi && <TgButton url={"https://t.me/" + TG_CHANNELS.batumi} label={cityLabel(lang, "Батуми")} lang={lang} />}
                    {TG_CHANNELS.tbilisi && <TgButton url={"https://t.me/" + TG_CHANNELS.tbilisi} label={cityLabel(lang, "Тбилиси")} lang={lang} />}
                  </>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
