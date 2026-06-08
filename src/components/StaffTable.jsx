"use client";
import { useState } from "react";

export default function StaffTable({ users }) {
  const [list, setList] = useState(users);
  const [busy, setBusy] = useState(null);

  async function toggle(u) {
    const next = !u.is_admin;
    const target = u.email ? { email: u.email } : { tg_user_id: u.tg_user_id };
    setBusy(u.key);
    try {
      const r = await fetch("/api/admin/set-staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...target, isAdmin: next }) });
      const j = await r.json();
      if (j.ok) setList((l) => l.map((x) => (x.key === u.key ? { ...x, is_admin: next } : x)));
      else alert("Не удалось изменить права");
    } catch (e) { alert("Ошибка сети"); }
    setBusy(null);
  }

  if (!list.length) return <p style={{ color: "var(--ink-soft)" }}>Пока нет зарегистрированных пользователей.</p>;

  const th = { padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap" };
  const td = { padding: "10px 12px", borderTop: "1px solid var(--line)" };

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 620 }}>
        <thead>
          <tr style={{ background: "var(--navy)", color: "#fff" }}>
            <th style={th}>Сотрудник</th>
            <th style={th}>Контакт</th>
            <th style={th}>Права</th>
            <th style={th}>Действие</th>
          </tr>
        </thead>
        <tbody>
          {list.map((u) => (
            <tr key={u.key}>
              <td style={td}>{u.name || "—"}</td>
              <td style={td}>{u.email ? `✉️ ${u.email}` : u.username ? `✈️ @${u.username}` : (u.tg_user_id ? `✈️ tg:${u.tg_user_id}` : "—")}</td>
              <td style={td}>{u.is_admin ? <b style={{ color: "var(--gold-dk)" }}>⚙️ Админ</b> : <span style={{ color: "var(--ink-soft)" }}>Пользователь</span>}</td>
              <td style={td}>
                <button
                  type="button"
                  onClick={() => toggle(u)}
                  disabled={busy === u.key}
                  className={u.is_admin ? "btn btn-ghost" : "btn btn-gold"}
                  style={{ padding: "6px 14px", fontSize: 13 }}
                >
                  {busy === u.key ? "…" : u.is_admin ? "Снять права" : "Сделать админом"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
