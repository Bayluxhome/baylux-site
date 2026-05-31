"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GE_CITIES, CAT_LABEL } from "@/data/data";
import { useFilter } from "./FilterContext";
import { useLang } from "./LangContext";

const TABS = [["sale", "tab_sale"], ["rent", "tab_rent"], ["new", "tab_new"], ["daily", "tab_daily"]];
const TYPE_BY_TAB = {
  new: ["apartment", "house", "commercial", "office", "garage"],
  daily: ["apartment", "house"],
};

export default function HeroSearch() {
  const { f, upd } = useFilter();
  const { t } = useLang();
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
        {TABS.map(([k, lk]) => (
          <button type="button" key={k} className={"tab" + (f.tab === k ? " active" : "")} onClick={() => { upd("tab", k); if (TYPE_BY_TAB[k] && f.cat && !TYPE_BY_TAB[k].includes(f.cat)) upd("cat", ""); }}>{t(lk)}</button>
        ))}
      </div>
      <form className="searchbar" onSubmit={show}>
        <div className="field">
          <label>{t("f_city")}</label>
          <select value={f.city} onChange={(e) => upd("city", e.target.value)}><option value="">{t("f_anyCity")}</option>{GE_CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>
        </div>
        <div className="field">
          <label>{t("f_type")}</label>
          <select value={f.cat} onChange={(e) => upd("cat", e.target.value)}><option value="">{t("f_anyType")}</option>{typeKeys.map((k) => <option key={k} value={k}>{CAT_LABEL[k]}</option>)}</select>
        </div>
        <div className="field"><label>{t("f_priceTo")}</label><input value={f.pmax} onChange={(e) => upd("pmax", e.target.value)} inputMode="numeric" placeholder="150000" /></div>
        <button className="btn btn-gold" style={{ padding: "0 26px" }} type="submit">{t("f_show")}</button>
        <Link className="btn btn-ghost" href="/map" style={{ padding: "0 20px", border: "1px solid var(--navy)", whiteSpace: "nowrap" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" /></svg>
          {t("f_map")}
        </Link>
      </form>
    </>
  );
}
