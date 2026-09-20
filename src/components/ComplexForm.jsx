"use client";
// Форма ЖК в админке: основное, цифры для витрины, теги, тексты RU/EN/KA, фото, карта, эксперт,
// планировки. Сохраняет через /api/admin/complexes. Русский интерфейс — как вся админка.
import { useState } from "react";
import { useRouter } from "next/navigation";
import MapPicker from "@/components/MapPicker";
import { compressImage } from "@/lib/imageCompress";

const EMPTY = {
  name: "", kind: "apartments", status: "draft", featured: false, sort_weight: 0,
  developer: "", city: "Батуми", district: "", address: "", lat: null, lng: null,
  desc_ru: "", desc_en: "", desc_ka: "", nearby_ru: "", nearby_en: "", nearby_ka: "",
  price_from: "", area_from: "", completion_q: "", completion_year: "", completed: false,
  installment_months: "", sea_distance_m: "", roi_percent: "",
  premium: false, renovated: false, for_investment: false, eco: false, amenities: "",
  photos: [], cover: "", expert_id: "", contract_note: "",
};

const inp = { width: "100%", padding: "9px 12px", borderRadius: 10, border: "1.5px solid var(--line)", fontSize: 14, fontFamily: "inherit", color: "var(--navy)", background: "#fff" };
const lbl = { display: "grid", gap: 4, fontSize: 13, color: "var(--ink-soft)", fontWeight: 600 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };
const box = { background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 18, display: "grid", gap: 12 };
const h = (t) => <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: 15 }}>{t}</div>;

