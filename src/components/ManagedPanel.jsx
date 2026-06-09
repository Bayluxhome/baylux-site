"use client";
import { useState } from "react";
import { useLang } from "@/components/LangContext";
import OwnerMessages from "@/components/OwnerMessages";
import PhotoReports from "@/components/PhotoReports";
import ReportSummary from "@/components/ReportSummary";

// Объекты владельца, переданные в управление Baylux. Редактировать нельзя — только сводка.
// Сводка пока заглушка («в разработке»): метрики дохода, загрузки, коммуналки, календарь.
export default function ManagedPanel({ items, adminView }) {
  const { t } = useLang();
  const [open, setOpen] = useState(null);

  if (!items.length) {
    return (
      <div style={{ background: "var(--cream)", borderRadius: 14, padding: "24px 22px", color: "var(--ink-soft)" }}>
        <p style={{ margin: 0, lineHeight: 1.6 }}>{t("mg_empty")}</p>
      </div>
    );
  }

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
                {adminView && (
                  <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                    👤 {r.owner || "—"} · 🧑‍💼 {r.responsible || t("mg_resp_none")}
                  </span>
                )}
                <div className="my-actions">
                  {r.slug && <a className="my-link" href={"/property/" + r.slug}>{t("my_view")}</a>}
                  {r.canManage && <a className="my-link" href={"/my/edit/" + r.id}>{t("my_edit")}</a>}
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
              <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ color: "var(--navy)", fontWeight: 700, fontSize: 14 }}>📄 {t("mg_contract")}</span>
                {r.contract
                  ? <a href={r.contract} target="_blank" rel="noopener noreferrer" className="my-link">{t("mg_contract_open")} →</a>
                  : <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>{t("mg_no_contract")}</span>}
              </div>
              {(r.managerName || r.managerPhone || r.managerEmail || r.managerTg) && (
                <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
                  <span style={{ color: "var(--navy)", fontWeight: 700, fontSize: 14 }}>🧑‍💼 {t("mg_manager")}</span>
                  <div style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 4 }}>{[r.managerName, r.managerPhone, r.managerEmail, r.managerTg].filter(Boolean).join(" · ")}</div>
                </div>
              )}
              {r.internalNo && (
                <div style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 10 }}>🔢 {t("mg_internal_no")}: <b style={{ color: "var(--navy)" }}>{r.internalNo}</b></div>
              )}
              {(r.ownerName || r.ownerPhone || r.ownerEmail) && (
                <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
                  <span style={{ color: "var(--navy)", fontWeight: 700, fontSize: 14 }}>👤 {t("mg_owner_contact")}</span>
                  <div style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 4 }}>{[r.ownerName, r.ownerPhone, r.ownerEmail].filter(Boolean).join(" · ")}</div>
                </div>
              )}
              <ReportSummary item={r} />
              <OwnerMessages item={r} />
              <PhotoReports item={r} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
