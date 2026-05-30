"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

const DEAL = { sale: "Продажа", rent: "Аренда", daily: "Посуточно" };
const DEALCLASS = { sale: "b-sale", rent: "b-rent", daily: "b-daily" };

function shortPrice(s) {
  return String(s || "").replace("от ", "").split(" ")[0] || "•";
}
function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// buildings: [{ slug, name, district, kind, lat, lng, priceFrom, units:[{slug,deal,type,rooms,area,price,per}] }]
export default function MapView({ buildings = [], center = [41.642, 41.632], zoom = 13, className = "map-home" }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.markercluster");
      if (cancelled || !elRef.current || mapRef.current) return;

      const map = L.map(elRef.current, { scrollWheelZoom: false }).setView(center, zoom);
      mapRef.current = map;
      map.attributionControl.setPrefix(false);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap, © CARTO", maxZoom: 19,
      }).addTo(map);

      // карточка-панель поверх карты
      const card = document.createElement("div");
      card.className = "map-card";
      card.style.display = "none";
      elRef.current.appendChild(card);

      let activePin = null;
      function clearActive() {
        if (activePin) { activePin.classList.remove("active"); activePin = null; }
      }
      function closeCard() { card.style.display = "none"; clearActive(); }
      card.addEventListener("click", (e) => { if (e.target.dataset.close) closeCard(); });

      const cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 46 });
      const markers = {};
      buildings.forEach((b) => {
        const icon = L.divIcon({ className: "", html: `<div class="price-pin jk" data-b="${b.slug}">${esc(shortPrice(b.priceFrom))}</div>` });
        const m = L.marker([b.lat, b.lng], { icon });
        m.on("click", () => {
          // подсветка дома
          clearActive();
          const pin = m._icon && m._icon.querySelector(".price-pin");
          if (pin) { pin.classList.add("active"); activePin = pin; }
          // приближаем к дому
          map.setView([b.lat, b.lng], Math.max(map.getZoom(), 15), { animate: true });
          // список квартир в доме
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
        });
        markers[b.slug] = m;
        cluster.addLayer(m);
      });
      map.addLayer(cluster);
      // клик по пустой карте — закрыть карточку
      map.on("click", () => closeCard());

      if (buildings.length > 1) {
        try { map.fitBounds(cluster.getBounds().pad(0.2)); } catch (e) {}
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [buildings, center, zoom]);

  return <div className={className} ref={elRef} />;
}
