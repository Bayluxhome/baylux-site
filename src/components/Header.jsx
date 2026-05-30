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

export default function Header() {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("Грузия, Батуми");
  const [active, setActive] = useState("Батуми");
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState("RU");
  const [curr, setCurr] = useState("USD");
  const [loginOpen, setLoginOpen] = useState(false);
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

  function pickCity(name) { setActive(name); setLabel("Грузия, " + name); setOpen(false); }
  function pickAll() { setActive(null); setLabel("Вся Грузия"); setOpen(false); }

  return (
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
          <Link href="/catalog?deal=sale">Продажа</Link>
          <Link href="/catalog?deal=rent">Аренда</Link>
          <Link href="/catalog?type=new">Новостройки</Link>
          <Link href="/catalog?deal=daily">Посуточно</Link>
          <Link href="/#services">Услуги</Link>
        </nav>

        <div className="hright">
          <Link className="hicon" href="/catalog" title="Поиск объектов" aria-label="Поиск">
            <span className="hi-ic">🔍</span><span className="hi-tx">Поиск</span>
          </Link>
          <button className="hicon hicon-sq" title="Избранное" aria-label="Избранное">♡</button>

          <div className="langw" ref={langRef}>
            <button className="hicon hicon-sq" onClick={(e) => { e.stopPropagation(); setLangOpen((v) => !v); }} title="Язык и валюта" aria-label="Язык и валюта">
              🌐<span className="lang-cur">{lang}</span>
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
                  <button key={c.code} className={"lp-row" + (curr === c.code ? " active" : "")} onClick={() => { setCurr(c.code); }}>
                    <b className="lp-cur">{c.sym}</b><span>{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="hdiv" />

          <div className="langw" ref={loginRef}>
            <button className="hicon hlogin" onClick={(e) => { e.stopPropagation(); setLoginOpen((v) => !v); }} title="Личный кабинет">
              <span className="hi-ic">👤</span><span className="hi-tx">Войти</span>
            </button>
            {loginOpen && (
              <div className="lang-pop login-pop">
                <div className="lp-h">Личный кабинет</div>
                <p className="login-note">Кабинет с избранным, бронированиями и заявками — скоро. Пока вход не требуется: оставьте заявку, и менеджер ответит за 5 минут.</p>
                <LeadButton className="btn btn-gold" style={{ width: "100%" }} type="Вопрос / заявка" title="Оставить заявку">Оставить заявку</LeadButton>
              </div>
            )}
          </div>

          <LeadButton className="btn btn-gold" type="Сдать / продать" title="Сдать или продать недвижимость">Сдать / продать</LeadButton>
        </div>
      </div>
    </header>
  );
}
