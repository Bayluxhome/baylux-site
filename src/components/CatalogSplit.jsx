"use client";
// Синхронизация списка и карты в каталоге (задача: карта ↔ список).
// Единый идентификатор — slug дома (пин = дом, карточки = его объекты с data-building=slug).
// Карта → список: клик по пину подсвечивает карточки этого дома и прокручивает список к первой;
//   если объектов дома нет на текущей странице списка — показываем закреплённую плашку со ссылкой.
// Список → карта: кнопка «На карте» на карточке шлёт событие bx:showOnMap → MapView центрируется и открывает попап.
// Список остаётся серверным (children) — клиентская обёртка только держит выбранный slug.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MapView from "@/components/MapView";
import { useLang } from "@/components/LangContext";
import { translitAddress } from "@/lib/dict";

export default function CatalogSplit({ buildings, center, zoom, fit, hiddenCount = 0, children }) {
  const { t, lang } = useLang();
  const [sel, setSel] = useState(null);
  const [src, setSrc] = useState(null); // откуда пришёл выбор: "map" | "list" (защита от цикла)
  const listRef = useRef(null);

  // Список → карта
  useEffect(() => {
    const h = (e) => { setSrc("list"); setSel(e.detail?.building || null); };
    window.addEventListener("bx:showOnMap", h);
    return () => window.removeEventListener("bx:showOnMap", h);
  }, []);

  // Подсветка карточек выбранного дома и прокрутка внутри списка (не всей страницы «неожиданно»)
  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    root.querySelectorAll(".card.card-sel").forEach((el) => { el.classList.remove("card-sel"); el.removeAttribute("aria-current"); });
    if (!sel) return;
    const cards = root.querySelectorAll(`.card[data-building="${CSS.escape(sel)}"]`);
    cards.forEach((el) => { el.classList.add("card-sel"); el.setAttribute("aria-current", "true"); });
    if (cards[0] && src === "map") cards[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [sel, src]);

  const selB = sel ? buildings.find((b) => b.slug === sel) : null;
  const onPage = sel && listRef.current ? listRef.current.querySelector(`.card[data-building="${CSS.escape(sel)}"]`) : null;

  return (
    <div className="split">
      <div ref={listRef}>
        {/* Выбранный на карте дом, которого нет на этой странице списка — закреплённая плашка */}
        {selB && !onPage && (
          <div className="map-sel-note" role="status">
            <b>{t("map_sel_h")}:</b> {translitAddress(selB["name_" + lang] || selB.name, lang, selB.kind)} · {selB.units.length} {t("map_objects")}
            <span className="muted"> — {t("map_sel_other_page")}</span>{" "}
            <Link href={`/building/${selB.slug}`}>{t("map_open_house")}</Link>
          </div>
        )}
        {hiddenCount > 0 && <div className="muted" style={{ fontSize: 13, margin: "0 0 10px" }}>{hiddenCount} {t("map_hidden_n")}</div>}
        {children}
      </div>
      <MapView buildings={buildings} className="map-full" center={center} zoom={zoom} fit={fit} selected={sel}
        onSelect={(slug) => { setSrc("map"); setSel(slug); }} />
    </div>
  );
}
