"use client";
import { createContext, useContext, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { t as tr } from "@/lib/dict";
import { withLang } from "@/lib/i18nPath";

const Ctx = createContext(null);

function setCookie(l) { try { document.cookie = `bxLang=${l};path=/;max-age=31536000`; } catch (e) {} }

// Язык страницы задаётся адресом (/ru/…): сервер прочитал его из URL и передал сюда как initial.
// Переключение языка = переход на тот же путь в другой языковой ветке. Никаких угадываний
// по navigator.language на клиенте: иначе серверный HTML и гидрация расходились бы.
export function LangProvider({ initial, children }) {
  const [lang, setLang] = useState(initial || "ru");
  const router = useRouter();
  const pathname = usePathname() || "/";
  const set = (l) => {
    if (l === lang) return;
    setLang(l);
    try { localStorage.setItem("bxLang", l); document.documentElement.lang = l; } catch (e) {}
    setCookie(l);
    // useSearchParams здесь нельзя (в root layout он требует Suspense и ломает статические
    // страницы блога) — параметры берём из адресной строки в момент клика.
    const qs = typeof window !== "undefined" ? window.location.search : "";
    router.push(withLang(l, pathname) + qs);
  };
  const t = (key) => tr(lang, key);
  return <Ctx.Provider value={{ lang, setLang: set, t }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx) || { lang: "ru", setLang: () => {}, t: (k) => k };
