"use client";
import { useState } from "react";
import { useLang } from "@/components/LangContext";

const DEAL_MAP = { "продажа": "sale", "аренда": "rent", "посуточно": "daily", "sale": "sale", "rent": "rent", "daily": "daily" };
const IMG_RE = /\.(jpe?g|png|webp)$/i;
// Текст из строки-примера шаблона — пропускаем, если риелтор её не удалил.
const SAMPLE_ABOUT = "Светлая квартира с видом на море, готова к заселению, документы в порядке.";

function gePhone(raw) {
  const s = String(raw || "").replace(/[^\d]/g, "");
  if (s.startsWith("995") && s.length === 12) return "+" + s;
  if (s.length === 9) return "+995" + s;
  return null;
}
// SHA-256 (hex) от ОРИГИНАЛА файла (до сжатия) — отпечаток фото для поиска дублей.
async function sha256Hex(file) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function compress(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1600;
      let w = img.width, h = img.height;
      if (w > max || h > max) { if (w > h) { h = Math.round((h * max) / w); w = max; } else { w = Math.round((w * max) / h); h = max; } }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      c.toBlob((bl) => { URL.revokeObjectURL(url); resolve(bl || file); }, "image/jpeg", 0.8);
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}

export default function BulkUpload() {
  const { t } = useLang();
  const [xlsx, setXlsx] = useState(null);
  const [zip, setZip] = useState(null);
  const [state, setState] = useState("");   // "" | parsing | uploading | sending | done | error
  const [prog, setProg] = useState("");
  const [result, setResult] = useState(null);
  const [rowErrors, setRowErrors] = useState([]);

  // Чтение Excel → массив строк-объектов (машинные ключи из строки 1).
  async function parseXlsx(file) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets["Объявления"] || wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
    if (!aoa.length) return [];
    const keys = aoa[0].map((k) => String(k || "").trim());
    const rows = [];
    for (let i = 1; i < aoa.length; i++) {
      const arr = aoa[i];
      if (!arr || !arr.length) continue;
      const first = String(arr[0] || "").trim();
      // пропускаем строку человеко-заголовков (A2 = «ID объявления*»)
      if (/^ID\s*объяв/i.test(first) || String(arr[1] || "").trim() === "Сделка*") continue;
      const o = {};
      keys.forEach((k, c) => { if (k) o[k] = arr[c]; });
      if (Object.values(o).every((v) => v == null || String(v).trim() === "")) continue;
      if (String(o.about || "").trim() === SAMPLE_ABOUT) continue; // строка-пример
      rows.push(o);
    }
    return rows;
  }

  // Машинный маппинг RU→значения схемы + валидация.
  function mapRows(raw) {
    const errs = [];
    const mapped = raw.map((o, idx) => {
      const refId = o.id != null && String(o.id).trim() ? String(o.id).trim() : String(idx + 1);
      const deal = DEAL_MAP[String(o.deal || "").trim().toLowerCase()] || "sale";
      const problems = [];
      if (!String(o.address || "").trim()) problems.push(t("bulk_e_addr"));
      if (!(parseInt(String(o.price || "").replace(/[^\d]/g, ""), 10) || 0)) problems.push(t("bulk_e_price"));
      if (problems.length) errs.push({ id: refId, problems });
      // Телефон владельца и его Telegram НЕ отправляем — на сайте публикуется номер агентства.
      return {
        id: refId, deal, type: String(o.type || "Квартира").trim() || "Квартира",
        city: String(o.city || "Батуми").trim() || "Батуми",
        address: String(o.address || "").trim(), complex: String(o.complex || "").trim(),
        price: o.price, currency: String(o.currency || "USD").trim().toUpperCase() === "GEL" ? "GEL" : "USD",
        area: o.area, rooms: o.rooms, bathrooms: o.bathrooms, floor: o.floor, year: o.year,
        amenities: String(o.amenities || "").trim(),
        no_commission: ["да", "yes", "true", "1"].includes(String(o.no_commission || "").trim().toLowerCase()),
        about: String(o.about || "").trim(),
        lang: ["ru", "en", "ka"].includes(String(o.lang || "").trim().toLowerCase()) ? String(o.lang).trim().toLowerCase() : "ru",
        _valid: problems.length === 0, photos: [],
      };
    });
    return { mapped, errs };
  }

  // ZIP → карта { folderId: [File, ...] } по папкам ID (натуральная сортировка).
  async function parseZip(file) {
    const JSZip = (await import("jszip")).default;
    const z = await JSZip.loadAsync(await file.arrayBuffer());
    const byId = {};
    const entries = [];
    z.forEach((path, entry) => { if (!entry.dir && IMG_RE.test(path)) entries.push({ path, entry }); });
    for (const { path, entry } of entries) {
      const parts = path.split("/").filter(Boolean);
      if (parts.length < 2) continue;                 // фото должно лежать в папке ID
      const folder = parts[parts.length - 2];
      const name = parts[parts.length - 1];
      const blob = await entry.async("blob");
      (byId[folder] ||= []).push({ name, file: new File([blob], name, { type: blob.type || "image/jpeg" }) });
    }
    Object.values(byId).forEach((a) => a.sort((x, y) => x.name.localeCompare(y.name, undefined, { numeric: true })));
    return byId;
  }

  async function uploadOne(file) {
    const blob = await compress(file);
    const fd = new FormData();
    fd.append("photo", blob, "photo.jpg");
    const r = await fetch("/api/upload-photo", { method: "POST", body: fd });
    const j = await r.json();
    return j.ok ? j.url : null;
  }

  async function run(e) {
    e.preventDefault();
    if (!xlsx) { alert(t("bulk_need_xlsx")); return; }
    setResult(null); setRowErrors([]);
    try {
      setState("parsing"); setProg(t("bulk_p_parse"));
      const raw = await parseXlsx(xlsx);
      const { mapped, errs } = mapRows(raw);
      setRowErrors(errs);
      const valid = mapped.filter((r) => r._valid);
      if (!valid.length) { setState("error"); setProg(t("bulk_no_valid")); return; }
      const photos = zip ? await parseZip(zip) : {};

      setState("uploading");
      let done = 0;
      for (const r of valid) {
        const files = (photos[r.id] || []).slice(0, 10);
        const urls = [];
        const hashes = [];
        for (const { file } of files) {
          const hash = await sha256Hex(file);       // хэш оригинала ДО сжатия
          const u = await uploadOne(file);
          if (u) { urls.push(u); hashes.push(hash); }
        }
        r.photos = urls;
        r.photo_hashes = hashes;                     // порядок/число = числу загруженных фото
        done++;
        setProg(t("bulk_p_upload").replace("{n}", done).replace("{total}", valid.length));
      }

      setState("sending"); setProg(t("bulk_p_send"));
      const payload = { rows: valid.map(({ _valid, ...r }) => r) };
      const res = await fetch("/api/bulk-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (j.ok) { setResult(j); setState("done"); }
      else { setState("error"); setProg(j.error === "no_phone" ? t("bulk_no_phone") : t("bulk_send_fail")); }
    } catch (err) { console.error(err); setState("error"); setProg(t("bulk_send_fail")); }
  }

  const busy = state === "parsing" || state === "uploading" || state === "sending";

  if (state === "done" && result) return (
    <div className="addform-done">
      <h2 style={{ color: "var(--navy)" }}>{t("bulk_done_h")}</h2>
      <p style={{ color: "var(--ink-soft)", margin: "10px 0 8px" }}>
        {t("bulk_done_count").replace("{n}", result.count)}
      </p>
      {result.geoFails?.length > 0 && <p style={{ color: "var(--ink-soft)", margin: "0 0 8px" }}>⚠️ {t("bulk_done_geo").replace("{n}", result.geoFails.length)}</p>}
      {result.errors?.length > 0 && <p style={{ color: "var(--ink-soft)", margin: "0 0 8px" }}>⏭ {t("bulk_done_skip").replace("{n}", result.errors.length)}</p>}
      <p style={{ color: "var(--ink-soft)", margin: "0 0 18px" }}>{t("bulk_done_mod")}</p>
      <a className="btn btn-gold" href="/my" style={{ padding: "11px 20px" }}>{t("af_my")}</a>
    </div>
  );

  return (
    <form className="addform" onSubmit={run}>
      <div className="af-full" style={{ color: "var(--ink-soft)", lineHeight: 1.6 }}>{t("bulk_intro")}</div>
      <div className="af-full">
        <a className="btn btn-gold" href="/baylux-template.xlsx" download style={{ padding: "11px 20px", display: "inline-flex" }}>⬇️ {t("bulk_template")}</a>
      </div>
      <label className="af-full">{t("bulk_xlsx")}
        <input type="file" accept=".xlsx" onChange={(e) => setXlsx(e.target.files[0] || null)} />
      </label>
      <label className="af-full">{t("bulk_zip")}
        <input type="file" accept=".zip" onChange={(e) => setZip(e.target.files[0] || null)} />
      </label>
      {rowErrors.length > 0 && (
        <div className="af-full" style={{ background: "#fff6f6", border: "1px solid #f3c4c4", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#9a2b2b" }}>
          <b>{t("bulk_rowerr_h").replace("{n}", rowErrors.length)}</b>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {rowErrors.slice(0, 15).map((e) => <li key={e.id}>#{e.id}: {e.problems.join(", ")}</li>)}
          </ul>
        </div>
      )}
      <div className="af-full">
        <button className="btn btn-gold" type="submit" disabled={busy} style={{ padding: "13px 26px", fontSize: 15 }}>
          {busy ? t("bulk_working") : t("bulk_submit")}
        </button>
        {busy && <div className="af-hint" style={{ marginTop: 8 }}>{prog}</div>}
        {state === "error" && <div className="af-err">{prog || t("af_err")}</div>}
      </div>
    </form>
  );
}
