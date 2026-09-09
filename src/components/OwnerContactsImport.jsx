"use client";
import { useState } from "react";

// Загрузка owner_contacts.csv (его готовит скрипт make_owner_contacts.py).
// Формат: ref;phone;tg;name;hashes — хэши через запятую. Разделитель колонок — «;».
//
// Файл режем на части и шлём последовательно: на сервере лимит времени запроса,
// а строк может быть больше тысячи. Прогресс показываем по частям.
const CHUNK = 150;

function parseCsv(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const head = lines[0].toLowerCase();
  const start = head.includes("ref") && head.includes("hashes") ? 1 : 0;
  const rows = [];
  for (let i = start; i < lines.length; i++) {
    const c = lines[i].split(";");
    if (c.length < 5) continue;
    rows.push({
      ref: (c[0] || "").trim(),
      phone: (c[1] || "").trim(),
      tg: (c[2] || "").trim(),
      name: (c[3] || "").trim(),
      hashes: (c[4] || "").split(",").map((s) => s.trim()).filter(Boolean),
    });
  }
  return rows;
}

const EMPTY = { rows: 0, matched: 0, noMatch: 0, ambiguous: 0, alreadyFilled: 0, toUpdate: 0, updated: 0, failed: 0 };

export default function OwnerContactsImport() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState("");
  const [res, setRes] = useState(null);
  const [samples, setSamples] = useState([]);
  const [err, setErr] = useState("");

  async function run(live) {
    if (!file) { setErr("Выберите файл owner_contacts.csv"); return; }
    setErr(""); setRes(null); setSamples([]); setBusy(true);
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) { setErr("В файле нет подходящих строк"); setBusy(false); return; }
      const total = { ...EMPTY };
      const seen = [];
      for (let i = 0; i < rows.length; i += CHUNK) {
        setProg(`${Math.min(i + CHUNK, rows.length)} из ${rows.length}...`);
        const r = await fetch(`/api/admin/owner-contacts?live=${live ? 1 : 0}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: rows.slice(i, i + CHUNK) }),
        });
        const j = await r.json();
        if (!j.ok) { setErr(j.error === "forbidden" ? "Нужны права супер-администратора" : `Ошибка: ${j.error}`); setBusy(false); return; }
        for (const k of Object.keys(total)) total[k] += j[k] || 0;
        if (seen.length < 12 && j.samples) seen.push(...j.samples.slice(0, 12 - seen.length));
      }
      setRes({ ...total, live });
      setSamples(seen);
    } catch (e) {
      setErr("Не удалось обработать файл: " + e.message);
    }
    setBusy(false); setProg("");
  }

  const box = { background: "#fff", border: "1px solid #e6e6e6", borderRadius: 12, padding: "16px 18px", marginTop: 16 };

  return (
    <div>
      <label style={{ display: "block", marginTop: 14 }}>
        <span style={{ display: "block", fontWeight: 600, color: "var(--navy)", marginBottom: 6 }}>Файл owner_contacts.csv</span>
        <input type="file" accept=".csv,text/csv" onChange={(e) => { setFile(e.target.files[0] || null); setRes(null); setErr(""); }} />
      </label>

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => run(false)} style={{ padding: "10px 18px" }}>
          {busy ? "Считаю..." : "Предпросмотр"}
        </button>
        <button
          className="btn btn-gold"
          type="button"
          disabled={busy || !res || res.live}
          onClick={() => { if (confirm(`Записать контакты в ${res.toUpdate} объявлений?`)) run(true); }}
          style={{ padding: "10px 18px" }}
        >
          Записать
        </button>
      </div>
      {busy && prog && <div style={{ color: "var(--ink-soft)", marginTop: 8, fontSize: 13 }}>{prog}</div>}
      {!res && !busy && <div style={{ color: "var(--ink-soft)", marginTop: 8, fontSize: 13 }}>Кнопка «Записать» станет активной после предпросмотра.</div>}
      {err && <div style={{ color: "#9a2b2b", marginTop: 10 }}>{err}</div>}

      {res && (
        <div style={box}>
          <b style={{ color: "var(--navy)" }}>{res.live ? "Записано" : "Предпросмотр — в базу ничего не записано"}</b>
          <ul style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.8, color: "var(--ink-soft)" }}>
            <li>строк в файле: <b>{res.rows}</b></li>
            <li>нашли объявление по фото: <b>{res.matched}</b></li>
            <li>к записи (поле было пустым): <b>{res.toUpdate}</b></li>
            {res.live && <li>обновлено: <b style={{ color: "var(--navy)" }}>{res.updated}</b>{res.failed ? `, ошибок: ${res.failed}` : ""}</li>}
            <li>контакт уже стоял — не трогали: {res.alreadyFilled}</li>
            <li>совпадений не нашлось: {res.noMatch}</li>
            <li>непонятно, к какому объявлению (ничья по фото): {res.ambiguous}</li>
          </ul>
          {samples.length > 0 && (
            <>
              <div style={{ marginTop: 14, fontWeight: 600, color: "var(--navy)" }}>Примеры</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", marginTop: 6, fontSize: 13, width: "100%" }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "var(--ink-soft)" }}>
                      <th style={{ padding: "4px 10px 4px 0" }}>строка файла</th>
                      <th style={{ padding: "4px 10px 4px 0" }}>объявление</th>
                      <th style={{ padding: "4px 10px 4px 0" }}>совпало фото</th>
                      <th style={{ padding: "4px 0" }}>что запишем</th>
                    </tr>
                  </thead>
                  <tbody>
                    {samples.map((s, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #eee" }}>
                        <td style={{ padding: "5px 10px 5px 0" }}>#{s.ref}</td>
                        <td style={{ padding: "5px 10px 5px 0" }}>{s.listingId}</td>
                        <td style={{ padding: "5px 10px 5px 0" }}>{s.photosMatched}</td>
                        <td style={{ padding: "5px 0" }}>{[s.patch.owner_phone, s.patch.owner_tg_username && "@" + s.patch.owner_tg_username, s.patch.owner_name].filter(Boolean).join(" · ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
