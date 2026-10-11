"use client";
import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/components/LangContext";
import MyListings from "@/components/MyListings";
import ManagedPanel from "@/components/ManagedPanel";
import PropertyListFilters from "@/components/PropertyListFilters";
import { EMPTY_FILTERS, matchListing, sanitizeFilters, filtersFromSearch, writeFiltersToUrl } from "@/lib/listingFilter";

// Вкладки раздела «Мои объекты»: свои объявления и объекты в управлении.
// Подборки и заявки — отдельные разделы кабинета (боковое меню).
// Фильтры (12.10.2026) — тот же общий компонент, что при выборе объектов для подборки.
// Работают внутри активной вкладки; при переключении вкладки сохраняются. Состояние — в URL (?q=&deal=&type=).
export default function CabinetTabs({ listings, managed, adminView }) {
  const { t } = useLang();
  const [tab, setTab] = useState("mine");
  const [flt, setFlt] = useState(EMPTY_FILTERS);
  useEffect(() => {
    setFlt(filtersFromSearch(window.location.search));
    if (new URLSearchParams(window.location.search).get("tab") === "managed") setTab("managed");
  }, []);
  const applyFlt = (f) => { const s = sanitizeFilters(f); setFlt(s); writeFiltersToUrl(s); };

  const active = tab === "mine" ? listings : managed;
  const types = useMemo(() => [...new Set(active.map((x) => x.type).filter(Boolean))], [active]);
  const managedShown = useMemo(() => managed.filter((x) => matchListing(x, flt)), [managed, flt]);
  const [mineCount, setMineCount] = useState(null);

  const TABS = [
    ["mine", t("cab_tab_mine"), listings.length],
    ["managed", t("cab_tab_managed"), managed.length],
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 24, borderBottom: "1px solid var(--line)", margin: "0 0 20px", flexWrap: "wrap" }}>
        {TABS.map(([k, label, n]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            style={{
              background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: 15, fontWeight: tab === k ? 800 : 600,
              color: tab === k ? "var(--navy)" : "var(--ink-soft)",
              padding: "0 2px 12px", marginBottom: -1,
              borderBottom: `3px solid ${tab === k ? "var(--gold)" : "transparent"}`,
            }}
          >
            {k === "managed" ? "🏠 " : ""}{label}{n ? ` · ${n}` : ""}
          </button>
        ))}
      </div>
      {active.length > 0 && (
        <PropertyListFilters value={flt} onChange={applyFlt} types={types} count={tab === "mine" ? (mineCount ?? undefined) : managedShown.length} />
      )}
      {tab === "mine"
        ? <MyListings items={listings} filters={flt} onReset={() => applyFlt(EMPTY_FILTERS)} onCount={setMineCount} />
        : (managed.length > 0 && managedShown.length === 0
          ? <p className="cab-empty">{t("flt_nothing")} <button type="button" className="btn btn-ghost" onClick={() => applyFlt(EMPTY_FILTERS)}>{t("flt_reset")}</button></p>
          : <ManagedPanel items={managedShown} adminView={adminView} />)}
    </div>
  );
}
