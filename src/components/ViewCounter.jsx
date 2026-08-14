"use client";
import { useEffect } from "react";

// Считает просмотр объявления один раз за сессию на объект (чтобы обновление страницы
// не накручивало счётчик). Ошибки молча игнорируются — счётчик не должен мешать просмотру.
export default function ViewCounter({ id }) {
  useEffect(() => {
    if (!id) return;
    const key = "bx_viewed_" + id;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch (e) { /* приватный режим */ }
    const t = setTimeout(() => {
      fetch("/api/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        keepalive: true,
      }).catch(() => {});
    }, 1200); // небольшая задержка — не считаем случайные заходы «на отскок»
    return () => clearTimeout(t);
  }, [id]);
  return null;
}
