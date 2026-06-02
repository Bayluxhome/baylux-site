"use client";
import { useState } from "react";

export default function AdminListings({ items }) {
  const [rows, setRows] = useState(items);
  const [busy, setBusy] = useState(null);

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

  if (!rows.length) return <p style={{ color: "var(--ink-soft)" }}>Объявлений нет.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((r) => (
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
  );
}
