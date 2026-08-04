"use client";
import { useState, useRef, useEffect } from "react";

// Варианты фильтра по статусу модерации. Значения статусов совпадают с колонкой listings.status.
const FILTERS = [
  { key: "all", label: "Все объявления" },
  { key: "pending", label: "На модерации" },
  { key: "rejected", label: "Отклонённые" },
  { key: "approved", label: "Одобренные" },
];

export default function AdminListings({ items, navBefore = null, navAfter = null }) {
  const [rows, setRows] = useState(items);
  const [busy, setBusy] = useState(null);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const ddRef = useRef(null);

  // Закрытие выпадающего списка по клику вне него.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ddRef.current && !ddRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function act(id, action) {
    if (action === "delete" && !confirm("Удалить объявление навсегда?")) return;
    setBusy(id);
    try {
      const r = await fetch("/api/admin/delete-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const j = await r.json();
      if (j.ok) {
        if (action === "delete") setRows((rs) => rs.filter((x) => x.id !== id));
        else if (action === "approve") setRows((rs) => rs.map((x) => (x.id === id ? { ...x, status: "approved" } : x)));
        else setRows((rs) => rs.map((x) => (x.id === id ? { ...x, status: "rejected" } : x)));
      } else alert("Ошибка: " + (j.error || "не удалось"));
    } catch { alert("Сбой сети"); }
    setBusy(null);
  }

  const curLabel = (FILTERS.find((f) => f.key === filter) || FILTERS[0]).label;
  // Фильтр применяется к полному списку rows (порядок created_at desc сохраняется), поэтому
  // корректно работает и при обновлении данных, и при изменении статуса через модерацию.
  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <>
      {/* Панель разделов + фильтр по статусу. Фильтр — тем же стилем (btn-ghost), справа от «Импорт сводки». */}
      <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap", alignItems: "center" }}>
        {navBefore}
        <div ref={ddRef} style={{ position: "relative", display: "inline-block" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={open}
            style={{ padding: "9px 16px", display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}
          >
            <span>{curLabel}</span>
            <span aria-hidden="true" style={{ fontSize: 10, opacity: 0.7, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▼</span>
          </button>
          {open && (
            <div
              role="listbox"
              style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 40,
                background: "#fff", border: "1px solid var(--line)", borderRadius: 10,
                boxShadow: "0 10px 28px rgba(1,39,75,.14)", overflow: "hidden",
                minWidth: 190, maxWidth: "80vw",
              }}
            >
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="option"
                  aria-selected={filter === f.key}
                  className="bx-admf-opt"
                  onClick={() => { setFilter(f.key); setOpen(false); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                    background: filter === f.key ? "var(--sand, #f5efe2)" : "#fff", border: "none",
                    cursor: "pointer", fontSize: 14, color: "var(--navy)", whiteSpace: "nowrap",
                    fontWeight: filter === f.key ? 600 : 400,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {navAfter}
        <style>{`.bx-admf-opt:hover{background:var(--sand,#f5efe2)!important;}`}</style>
      </div>

      <h2 style={{ color: "var(--navy)", fontSize: 18, marginBottom: 12 }}>Все объявления</h2>

      {visible.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visible.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: 12, alignItems: "center", border: "1px solid var(--line)", borderRadius: 10, padding: 10, flexWrap: "wrap" }}>
              <img src={r.photo} alt="" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 6, flex: "none" }} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 600, color: "var(--navy)", fontSize: 14 }}>{r.title}</div>
                <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>{r.sub}</div>
                <div style={{ fontSize: 12, color: r.status === "approved" ? "#1a7f37" : r.status === "pending" ? "#b3801e" : "#b3261e" }}>
                  {r.status} · id {r.id}{r.owner ? ` · ${r.owner}` : ""}
                </div>
                {r.dupes && r.dupes.length > 0 && (
                  <div style={{ fontSize: 12, color: "#b3261e", fontWeight: 600, marginTop: 2 }}>
                    ⚠️ возможный дубль: {r.dupes.map((d) => "#" + d).join(", ")}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {r.slug && <a className="btn btn-ghost" href={`/property/${r.slug}`} target="_blank" style={{ padding: "7px 12px", fontSize: 13 }}>Открыть</a>}
                <a className="btn btn-ghost" href={`/my/edit/${r.id}`} style={{ padding: "7px 12px", fontSize: 13 }}>Редактировать</a>
                {r.status !== "approved" && (
                  <button className="btn btn-gold" disabled={busy === r.id} onClick={() => act(r.id, "approve")} style={{ padding: "7px 12px", fontSize: 13 }}>
                    {busy === r.id ? "…" : "Опубликовать"}
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button className="btn btn-ghost" disabled={busy === r.id} onClick={() => act(r.id, "unpublish")} style={{ padding: "7px 12px", fontSize: 13 }}>Снять</button>
                )}
                <button className="btn" disabled={busy === r.id} onClick={() => act(r.id, "delete")}
                  style={{ padding: "7px 12px", fontSize: 13, background: "#b3261e", color: "#fff" }}>
                  {busy === r.id ? "…" : "Удалить"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "var(--ink-soft)" }}>Объявлений нет.</p>
      )}
    </>
  );
}
