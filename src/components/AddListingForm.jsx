"use client";
import { useState } from "react";
import MapPicker from "./MapPicker";
import { useLang } from "@/components/LangContext";
import { typeLabel, amenLabel } from "@/lib/dict";

const DEALS = ["sale", "rent", "daily"];
const TYPES = ["Квартира", "Студия", "Дом", "Коммерция", "Офис", "Участок", "Гараж"];
const AMENITIES = ["Мебель", "Балкон", "Терраса", "Парковка", "Ремонт «евро»", "Без ремонта", "Кондиционер", "Лифт"];
const CITIES = ["Батуми", "Тбилиси", "Кутаиси", "Гонио", "Махинджаури", "Чакви"];

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

export default function AddListingForm({ initial, editId }) {
  const { t, lang } = useLang();
  const init = initial || {};
  const [f, setF] = useState({ country: "Грузия", city: "Батуми", deal: "sale", type: "Квартира", complex: "", address: "", price: "", currency: "USD", area: "", rooms: "", bathrooms: "", floor: "", year: "", about: "", contact: "", tg: "", noCommission: false, ...(init.f || {}) });
  const [amenities, setAmenities] = useState(init.amenities || []);
  const [existingPhotos, setExistingPhotos] = useState(init.photos || []);
  const [files, setFiles] = useState([]);
  const [facadeFile, setFacadeFile] = useState(null);
  const [facade, setFacade] = useState(init.facade || "");
  const [geo, setGeo] = useState(init.geo || null);
  const [geoNote, setGeoNote] = useState("");
  const [state, setState] = useState("");
  const upd = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const toggleAmenity = (a) => setAmenities((arr) => arr.includes(a) ? arr.filter((x) => x !== a) : [...arr, a]);

  async function geocodeAddress(addr, city) {
    const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (!addr || !addr.trim() || !key) return;
    try {
      const q = `${addr}, ${city}, Georgia`;
      const r = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${key}&limit=1&country=ge`);
      const j = await r.json();
      const c = j?.features?.[0]?.center;
      if (Array.isArray(c) && c.length === 2) { setGeo({ lat: c[1], lng: c[0] }); setGeoNote(t("af_geo_auto")); }
    } catch (e) { /* ignore */ }
  }

  async function submit(e) {
    e.preventDefault();
    if (!f.address.trim()) { alert(t("af_alert_addr")); return; }
    const phone = gePhone(f.contact);
    if (!phone) { alert(t("af_alert_phone")); return; }
    setState("loading");
    try {
      const newUrls = [];
      const newHashes = [];
      for (const file of files.slice(0, 10)) {
        const hash = await sha256Hex(file);     // хэш оригинала ДО сжатия
        const blob = await compress(file);
        const fd = new FormData();
        fd.append("photo", blob, "photo.jpg");
        const r = await fetch("/api/upload-photo", { method: "POST", body: fd });
        const j = await r.json();
        if (j.ok) { newUrls.push(j.url); newHashes.push(hash); }
      }
      const photos = [...existingPhotos, ...newUrls].slice(0, 10);
      const photo_hashes = newHashes.slice(0, 10);
      let facadeUrl = facade;
      if (facadeFile) {
        const blob = await compress(facadeFile);
        const fd = new FormData();
        fd.append("photo", blob, "facade.jpg");
        const r = await fetch("/api/upload-photo", { method: "POST", body: fd });
        const j = await r.json();
        if (j.ok) facadeUrl = j.url;
      }
      const payload = { ...f, contact: phone, amenities, lat: geo?.lat, lng: geo?.lng, photos, photo_hashes, lang, facade: facadeUrl };
      if (editId) payload.id = editId;
      const r = await fetch(editId ? "/api/edit-listing" : "/api/add-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      setState(j.ok ? "done" : "error");
    } catch (err) { setState("error"); }
  }

  if (state === "done") return (
    <div className="addform-done">
      <h2 style={{ color: "var(--navy)" }}>{editId ? t("af_done_edit_h") : t("af_done_add_h")}</h2>
      <p style={{ color: "var(--ink-soft)", margin: "10px 0 18px" }}>{editId ? t("af_done_edit_p") : t("af_done_add_p")} {t("af_done_tail")}</p>
      <a className="btn btn-gold" href="/my" style={{ padding: "11px 20px" }}>{t("af_my")}</a>
    </div>
  );

  return (
    <form className="addform" onSubmit={submit}>
      <label>{t("af_country")}
        <select value={f.country} onChange={(e) => upd("country", e.target.value)}><option>Грузия</option></select>
      </label>
      <label>{t("af_city")}
        <select value={f.city} onChange={(e) => { upd("city", e.target.value); geocodeAddress(f.address, e.target.value); }}>{CITIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
      </label>
      <label>{t("af_deal")}
        <select value={f.deal} onChange={(e) => upd("deal", e.target.value)}>{DEALS.map((v) => <option key={v} value={v}>{t("deal_" + v)}</option>)}</select>
      </label>
      <label>{t("af_type")}
        <select value={f.type} onChange={(e) => upd("type", e.target.value)}>{TYPES.map((ty) => <option key={ty} value={ty}>{typeLabel(lang, ty)}</option>)}</select>
      </label>
      <label className="af-full">{t("af_complex")}
        <input value={f.complex} onChange={(e) => upd("complex", e.target.value)} placeholder={t("af_complex_ph")} />
      </label>
      <label className="af-full">{t("af_address")}
        <input value={f.address} onChange={(e) => upd("address", e.target.value)} onBlur={(e) => geocodeAddress(e.target.value, f.city)} placeholder={t("af_address_ph")} />
      </label>
      <div className="af-full">
        <div className="af-lbl">{t("af_mapnote")}</div>
        <MapPicker point={geo} onPick={(lat, lng) => { setGeo({ lat, lng }); setGeoNote(t("af_geo_manual")); }} />
        <div className="af-hint">{geoNote || (geo ? t("af_geo_set") : t("af_geo_hint"))}</div>
      </div>
      <label>{t("af_price")}
        <input value={f.price} onChange={(e) => upd("price", e.target.value)} inputMode="numeric" placeholder="74000" />
      </label>
      <label>{t("af_currency")}
        <select value={f.currency} onChange={(e) => upd("currency", e.target.value)}><option value="USD">$ USD</option><option value="GEL">₾ GEL</option></select>
      </label>
      <label>{t("af_area")}
        <input value={f.area} onChange={(e) => upd("area", e.target.value)} inputMode="numeric" placeholder="56" />
      </label>
      <label>{t("af_rooms")}
        <input value={f.rooms} onChange={(e) => upd("rooms", e.target.value)} inputMode="numeric" placeholder="2" />
      </label>
      <label>{t("af_bath")}
        <input value={f.bathrooms} onChange={(e) => upd("bathrooms", e.target.value)} inputMode="numeric" placeholder="1" />
      </label>
      <label>{t("af_floor")}
        <input value={f.floor} onChange={(e) => upd("floor", e.target.value)} placeholder="10/22" />
      </label>
      <label>{t("af_year")}
        <input value={f.year} onChange={(e) => upd("year", e.target.value)} inputMode="numeric" placeholder="2021" />
      </label>
      <label className="af-full">{t("af_about")}
        <textarea value={f.about} onChange={(e) => upd("about", e.target.value)} rows={3} placeholder={t("af_about_ph")} />
      </label>
      <div className="af-full">
        <div className="af-lbl">{t("af_amen")}</div>
        <div className="amen-row">
          {AMENITIES.map((a) => (
            <button type="button" key={a} className={"amen-tag" + (amenities.includes(a) ? " on" : "")} onClick={() => toggleAmenity(a)}>{amenLabel(lang, a)}</button>
          ))}
        </div>
      </div>
      <label className="af-full af-check">
        <input type="checkbox" checked={f.noCommission} onChange={(e) => upd("noCommission", e.target.checked)} />
        <span>{t("af_nc")}</span>
      </label>
      <label className="af-full">{t("af_phone")}
        <input value={f.contact} onChange={(e) => upd("contact", e.target.value)} inputMode="tel" placeholder="+995 555 12 34 56" required />
      </label>
      <label className="af-full">{t("af_tg")}
        <input value={f.tg} onChange={(e) => upd("tg", e.target.value)} placeholder={t("af_tg_ph")} />
      </label>
      {existingPhotos.length > 0 && (
        <div className="af-full">
          <div className="af-lbl">{t("af_cur_photos")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {existingPhotos.map((u, i) => (
              <div key={u + i} style={{ position: "relative", width: 84, height: 64, borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)" }}>
                <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button type="button" onClick={() => setExistingPhotos((p) => p.filter((_, j) => j !== i))} style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer", lineHeight: 1, fontSize: 12 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="af-full">
        <div className="af-lbl">{editId ? t("af_add_photos") : t("af_photos")}</div>
        <input type="file" accept="image/*" multiple onChange={(e) => setFiles([...e.target.files])} />
        {files.length > 0 && <div className="af-hint">{files.length} {t("af_newphotos")}</div>}
      </div>
      <div className="af-full">
        <div className="af-lbl">🏢 {t("af_facade")}</div>
        <input type="file" accept="image/*" onChange={(e) => setFacadeFile(e.target.files[0] || null)} />
        {(facadeFile || facade) && <div className="af-hint">✓ 1</div>}
      </div>
      <div className="af-full" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
        {t("af_rules_pre")}<a href="/rules" target="_blank" style={{ color: "var(--gold-dk)", fontWeight: 600 }}>{t("af_rules_link")}</a>.
      </div>
      <div className="af-full">
        <button className="btn btn-gold" type="submit" disabled={state === "loading"} style={{ padding: "13px 26px", fontSize: 15 }}>
          {state === "loading" ? t("af_saving") : editId ? t("af_submit_edit") : t("af_submit")}
        </button>
        {state === "error" && <div className="af-err">{t("af_err")}</div>}
      </div>
    </form>
  );
}
