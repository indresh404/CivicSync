"use client";

import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty";

interface MapViewProps {
  onReady?: (m: maplibregl.Map) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

export default function MapView({
  onReady,
  center = [72.8777, 19.076], // [lng, lat] Mumbai
  zoom = 13,
  className = "h-full w-full",
}: MapViewProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: STYLE,
      center,
      zoom,
      pitch: 0,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("load", () => onReady?.(map));

    return () => {
      map.remove();
    };
  }, [center, zoom, onReady]);

  return <div ref={ref} className={className} />;
}
