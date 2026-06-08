"use client";
import { useState } from "react";
import { useLang } from "@/components/LangContext";

const HEADERS = ["внутренний номер", "месяц", "доход", "выплачено владельцу", "комиссия", "коммуналка", "расходы", "заметка"];
const SAMPLE = ["A-101", "2026-06", "1200", "960", "240", "80", "30", "всё в порядке"];

export default function ReportsUpload() {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);

  async function upload(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true); setRes(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/import-reports", { method: "POST", body: fd });
      setRes(await r.json());
    } catch (e2) { setRes({ ok: false, error: "net" }); }
    setBusy(false);
  }

  function downloadTemplate() {
    const csv = HEADERS.join(",") + "\n" + SAMPLE.join(",") + "\n";
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "baylux_svodka_template.csv";
    a.click();
  }

  return (
    <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: "20px 22px", maxWidth: 720 }}>
      <p style={{ color: "var(--ink-soft)", margin: "0 0 16px", lineHeight: 1.6 }}>{t("rep_intro")}</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label className="btn btn-gold" style={{ cursor: "pointer" }}>
          {busy ? t("rep_uploading") : t("rep_upload")}
          <input type="file" accept=".xlsx,.xls,.csv" onChange={upload} disabled={busy} style={{ display: "none" }} />
        </label>
        <button type="button" className="btn btn-ghost" onClick={downloadTemplate}>⬇ {t("rep_template")}</button>
      </div>
      <div style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 10 }}>{t("rep_cols")}: <b>{HEADERS.join(" · ")}</b></div>

      {res && (
        <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10, background: res.ok ? "var(--cream)" : "#fdecea", color: res.ok ? "var(--navy)" : "#b3261e" }}>
          {res.ok ? (
            <>
              <b>✅ {t("rep_done").replace("{n}", res.imported).replace("{m}", (res.skipped || []).length)}</b>
              {(res.skipped || []).length > 0 && (
                <div style={{ fontSize: 13, marginTop: 6, color: "var(--ink-soft)" }}>
                  {t("rep_skipped")}: {res.skipped.map((x) => x.no || "—").join(", ")}
                </div>
              )}
            </>
          ) : (
            <b>{t("rep_fail")} {res.error ? `(${res.error})` : ""}</b>
          )}
        </div>
      )}
    </div>
  );
}
