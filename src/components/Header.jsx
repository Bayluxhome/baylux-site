"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { GE_CITIES } from "@/data/data";
import LeadButton from "@/components/LeadButton";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("Грузия, Батуми");
  const [active, setActive] = useState("Батуми");
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  function pickCity(name) { setActive(name); setLabel("Грузия, " + name); setOpen(false); }
  function pickAll() { setActive(null); setLabel("Вся Грузия"); setOpen(false); }

  return (
    <header className="site">
      <div className="wrap hrow">
        <Link className="logo" href="/"><img src="/baylux_logo.svg" alt="Baylux" /></Link>

        <div className="loc" ref={ref}>
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
          <Link href="/catalog?deal=sale">Купить</Link>
          <Link href="/catalog?deal=rent">Снять</Link>
          <Link href="/catalog?deal=daily">Посуточно</Link>
          <Link href="/catalog?type=new">Новостройки</Link>
          <Link href="/#services">Услуги</Link>
        </nav>

        <div className="hright">
          <div className="lang"><b>RU</b>·<a href="#">EN</a>·<a href="#">KA</a></div>
          <div className="icon-btn" title="Избранное">♡</div>
          <LeadButton className="btn btn-gold" type="Сдать / продать" title="Сдать или продать недвижимость">Сдать / продать</LeadButton>
        </div>
      </div>
    </header>
  );
}
