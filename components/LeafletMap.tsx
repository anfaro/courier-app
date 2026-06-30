// components/LeafletMap.tsx
"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

// Fix for default marker icons not showing up in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LeafletMapProps {
  lat: number;
  lng: number;
  interactive?: boolean;
}

export default function LeafletMap({ lat, lng, interactive = true }: LeafletMapProps) {
  // If not interactive (like the small tile), we disable all map movements
  return (
    <MapContainer
      key={`${lat}-${lng}-${interactive ? 'modal' : 'tile'}`}
      center={[lat, lng]}
      zoom={16}
      scrollWheelZoom={interactive}
      dragging={interactive}
      zoomControl={interactive}
      doubleClickZoom={interactive}
      style={{ height: "100%", width: "100%", zIndex: 0 }}
    >
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        attribution="&copy; <a href=&quot;https://www.esri.com/&quot;>Esri</a>" />
      <Marker position={[lat, lng]} />
    </MapContainer>
  );
}

