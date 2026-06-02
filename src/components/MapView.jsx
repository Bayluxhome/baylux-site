"use client";
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

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
// Подписи карты на русский (fallback: латиница → английский → локальное имя), иначе MapTiler даёт грузинский.
function localizeMap(map) {
  try {
    for (const l of (map.getStyle().layers || [])) {
      if (l.type === "symbol" && l.layout && l.layout["text-field"]) {
        map.setLayoutProperty(l.id, "text-field", ["coalesce", ["get", "name:ru"], ["get", "name:latin"], ["get", "name:en"], ["get", "name"]]);
      }
    }
  } catch (e) { /* стиль не готов — игнор */ }
}

// buildings: [{ slug, name, district, kind, lat, lng, priceFrom, units:[{slug,deal,type,rooms,area,price,per}] }]
export default function MapView({ buildings = [], center = [41.642, 41.632], zoom = 13, className = "map-home", onSelect }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const onSelRef = useRef(onSelect);
  onSelRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !elRef.current || mapRef.current) return;

      const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
      const style = key
        ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`
        : "https://demotiles.maplibre.org/style.json";

      const map = new maplibregl.Map({
        container: elRef.current,
        style,
        center: [center[1], center[0]],
        zoom,
        attributionControl: { compact: true },
        // на встроенных картах: один палец листает страницу, два — двигают карту
        cooperativeGestures: className !== "map-screen",
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
      map.addControl(new maplibregl.FullscreenControl(), "top-right");

      const card = document.createElement("div");
      card.className = "map-card";
      card.style.display = "none";
      elRef.current.appendChild(card);
      let activeEl = null;
      function closeCard() {
        card.style.display = "none";
        if (activeEl) { activeEl.classList.remove("active"); activeEl = null; }
        if (map.getSource("baylux-sel")) map.getSource("baylux-sel").setData({ type: "FeatureCollection", features: [] });
        if (onSelRef.current) onSelRef.current(null);
      }
      card.addEventListener("click", (e) => { if (e.target.dataset && e.target.dataset.close) closeCard(); });

      map.on("load", () => {
        localizeMap(map); // подписи на русский
        // слой подсветки выбранного здания
        map.addSource("baylux-sel", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({ id: "baylux-sel-fill", type: "fill", source: "baylux-sel",
          paint: { "fill-color": "#01274B", "fill-opacity": 0.55 } });
        map.addLayer({ id: "baylux-sel-line", type: "line", source: "baylux-sel",
          paint: { "line-color": "#01274B", "line-width": 2 } });

        buildings.forEach((b) => {
          const el = document.createElement("div");
          el.className = "price-pin jk";
          el.textContent = shortPrice(b.priceFrom);
          new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([b.lng, b.lat]).addTo(map);
          el.addEventListener("click", (ev) => {
            ev.stopPropagation();
            selectBuilding(b, el);
          });
        });

        if (buildings.length > 1) {
          const b = new maplibregl.LngLatBounds();
          buildings.forEach((x) => b.extend([x.lng, x.lat]));
          map.fitBounds(b, { padding: 60, maxZoom: 15, duration: 0 });
        }
      });

      function highlightAt(lng, lat) {
        const pt = map.project([lng, lat]);
        const feats = map.queryRenderedFeatures(pt) || [];
        const bld = feats.find((f) => f.sourceLayer === "building" && f.geometry);
        if (bld && map.getSource("baylux-sel")) {
          map.getSource("baylux-sel").setData({ type: "Feature", geometry: bld.geometry, properties: {} });
        }
      }

      function selectBuilding(b, el) {
        if (activeEl) activeEl.classList.remove("active");
        el.classList.add("active"); activeEl = el;
        if (onSelRef.current) onSelRef.current(b.slug);
        map.flyTo({ center: [b.lng, b.lat], zoom: Math.max(map.getZoom(), 16.5) });
        map.once("idle", () => highlightAt(b.lng, b.lat));

        const rows = b.units.map((u) =>
          `<a class="mc-unit" href="/property/${u.slug}">
             <span class="mc-badge ${DEALCLASS[u.deal] || "b-sale"}">${DEAL[u.deal] || ""}</span>
             <span class="mc-u-main">${esc(u.type)}${u.rooms ? ", " + u.rooms + " комн." : ""} · ${u.area} м²</span>
             <span class="mc-u-price">${esc(u.price)}</span>
           </a>`).join("");
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

      map.on("click", () => closeCard());
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [buildings, center, zoom]);

  return <div className={className} ref={elRef} />;
}
