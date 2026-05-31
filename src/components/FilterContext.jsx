"use client";
import { createContext, useContext, useState } from "react";

const Ctx = createContext(null);

export function FilterProvider({ children }) {
  const [f, setF] = useState({ tab: "sale", city: "", cat: "", pmax: "" });
  const upd = (k, v) => setF((s) => ({ ...s, [k]: v }));
  return <Ctx.Provider value={{ f, setF, upd }}>{children}</Ctx.Provider>;
}

export const useFilter = () => useContext(Ctx);
