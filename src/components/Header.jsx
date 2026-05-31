"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { GE_CITIES } from "@/data/data";
import LeadButton from "@/components/LeadButton";

const LANGS = [
  { code: "GE", name: "ქართული" },
  { code: "RU", name: "Русский" },
  { code: "EN", name: "English" },
];
const CURR = [
  { code: "GEL", sym: "₾", name: "GEL — Грузинский лари" },
  { code: "USD", sym: "$", name: "USD — Американский доллар" },
];

// Верхнее меню с выпадающими подменю (как korter, адаптировано под Baylux)
const NAV = [
  { label: "Продажа", href: "/catalog?deal=sale", sub: [
    ["Продажа квартир", "/catalog?deal=sale&cat=apartment"],
    ["Продажа домов", "/catalog?deal=sale&cat=house"],
    ["Продажа коммерческой недвижимости", "/catalog?deal=sale&cat=commercial"],
    ["Продажа офисов", "/catalog?deal=sale&cat=office"],
    ["Продажа складов", "/catalog?deal=sale&cat=warehouse"],
    ["Продажа участков", "/catalog?deal=sale&cat=land"],
    ["Продажа гаражей и паркингов", "/catalog?deal=sale&cat=garage"],
  ] },
  { label: "Аренда", href: "/catalog?deal=rent", sub: [
    ["Аренда квартир", "/catalog?deal=rent&cat=apartment"],
    ["Аренда домов", "/catalog?deal=rent&cat=house"],
    ["Аренда коммерческой недвижимости", "/catalog?deal=rent&cat=commercial"],
    ["Аренда офисов", "/catalog?deal=rent&cat=office"],
    ["Аренда складов", "/catalog?deal=rent&cat=warehouse"],
    ["Аренда гаражей и паркингов", "/catalog?deal=rent&cat=garage"],
  ] },
  { label: "Новостройки", href: "/catalog?new=1", sub: [
    ["Жилые комплексы", "/catalog?new=1"],
    ["Коттеджи", "/catalog?cat=house&new=1"],
  ] },
  { label: "Посуточно", href: "/catalog?deal=daily", sub: [
    ["Посуточная аренда квартир", "/catalog?deal=daily&cat=apartment"],
    ["Посуточная аренда домов", "/catalog?deal=daily&cat=house"],
  ] },
  { label: "Услуги", href: "/#services", sub: [
    ["Управление недвижимостью", "/#services"],
    ["Клининг", "/#services"],
    ["Риелторы", "/#services"],
  ] },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("Грузия, Батуми");
  const [active, setActive] = useState("Батуми");
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState("RU");
  const [curr, setCurr] = useState("USD");
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  function pickCity(name) { setActive(name); setLabel("Грузия, " + name); setOpen(false); }
  function pickAll() { setActive(null); setLabel("Вся Грузия"); setOpen(false); }

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
                <div className="loc-country active">Грузия</div>
                <div className="loc-country soon">Казахстан · скоро</div>
                <div className="loc-country soon">ОАЭ · скоро</div>
              </div>
              <button className="loc-allbtn" onClick={pickAll}>🇬🇪 Вся Грузия — объекты во всех городах</button>
              <div className="loc-cities">
                {GE_CITIES.map((c) => (
                  <button key={c.name} className={"loc-city" + (active === c.name ? " active" : "")} onClick={() => pickCity(c.name)}>
                    <b>{c.name}</b><span>{c.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <nav className="main">
          {NAV.map((it) => (
            <div className="navitem" key={it.label}>
              <Link className="navtop" href={it.href}>{it.label}<span className="navcar">▾</span></Link>
              <div className="submenu">
                {it.sub.map(([l, h]) => <Link key={l} href={h}>{l}</Link>)}
              </div>
            </div>
          ))}
        </nav>

        <div className="hright">
          <Link className="hicon" href="/catalog" title="Поиск объектов" aria-label="Поиск">
            <span className="hi-ic">🔍</span><span className="hi-tx">Поиск</span>
          </Link>
          <button className="hicon hicon-sq" title="Избранное" aria-label="Избранное">♡</button>

          <div className="langw" ref={langRef}>
            <button className="hicon hlang" onClick={(e) => { e.stopPropagation(); setLangOpen((v) => !v); }} title="Язык и валюта" aria-label="Язык и валюта">
              <span className="hi-ic">🌐</span><span className="lang-cur">{lang}</span>
            </button>
            {langOpen && (
              <div className="lang-pop">
                <div className="lp-h">Язык сайта</div>
                {LANGS.map((l) => (
                  <button key={l.code} className={"lp-row" + (lang === l.code ? " active" : "")} onClick={() => { setLang(l.code); }}>
                    <b>{l.code}</b><span>{l.name}</span>
                  </button>
                ))}
                <div className="lp-h">Валюта сайта</div>
                {CURR.map((c) => (
                  <button key={c.code} className={"lp-row" + (curr === c.code ? " active" : "")} onClick={() => { setCurr(c.code); if (typeof window !== "undefined" && window.bxApplyCurrency) window.bxApplyCurrency(c.code); }}>
                    <b className="lp-cur">{c.sym}</b><span>{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="hdiv" />

          <Link className="hicon hlogin" href="/my" title="Личный кабинет">
            <span className="hi-ic">👤</span><span className="hi-tx">Войти</span>
          </Link>

          <Link className="btn btn-gold" href="/add">Сдать / продать</Link>
        </div>

        <button className="burger" aria-label="Меню" onClick={() => setMenuOpen(true)}>☰</button>
      </div>
    </header>

      {menuOpen && (
        <div className="mobile-drawer" onClick={(e) => { if (e.target.classList.contains("mobile-drawer")) setMenuOpen(false); }}>
          <div className="md-panel">
            <button className="md-close" onClick={() => setMenuOpen(false)} aria-label="Закрыть">✕</button>
            {NAV.map((it) => <Link key={it.label} href={it.href} className="md-item" onClick={() => setMenuOpen(false)}>{it.label}</Link>)}
            <Link href="/catalog" className="md-item" onClick={() => setMenuOpen(false)}>🔍 Поиск по каталогу</Link>
            <Link href="/my" className="md-item" onClick={() => setMenuOpen(false)}>👤 Войти / Кабинет</Link>
            <Link href="/add" className="md-item md-sell" onClick={() => setMenuOpen(false)}>Сдать / продать</Link>
          </div>
        </div>
      )}
    </>
  );
}
