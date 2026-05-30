"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// points: [{ lat, lng, label, href, jk }]
export default function MapView({ points = [], center = [41.642, 41.632], zoom = 13, className = "map-home" }) {
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
      // убираем дефолтный префикс Leaflet (с флагом), оставляем копирайт карт
      map.attributionControl.setPrefix(false);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap, © CARTO", maxZoom: 19,
      }).addTo(map);

      const cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 48 });
      points.forEach((p) => {
        const icon = L.divIcon({ className: "", html: `<div class="price-pin ${p.jk ? "jk" : ""}">${p.label}</div>` });
        const m = L.marker([p.lat, p.lng], { icon });
        // клик по дому/объекту — сразу переход на страницу (без всплывающего окна)
        if (p.href) m.on("click", () => { window.location.href = p.href; });
        cluster.addLayer(m);
      });
      map.addLayer(cluster);
      if (points.length > 1) {
        try { map.fitBounds(cluster.getBounds().pad(0.2)); } catch (e) {}
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [points, center, zoom]);

  return <div className={className} ref={elRef} />;
}
