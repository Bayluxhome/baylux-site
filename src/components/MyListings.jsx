"use client";
import { useState } from "react";

const STATUS = { pending: "На модерации", approved: "Опубликовано", rejected: "Снято / отклонено" };

export default function MyListings({ items }) {
  const [list, setList] = useState(items);
  const [busy, setBusy] = useState(null);

  async function del(id) {
    if (!window.confirm("Удалить это объявление? Действие необратимо.")) return;
    setBusy(id);
    try {
      const r = await fetch("/api/my-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "delete" }) });
      const j = await r.json();
      if (j.ok) setList(list.filter((x) => x.id !== id));
      else alert("Не удалось удалить. Попробуйте позже.");
    } catch (e) { alert("Ошибка сети."); }
    setBusy(null);
  }

  if (!list.length) return <p style={{ color: "var(--ink-soft)" }}>Пока нет объявлений. Откройте бота и отправьте /start.</p>;

  return (
    <div className="my-list">
      {list.map((r) => (
        <div className="my-item" key={r.id}>
          <div className="my-left">
            <img className="my-thumb" src={r.photo} alt="" />
            <div className="my-main">
              <b>{r.title}</b>
              <span>{r.sub}</span>
              <div className="my-actions">
                {r.slug ? <a className="my-link" href={"/property/" + r.slug}>Посмотреть →</a> : <span className="my-note">на сайте не виден</span>}
                <a className="my-link" href={"/my/edit/" + r.id}>✏️ Редактировать</a>
                <button className="my-del" onClick={() => del(r.id)} disabled={busy === r.id}>{busy === r.id ? "Удаляю…" : "🗑 Удалить"}</button>
              </div>
            </div>
          </div>
          <span className={"my-status st-" + r.status}>{STATUS[r.status] || r.status}</span>
        </div>
      ))}
    </div>
  );
}
