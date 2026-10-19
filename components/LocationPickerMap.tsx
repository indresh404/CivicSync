"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin, Check, X } from "lucide-react";

interface LocationPickerMapProps {
  initialLat: number;
  initialLng: number;
  onConfirm: (lat: number, lng: number) => void;
  onCancel: () => void;
}

export default function LocationPickerMap({
  initialLat,
  initialLng,
  onConfirm,
  onCancel,
}: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [currentLat, setCurrentLat] = useState<number>(initialLat);
  const [currentLng, setCurrentLng] = useState<number>(initialLng);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let map: any = null;

    const initMap = async () => {
      try {
        const maplibregl = (await import("maplibre-gl")).default;

        map = new maplibregl.Map({
          container: mapContainerRef.current!,
          style: {
            version: 8,
            sources: {
              "osm-tiles": {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
              },
            },
            layers: [
              {
                id: "osm-tiles-layer",
                type: "raster",
                source: "osm-tiles",
                minzoom: 0,
                maxzoom: 19,
              },
            ],
          },
          center: [initialLng, initialLat],
          zoom: 14.5,
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

        // Custom draggable marker
        const el = document.createElement("div");
        el.className = "cursor-grab active:cursor-grabbing";
        el.innerHTML = `
          <div style="width: 32px; height: 32px; border-radius: 50%; background: #2563EB; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
            <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el, draggable: true })
          .setLngLat([initialLng, initialLat])
          .addTo(map);

        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          setCurrentLat(Number(lngLat.lat.toFixed(6)));
          setCurrentLng(Number(lngLat.lng.toFixed(6)));
        });

        markerRef.current = marker;

        // Click map to reposition marker
        map.on("click", (e: any) => {
          const { lng, lat } = e.lngLat;
          marker.setLngLat([lng, lat]);
          setCurrentLat(Number(lat.toFixed(6)));
          setCurrentLng(Number(lng.toFixed(6)));
        });

        mapInstanceRef.current = map;
      } catch (err) {
        console.error("LocationPickerMap init error:", err);
      }
    };

    initMap();

    return () => {
      if (map) map.remove();
    };
  }, [initialLat, initialLng]);

  return (
    <div className="flex flex-col h-[400px] border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-800">
            Click map or drag marker to set exact excavation point
          </span>
        </div>
        <div className="font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
          Lat: {currentLat}, Lng: {currentLng}
        </div>
      </div>

      <div className="relative flex-1">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      </div>

      <div className="bg-white border-t border-slate-200 p-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onConfirm(currentLat, currentLng)}
          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          Confirm Location
        </button>
      </div>
    </div>
  );
}
