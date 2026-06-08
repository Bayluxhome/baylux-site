"use client";
import { useState } from "react";
import { useLang } from "@/components/LangContext";

const LOC = { ru: "ru-RU", en: "en-US", ka: "ka-GE" };

export default function ReportSummary({ item }) {
  const { t, lang } = useLang();
  const data = item.reportData || {};
  const periods = item.periods || [];
  const [period, setPeriod] = useState(periods[0] || "");
  const cur = data[period] || null;

  const money = (v) => (v == null ? "—" : "$" + Number(v).toLocaleString("ru-RU"));
  const label = (p) => { try { return new Date(p + "-01").toLocaleDateString(LOC[lang] || "ru-RU", { month: "long", year: "numeric" }); } catch { return p; } };

  const tiles = cur ? [
    ["💰", t("mg_income"), money(cur.income)],
    ["💸", t("mg_payout"), money(cur.payout)],
    ["🧮", t("mg_commission"), money(cur.commission)],
    ["🧾", t("mg_utils"), money(cur.utilities)],
    ["🛠️", t("mg_expenses"), money(cur.expenses)],
  ] : [];

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, color: "var(--navy)" }}>{t("mg_period")}:</span>
        {periods.length ? (
          <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--line)", fontFamily: "inherit", fontSize: 14, color: "var(--navy)", background: "#fff" }}>
            {periods.map((p) => <option key={p} value={p}>{label(p)}</option>)}
          </select>
        ) : <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>{t("mg_no_report")}</span>}
      </div>

      {cur ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            {tiles.map(([ic, lbl, val]) => (
              <div key={lbl} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 20 }}>{ic}</div>
                <div style={{ color: "var(--ink-soft)", fontSize: 12, margin: "4px 0 2px" }}>{lbl}</div>
                <div style={{ color: "var(--navy)", fontWeight: 800, fontSize: 17 }}>{val}</div>
              </div>
            ))}
          </div>
          {cur.note && <div style={{ marginTop: 10, color: "var(--ink-soft)", fontSize: 13, whiteSpace: "pre-line" }}>📝 {cur.note}</div>}
        </>
      ) : periods.length ? <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>{t("mg_no_report")}</div> : null}

      <div style={{ marginTop: 12, color: "var(--ink-soft)", fontSize: 12 }}>📅 {t("mg_calendar")} — {t("mg_soon")}</div>
    </div>
  );
}
