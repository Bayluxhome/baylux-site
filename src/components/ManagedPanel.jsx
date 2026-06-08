"use client";
import { useState } from "react";
import { useLang } from "@/components/LangContext";

// Объекты владельца, переданные в управление Baylux. Редактировать нельзя — только сводка.
// Сводка пока заглушка («в разработке»): метрики дохода, загрузки, коммуналки, календарь.
export default function ManagedPanel({ items }) {
  const { t } = useLang();
  const [open, setOpen] = useState(null);

  if (!items.length) {
    return (
      <div style={{ background: "var(--cream)", borderRadius: 14, padding: "24px 22px", color: "var(--ink-soft)" }}>
        <p style={{ margin: 0, lineHeight: 1.6 }}>{t("mg_empty")}</p>
      </div>
    );
  }

  const tiles = [
    ["💰", t("mg_income"), "—"],
    ["💸", t("mg_payout"), "—"],
    ["📊", t("mg_occ"), "—"],
    ["🧾", t("mg_utils"), "—"],
    ["🛎️", t("mg_checkins"), "—"],
    ["📅", t("mg_calendar"), t("mg_soon")],
  ];

  return (
    <div className="my-list">
      {items.map((r) => (
        <div key={r.id} style={{ border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
          <div className="my-item" style={{ border: "none" }}>
            <div className="my-left">
              <img className="my-thumb" src={r.photo} alt="" />
              <div className="my-main">
                <b>{r.title}</b>
                <span>{r.sub}</span>
                <div className="my-actions">
                  {r.slug && <a className="my-link" href={"/property/" + r.slug}>{t("my_view")}</a>}
                  <button className="my-link" type="button" onClick={() => setOpen(open === r.id ? null : r.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    {open === r.id ? "▲ " : "▼ "}{t("mg_summary")}
                  </button>
                </div>
              </div>
            </div>
            <span className="my-status" style={{ background: "var(--gold-dk)", color: "#fff" }}>🏠 {t("managed_badge")}</span>
          </div>

          {open === r.id && (
            <div style={{ borderTop: "1px solid var(--line)", padding: "16px 16px 18px", background: "var(--cream)" }}>
              <div style={{ display: "inline-block", background: "rgba(201,162,75,.18)", color: "var(--gold-dk)", fontWeight: 700, fontSize: 12, padding: "3px 10px", borderRadius: 20, marginBottom: 14 }}>⚙️ {t("mg_dev")}</div>
              <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ color: "var(--navy)", fontWeight: 700, fontSize: 14 }}>📄 {t("mg_contract")}</span>
                {r.contract
                  ? <a href={r.contract} target="_blank" rel="noopener noreferrer" className="my-link">{t("mg_contract_open")} →</a>
                  : <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>{t("mg_no_contract")}</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                {tiles.map(([ic, label, val]) => (
                  <div key={label} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ fontSize: 20 }}>{ic}</div>
                    <div style={{ color: "var(--ink-soft)", fontSize: 12, margin: "4px 0 2px" }}>{label}</div>
                    <div style={{ color: "var(--navy)", fontWeight: 800, fontSize: 17 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
