"use client";
import { useEffect, useRef } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/config";

const DEAL = { sale: "Продажа", rent: "Аренда", daily: "Посуточно" };
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

// buildings: [{ slug, name, district, kind, lat, lng, priceFrom, units:[{slug,deal,type,rooms,area,price,per}] }]
export default function MapView({ buildings = [], center = [41.642, 41.632], zoom = 13, className = "map-home", onSelect, fit = true }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const glRef = useRef(null);
  const cardRef = useRef(null);
  const markersRef = useRef([]);
  const activeElRef = useRef(null);
  const onSelRef = useRef(onSelect);
  onSelRef.current = onSelect;
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

    const rows = b.units.map((u) => {
      const uimg = u.img || u.unit_image || (Array.isArray(u.photos) && u.photos[0]) || "";
      return `<a class="mc-unit" href="/property/${u.slug}">
         ${uimg ? `<img class="mc-u-img" src="${esc(uimg)}" alt="" loading="lazy">` : `<span class="mc-u-img"></span>`}
         <span class="mc-u-main"><span class="mc-badge ${DEALCLASS[u.deal] || "b-sale"}">${DEAL[u.deal] || ""}</span> ${esc(u.type)}${u.rooms ? ", " + u.rooms + " комн." : ""} · ${u.area} м²</span>
         <span class="mc-u-price">${esc(u.price)}</span>
       </a>`;
    }).join("");
    card.innerHTML =
      `<div class="mc-head">
         <div>
           <div class="mc-title">${esc(b.name)}</div>
           <div class="mc-sub">📍 ${esc(b.district)} · ${b.units.length} объект(ов)</div>
         </div>
         <button class="mc-close" data-close="1" aria-label="Закрыть">✕</button>
       </div>
       <div class="mc-list">${rows}</div>
       <a class="mc-all" href="/building/${b.slug}">Открыть дом — все объекты →</a>`;
    card.style.display = "block";
  }

  // Перерисовать маркеры (вызывается при загрузке стиля и при смене buildings) — карту НЕ пересоздаём.
  function renderMarkers() {
    const gl = glRef.current, map = mapRef.current;
    if (!gl || !map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const list = buildingsRef.current || [];
    list.forEach((b) => {
      const el = document.createElement("div");
      el.className = "price-pin jk";
      el.textContent = shortPrice(b.priceFrom);
      const mk = new gl.Marker({ element: el, anchor: "center" }).setLngLat([b.lng, b.lat]).addTo(map);
      markersRef.current.push(mk);
      el.addEventListener("click", (ev) => { ev.stopPropagation(); selectBuilding(b, el); });
    });
    // Подгоняем карту под все объекты ТОЛЬКО при первом рендере. Дальше маркеры обновляются,
    // но вид (приближение/центр) не трогаем — иначе клик/ре-рендер сбрасывал бы зум пользователя.
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

      const map = new mapboxgl.Map({
        container: elRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [center[1], center[0]],
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
    const map = mapRef.current;
    if (map && map.isStyleLoaded && map.isStyleLoaded()) renderMarkers();
  }, [buildings]);

  return <div className={className} ref={elRef} />;
}