export default function ComplexForm({ initial, realtors = [], cities = [] }) {
  const router = useRouter();
  // Из initial берём только поля формы (units — отдельным состоянием), null → пустое значение.
  const [f, setF] = useState(() => ({ ...EMPTY, ...(initial ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, initial[k] == null ? EMPTY[k] : initial[k]])) : {}) }));
  const [units, setUnits] = useState(initial?.units || []);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const id = initial?.id || null;

  const upd = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const F = (k, label, props = {}) => (
    <label style={lbl}>{label}<input style={inp} value={f[k] ?? ""} onChange={upd(k)} {...props} /></label>
  );
  const T = (k, label, rows = 4) => (
    <label style={lbl}>{label}<textarea style={{ ...inp, resize: "vertical" }} rows={rows} value={f[k] ?? ""} onChange={upd(k)} /></label>
  );
  const C = (k, label) => (
    <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: "var(--navy)" }}><input type="checkbox" checked={!!f[k]} onChange={upd(k)} />{label}</label>
  );

  async function api(body) {
    const r = await fetch("/api/admin/complexes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return r.json().catch(() => ({}));
  }

  async function save(e) {
    e.preventDefault();
    if (!f.name.trim()) { setMsg("Укажите название ЖК"); return; }
    setSaving(true); setMsg("");
    const r = await api({ action: id ? "update" : "create", id, ...f });
    setSaving(false);
    if (!r.ok) { setMsg("Ошибка: " + (r.error || "не сохранилось")); return; }
    if (!id) { router.push(`/admin/complexes/${r.item.id}`); router.refresh(); return; }
    setMsg("Сохранено ✓"); router.refresh();
  }

  async function addPhotos(e) {
    const files = [...(e.target.files || [])].slice(0, 30);
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const file of files) {
      try {
        const blob = await compressImage(file, { maxDim: 1800, targetKB: 260, watermark: true });
        const fd = new FormData(); fd.append("photo", blob, "photo.jpg");
        const j = await fetch("/api/upload-photo", { method: "POST", body: fd }).then((r) => r.json());
        if (j.ok && j.url) urls.push(j.url);
      } catch (_) { /* пропускаем битый файл */ }
    }
    setUploading(false);
    setF((s) => ({ ...s, photos: [...s.photos, ...urls], cover: s.cover || urls[0] || "" }));
    e.target.value = "";
  }

  // ---- планировки ----
  const [nu, setNu] = useState({ label: "", rooms: "", area: "", price: "", floor: "" });
  async function addUnit() {
    if (!nu.area && !nu.price) return;
    const r = await api({ action: "unit_add", complexId: id, ...nu });
    if (r.ok) { setUnits((u) => [...u, r.item]); setNu({ label: "", rooms: "", area: "", price: "", floor: "" }); } else alert("Не добавилось: " + (r.error || ""));
  }
  async function saveUnit(u) {
    const r = await api({ action: "unit_update", ...u });
    if (!r.ok) alert("Не сохранилось: " + (r.error || ""));
  }
  async function removeUnit(uid) {
    if (!confirm("Удалить планировку?")) return;
    const r = await api({ action: "unit_remove", id: uid });
    if (r.ok) setUnits((u) => u.filter((x) => x.id !== uid));
  }
  const updUnit = (uid, k, v) => setUnits((list) => list.map((x) => (x.id === uid ? { ...x, [k]: v } : x)));

  return (
    <form onSubmit={save} style={{ display: "grid", gap: 16 }}>
      <div style={box}>
        {h("Основное")}
        <div style={grid}>
          {F("name", "Название ЖК *", { required: true, placeholder: "Alliance Palace" })}
          <label style={lbl}>Тип<select style={inp} value={f.kind} onChange={upd("kind")}><option value="apartments">Жилой комплекс</option><option value="cottages">Коттеджный посёлок</option><option value="mixed">ЖК + коттеджи</option></select></label>
          <label style={lbl}>Статус<select style={inp} value={f.status} onChange={upd("status")}><option value="draft">Черновик</option><option value="published">Опубликован</option><option value="hidden">Скрыт</option></select></label>
          {F("developer", "Застройщик")}
          <label style={lbl}>Город<select style={inp} value={f.city} onChange={upd("city")}>{cities.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
          {F("district", "Район", { placeholder: "Новый бульвар" })}
          {F("address", "Адрес", { placeholder: "ул. Шерифа Химшиашвили, 1" })}
          {F("sort_weight", "Приоритет в «популярных»", { type: "number", placeholder: "0" })}
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>{C("featured", "⭐ Рекомендуем (первая крупная карточка)")}</div>
        <div>
          <div style={{ ...lbl, marginBottom: 6 }}>Точка на карте — кликните по карте{f.lat ? ` · ${Number(f.lat).toFixed(5)}, ${Number(f.lng).toFixed(5)}` : ""}</div>
          <MapPicker point={f.lat != null && f.lat !== "" ? { lat: Number(f.lat), lng: Number(f.lng) } : null} onPick={(lat, lng) => setF((s) => ({ ...s, lat, lng }))} />
        </div>
      </div>

      <div style={box}>
        {h("Цифры для витрины")}
        <div style={grid}>
          {F("price_from", "Цена от, $ за м²", { type: "number", step: "1", placeholder: "1800" })}
          {F("area_from", "Площадь от, м²", { type: "number", step: "0.1", placeholder: "42" })}
          <label style={lbl}>Квартал сдачи<select style={inp} value={f.completion_q} onChange={upd("completion_q")}><option value="">—</option><option value="1">I</option><option value="2">II</option><option value="3">III</option><option value="4">IV</option></select></label>
          {F("completion_year", "Год сдачи", { type: "number", placeholder: "2026" })}
          {F("installment_months", "Рассрочка, мес (0 — нет)", { type: "number", placeholder: "36" })}
          {F("sea_distance_m", "До моря, м", { type: "number", placeholder: "300" })}
          {F("roi_percent", "Ожидаемая доходность, % в год", { type: "number", step: "0.1", placeholder: "8.5" })}
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {C("completed", "Сдан")}{C("premium", "Премиум-класс")}{C("renovated", "С ремонтом")}{C("for_investment", "Для инвестиций")}{C("eco", "Экологичный")}
        </div>
        {F("amenities", "Удобства через запятую", { placeholder: "бассейн, паркинг, спортзал, консьерж, охрана 24/7" })}
        <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Доходность — ваша оценка, она выводится клиенту как «ожидаемая». Не указывайте цифру, которую не готовы обосновать.</div>
      </div>

      <div style={box}>
        {h("Описание")}
        {T("desc_ru", "Описание (RU) *", 5)}
        {T("nearby_ru", "Что рядом (RU)", 3)}
        <details>
          <summary style={{ cursor: "pointer", color: "var(--gold-dk)", fontWeight: 600 }}>English / ქართული (если пусто — покажем русский)</summary>
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {T("desc_en", "Description (EN)", 4)}{T("nearby_en", "Nearby (EN)", 2)}
            {T("desc_ka", "აღწერა (KA)", 4)}{T("nearby_ka", "ახლომახლო (KA)", 2)}
          </div>
        </details>
      </div>

      <div style={box}>
        {h("Фото")}
        <input type="file" accept="image/*" multiple onChange={addPhotos} disabled={uploading} />
        {uploading && <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Загружаем…</div>}
        {f.photos.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
            {f.photos.map((u) => (
              <div key={u} style={{ position: "relative", border: f.cover === u ? "2px solid var(--gold-dk)" : "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
                <img src={u} alt="" style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
                <div style={{ display: "flex", gap: 4, padding: 4 }}>
                  <button type="button" className="btn btn-ghost" style={{ padding: "3px 8px", fontSize: 11, flex: 1 }} onClick={() => setF((s) => ({ ...s, cover: u }))}>{f.cover === u ? "Обложка ✓" : "Обложка"}</button>
                  <button type="button" className="btn btn-ghost" style={{ padding: "3px 8px", fontSize: 11, color: "#9a2b2b" }} onClick={() => setF((s) => ({ ...s, photos: s.photos.filter((x) => x !== u), cover: s.cover === u ? "" : s.cover }))}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={box}>
        {h("Эксперт и служебное")}
        <div style={grid}>
          <label style={lbl}>Эксперт по новостройкам (блок «Поможем подобрать»)
            <select style={inp} value={f.expert_id || ""} onChange={upd("expert_id")}>
              <option value="">— без персоны, заявка в общий чат —</option>
              {realtors.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
        </div>
        {T("contract_note", "Условия договора / комиссия (служебное, на сайте не показывается)", 2)}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn-gold" type="submit" disabled={saving || uploading}>{saving ? "Сохраняем…" : id ? "Сохранить" : "Создать ЖК"}</button>
        {id && f.status === "published" && <a className="btn btn-ghost" href={`/novostroyki/${initial.slug}`} target="_blank" rel="noopener">Открыть на сайте ↗</a>}
        {msg && <span style={{ color: msg.startsWith("Ошибка") ? "#9a2b2b" : "#2e7d32", fontWeight: 600 }}>{msg}</span>}
      </div>

      {id ? (
        <div style={box}>
          {h(`Планировки и квартиры · ${units.length}`)}
          <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Цена — полная, в $. Комнат: 0 = студия. Изменения в строках сохраняются кнопкой «💾».</div>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr .6fr .8fr 1fr .8fr auto auto", gap: 6, fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>
              <span>Название</span><span>Комнат</span><span>м²</span><span>Цена, $</span><span>Этаж</span><span>В продаже</span><span></span>
            </div>
            {units.map((u) => (
              <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1.4fr .6fr .8fr 1fr .8fr auto auto", gap: 6, alignItems: "center" }}>
                <input style={inp} value={u.label ?? ""} onChange={(e) => updUnit(u.id, "label", e.target.value)} placeholder="1+1" />
                <input style={inp} type="number" value={u.rooms ?? ""} onChange={(e) => updUnit(u.id, "rooms", e.target.value)} />
                <input style={inp} type="number" step="0.1" value={u.area ?? ""} onChange={(e) => updUnit(u.id, "area", e.target.value)} />
                <input style={inp} type="number" value={u.price ?? ""} onChange={(e) => updUnit(u.id, "price", e.target.value)} />
                <input style={inp} value={u.floor ?? ""} onChange={(e) => updUnit(u.id, "floor", e.target.value)} placeholder="5–12" />
                <input type="checkbox" checked={u.available !== false} onChange={(e) => updUnit(u.id, "available", e.target.checked)} />
                <div style={{ display: "flex", gap: 4 }}>
                  <button type="button" className="btn btn-ghost" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => saveUnit(u)}>💾</button>
                  <button type="button" className="btn btn-ghost" style={{ padding: "6px 8px", fontSize: 12, color: "#9a2b2b" }} onClick={() => removeUnit(u.id)}>✕</button>
                </div>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr .6fr .8fr 1fr .8fr auto auto", gap: 6, alignItems: "center", marginTop: 6, paddingTop: 10, borderTop: "1px dashed var(--line)" }}>
              <input style={inp} value={nu.label} onChange={(e) => setNu({ ...nu, label: e.target.value })} placeholder="Студия" />
              <input style={inp} type="number" value={nu.rooms} onChange={(e) => setNu({ ...nu, rooms: e.target.value })} placeholder="0" />
              <input style={inp} type="number" step="0.1" value={nu.area} onChange={(e) => setNu({ ...nu, area: e.target.value })} placeholder="38" />
              <input style={inp} type="number" value={nu.price} onChange={(e) => setNu({ ...nu, price: e.target.value })} placeholder="68000" />
              <input style={inp} value={nu.floor} onChange={(e) => setNu({ ...nu, floor: e.target.value })} placeholder="3–20" />
              <span />
              <button type="button" className="btn btn-gold" style={{ padding: "6px 10px", fontSize: 12 }} onClick={addUnit}>＋ Добавить</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Планировки и квартиры можно добавить после создания ЖК.</div>
      )}
    </form>
  );
}
