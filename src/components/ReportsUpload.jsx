"use client";
import { useState } from "react";
import { useLang } from "@/components/LangContext";

const HEADERS = ["внутренний номер", "месяц", "доход", "выплачено владельцу", "комиссия", "коммуналка", "расходы", "заметка"];
const SAMPLE = [
  ["A-101", "2026-06", 1200, 960, 240, 80, 30, "всё в порядке"],
  ["A-102", "2026-06", 1500, 1200, 300, 90, 0, ""],
];
const COL_W = [18, 12, 12, 18, 12, 13, 12, 30];
const HELP = [
  ["Как заполнять сводку Baylux"],
  [""],
  ["внутренний номер", "Внутренний номер объекта из его карточки. По нему строка привязывается к квартире. Обязательно."],
  ["месяц", "Месяц отчёта в формате ГГГГ-ММ, например 2026-06. Обязательно."],
  ["доход", "Общая выручка за месяц, число (без знака валюты)."],
  ["выплачено владельцу", "Сумма к выплате собственнику."],
  ["комиссия", "Комиссия Baylux."],
  ["коммуналка", "Коммунальные платежи."],
  ["расходы", "Прочие расходы (ремонт, расходники и т.п.)."],
  ["заметка", "Комментарий для собственника (необязательно)."],
  [""],
  ["Одна строка = один объект за один месяц. Файл можно вести один на все месяцы — данные группируются по месяцу."],
];

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

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...SAMPLE]);
    ws["!cols"] = COL_W.map((w) => ({ wch: w }));
    const help = XLSX.utils.aoa_to_sheet(HELP);
    help["!cols"] = [{ wch: 22 }, { wch: 70 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Сводка");
    XLSX.utils.book_append_sheet(wb, help, "Инструкция");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "baylux_svodka_template.xlsx";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
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
