"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t as tr } from "@/lib/dict";

const Ctx = createContext(null);

function setCookie(l) { try { document.cookie = `bxLang=${l};path=/;max-age=31536000`; } catch (e) {} }

export function LangProvider({ initial, children }) {
  const [lang, setLang] = useState(initial || "ru");
  const router = useRouter();
  useEffect(() => {
    let saved = null;
    try { saved = localStorage.getItem("bxLang"); } catch (e) {}
    if (!saved) {
      const nav = (typeof navigator !== "undefined" ? navigator.language : "").toLowerCase();
      if (nav.startsWith("ka")) saved = "ka";
    }
    if (saved && saved !== lang) { setLang(saved); setCookie(saved); router.refresh(); }
    else if (saved) setCookie(saved);
  }, []);
  const set = (l) => {
    setLang(l);
    try { localStorage.setItem("bxLang", l); document.documentElement.lang = l; } catch (e) {}
    setCookie(l);
    router.refresh();
  };
  const t = (key) => tr(lang, key);
  return <Ctx.Provider value={{ lang, setLang: set, t }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx) || { lang: "ru", setLang: () => {}, t: (k) => k };
