"use client";
import HeroSearch from "./HeroSearch";
import { useFilter } from "./FilterContext";
import { useLang } from "./LangContext";
import { channelForCity, TG_CHANNELS, TG_CONTACT, WA_PHONE } from "@/config";
import { cityLabel } from "@/lib/dict";

const CITY_IMG = { "Батуми": "/hero-batumi.webp", "Тбилиси": "/hero-tbilisi.webp" };

const TgIcon = ({ s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M21.94 4.58a1.3 1.3 0 0 0-1.32-.2L3.4 11.04c-.9.35-.88 1.64.04 1.95l4.3 1.45 1.64 5.02c.2.6.97.78 1.42.32l2.4-2.42 4.36 3.2c.5.37 1.22.1 1.36-.5l3.06-13.9a1.3 1.3 0 0 0-.44-1.3ZM9.7 14.2l8.1-5.1-6.62 6.06c-.16.15-.27.36-.3.58l-.26 1.97-1.02-3.5Z"/>
  </svg>
);

const WaIcon = ({ s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.98L2 22l5.15-1.5A9.94 9.94 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.06.89.9-2.98-.2-.31a8.17 8.17 0 1 1 6.84 3.73Zm4.49-6.12c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.96-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.71-1.33.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.25-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62 1.52.66 2.12.72 2.88.6.46-.07 1.46-.6 1.66-1.18.2-.58.2-1.08.14-1.18-.06-.1-.22-.16-.47-.28Z"/>
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

        {/* 06.11 (Дмитрий): вместо подписки на каналы — прямой контакт. Каналы — маленькой строкой ниже. */}
        <div className="tg-hero">
          <div className="tg-hero-txt">
            <b>{t("hc_h")}</b>
            <span>{t("hc_sub")}</span>
          </div>
          <div className="tg-hero-btns">
            <a className="tg-hero-btn" href={`https://t.me/${TG_CONTACT}`} target="_blank" rel="noopener"><TgIcon /><span>{t("hc_tg")}</span></a>
            <a className="tg-hero-btn wa-hero-btn" href={`https://wa.me/${WA_PHONE}`} target="_blank" rel="noopener"><WaIcon /><span>{t("hc_wa")}</span></a>
          </div>
        </div>
        {(TG_CHANNELS.batumi || TG_CHANNELS.tbilisi) && (
          <div className="hero-channels">
            {t("hc_channels")}{" "}
            {ch
              ? <a href={ch.url} target="_blank" rel="noopener">{cityLabel(lang, city)}</a>
              : <>
                  {TG_CHANNELS.batumi && <a href={"https://t.me/" + TG_CHANNELS.batumi} target="_blank" rel="noopener">{cityLabel(lang, "Батуми")}</a>}
                  {TG_CHANNELS.batumi && TG_CHANNELS.tbilisi && " · "}
                  {TG_CHANNELS.tbilisi && <a href={"https://t.me/" + TG_CHANNELS.tbilisi} target="_blank" rel="noopener">{cityLabel(lang, "Тбилиси")}</a>}
                </>}
          </div>
        )}
      </div>
    </section>
  );
}
