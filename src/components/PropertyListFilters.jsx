"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/components/LangContext";
import { typeLabel } from "@/lib/dict";
import { FILTER_DEALS, FILTER_TYPES, MAX_Q, EMPTY_FILTERS, isDefaultFilters } from "@/lib/listingFilter";

// Общий блок фильтров списков объектов в кабинете (12.10.2026):
// «Мои объекты» и «Выбор объектов для подборки». Только поля фильтра — никаких действий
// над результатами (удаление, добавление в подборку, выбор чекбоксами остаются в экранах).
//
// props:
//   value     { q, deal, type } — текущие (канонические) значения
//   onChange  (next) => void   — новое значение фильтров
//   types     string[]         — какие типы показывать в списке (по умолчанию все канонические;
//                                экран передаёт только реально встречающиеся в его наборе)
//   count     number           — сколько объектов осталось после фильтра (для «Найдено: N»)
export default function PropertyListFilters({ value = EMPTY_FILTERS, onChange, types, count }) {
  const { t, lang } = useLang();
  const [q, setQ] = useState(value.q || "");
  useEffect(() => { setQ(value.q || ""); }, [value.q]);

  // Поиск — с задержкой 250 мс, чтобы не пересчитывать список на каждую букву.
  useEffect(() => {
    if (q === (value.q || "")) return;
    const tm = setTimeout(() => onChange({ ...value, q }), 250);
    return () => clearTimeout(tm);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const typeList = (types && types.length ? FILTER_TYPES.filter((x) => types.includes(x)) : FILTER_TYPES);
  const showReset = !isDefaultFilters({ ...value, q });

  return (
    <div className="plf" role="search">
      <label className="plf-q">
        <span className="sr-only">{t("flt_search_lbl")}</span>
        <input type="search" value={q} maxLength={MAX_Q} placeholder={t("flt_search")}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onChange({ ...value, q }); } }} />
      </label>
      <label>
        <span className="sr-only">{t("flt_deal_lbl")}</span>
        <select value={value.deal || ""} onChange={(e) => onChange({ ...value, q, deal: e.target.value })}>
          <option value="">{t("f_anyDeal")}</option>
          {FILTER_DEALS.map((d) => <option key={d} value={d}>{t("deal_" + d)}</option>)}
        </select>
      </label>
      <label>
        <span className="sr-only">{t("flt_type_lbl")}</span>
        <select value={value.type || ""} onChange={(e) => onChange({ ...value, q, type: e.target.value })}>
          <option value="">{t("f_anyType")}</option>
          {typeList.map((ty) => <option key={ty} value={ty}>{typeLabel(lang, ty)}</option>)}
        </select>
      </label>
      {showReset && (
        <button type="button" className="btn btn-ghost plf-reset" onClick={() => { setQ(""); onChange({ ...EMPTY_FILTERS }); }}>{t("flt_reset")}</button>
      )}
      {typeof count === "number" && !isDefaultFilters(value) && (
        <span className="plf-count" aria-live="polite">{t("flt_found").replace("{n}", count)}</span>
      )}
    </div>
  );
}
