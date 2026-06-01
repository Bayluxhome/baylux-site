"use client";
import { useState } from "react";

const EMPTY = { id: null, title_ru: "", title_en: "", title_ka: "", body_ru: "", body_en: "", body_ka: "", image: "", published: true };

export default function AdminNews({ items }) {
  const [rows, setRows] = useState(items);
  const [f, setF] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [state, setState] = useState("");
  const upd = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function onImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("photo", file, "news.jpg");
      const r = await fetch("/api/upload-photo", { method: "POST", body: fd });
      const j = await r.json();
      if (j.ok) upd("image", j.url);
    } catch { /* ignore */ }
    setUploading(false);
  }

  async function save() {
    setState("loading");
    try {
      const r = await fetch("/api/admin/news", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await r.json();
      if (j.ok) { window.location.reload(); return; }
      setState("error");
    } catch { setState("error"); }
  }
  async function del(id) {
    if (!confirm("Удалить новость?")) return;
    try {
      const r = await fetch("/api/admin/news", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const j = await r.json();
      if (j.ok) setRows((rs) => rs.filter((x) => x.id !== id));
    } catch { /* ignore */ }
  }
  function edit(n) { setF({ id: n.id, title_ru: n.title_ru || "", title_en: n.title_en || "", title_ka: n.title_ka || "", body_ru: n.body_ru || "", body_en: n.body_en || "", body_ka: n.body_ka || "", image: n.image || "", published: n.published !== false }); window.scrollTo({ top: 0, behavior: "smooth" }); }

  return (
    <div>
      <div style={{ display: "grid", gap: 10, maxWidth: 700, marginBottom: 30, padding: 18, border: "1px solid var(--line)", borderRadius: 12 }}>
        <h3 style={{ color: "var(--navy)", margin: 0 }}>{f.id ? "Редактировать новость" : "Новая новость"}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {f.image && <img src={f.image} alt="" style={{ width: 80, height: 56, objectFit: "cover", borderRadius: 8 }} />}
          <label className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
            {uploading ? "Загрузка…" : "Картинка"}
            <input type="file" accept="image/*" onChange={onImage} style={{ display: "none" }} />
          </label>
        </div>
        <input className="ri-inp" placeholder="Заголовок (RU)" value={f.title_ru} onChange={(e) => upd("title_ru", e.target.value)} />
        <textarea className="ri-inp" rows={4} placeholder="Текст (RU)" value={f.body_ru} onChange={(e) => upd("body_ru", e.target.value)} />
        <input className="ri-inp" placeholder="Title (EN)" value={f.title_en} onChange={(e) => upd("title_en", e.target.value)} />
        <textarea className="ri-inp" rows={3} placeholder="Text (EN)" value={f.body_en} onChange={(e) => upd("body_en", e.target.value)} />
        <input className="ri-inp" placeholder="სათაური (KA)" value={f.title_ka} onChange={(e) => upd("title_ka", e.target.value)} />
        <textarea className="ri-inp" rows={3} placeholder="ტექსტი (KA)" value={f.body_ka} onChange={(e) => upd("body_ka", e.target.value)} />
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
          <input type="checkbox" checked={f.published} onChange={(e) => upd("published", e.target.checked)} /> Опубликовать
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-gold" onClick={save} disabled={state === "loading" || uploading} style={{ padding: "10px 18px" }}>{state === "loading" ? "Сохраняю…" : f.id ? "Сохранить" : "Создать"}</button>
          {f.id && <button className="btn btn-ghost" onClick={() => setF(EMPTY)} style={{ padding: "10px 18px" }}>Новая</button>}
        </div>
        {state === "error" && <div style={{ color: "#b3261e", fontSize: 13 }}>Ошибка сохранения.</div>}
      </div>

      <h3 style={{ color: "var(--navy)" }}>Все новости ({rows.length})</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {rows.map((n) => (
          <div key={n.id} style={{ display: "flex", gap: 12, alignItems: "center", border: "1px solid var(--line)", borderRadius: 10, padding: 10, flexWrap: "wrap" }}>
            {n.image && <img src={n.image} alt="" style={{ width: 56, height: 42, objectFit: "cover", borderRadius: 6 }} />}
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontWeight: 600, color: "var(--navy)", fontSize: 14 }}>{n.title_ru || n.title_en || n.title_ka}</div>
              <div style={{ fontSize: 12, color: n.published ? "#1a7f37" : "#b3801e" }}>{n.published ? "опубликовано" : "черновик"} · id {n.id}</div>
            </div>
            <button className="btn btn-ghost" onClick={() => edit(n)} style={{ padding: "7px 12px", fontSize: 13 }}>Изменить</button>
            <button className="btn" onClick={() => del(n.id)} style={{ padding: "7px 12px", fontSize: 13, background: "#b3261e", color: "#fff" }}>Удалить</button>
          </div>
        ))}
      </div>
    </div>
  );
}
