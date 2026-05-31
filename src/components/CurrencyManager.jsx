"use client";
import { useEffect } from "react";

// Конвертирует все .bx-price[data-num] под выбранную валюту, используя курс НБГ.
export default function CurrencyManager({ rate }) {
  useEffect(() => {
    window.__BX_RATE = rate || 2.7;
    const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    window.bxApplyCurrency = (cur) => {
      const c = cur || localStorage.getItem("bxCurrency") || "USD";
      try { localStorage.setItem("bxCurrency", c); } catch (e) {}
      const r = window.__BX_RATE || 2.7;
      document.querySelectorAll(".bx-price[data-num]").forEach((el) => {
        const num = parseFloat(el.dataset.num);
        if (!num) return;
        const usd = el.dataset.cur === "GEL" ? num / r : num;
        const val = c === "GEL" ? usd * r : usd;
        el.textContent = (c === "GEL" ? "₾" : "$") + fmt(val);
      });
    };
    window.bxApplyCurrency();
  }, [rate]);
  return null;
}
