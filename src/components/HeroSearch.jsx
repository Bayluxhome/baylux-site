"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GE_CITIES, CAT_LABEL } from "@/data/data";
import { useFilter } from "./FilterContext";

const TABS = [["sale", "Продажа"], ["rent", "Аренда"], ["new", "Новостройки"], ["daily", "Посуточно"]];
const TYPE_BY_TAB = {
  new: ["apartment", "house", "commercial", "office", "garage"],
  daily: ["apartment", "house"],
};

export default function HeroSearch() {
  const { f, upd } = useFilter();
  const router = useRouter();
  const typeKeys = TYPE_BY_TAB[f.tab] || Object.keys(CAT_LABEL);

  function show(e) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (f.tab === "new") p.set("new", "1"); else p.set("deal", f.tab);
    if (f.city) p.set("city", f.city);
    if (f.cat) p.set("cat", f.cat);
    if (f.pmax) p.set("pmax", f.pmax);
    router.push("/catalog?" + p.toString());
  }

  return (
    <>
      <div className="tabs">
        {TABS.map(([k, l]) => (
          <button type="button" key={k} className={"tab" + (f.tab === k ? " active" : "")} onClick={() => { upd("tab", k); if (TYPE_BY_TAB[k] && f.cat && !TYPE_BY_TAB[k].includes(f.cat)) upd("cat", ""); }}>{l}</button>
        ))}
      </div>
      <form className="searchbar" onSubmit={show}>
        <div className="field">
          <label>Город</label>
          <select value={f.city} onChange={(e) => upd("city", e.target.value)}><option value="">Любой город</option>{GE_CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>
        </div>
        <div className="field">
          <label>Тип</label>
          <select value={f.cat} onChange={(e) => upd("cat", e.target.value)}><option value="">Любой тип</option>{typeKeys.map((k) => <option key={k} value={k}>{CAT_LABEL[k]}</option>)}</select>
        </div>
        <div className="field"><label>Цена до, $</label><input value={f.pmax} onChange={(e) => upd("pmax", e.target.value)} inputMode="numeric" placeholder="150000" /></div>
        <button className="btn btn-gold" style={{ padding: "0 26px" }} type="submit">Показать объекты</button>
        <Link className="btn btn-ghost" href="/map" style={{ padding: "0 20px", border: "1px solid var(--navy)", whiteSpace: "nowrap" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" /></svg>
          На карте
        </Link>
      </form>
    </>
  );
}
