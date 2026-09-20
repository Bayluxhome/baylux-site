"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const KIND = { apartments: "ЖК", cottages: "Коттеджи", mixed: "ЖК + коттеджи" };
const STATUS = { draft: ["Черновик", "#8a8a8a"], published: ["Опубликован", "#2e7d32"], hidden: ["Скрыт", "#9a2b2b"] };

// Список ЖК в админке: статус, быстрые действия. Правка полей — на странице /admin/complexes/<id>.
export default function AdminComplexList({ items }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [filter, setFilter] = useState("all");

  async function post(body) {
    setBusy(body.id);
    const r = await fetch("/api/admin/complexes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.json()).catch(() => ({}));
    setBusy("");
    if (!r.ok) { alert("Не получилось: " + (r.error || "ошибка")); return; }
    router.refresh();
  }

  const list = items.filter((c) => filter === "all" || c.status === filter);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {[["all", "Все"], ["published", "Опубликованные"], ["draft", "Черновики"], ["hidden", "Скрытые"]].map(([k, l]) => (
          <button key={k} type="button" className={"btn " + (filter === k ? "btn-gold" : "btn-ghost")} style={{ padding: "7px 14px", fontSize: 13 }} onClick={() => setFilter(k)}>
            {l} · {k === "all" ? items.length : items.filter((c) => c.status === k).length}
          </button>
        ))}
      </div>

      {list.length === 0 && <p style={{ color: "var(--ink-soft)" }}>Пока пусто. Нажмите «Добавить ЖК».</p>}

      <div style={{ display: "grid", gap: 10 }}>
        {list.map((c) => {
          const [sl, sc] = STATUS[c.status] || STATUS.draft;
          const cover = c.cover || (Array.isArray(c.photos) && c.photos[0]) || "/placeholder-baylux.jpg";
          return (
            <div key={c.id} style={{ display: "grid", gridTemplateColumns: "96px minmax(0,1fr) auto", gap: 14, alignItems: "center", background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 12 }}>
              <img src={cover} alt="" style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 10, background: "var(--cream)" }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <a href={`/admin/complexes/${c.id}`} style={{ fontWeight: 700, color: "var(--navy)", fontSize: 16 }}>{c.name}</a>
                  {c.featured && <span className="cab-tag-soft">⭐ рекомендуем</span>}
                  <span style={{ fontSize: 12, fontWeight: 600, color: sc }}>● {sl}</span>
                </div>
                <div style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 4 }}>
                  {KIND[c.kind] || c.kind} · {c.city}{c.district ? `, ${c.district}` : ""}
                  {c.price_from ? ` · от $${c.price_from}/м²` : " · цена не указана"}
                  {c.completed ? " · сдан" : c.completion_year ? ` · сдача ${c.completion_year}` : ""}
                  {` · планировок: ${c.unitsCount}`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {c.status === "published" && <a className="btn btn-ghost" href={`/novostroyki/${c.slug}`} target="_blank" rel="noopener" style={{ padding: "6px 10px", fontSize: 12 }}>Открыть ↗</a>}
                <a className="btn btn-ghost" href={`/admin/complexes/${c.id}`} style={{ padding: "6px 10px", fontSize: 12 }}>✏️ Редактировать</a>
                {c.status !== "published"
                  ? <button type="button" className="btn btn-gold" disabled={busy === c.id} style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => post({ action: "status", id: c.id, status: "published" })}>Опубликовать</button>
                  : <button type="button" className="btn btn-ghost" disabled={busy === c.id} style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => post({ action: "status", id: c.id, status: "hidden" })}>Скрыть</button>}
                <button type="button" className="btn btn-ghost" disabled={busy === c.id} style={{ padding: "6px 10px", fontSize: 12, color: "#9a2b2b" }}
                  onClick={() => { if (confirm(`Удалить «${c.name}» вместе с планировками? Это необратимо.`)) post({ action: "delete", id: c.id }); }}>🗑</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
