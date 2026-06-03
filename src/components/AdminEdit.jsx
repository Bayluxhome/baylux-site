"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

// Показывает кнопки «Редактировать» прямо в карточке — только главному админу.
// Проверка идёт на клиенте (через /api/me), поэтому страница остаётся кэшируемой для всех остальных.
export default function AdminEdit({ items = [] }) {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => setAdmin(!!d.admin)).catch(() => {});
  }, []);
  const list = (items || []).filter((it) => it && it.id);
  if (!admin || !list.length) return null;
  return (
    <div className="admin-edit-bar">
      <span className="admin-edit-tag">Админ</span>
      {list.map((it) => (
        <Link key={it.id} href={`/my/edit/${it.id}`} className="admin-edit-btn">✏️ {it.label || "Редактировать"}</Link>
      ))}
    </div>
  );
}
