"use client";
import { useEffect, useRef } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/config";

export default function MapPicker({ onPick, point }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const glRef = useRef(null);
  const markerRef = useRef(null);

  function place(lng, lat) {
    const gl = glRef.current, map = mapRef.current;
    if (!gl || !map) return;
    if (!markerRef.current) markerRef.current = new gl.Marker({ color: "#01274B" }).setLngLat([lng, lat]).addTo(map);
    else markerRef.current.setLngLat([lng, lat]);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !elRef.current || mapRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      glRef.current = mapboxgl;
      const hasPoint = point && point.lat != null;
      const map = new mapboxgl.Map({
        container: elRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: hasPoint ? [point.lng, point.lat] : [41.636, 41.641],
        zoom: hasPoint ? 17 : 13, // 17 — на этом уровне видны номера домов
      });
      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-left");
      map.on("load", () => { try { map.setLanguage("ru"); } catch (e) { /* подписи останутся по умолчанию */ } });
      map.on("click", (e) => {
        const { lng, lat } = e.lngLat;
        place(lng, lat);
        if (onPick) onPick(lat, lng);
      });
      if (hasPoint) place(point.lng, point.lat);
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  // Внешняя точка (из геокодинга адреса) — ставим маркер и приближаем до номеров домов.
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
