"use client";
import { useState } from "react";

export default function StaffTable({ users, allPerms }) {
  const [list, setList] = useState(users);
  const [busy, setBusy] = useState(null);

  async function setPerms(u, perms) {
    const target = u.email ? { email: u.email } : { tg_user_id: u.tg_user_id };
    setBusy(u.key);
    try {
      const r = await fetch("/api/admin/set-staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...target, permissions: perms }) });
      const j = await r.json();
      if (j.ok) setList((l) => l.map((x) => (x.key === u.key ? { ...x, permissions: j.permissions || perms } : x)));
      else alert("Не удалось изменить права");
    } catch (e) { alert("Ошибка сети"); }
    setBusy(null);
  }

  function toggle(u, key) {
    const has = u.permissions.includes(key);
    setPerms(u, has ? u.permissions.filter((p) => p !== key) : [...u.permissions, key]);
  }

  if (!list.length) return <p style={{ color: "var(--ink-soft)" }}>Пока нет зарегистрированных пользователей.</p>;

  const th = { padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap" };
  const td = { padding: "10px 12px", borderTop: "1px solid var(--line)", verticalAlign: "top" };
  const chip = (on) => ({
    padding: "6px 12px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
    border: `1.5px solid ${on ? "var(--gold)" : "var(--line)"}`,
    background: on ? "var(--cream)" : "#fff", color: on ? "var(--gold-dk)" : "var(--ink-soft)",
  });

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 640 }}>
        <thead>
          <tr style={{ background: "var(--navy)", color: "#fff" }}>
            <th style={th}>Сотрудник</th>
            <th style={th}>Контакт</th>
            <th style={th}>Права (нажмите, чтобы выдать/снять)</th>
          </tr>
        </thead>
        <tbody>
          {list.map((u) => (
            <tr key={u.key}>
              <td style={td}>{u.name || "—"}{u.permissions.length ? <span style={{ display: "block", color: "var(--gold-dk)", fontSize: 12, fontWeight: 700 }}>⚙️ админ</span> : null}</td>
              <td style={td}>{u.email ? `✉️ ${u.email}` : u.username ? `✈️ @${u.username}` : (u.tg_user_id ? `✈️ tg:${u.tg_user_id}` : "—")}</td>
              <td style={td}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, opacity: busy === u.key ? 0.5 : 1 }}>
                  {allPerms.map((p) => (
                    <button key={p.key} type="button" disabled={busy === u.key} onClick={() => toggle(u, p.key)} style={chip(u.permissions.includes(p.key))}>
                      {u.permissions.includes(p.key) ? "✓ " : ""}{p.label}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
