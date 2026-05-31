"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { t as tr } from "@/lib/dict";

const Ctx = createContext(null);

export function LangProvider({ initial, children }) {
  const [lang, setLang] = useState(initial || "ru");
  useEffect(() => {
    let saved = null;
    try { saved = localStorage.getItem("bxLang"); } catch (e) {}
    if (saved) { if (saved !== lang) setLang(saved); return; }
    const nav = (typeof navigator !== "undefined" ? navigator.language : "").toLowerCase();
    if (nav.startsWith("ka") && lang !== "ka") setLang("ka");
  }, []);
  const set = (l) => { setLang(l); try { localStorage.setItem("bxLang", l); document.documentElement.lang = l === "ka" ? "ka" : l; } catch (e) {} };
  const t = (key) => tr(lang, key);
  return <Ctx.Provider value={{ lang, setLang: set, t }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx) || { lang: "ru", setLang: () => {}, t: (k) => k };
