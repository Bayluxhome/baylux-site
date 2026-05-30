"use client";
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

export default function MapPicker({ onPick }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !elRef.current || mapRef.current) return;
      const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
      const style = key ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}` : "https://demotiles.maplibre.org/style.json";
      const map = new maplibregl.Map({ container: elRef.current, style, center: [41.636, 41.641], zoom: 12 });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
      map.on("click", (e) => {
        const { lng, lat } = e.lngLat;
        if (!markerRef.current) markerRef.current = new maplibregl.Marker({ color: "#01274B" }).setLngLat([lng, lat]).addTo(map);
        else markerRef.current.setLngLat([lng, lat]);
        if (onPick) onPick(lat, lng);
      });
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  return <div ref={elRef} className="map-pick" />;
}
