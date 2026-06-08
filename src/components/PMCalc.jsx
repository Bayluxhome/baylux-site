"use client";
import { useState } from "react";
import { useLang } from "@/components/LangContext";

// TODO(finance): моки — заменить на цифры финансиста (загрузка % и доход $ по 4 типам × 6 районов × 3 сезона).
const BASE = { studio: 550, r1: 700, r2: 900, r3: 1150 }; // усреднённый gross $/мес
const DISTRICT = { oldblvd: 1.15, newblvd: 1.1, makh: 0.85, gonio: 0.9, khel: 0.75, other: 0.9 };
const SEASON = { high: { m: 1.6, occ: 87 }, low: { m: 0.5, occ: 42 }, avg: { m: 1.0, occ: 65 } };
const FEE = 0.2;

export default function PMCalc() {
  const { t } = useLang();
  const [type, setType] = useState("studio");
  const [district, setDistrict] = useState("oldblvd");
  const [season, setSeason] = useState("avg");
  const [res, setRes] = useState(null);

  const TYPES = [["studio", t("pm_t_studio")], ["r1", t("pm_t_1")], ["r2", t("pm_t_2")], ["r3", t("pm_t_3")]];
  const DISTRICTS = [["oldblvd", t("pm_d_oldblvd")], ["newblvd", t("pm_d_newblvd")], ["makh", t("pm_d_makh")], ["gonio", t("pm_d_gonio")], ["khel", t("pm_d_khel")], ["other", t("pm_d_other")]];
  const SEASONS = [["avg", t("pm_s_avg")], ["high", t("pm_s_high")], ["low", t("pm_s_low")]];

  function calc() {
    const gross = Math.round((BASE[type] * DISTRICT[district] * SEASON[season].m) / 10) * 10;
    const fee = Math.round(gross * FEE);
    const occ = Math.min(95, Math.round(SEASON[season].occ * (DISTRICT[district] >= 1 ? 1.05 : 0.95)));
    setRes({ gross, fee, net: gross - fee, occ });
  }

  const lbl = { display: "block", fontWeight: 700, color: "var(--navy)", fontSize: 14, margin: "14px 0 8px" };
  const chip = (on) => ({
    padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${on ? "var(--gold)" : "var(--line)"}`,
    background: on ? "var(--cream)" : "#fff", color: "var(--navy)", fontWeight: 600, fontSize: 14,
    cursor: "pointer", fontFamily: "inherit",
  });
  const sel = { width: "100%", maxWidth: 340, padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--line)", fontSize: 15, fontFamily: "inherit", color: "var(--navy)", background: "#fff" };

  return (
    <div id="pm-calc" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "24px 22px", scrollMarginTop: 80 }}>
      <h2 style={{ color: "var(--navy)", margin: "0 0 4px" }}>{t("pm_calc_h")}</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: "0 0 6px" }}>{t("pm_calc_p")}</p>

      <span style={lbl}>{t("pm_type")}</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TYPES.map(([k, v]) => (
          <button key={k} type="button" style={chip(type === k)} onClick={() => setType(k)}>{v}</button>
        ))}
      </div>

      <span style={lbl}>{t("pm_district")}</span>
      <select style={sel} value={district} onChange={(e) => setDistrict(e.target.value)}>
        {DISTRICTS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>

      <span style={lbl}>{t("pm_season")}</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {SEASONS.map(([k, v]) => (
          <button key={k} type="button" style={chip(season === k)} onClick={() => setSeason(k)}>{v}</button>
        ))}
      </div>

      <button type="button" className="btn btn-gold" style={{ marginTop: 18 }} onClick={calc}>{t("pm_calc_btn")}</button>

      {res && (
        <div style={{ marginTop: 20, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
          {[
            [t("pm_r_occ"), `${res.occ}%`],
            [t("pm_r_gross"), `$${res.gross}`],
            [t("pm_r_fee"), `−$${res.fee}`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 15 }}>
              <span style={{ color: "var(--ink-soft)" }}>{k}</span><b style={{ color: "var(--navy)" }}>{v}</b>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 4px", fontSize: 17 }}>
            <b style={{ color: "var(--navy)" }}>{t("pm_r_net")}</b>
            <b style={{ color: "var(--gold-dk)" }}>${res.net} {t("pm_r_mo")}</b>
          </div>
          <a className="btn btn-ghost" href="#pm-form" style={{ marginTop: 12, display: "inline-block" }}>{t("pm_plan_btn")}</a>
        </div>
      )}
    </div>
  );
}
