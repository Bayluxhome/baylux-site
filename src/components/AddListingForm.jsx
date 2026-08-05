"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import MapPicker from "./MapPicker";
import { useLang } from "@/components/LangContext";
import { typeLabel, amenLabel } from "@/lib/dict";
import { compressImage } from "@/lib/imageCompress";

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
  const [isAdm, setIsAdm] = useState(false);
  const [canMng, setCanMng] = useState(false);
  useEffect(() => { fetch("/api/me").then((r) => r.json()).then((j) => { setIsAdm(!!j.admin); setCanMng(!!(j.perms && j.perms.managed)); }).catch(() => {}); }, []);
  const [ownerList, setOwnerList] = useState([]);
  const [ownerSel, setOwnerSel] = useState("");
  useEffect(() => { if (!canMng) return; fetch("/api/admin/users-list").then((r) => r.json()).then((j) => setOwnerList(j.users || [])).catch(() => {}); }, [canMng]);
  const ownerVal = (u) => u.email || (u.tg_user_id != null ? "tg:" + u.tg_user_id : "");
  const curOwner = editId ? (init.f?.ownerEmail || (init.f?.ownerUsername ? "@" + init.f.ownerUsername : (init.f?.ownerTg != null ? "tg:" + init.f.ownerTg : ""))) : "";
  const [respSel, setRespSel] = useState("");
  const curResp = editId ? (init.f?.responsibleEmail || (init.f?.responsibleTg != null ? "tg:" + init.f.responsibleTg : "")) : "";
  // Управлять объектом (владелец/контакты/договор) может право managed ИЛИ ответственный за этот объект.
  const showManage = canMng || !!init.f?.canManage;
  const upd = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const dragIdx = useRef(null);
  const dragIdx2 = useRef(null);
  const moveThumb = (from, to) => setExistingPhotos((p) => {
    if (from == null || to < 0 || to >= p.length || from === to) return p;
    const arr = [...p];
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    return arr;
  });
  const moveFile = (from, to) => setFiles((p) => {
    if (from == null || to < 0 || to >= p.length || from === to) return p;
    const arr = [...p];
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    return arr;
  });
  const filePreviews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => filePreviews.forEach((u) => URL.revokeObjectURL(u)), [filePreviews]);
  const facadePrev = useMemo(() => (facadeFile ? URL.createObjectURL(facadeFile) : ""), [facadeFile]);
  useEffect(() => () => { if (facadePrev) URL.revokeObjectURL(facadePrev); }, [facadePrev]);
  const toggleAmenity = (a) => setAmenities((arr) => arr.includes(a) ? arr.filter((x) => x !== a) : [...arr, a]);
  const geoTimer = useRef(null);

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

  // Обратное геокодирование: по клику на карту — заполняем поле адреса (улица + дом).
  async function reverseGeocode(lat, lng) {
    const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (!key) return;
    try {
      const r = await fetch(`https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${key}&language=ru&limit=1`);
      const j = await r.json();
      const feat = j?.features?.[0];
      if (!feat) return;
      const street = feat.text || (feat.place_name || "").split(",")[0] || "";
      const house = feat.address || feat.properties?.address || "";
      const line = (street + (house ? ", " + house : "")).trim();
      if (line) upd("address", line);
    } catch (e) { /* адрес оставим как есть */ }
  }

  // Адрес: точка двигается сама — авто-геокод с задержкой при вводе и по Enter (Enter НЕ сабмитит форму).
  const onAddrChange = (val) => {
    upd("address", val);
    clearTimeout(geoTimer.current);
    geoTimer.current = setTimeout(() => geocodeAddress(val, f.city), 800);
  };
  const onAddrKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); clearTimeout(geoTimer.current); geocodeAddress(e.currentTarget.value, f.city); }
  };

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
        const blob = await compressImage(file, { maxDim: 1600, targetKB: 200, watermark: true });
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
        const blob = await compressImage(facadeFile, { maxDim: 1600, targetKB: 200, watermark: true });
        const fd = new FormData();
        fd.append("photo", blob, "facade.jpg");
        const r = await fetch("/api/upload-photo", { method: "POST", body: fd });
        const j = await r.json();
        if (j.ok) facadeUrl = j.url;
      }
      const payload = { ...f, contact: phone, amenities, lat: geo?.lat, lng: geo?.lng, photos, photo_hashes, lang, facade: facadeUrl };
      if (editId) payload.id = editId;
      if (showManage && editId && ownerSel) {
        const ou = ownerList.find((x) => ownerVal(x) === ownerSel);
        if (ou) { payload.ownerEmail = ou.email || ""; payload.ownerTg = ou.tg_user_id ?? null; }
      }
      if (canMng && editId &&respSel) {
        const ru = ownerList.find((x) => ownerVal(x) === respSel);
        if (ru) { payload.responsibleEmail = ru.email || ""; payload.responsibleTg = ru.tg_user_id ?? null; }
      }
      const r = await fetch(editId ? "/api/edit-listing" : "/api/add-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      setState(j.ok ? "done" : "error");
    } catch (err) { setState("error"); }
  }

  if (state === "done") return (
    <div className="addform-done">
      <h2 style={{ color: "var(--navy)" }}>{editId ? t("af_done_edit_h") : t("af_done_add_h")}</h2>
      <p style={{ color: "var(--ink-soft)", margin: "10px 0 18px" }}>{editId ? t("af_done_edit_p") : t("af_done_add_p")} {t("af_done_tail")}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a className="btn btn-gold" href="/my" style={{ padding: "11px 20px" }}>{t("af_my")}</a>
        {/* «Разместить ещё» — перезагружаем /add начисто (у формы много состояний; полный
            ре-маунт надёжнее ручного сброса). Кнопка в шапке ведёт на тот же /add, но не
            сбрасывала экран успеха — поэтому явная кнопка здесь. Только для нового объявления. */}
        {!editId && (
          <button type="button" className="btn btn-ghost" style={{ padding: "11px 20px" }}
            onClick={() => { window.location.href = "/add"; }}>{t("af_more")}</button>
        )}
      </div>
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
        <input value={f.address} onChange={(e) => onAddrChange(e.target.value)} onBlur={(e) => geocodeAddress(e.target.value, f.city)} onKeyDown={onAddrKey} placeholder={t("af_address_ph")} />
      </label>
      <div className="af-full">
        <div className="af-lbl">{t("af_mapnote")}</div>
        <MapPicker point={geo} onPick={(lat, lng) => { setGeo({ lat, lng }); setGeoNote(t("af_geo_manual")); reverseGeocode(lat, lng); }} />
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
        <select value={f.rooms} onChange={(e) => upd("rooms", e.target.value)}>
          <option value="">—</option>
          <option value="0">{t("ht_studio")}</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5+</option>
        </select>
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
      {canMng && (
        <label className="af-full af-check" style={{ background: "var(--cream)", borderRadius: 10, padding: "10px 12px" }}>
          <input type="checkbox" checked={!!f.managed} onChange={(e) => upd("managed", e.target.checked)} />
          <span>🏠 {t("managed_badge")} <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>({t("af_admin_only")})</span></span>
        </label>
      )}
      {showManage && editId && (
        <label className="af-full">🔢 {t("af_internal_no")} <span style={{ color: "var(--ink-soft)", fontWeight: 400, fontSize: 13 }}>({t("af_internal_hint")})</span>
          <input value={f.internalNo || ""} onChange={(e) => upd("internalNo", e.target.value)} placeholder="A-101" />
        </label>
      )}
      {showManage && editId && (
        <div className="af-full" style={{ background: "var(--cream)", borderRadius: 10, padding: "12px 14px" }}>
          <div className="af-lbl">👤 {t("af_owner_h")}</div>
          {canMng && (
            <>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", margin: "2px 0 8px" }}>{t("af_owner_cur")}: <b>{curOwner || "—"}</b></div>
              <select value={ownerSel} onChange={(e) => setOwnerSel(e.target.value)} style={{ width: "100%" }}>
                <option value="">{t("af_owner_keep")}</option>
                {ownerList.map((u) => (
                  <option key={ownerVal(u)} value={ownerVal(u)}>
                    {(u.name || u.username || u.email || u.tg_user_id) + " · " + (u.email || ("@" + (u.username || u.tg_user_id)))}
                  </option>
                ))}
              </select>
              <div className="af-hint">{t("af_owner_hint")}</div>
            </>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            <label style={{ fontSize: 13, color: "var(--navy)", fontWeight: 600 }}>{t("af_owner_name")}
              <input value={f.ownerName || ""} onChange={(e) => upd("ownerName", e.target.value)} placeholder={t("af_owner_name")} style={{ width: "100%", marginTop: 4, border: "1px solid var(--line)", borderRadius: 8, padding: "9px 11px", fontFamily: "inherit", fontSize: 14 }} />
            </label>
            <label style={{ fontSize: 13, color: "var(--navy)", fontWeight: 600 }}>{t("af_owner_phone")}
              <input value={f.ownerPhone || ""} onChange={(e) => upd("ownerPhone", e.target.value)} placeholder="+995 ..." inputMode="tel" style={{ width: "100%", marginTop: 4, border: "1px solid var(--line)", borderRadius: 8, padding: "9px 11px", fontFamily: "inherit", fontSize: 14 }} />
            </label>
          </div>
          <label style={{ display: "block", fontSize: 13, color: "var(--navy)", fontWeight: 600, marginTop: 8 }}>{t("af_owner_email")}
            <input type="email" value={f.ownerEmailC || ""} onChange={(e) => upd("ownerEmailC", e.target.value)} placeholder="owner@email.com" style={{ width: "100%", marginTop: 4, border: "1px solid var(--line)", borderRadius: 8, padding: "9px 11px", fontFamily: "inherit", fontSize: 14 }} />
            <span className="af-hint">{t("af_owner_email_hint")}</span>
          </label>
        </div>
      )}
      {canMng && editId && (
        <div className="af-full" style={{ background: "var(--cream)", borderRadius: 10, padding: "12px 14px" }}>
          <div className="af-lbl">🧑‍💼 {t("af_resp_h")} <span style={{ color: "var(--ink-soft)", fontWeight: 400, fontSize: 13 }}>({t("af_admin_only")})</span></div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", margin: "2px 0 8px" }}>{t("af_resp_cur")}: <b>{curResp || "—"}</b></div>
          <select value={respSel} onChange={(e) => setRespSel(e.target.value)} style={{ width: "100%" }}>
            <option value="">{t("af_resp_keep")}</option>
            {ownerList.map((u) => (
              <option key={"r" + ownerVal(u)} value={ownerVal(u)}>
                {(u.name || u.username || u.email || u.tg_user_id) + " · " + (u.email || ("@" + (u.username || u.tg_user_id)))}
              </option>
            ))}
          </select>
          <div className="af-hint">{t("af_resp_hint")}</div>
        </div>
      )}
      {showManage && editId && (
        <label className="af-full">📄 {t("af_contract_h")}
          <input value={f.contractUrl || ""} onChange={(e) => upd("contractUrl", e.target.value)} placeholder="https://..." />
          <span className="af-hint">{t("af_contract_hint")}</span>
        </label>
      )}
      <label className="af-full">{t("af_phone")}
        <input value={f.contact} onChange={(e) => upd("contact", e.target.value)} inputMode="tel" placeholder="+995 555 12 34 56" required />
      </label>
      <label className="af-full">{t("af_tg")}
        <input value={f.tg} onChange={(e) => upd("tg", e.target.value)} placeholder={t("af_tg_ph")} />
      </label>
      {existingPhotos.length > 0 && (
        <div className="af-full">
          <div className="af-lbl">{t("af_cur_photos")} <span style={{ color: "var(--ink-soft)", fontWeight: 400, fontSize: 13 }}>· {t("af_reorder")}</span></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {existingPhotos.map((u, i) => (
              <div
                key={u + i}
                draggable
                onDragStart={() => { dragIdx.current = i; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { moveThumb(dragIdx.current, i); dragIdx.current = null; }}
                style={{ position: "relative", width: 84, height: 64, borderRadius: 8, overflow: "hidden", border: i === 0 ? "2px solid var(--gold)" : "1px solid var(--line)", cursor: "grab" }}
                title={i === 0 ? t("af_cover") : ""}
              >
                <img src={u} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {i === 0 && <span style={{ position: "absolute", left: 2, top: 2, background: "var(--gold-dk)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 6 }}>{t("af_cover")}</span>}
                <button type="button" onClick={() => setExistingPhotos((p) => p.filter((_, j) => j !== i))} style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer", lineHeight: 1, fontSize: 12 }}>✕</button>
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "space-between" }}>
                  <button type="button" aria-label="←" onClick={() => moveThumb(i, i - 1)} disabled={i === 0} style={{ flex: 1, border: "none", background: "rgba(1,29,60,.6)", color: "#fff", cursor: i === 0 ? "default" : "pointer", fontSize: 13, padding: "1px 0", opacity: i === 0 ? 0.35 : 1 }}>‹</button>
                  <button type="button" aria-label="→" onClick={() => moveThumb(i, i + 1)} disabled={i === existingPhotos.length - 1} style={{ flex: 1, border: "none", background: "rgba(1,29,60,.6)", color: "#fff", cursor: i === existingPhotos.length - 1 ? "default" : "pointer", fontSize: 13, padding: "1px 0", opacity: i === existingPhotos.length - 1 ? 0.35 : 1 }}>›</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="af-full">
        <div className="af-lbl">{editId ? t("af_add_photos") : t("af_photos")}{files.length > 0 ? <span style={{ color: "var(--ink-soft)", fontWeight: 400, fontSize: 13 }}> · {t("af_reorder")}</span> : null}</div>
        <input type="file" accept="image/*" multiple onChange={(e) => { const add = [...e.target.files]; setFiles((p) => [...p, ...add].slice(0, 10)); e.target.value = ""; }} />
        <div className="af-hint" style={{ color: "var(--gold-dk)" }}>⚠️ {t("af_nowatermark")}</div>
        {files.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {files.map((f, i) => (
              <div
                key={f.name + f.size + f.lastModified}
                draggable
                onDragStart={() => { dragIdx2.current = i; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { moveFile(dragIdx2.current, i); dragIdx2.current = null; }}
                style={{ position: "relative", width: 84, height: 64, borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)", cursor: "grab" }}
              >
                <img src={filePreviews[i]} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer", lineHeight: 1, fontSize: 12 }}>✕</button>
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "space-between" }}>
                  <button type="button" aria-label="‹" onClick={() => moveFile(i, i - 1)} disabled={i === 0} style={{ flex: 1, border: "none", background: "rgba(1,29,60,.6)", color: "#fff", cursor: i === 0 ? "default" : "pointer", fontSize: 13, padding: "1px 0", opacity: i === 0 ? 0.35 : 1 }}>‹</button>
                  <button type="button" aria-label="›" onClick={() => moveFile(i, i + 1)} disabled={i === files.length - 1} style={{ flex: 1, border: "none", background: "rgba(1,29,60,.6)", color: "#fff", cursor: i === files.length - 1 ? "default" : "pointer", fontSize: 13, padding: "1px 0", opacity: i === files.length - 1 ? 0.35 : 1 }}>›</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {files.length > 0 && <div className="af-hint">{files.length} {t("af_newphotos")}</div>}
      </div>
      <div className="af-full">
        <div className="af-lbl">🏢 {t("af_facade")}</div>
        <input type="file" accept="image/*" onChange={(e) => setFacadeFile(e.target.files[0] || null)} />
        {(facadePrev || facade) && (
          <div style={{ position: "relative", width: 120, height: 80, marginTop: 8, borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)" }}>
            <img src={facadePrev || facade} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button type="button" onClick={() => { setFacadeFile(null); setFacade(""); }} style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer", lineHeight: 1, fontSize: 12 }}>✕</button>
          </div>
        )}
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
