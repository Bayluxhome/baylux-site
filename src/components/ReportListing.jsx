"use client";
import { useState } from "react";
import { useLang } from "@/components/LangContext";

// 06.11.2026: «Пожаловаться на объявление» — маленькая ссылка внизу карточки объекта.
export default function ReportListing({ id }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  if (!id) return null;
  const send = (reason) => {
    setSent(true);
    fetch("/api/report-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, reason }) }).catch(() => {});
  };
  if (sent) return <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 12 }}>✓ {t("rep_thanks")}</div>;
  return (
    <div style={{ marginTop: 12, fontSize: 12 }}>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} style={{ background: "none", border: 0, padding: 0, color: "var(--ink-soft)", textDecoration: "underline", cursor: "pointer", fontSize: 12 }}>🚩 {t("rep_btn")}</button>
      ) : (
        <div>
          <div style={{ color: "var(--navy)", fontWeight: 600, marginBottom: 6 }}>{t("rep_q")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["bad", "fake", "sold", "other"].map((r) => (
              <button type="button" key={r} className="amen-tag" onClick={() => send(r)}>{t("rep_r_" + r)}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
