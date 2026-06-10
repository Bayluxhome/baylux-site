"use client";
import { useState, useMemo } from "react";
import { useLang } from "@/components/LangContext";

// Множитель района (общий для всех форматов).
const DISTRICT = { oldblvd: 1.15, newblvd: 1.1, makh: 0.85, gonio: 0.9, khel: 0.75, other: 0.9 };

// ⚠️ ПРЕДВАРИТЕЛЬНЫЕ ставки в $ — финансист правит ТОЛЬКО эти 4 строки.
const NIGHTLY = { studio: 50, r1: 65, r2: 90, r3: 120 }; // посуточно, цена за ночь в сезон
const OCC = 0.80;                                          // загрузка в сезон (доля)
const SHORT = { studio: 550, r1: 700, r2: 900, r3: 1150 }; // краткосрочно (межсезонье), $/мес
const LONG = { studio: 450, r1: 600, r2: 800, r3: 1050 };  // долгосрочно, $/мес

// Доли собственника по форматам: краткосрочная 80%, посуточная 70%, долгосрочная 90%.
const round10 = (n) => Math.round(n / 10) * 10;

export default function PMCalc() {
  const { t } = useLang();
  const [type, setType] = useState("studio");
  const [district, setDistrict] = useState("oldblvd");

  const TYPES = [["studio", t("pm_t_studio")], ["r1", t("pm_t_1")], ["r2", t("pm_t_2")], ["r3", t("pm_t_3")]];
  const DISTRICTS = [["oldblvd", t("pm_d_oldblvd")], ["newblvd", t("pm_d_newblvd")], ["makh", t("pm_d_makh")], ["gonio", t("pm_d_gonio")], ["khel", t("pm_d_khel")], ["other", t("pm_d_other")]];

  const modes = useMemo(() => {
    const d = DISTRICT[district] || 1;
    const mk = (gross, ownerPct) => { const g = round10(gross); const income = round10(g * ownerPct); return { gross: g, fee: g - income, income }; };
    return [
      { ...mk(SHORT[type] * d, 0.80), split: "80 / 20", title: t("pmx_short"), per: t("pmx_short_per"), grossLbl: t("pmx_gross_rent"), util: t("pmx_util_short") },
      { ...mk(NIGHTLY[type] * d * 30 * OCC, 0.70), split: "70 / 30", title: t("pmx_daily"), per: t("pmx_daily_per"), grossLbl: t("pmx_gross_daily"), util: t("pmx_util_daily"), hot: true },
      { ...mk(LONG[type] * d, 0.90), split: "90 / 10", title: t("pmx_long"), per: t("pmx_long_per"), grossLbl: t("pmx_gross_rent"), util: t("pmx_util_long") },
    ];
  }, [type, district, t]);

  const lbl = { display: "block", fontWeight: 700, color: "var(--navy)", fontSize: 14, margin: "14px 0 8px" };
  const chip = (on) => ({ padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${on ? "var(--gold)" : "var(--line)"}`, background: on ? "var(--cream)" : "#fff", color: "var(--navy)", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" });
  const sel = { width: "100%", maxWidth: 340, padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--line)", fontSize: 15, fontFamily: "inherit", color: "var(--navy)", background: "#fff" };

  return (
    <div id="pm-calc" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "24px 22px", scrollMarginTop: 80 }}>
      <h2 style={{ color: "var(--navy)", margin: "0 0 4px" }}>{t("pm_calc_h")}</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: "0 0 6px" }}>{t("pm_calc_p")}</p>

      <span style={lbl}>{t("pm_type")}</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TYPES.map(([k, v]) => <button key={k} type="button" style={chip(type === k)} onClick={() => setType(k)}>{v}</button>)}
      </div>

      <span style={lbl}>{t("pm_district")}</span>
      <select style={sel} value={district} onChange={(e) => setDistrict(e.target.value)}>
        {DISTRICTS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14, marginTop: 22 }}>
        {modes.map((m) => (
          <div key={m.title} style={{ border: `1.5px solid ${m.hot ? "var(--gold)" : "var(--line)"}`, borderRadius: 14, padding: "16px 16px 14px", background: m.hot ? "var(--cream)" : "#fff", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <b style={{ color: "var(--navy)", fontSize: 16 }}>{m.title}</b>
              <span style={{ background: "var(--navy)", color: "#fff", fontWeight: 700, fontSize: 12, padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{m.split}</span>
            </div>
            <div style={{ color: "var(--ink-soft)", fontSize: 12, margin: "4px 0 12px" }}>{m.per}</div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
              <span style={{ color: "var(--ink-soft)" }}>{m.grossLbl}</span><b style={{ color: "var(--navy)" }}>${m.gross}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
              <span style={{ color: "var(--ink-soft)" }}>{t("pmx_fee")}</span><span style={{ color: "var(--ink-soft)" }}>−${m.fee}</span>
            </div>

            <div style={{ borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 10 }}>
              <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>{t("pmx_income")}</div>
              <div style={{ color: "var(--gold-dk)", fontWeight: 800, fontSize: 22, lineHeight: 1.1 }}>${m.income}<span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}> {t("pmx_mo")}</span></div>
            </div>
            <div style={{ color: "var(--ink-soft)", fontSize: 12, marginTop: 8 }}>💡 {m.util}</div>
          </div>
        ))}
      </div>

      <a className="btn btn-gold" href="/add-holiday" style={{ marginTop: 18, display: "inline-block" }}>{t("pm_plan_btn")}</a>
    </div>
  );
}
