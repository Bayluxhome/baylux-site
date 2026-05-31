"use client";
import { useState } from "react";
import MapPicker from "./MapPicker";

const DEALS = [["sale", "Продажа"], ["rent", "Аренда"], ["daily", "Посуточно"]];
const TYPES = ["Квартира", "Студия", "Дом", "Коммерция", "Офис", "Участок", "Гараж"];
const CITIES = ["Батуми", "Тбилиси", "Кутаиси", "Гонио", "Махинджаури", "Чакви"];

// Грузинский номер: +995XXXXXXXXX, 995XXXXXXXXX или локальные 9 цифр. Иначе null.
function gePhone(raw) {
  const s = String(raw || "").replace(/[^\d]/g, "");
  if (s.startsWith("995") && s.length === 12) return "+" + s;
  if (s.length === 9) return "+995" + s;
  return null;
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

export default function AddListingForm() {
  const [f, setF] = useState({ country: "Грузия", city: "Батуми", deal: "sale", type: "Квартира", address: "", price: "", area: "", rooms: "", floor: "", about: "", contact: "" });
  const [files, setFiles] = useState([]);
  const [geo, setGeo] = useState(null);
  const [geoNote, setGeoNote] = useState("");
  const [state, setState] = useState("");
  const upd = (k, v) => setF((s) => ({ ...s, [k]: v }));

  // Геокод адреса → ставим пин на карте автоматически
  async function geocodeAddress(addr, city) {
    const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (!addr || !addr.trim() || !key) return;
    try {
      const q = `${addr}, ${city}, Georgia`;
      const r = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${key}&limit=1&country=ge`);
      const j = await r.json();
      const c = j?.features?.[0]?.center;
      if (Array.isArray(c) && c.length === 2) {
        setGeo({ lat: c[1], lng: c[0] });
        setGeoNote("📍 Точка поставлена по адресу — проверьте и при необходимости передвиньте кликом по карте.");
      }
    } catch { /* ignore */ }
  }

  async function submit(e) {
    e.preventDefault();
    if (!f.address.trim()) { alert("Укажите адрес объекта."); return; }
    const phone = gePhone(f.contact);
    if (!phone) { alert("Укажите грузинский номер телефона (+995). Например: +995 555 12 34 56."); return; }
    setState("loading");
    try {
      const urls = [];
      for (const file of files.slice(0, 10)) {
        const blob = await compress(file);
        const fd = new FormData();
        fd.append("photo", blob, "photo.jpg");
        const r = await fetch("/api/upload-photo", { method: "POST", body: fd });
        const j = await r.json();
        if (j.ok) urls.push(j.url);
      }
      const payload = { ...f, contact: phone, lat: geo?.lat, lng: geo?.lng, photos: urls };
      const r = await fetch("/api/add-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      setState(j.ok ? "done" : "error");
    } catch (err) { setState("error"); }
  }

  if (state === "done") return (
    <div className="addform-done">
      <h2 style={{ color: "var(--navy)" }}>✅ Объявление отправлено на модерацию</h2>
      <p style={{ color: "var(--ink-soft)", margin: "10px 0 18px" }}>Мы проверим его и опубликуем. Статус — в разделе «Мои объявления».</p>
      <a className="btn btn-gold" href="/my" style={{ padding: "11px 20px" }}>Мои объявления</a>
    </div>
  );

  return (
    <form className="addform" onSubmit={submit}>
      <label>Страна
        <select value={f.country} onChange={(e) => upd("country", e.target.value)}><option>Грузия</option></select>
      </label>
      <label>Город
        <select value={f.city} onChange={(e) => { upd("city", e.target.value); geocodeAddress(f.address, e.target.value); }}>{CITIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
      </label>
      <label>Тип сделки
        <select value={f.deal} onChange={(e) => upd("deal", e.target.value)}>{DEALS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
      </label>
      <label>Тип объекта
        <select value={f.type} onChange={(e) => upd("type", e.target.value)}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
      </label>
      <label className="af-full">Адрес (улица, дом)
        <input value={f.address} onChange={(e) => upd("address", e.target.value)} onBlur={(e) => geocodeAddress(e.target.value, f.city)} placeholder="ул. Шерифа Химшиашвили, 1" />
      </label>
      <div className="af-full">
        <div className="af-lbl">Точка на карте — ставится по адресу автоматически. Можно поправить кликом (включите спутник):</div>
        <MapPicker point={geo} onPick={(lat, lng) => { setGeo({ lat, lng }); setGeoNote("✓ Точка выбрана вручную."); }} />
        <div className="af-hint">{geoNote || (geo ? "✓ Точка выбрана" : "Введите адрес — точка встанет сама, либо кликните по карте")}</div>
      </div>
      <label>Цена
        <input value={f.price} onChange={(e) => upd("price", e.target.value)} placeholder="74000 или $650 / мес" />
      </label>
      <label>Площадь, м²
        <input value={f.area} onChange={(e) => upd("area", e.target.value)} inputMode="numeric" placeholder="56" />
      </label>
      <label>Комнат
        <input value={f.rooms} onChange={(e) => upd("rooms", e.target.value)} inputMode="numeric" placeholder="2" />
      </label>
      <label>Этаж
        <input value={f.floor} onChange={(e) => upd("floor", e.target.value)} placeholder="10/22" />
      </label>
      <label className="af-full">Описание
        <textarea value={f.about} onChange={(e) => upd("about", e.target.value)} rows={3} placeholder="Кратко об объекте" />
      </label>
      <label className="af-full">Телефон для связи — Грузия, +995 (обязательно)
        <input value={f.contact} onChange={(e) => upd("contact", e.target.value)} inputMode="tel" placeholder="+995 555 12 34 56" required />
      </label>
      <div className="af-full">
        <div className="af-lbl">Фото (до 10, сжимаются автоматически)</div>
        <input type="file" accept="image/*" multiple onChange={(e) => setFiles([...e.target.files])} />
        {files.length > 0 && <div className="af-hint">{files.length} фото выбрано</div>}
      </div>
      <div className="af-full">
        <button className="btn btn-gold" type="submit" disabled={state === "loading"} style={{ padding: "13px 26px", fontSize: 15 }}>
          {state === "loading" ? "Отправляю…" : "Отправить на модерацию"}
        </button>
        {state === "error" && <div className="af-err">Ошибка отправки. Проверьте поля и попробуйте снова.</div>}
      </div>
    </form>
  );
}
