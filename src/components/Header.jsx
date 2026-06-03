"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { GE_CITIES } from "@/data/data";
import { useFilter } from "@/components/FilterContext";
import { useLang } from "@/components/LangContext";
import { cityLabel } from "@/lib/dict";
import LeadButton from "@/components/LeadButton";

const LANGS = [
  { code: "ka", label: "GE", name: "ქართული" },
  { code: "ru", label: "RU", name: "Русский" },
  { code: "en", label: "EN", name: "English" },
];
const NAV_KEY = { "Продажа": "nav_sale", "Аренда": "nav_rent", "Новостройки": "nav_new", "Посуточно": "nav_daily", "Услуги": "nav_services" };
const CURR = [
  { code: "GEL", sym: "₾", name: "GEL — Грузинский лари" },
  { code: "USD", sym: "$", name: "USD — Американский доллар" },
];

// Верхнее меню с выпадающими подменю (как korter, адаптировано под Baylux)
const NAV = [
  { label: "Продажа", href: "/catalog?deal=sale", sub: [
    { d: "sale", c: "apartment", href: "/catalog?deal=sale&cat=apartment" },
    { d: "sale", c: "house", href: "/catalog?deal=sale&cat=house" },
    { d: "sale", c: "commercial", href: "/catalog?deal=sale&cat=commercial" },
    { d: "sale", c: "office", href: "/catalog?deal=sale&cat=office" },
    { d: "sale", c: "warehouse", href: "/catalog?deal=sale&cat=warehouse" },
    { d: "sale", c: "land", href: "/catalog?deal=sale&cat=land" },
    { d: "sale", c: "garage", href: "/catalog?deal=sale&cat=garage" },
  ] },
  { label: "Аренда", href: "/catalog?deal=rent", sub: [
    { d: "rent", c: "apartment", href: "/catalog?deal=rent&cat=apartment" },
    { d: "rent", c: "house", href: "/catalog?deal=rent&cat=house" },
    { d: "rent", c: "commercial", href: "/catalog?deal=rent&cat=commercial" },
    { d: "rent", c: "office", href: "/catalog?deal=rent&cat=office" },
    { d: "rent", c: "warehouse", href: "/catalog?deal=rent&cat=warehouse" },
    { d: "rent", c: "garage", href: "/catalog?deal=rent&cat=garage" },
  ] },
  { label: "Новостройки", href: "/catalog?new=1", sub: [
    { lk: "cat_jk", href: "/catalog?new=1" },
    { lk: "cat_cottage", href: "/catalog?cat=house&new=1" },
  ] },
  { label: "Посуточно", href: "/catalog?deal=daily", sub: [
    { d: "daily", c: "apartment", href: "/catalog?deal=daily&cat=apartment" },
    { d: "daily", c: "house", href: "/catalog?deal=daily&cat=house" },
  ] },
  { label: "Услуги", href: "/#services", sub: [
    { lk: "foot_mgmt", href: "/#services" },
    { lk: "foot_cleaning", href: "/#services" },
    { lk: "foot_realtors", href: "/#services" },
  ] },
];

