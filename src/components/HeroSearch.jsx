"use client";
import { useState } from "react";
import Link from "next/link";
import { GE_CITIES, CAT_LABEL } from "@/data/data";

const TABS = [["sale", "Продажа"], ["rent", "Аренда"], ["new", "Новостройки"], ["daily", "Посуточно"]];

export default function HeroSearch() {
  const [tab, setTab] = useState("sale");
  return (
    <>
      <div className="tabs">
        {TABS.map(([k, l]) => (
          <button type="button" key={k} className={"tab" + (tab === k ? " active" : "")} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      <form className="searchbar" action="/catalog">
        {tab === "new" ? <input type="hidden" name="new" value="1" /> : <input type="hidden" name="deal" value={tab} />}
        <div className="field">
          <label>Город</label>
          <select name="city"><option value="">Любой город</option>{GE_CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>
        </div>
        <div className="field">
          <label>Тип</label>
          <select name="cat"><option value="">Любой тип</option>{Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
        <div className="field"><label>Цена до, $</label><input name="pmax" inputMode="numeric" placeholder="150000" /></div>
        <button className="btn btn-gold" style={{ padding: "0 26px" }} type="submit">Показать объекты</button>
        <Link className="btn btn-ghost" href="/map" style={{ padding: "0 20px", border: "1px solid var(--navy)", whiteSpace: "nowrap" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" /></svg>
          На карте
        </Link>
      </form>
    </>
  );
}
