// Общая логика фильтров списков объектов в кабинете (12.10.2026):
// «Мои объекты» (обе вкладки) и «Выбор объектов для подборки».
// Один набор правил: нормализация поиска, allowlist сделок/типов, AND между группами,
// сериализация в URL. Модуль без серверных импортов — его используют клиентские компоненты.
//
// Где фильтруется: оба экрана получают с сервера УЖЕ ограниченный набор (только объекты,
// доступные текущему пользователю по сессии — см. data/cabinetLoad.js и lib/collections.pickableUnits).
// Фильтр лишь сужает этот набор и не может добавить чужие объекты.
import { DEALS, TYPES } from "@/lib/classify";

export const FILTER_DEALS = DEALS;            // sale | rent | daily
export const FILTER_TYPES = TYPES;            // канонические типы (как в базе)
export const MAX_Q = 80;                      // предел длины поисковой строки
export const EMPTY_FILTERS = { q: "", deal: "", type: "" };

// Пробелы по краям и повторные — убираем, регистр не важен, длина ограничена.
export const normQ = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, MAX_Q).toLowerCase();

// Неизвестные значения не превращаются в «продажу»/«квартиру» — просто сбрасываются.
export function sanitizeFilters(f = {}) {
  return {
    q: String(f.q || "").slice(0, MAX_Q),
    deal: FILTER_DEALS.includes(f.deal) ? f.deal : "",
    type: FILTER_TYPES.includes(f.type) ? f.type : "",
  };
}

export const isDefaultFilters = (f) => !normQ(f.q) && !f.deal && !f.type;

// Совпадение объекта с фильтрами: поиск AND сделка AND тип.
// Объект: { id, deal, type, address, city, complex, title } — ищем только по публичным полям
// (адрес, город, ЖК, ID), без контактов собственника и внутренних заметок.
export function matchListing(item, f) {
  if (f.deal && item.deal !== f.deal) return false;
  if (f.type && item.type !== f.type) return false;
  const s = normQ(f.q);
  if (!s) return true;
  const hay = [item.address, item.city, item.complex, String(item.id || "")].filter(Boolean).join(" ").toLowerCase();
  return s.split(" ").every((w) => hay.includes(w));
}

// URL ↔ фильтры (?q=&deal=&type=). Пустые параметры не пишем.
export function filtersFromSearch(search) {
  const p = new URLSearchParams(search || "");
  return sanitizeFilters({ q: p.get("q") || "", deal: p.get("deal") || "", type: p.get("type") || "" });
}
export function writeFiltersToUrl(f) {
  if (typeof window === "undefined") return;
  const p = new URLSearchParams(window.location.search);
  for (const k of ["q", "deal", "type"]) { const v = k === "q" ? String(f.q || "").trim() : f[k]; if (v) p.set(k, v); else p.delete(k); }
  const qs = p.toString();
  // replaceState: частые изменения поиска не плодят записи в истории.
  window.history.replaceState(window.history.state, "", window.location.pathname + (qs ? "?" + qs : "") + window.location.hash);
}
