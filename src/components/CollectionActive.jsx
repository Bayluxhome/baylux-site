"use client";
import { useEffect, useState } from "react";

// «Активная подборка» — какую подборку риелтор сейчас наполняет из каталога (задача №06/07).
// В браузере хранится только указатель (id/token/название/список id) для удобства интерфейса;
// сама подборка живёт в базе. Доступность клиентской ссылки от этого не зависит.
const KEY = "bxColl";

export function readActive() {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}
export function writeActive(v) {
  try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch { /* приватный режим */ }
  window.dispatchEvent(new Event("bxcoll"));
}
// Снимок из ответа API → компактный указатель.
export function toActive(c) {
  return c ? { id: c.id, token: c.token, title: c.title, client_name: c.client_name, items: (c.items || []).map((i) => ({ id: i.id, slug: i.slug, title: i.title })) } : null;
}

export function useActiveCollection() {
  const [active, setActive] = useState(null);
  useEffect(() => {
    const sync = () => setActive(readActive());
    sync();
    window.addEventListener("bxcoll", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("bxcoll", sync); window.removeEventListener("storage", sync); };
  }, []);
  return active;
}

// Добавить/убрать объект в активной подборке через сервер; локальный указатель обновляется ответом.
export async function toggleItem(active, listingId) {
  const has = (active.items || []).some((i) => i.id === String(listingId));
  const r = await fetch("/api/collections", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: has ? "remove" : "add", id: active.id, listingId: String(listingId) }),
  });
  const j = await r.json().catch(() => ({}));
  if (j.ok && j.item) writeActive(toActive(j.item));
  return j;
}
