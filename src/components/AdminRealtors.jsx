"use client";
import { useState } from "react";

const STATUS = {
  pending: { label: "На модерации", bg: "rgba(201,169,97,.18)", fg: "#9a7b2e" },
  approved: { label: "Одобрен", bg: "rgba(37,211,102,.16)", fg: "#1a8d46" },
  rejected: { label: "Отклонён", bg: "rgba(224,36,94,.12)", fg: "#c0264e" },
};

function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminRealtors({ realtors = [] }) {
  const [items, setItems] = useState(realtors);
  const [onlyPending, setOnlyPending] = useState(false);
  const [busy, setBusy] = useState(null);

  const act = async (id, action) => {
    setBusy(id);
    try {
      const r = await fetch("/api/admin/realtor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
      const j = await r.json();
      if (j.ok) setItems((arr) => arr.map((x) => (x.id === id ? { ...x, status: j.status } : x)));
    } finally { setBusy(null); }
  };
  const del = async (id) => {
    if (!confirm("Удалить риелтора безвозвратно?")) return;
    setBusy(id);
    try {
      const r = await fetch("/api/admin/realtor", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const j = await r.json();
      if (j.ok) setItems((arr) => arr.filter((x) => x.id !== id));
    } finally { setBusy(null); }
  };

  const list = onlyPending ? items.filter((x) => x.status === "pending") : items;
  if (!items.length) return <p style={{ color: "var(--ink-soft)" }}>Пока ни одного риелтора.</p>;

  return (
    <>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16, fontWeight: 600, color: "var(--navy)", cursor: "pointer" }}>
        <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} /> Только на модерации
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {list.map((r) => {
          const st = STATUS[r.status] || STATUS.pending;
          return (
            <div key={r.id} style={{ display: "flex", gap: 14, alignItems: "flex-start", border: "1px solid var(--line)", borderRadius: 14, padding: 14, background: "#fff", flexWrap: "wrap" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", flex: "none", overflow: "hidden", background: "var(--cream)", display: "grid", placeItems: "center", color: "var(--navy)", fontWeight: 700, fontSize: 22 }}>
                {r.photo ? <img src={r.photo} alt={r.name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (r.name || "?").slice(0, 1)}
              </div>
              <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <b style={{ color: "var(--navy)", fontSize: 16 }}>{r.name || "Без имени"}</b>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 20, background: st.bg, color: st.fg }}>{st.label}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", color: "var(--ink-soft)", fontSize: 13, marginTop: 6 }}>
                  {r.phone && <span>📞 {r.phone}</span>}
                  {r.account && <span>👤 {r.account}</span>}
                  {r.deal_types && <span>🏷 {r.deal_types}</span>}
                  <span>🗓 {fmtDate(r.created_at)}</span>
                  <span>📦 {r.listings} объяв.</span>
                </div>
                {r.bio && <div style={{ color: "var(--ink)", fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>{r.bio}</div>}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {r.status !== "approved" && <button type="button" className="btn btn-gold" style={{ padding: "7px 14px" }} disabled={busy === r.id} onClick={() => act(r.id, "approve")}>Одобрить</button>}
                {r.status !== "rejected" && <button type="button" className="btn btn-ghost" style={{ padding: "7px 14px" }} disabled={busy === r.id} onClick={() => act(r.id, "reject")}>Отклонить</button>}
                <button type="button" className="btn btn-ghost" style={{ padding: "7px 14px", color: "#c0264e" }} disabled={busy === r.id} onClick={() => del(r.id)}>Удалить</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
