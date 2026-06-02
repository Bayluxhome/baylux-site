"use client";
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

// Переключаем подписи карты на русский (fallback: латиница → английский → локальное имя).
// Иначе MapTiler streets-v2 показывает названия по умолчанию на грузинском.
function localize(map) {
  try {
    const layers = (map.getStyle().layers) || [];
    for (const l of layers) {
      if (l.type === "symbol" && l.layout && l.layout["text-field"]) {
        map.setLayoutProperty(l.id, "text-field", ["coalesce", ["get", "name:ru"], ["get", "name:latin"], ["get", "name:en"], ["get", "name"]]);
      }
    }
  } catch (e) { /* стиль ещё не готов — игнор */ }
}

export default function MapPicker({ onPick, point }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const glRef = useRef(null);

  function place(lng, lat) {
    const gl = glRef.current, map = mapRef.current;
    if (!gl || !map) return;
    if (!markerRef.current) markerRef.current = new gl.Marker({ color: "#01274B" }).setLngLat([lng, lat]).addTo(map);
    else markerRef.current.setLngLat([lng, lat]);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !elRef.current || mapRef.current) return;
      glRef.current = maplibregl;
      const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
      const style = key ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}` : "https://demotiles.maplibre.org/style.json";
      const map = new maplibregl.Map({ container: elRef.current, style, center: [41.636, 41.641], zoom: 13 });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
      map.on("load", () => localize(map));
      map.on("click", (e) => {
        const { lng, lat } = e.lngLat;
        place(lng, lat);
        if (onPick) onPick(lat, lng);
      });
      // zoom 17 — на этом уровне MapTiler показывает номера домов
      if (point && point.lat != null) { place(point.lng, point.lat); map.flyTo({ center: [point.lng, point.lat], zoom: 17, duration: 600 }); }
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  // Внешняя точка (например, из геокодинга адреса) — ставим маркер и приближаем до номеров домов.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !point || point.lat == null) return;
    const cur = markerRef.current && markerRef.current.getLngLat();
    if (cur && Math.abs(cur.lat - point.lat) < 1e-6 && Math.abs(cur.lng - point.lng) < 1e-6) return;
    place(point.lng, point.lat);
    map.flyTo({ center: [point.lng, point.lat], zoom: Math.max(map.getZoom(), 17), duration: 600 });
  }, [point && point.lat, point && point.lng]);

  return <div ref={elRef} className="map-pick" />;
}
