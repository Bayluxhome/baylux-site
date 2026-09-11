"use client";
import { useEffect, useRef } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/config";
import { useLang } from "@/components/LangContext";
import { typeLabel, cityLabel, translitAddress } from "@/lib/dict";

const DEALCLASS = { sale: "b-sale", rent: "b-rent", daily: "b-daily" };
function shortPrice(s) {
  const str = String(s || "");
  const sym = /₾/.test(str) ? "₾" : "$";
  const n = parseInt(str.replace(/[^\d]/g, ""), 10);
  if (!n) return "•";
  if (n >= 1000) {
    const k = n / 1000;
    return sym + (k >= 100 ? Math.round(k) : Math.round(k * 10) / 10) + "k";
  }
  return sym + n;
}
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Валидная точка: конечные числа в разумном диапазоне. Дома без координат на карту не попадают
// (в списке они остаются) — раньше они рисовались в «центре Батуми».
const hasPoint = (b) => Number.isFinite(b?.lat) && Number.isFinite(b?.lng) && Math.abs(b.lat) <= 90 && Math.abs(b.lng) <= 180 && !(b.lat === 0 && b.lng === 0);

// buildings: [{ slug, name, district, kind, lat, lng, priceFrom, units:[{slug,deal,type,rooms,area,price,per}] }]
// selected — slug дома, который нужно показать/открыть программно (кнопка «На карте» у карточки).
// onSelect(slug|null) — обратная связь: клик по пину / закрытие карточки на карте.
export default function MapView({ buildings = [], center = [41.642, 41.632], zoom = 13, className = "map-home", onSelect, fit = true, selected = null }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const glRef = useRef(null);
  const cardRef = useRef(null);
  const markersRef = useRef([]);
  const markerBySlugRef = useRef(new Map());
  const activeElRef = useRef(null);
  const onSelRef = useRef(onSelect);
  onSelRef.current = onSelect;
  const langCtx = useLang();
  const langRef = useRef(langCtx);
  langRef.current = langCtx;
  const buildingsRef = useRef(buildings);
  buildingsRef.current = buildings;
  const didFitRef = useRef(false); // fitBounds выполняется ОДИН раз — чтобы клик/ре-рендер не сбрасывал приближение

  function closeCard() {
    const map = mapRef.current, card = cardRef.current;
    if (!card) return;
    card.style.display = "none";
    if (activeElRef.current) { activeElRef.current.classList.remove("active"); activeElRef.current = null; }
    if (map && map.getSource && map.getSource("baylux-sel")) map.getSource("baylux-sel").setData({ type: "FeatureCollection", features: [] });
    if (onSelRef.current) onSelRef.current(null);
  }

  function highlightAt(lng, lat) {
    const map = mapRef.current;
    if (!map) return;
    const pt = map.project([lng, lat]);
    const feats = map.queryRenderedFeatures(pt) || [];
    const bld = feats.find((f) => f.sourceLayer === "building" && f.geometry);
    if (bld && map.getSource("baylux-sel")) map.getSource("baylux-sel").setData({ type: "Feature", geometry: bld.geometry, properties: {} });
  }

  function selectBuilding(b, el) {
    const map = mapRef.current, card = cardRef.current;
    if (!map || !card) return;
    if (activeElRef.current) activeElRef.current.classList.remove("active");
    el.classList.add("active"); activeElRef.current = el;
    if (onSelRef.current) onSelRef.current(b.slug);
    map.flyTo({ center: [b.lng, b.lat], zoom: Math.max(map.getZoom(), 16.5) });
    map.once("idle", () => highlightAt(b.lng, b.lat));

    // Попап — на языке страницы (тот же словарь, что у карточек списка): сделка, тип, город, адрес.
    const { t, lang } = langRef.current;
    const rows = b.units.map((u) => {
      const uimg = u.img || u.unit_image || (Array.isArray(u.photos) && u.photos[0]) || "";
      const ps = u.deal === "rent" ? t("ps_rent") : u.deal === "daily" ? t("ps_daily") : "";
      return `<a class="mc-unit" href="/property/${u.slug}" data-unit="${esc(u.slug)}">
         ${uimg ? `<img class="mc-u-img" src="${esc(uimg)}" alt="" loading="lazy">` : `<span class="mc-u-img"></span>`}
         <span class="mc-u-main"><span class="mc-badge ${DEALCLASS[u.deal] || ""}">${esc(t("deal_" + u.deal))}</span> ${esc(typeLabel(lang, u.type))}${u.rooms ? ", " + u.rooms + " " + esc(t("rooms_short")) : ""} · ${u.area} ${esc(t("sqm"))}</span>
         <span class="mc-u-price">${esc(u.price)}${esc(ps)}</span>
       </a>`;
    }).join("");
    card.innerHTML =
      `<div class="mc-head" role="dialog" aria-label="${esc(translitAddress(b["name_" + lang] || b.name, lang, b.kind))}">
         <div>
           <div class="mc-title">${esc(translitAddress(b["name_" + lang] || b.name, lang, b.kind))}</div>
           <div class="mc-sub">📍 ${esc(cityLabel(lang, b.district))} · ${b.units.length} ${esc(t("map_objects"))}</div>
         </div>
         <button class="mc-close" data-close="1" aria-label="${esc(t("map_close"))}">✕</button>
       </div>
       <div class="mc-list">${rows}</div>
       <a class="mc-all" href="/building/${b.slug}">${esc(t("map_open_house"))}</a>`;
    card.style.display = "block";
  }

  // Перерисовать маркеры (вызывается при загрузке стиля и при смене buildings) — карту НЕ пересоздаём.
  function renderMarkers() {
    const gl = glRef.current, map = mapRef.current;
    if (!gl || !map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    markerBySlugRef.current = new Map();
    const list = (buildingsRef.current || []).filter(hasPoint);
    list.forEach((b) => {
      const el = document.createElement("div");
      el.className = "price-pin jk";
      el.textContent = shortPrice(b.priceFrom);
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-label", `${b.name}: ${b.priceFrom}`);
      const mk = new gl.Marker({ element: el, anchor: "center" }).setLngLat([b.lng, b.lat]).addTo(map);
      markersRef.current.push(mk);
      markerBySlugRef.current.set(b.slug, { b, el });
      el.addEventListener("click", (ev) => { ev.stopPropagation(); selectBuilding(b, el); });
      el.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); selectBuilding(b, el); } });
    });
    // Подгоняем карту под все объекты ТОЛЬКО при первом рендере (и только по валидным точкам —
    // одна ошибочная точка не растягивает карту). Дальше вид пользователя не трогаем.
    if (!didFitRef.current && fit && list.length > 1) {
      const bb = new gl.LngLatBounds();
      list.forEach((x) => bb.extend([x.lng, x.lat]));
      map.fitBounds(bb, { padding: 60, maxZoom: 15, duration: 0 });
    }
    didFitRef.current = true;
  }

  // Создаём карту ОДИН раз. Карта не пересоздаётся при ре-рендерах — иначе сбрасывался зум и плодились карточки.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !elRef.current || mapRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      glRef.current = mapboxgl;

      const safeCenter = Number.isFinite(center?.[0]) && Number.isFinite(center?.[1]) ? center : [41.642, 41.632];
      const map = new mapboxgl.Map({
        container: elRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [safeCenter[1], safeCenter[0]],
        zoom,
        attributionControl: { compact: true },
        cooperativeGestures: className !== "map-screen",
      });
      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-left");
      map.addControl(new mapboxgl.FullscreenControl(), "top-right");

      const card = document.createElement("div");
      card.className = "map-card";
      card.style.display = "none";
      elRef.current.appendChild(card);
      cardRef.current = card;
      card.addEventListener("click", (e) => { if (e.target.dataset && e.target.dataset.close) closeCard(); });

      // Метки — HTML-оверлеи, им НЕ нужен полностью загруженный стиль. Тайлы/глифы/спрайт
      // Mapbox иногда не догружаются (лимиты/троттлинг), тогда событие "load" не срабатывает
      // вовсе и метки не появлялись. Рисуем их сразу, как только распарсился стиль (styledata).
      map.on("styledata", () => {
        if (!markersRef.current.length && (buildingsRef.current || []).length) renderMarkers();
      });
      map.on("load", () => {
        try { map.setLanguage("ru"); } catch (e) { /* подписи по умолчанию */ }
        // Маркеры рисуем ПЕРВЫМ делом. Раньше renderMarkers стоял ПОСЛЕ addSource/addLayer,
        // и если те бросали ошибку (стиль ещё не догрузился — по таймингу), до renderMarkers
        // выполнение не доходило, а Mapbox глотал ошибку внутри обработчика → 0 меток на /map.
        renderMarkers();
        try {
          if (!map.getSource("baylux-sel")) {
            map.addSource("baylux-sel", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
            map.addLayer({ id: "baylux-sel-fill", type: "fill", source: "baylux-sel", paint: { "fill-color": "#01274B", "fill-opacity": 0.55 } });
            map.addLayer({ id: "baylux-sel-line", type: "line", source: "baylux-sel", paint: { "line-color": "#01274B", "line-width": 2 } });
          }
        } catch (e) { /* слой подсветки дома не критичен — метки уже отрисованы */ }
      });
      // Подстраховка: если событие "load" по какой-то причине не отрисовало метки
      // (гонка загрузки стиля/тайлов, проглоченная ошибка в обработчике), досоздаём их
      // при первом же "idle" — карта к этому моменту гарантированно готова. Условие
      // защищает от лишней работы, если метки уже на месте.
      map.on("idle", () => {
        if (!markersRef.current.length && (buildingsRef.current || []).length) renderMarkers();
      });
      // клик по пустому месту карты — закрыть карточку (по маркеру срабатывает свой обработчик)
      map.on("click", () => closeCard());
    })();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (cardRef.current && cardRef.current.parentNode) cardRef.current.parentNode.removeChild(cardRef.current);
      cardRef.current = null;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // Смена списка объектов — обновляем маркеры, не трогая саму карту.
  useEffect(() => {
    // Раньше здесь стояла проверка isStyleLoaded() — но стиль может не догрузиться,
    // а метки (оверлеи) от него не зависят. Достаточно, чтобы карта существовала.
    if (mapRef.current) renderMarkers();
  }, [buildings]);

  // Программный выбор (список → карта): открыть пин дома по slug. null — закрыть карточку.
  useEffect(() => {
    if (!mapRef.current) return;
    if (!selected) { if (activeElRef.current) closeCard(); return; }
    const hit = markerBySlugRef.current.get(selected);
    if (hit) selectBuilding(hit.b, hit.el);
  }, [selected]);

  return <div className={className} ref={elRef} />;
}