export default function Header({ cityCounts } = {}) {
  const [open, setOpen] = useState(false);
  const fc = useFilter();
  const { lang: uiLang, setLang: setUiLang, t } = useLang();
  const city = (fc && fc.f && fc.f.city) || "";
  const label = city ? cityLabel(uiLang, city) : t("allGeorgia");
  const [langOpen, setLangOpen] = useState(false);
  const [curr, setCurr] = useState("USD");
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [favCount, setFavCount] = useState(0);
  const [auth, setAuth] = useState(null);
  const locRef = useRef(null);
  const langRef = useRef(null);
  const loginRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (locRef.current && !locRef.current.contains(e.target)) setOpen(false);
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
      if (loginRef.current && !loginRef.current.contains(e.target)) setLoginOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  useEffect(() => { try { const c = localStorage.getItem("bxCurrency"); if (c) setCurr(c); } catch (e) {} }, []);

  useEffect(() => {
    const upd = () => { try { setFavCount(JSON.parse(localStorage.getItem("bxFav") || "[]").length); } catch (e) {} };
    upd();
    window.addEventListener("bxfav", upd);
    window.addEventListener("storage", upd);
    return () => { window.removeEventListener("bxfav", upd); window.removeEventListener("storage", upd); };
  }, []);

  useEffect(() => { fetch("/api/me").then((r) => r.json()).then(setAuth).catch(() => setAuth({ in: false })); }, []);

  function pickCity(name) { if (fc) fc.upd("city", name); setOpen(false); }
  function pickAll() { if (fc) fc.upd("city", ""); setOpen(false); }

  return (
    <>
    <header className="site">
      <div className="wrap hrow">
        <Link className="logo" href="/"><img src="/baylux_logo.svg" alt="Baylux" /></Link>

        <div className="loc" ref={locRef}>
          <button className="loc-btn" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>
            <span className="pin">📍</span><span>{label}</span> ▾
          </button>
          {open && (
            <div className="loc-pop">
              <div className="loc-countries">
                <div className="loc-country active">{t("country_ge")}</div>
                <div className="loc-country soon">{t("country_kz")} · {t("loc_soon")}</div>
                <div className="loc-country soon">{t("country_ae")} · {t("loc_soon")}</div>
              </div>
              <button className="loc-allbtn" onClick={pickAll}>{t("loc_all")}</button>
              <div className="loc-cities">
                {GE_CITIES.map((c) => (
                  <button key={c.name} className={"loc-city" + (city === c.name ? " active" : "")} onClick={() => pickCity(c.name)}>
                    <b>{cityLabel(uiLang, c.name)}</b><span>{cityCounts ? (cityCounts[c.name] || 0) : c.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <nav className="main">
          {NAV.map((it) => (
            <div className="navitem" key={it.label}>
              <Link className="navtop" href={it.href}>{NAV_KEY[it.label] ? t(NAV_KEY[it.label]) : it.label}<span className="navcar">▾</span></Link>
              <div className="submenu">
                {it.sub.map((s) => <Link key={s.href + (s.lk || s.c)} href={s.href}>{s.lk ? t(s.lk) : `${t("deal_" + s.d)} · ${t("cat_" + s.c)}`}</Link>)}
              </div>
            </div>
          ))}
        </nav>

        <div className="hright">
          <Link className="hicon" href="/catalog" title="Поиск объектов" aria-label="Поиск">
            <svg className="hi-ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <span className="hi-tx">{t("search")}</span>
          </Link>
          <Link className="hicon hicon-sq" href="/favorites" title="Избранное" aria-label="Избранное">♡{favCount > 0 && <span className="fav-count">{favCount}</span>}</Link>

          <div className="langw" ref={langRef}>
            <button className="hicon hlang" onClick={(e) => { e.stopPropagation(); setLangOpen((v) => !v); }} title="Язык и валюта" aria-label="Язык и валюта">
              <svg className="hi-ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18" /></svg><span className="lang-cur">{uiLang === "ka" ? "GE" : uiLang.toUpperCase()}</span>
            </button>
            {langOpen && (
              <div className="lang-pop">
                <div className="lp-h">{t("lp_lang")}</div>
                {LANGS.map((l) => (
                  <button key={l.code} className={"lp-row" + (uiLang === l.code ? " active" : "")} onClick={() => setUiLang(l.code)}>
                    <b>{l.label}</b><span>{l.name}</span>
                  </button>
                ))}
                <div className="lp-h">{t("lp_curr")}</div>
                {CURR.map((c) => (
                  <button key={c.code} className={"lp-row" + (curr === c.code ? " active" : "")} onClick={() => { setCurr(c.code); if (typeof window !== "undefined" && window.bxApplyCurrency) window.bxApplyCurrency(c.code); }}>
                    <b className="lp-cur">{c.sym}</b><span>{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="hdiv" />

          <Link className={"hicon hlogin" + (auth && auth.in ? " hlogin-in" : "")} href="/my" title="Личный кабинет">
            <span className="hi-ic">👤</span><span className="hi-tx">{auth && auth.in ? (auth.name ? auth.name.split(" ")[0] : t("cabinet")) : t("login")}</span>
          </Link>

          <Link className="btn btn-gold" href="/add">{t("sell")}</Link>
        </div>

        <button className="burger" aria-label="Меню" onClick={() => setMenuOpen(true)}>☰</button>
      </div>
    </header>

      {menuOpen && (
        <div className="mobile-drawer" onClick={(e) => { if (e.target.classList.contains("mobile-drawer")) setMenuOpen(false); }}>
          <div className="md-panel">
            <button className="md-close" onClick={() => setMenuOpen(false)} aria-label="Закрыть">✕</button>
            <div className="md-curr">
              <span className="md-curr-lbl">{t("md_lang")}</span>
              {LANGS.map((l) => (
                <button key={l.code} type="button" className={"md-curr-btn" + (uiLang === l.code ? " on" : "")} onClick={() => setUiLang(l.code)}>{l.label}</button>
              ))}
            </div>
            <div className="md-curr">
              <span className="md-curr-lbl">{t("lp_curr")}</span>
              {CURR.map((c) => (
                <button key={c.code} type="button" className={"md-curr-btn" + (curr === c.code ? " on" : "")} onClick={() => { setCurr(c.code); if (typeof window !== "undefined" && window.bxApplyCurrency) window.bxApplyCurrency(c.code); }}>{c.sym} {c.code}</button>
              ))}
            </div>
            {NAV.map((it) => <Link key={it.label} href={it.href} className="md-item" onClick={() => setMenuOpen(false)}>{NAV_KEY[it.label] ? t(NAV_KEY[it.label]) : it.label}</Link>)}
            <Link href="/catalog" className="md-item" onClick={() => setMenuOpen(false)}>🔍 {t("search")}</Link>
            <Link href="/my" className="md-item" onClick={() => setMenuOpen(false)}>👤 {auth && auth.in ? t("cabinet") : t("login")}</Link>
            <Link href="/add" className="md-item md-sell" onClick={() => setMenuOpen(false)}>{t("sell")}</Link>
          </div>
        </div>
      )}
    </>
  );
}
