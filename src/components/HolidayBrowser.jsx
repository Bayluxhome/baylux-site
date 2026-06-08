"use client";
import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useLang } from "@/components/LangContext";
import { fmtMoney } from "@/data/data";

// Поиск + витрина объектов под управлением Baylux. Фильтрует список на этой же странице.
// Тбилиси пока убран из выбора города (только Батуми).
const HTYPES = [["", "hh_any_type"], ["studio", "ht_studio"], ["1", "ht_1"]];

export default function HolidayBrowser({ items }) {
  const { t } = useLang();
  const [type, setType] = useState("");
  const [guests, setGuests] = useState("");
  const gridRef = useRef(null);

  const filtered = useMemo(() => items.filter((u) => {
    if (type === "studio" && u.rooms !== 0) return false;
    if (type === "1" && u.rooms !== 1) return false;
    if (guests) { const cap = Math.max(2, (u.rooms || 1) * 2); if (cap < Number(guests)) return false; }
    return true;
  }), [items, type, guests]);

  const apply = () => { if (gridRef.current) gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); };

  const field = { display: "flex", flexDirection: "column", gap: 4, flex: "1 1 150px", minWidth: 0, textAlign: "left" };
  const lbl = { fontSize: 12, fontWeight: 700, color: "var(--navy)" };
  const ctrl = { padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 15, fontFamily: "inherit", color: "var(--navy)", background: "#fff", width: "100%" };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 10px 40px rgba(1,29,60,.14)", marginTop: -44, position: "relative", zIndex: 3 }}>
        <label style={field}>
          <span style={lbl}>{t("hh_city")}</span>
          <select style={ctrl} disabled><option>Батуми</option></select>
        </label>
        <label style={field}>
          <span style={lbl}>{t("hh_htype")}</span>
          <select style={ctrl} value={type} onChange={(e) => setType(e.target.value)}>
            {HTYPES.map(([k, lk]) => <option key={k} value={k}>{t(lk)}</option>)}
          </select>
        </label>
        <label style={field}>
          <span style={lbl}>{t("hh_guests")}</span>
          <select style={ctrl} value={guests} onChange={(e) => setGuests(e.target.value)}>
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((g) => <option key={g} value={g}>{g}+</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-gold" style={{ flex: "1 1 150px", height: 44 }} onClick={apply}>{t("hh_search")}</button>
      </div>

      <h2 ref={gridRef} style={{ color: "var(--navy)", margin: "36px 0 16px", scrollMarginTop: 80 }}>{t("hh_list_h")}</h2>
      {filtered.length === 0 ? (
        <p style={{ color: "var(--ink-soft)", maxWidth: 700 }}>{t("hh_empty")}</p>
      ) : (
        <div className="hh-grid">
          {filtered.map((it) => {
            const suffix = it.deal === "rent" ? t("ps_rent") : it.deal === "daily" ? t("ps_daily") : "";
            const desc = it.desc || `${t("deal_" + it.deal)} · ${it.area ? it.area + " " + t("sqm") : ""}`.trim();
            return (
              <Link key={it.id} href={`/property/${it.slug}`} className="hh-card">
                <div className="hh-ph">
                  <img src={it.photo} alt={it.bname} loading="lazy" />
                  {it.managed && <span className="managed-badge">🏠 {t("managed_badge")}</span>}
                </div>
                <div style={{ padding: "10px 2px 2px" }}>
                  <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 18 }}>
                    {it.priceNum
                      ? <><span className="bx-price" data-num={it.priceNum} data-cur={it.currency}>{fmtMoney(it.priceNum, it.currency)}</span>{suffix}</>
                      : it.price}
                  </div>
                  <div className="hh-desc">{desc}</div>
                  <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>📍 {it.district}{it.bname ? ` · ${it.bname}` : ""}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
