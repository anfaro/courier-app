"use client";

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const draggableIcon = L.divIcon({
  className: "",
  html: `<div style="transform: translate(-50%, -100%);">
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
      <path d="M16 0C7.2 0 0 7.2 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.2 24.8 0 16 0Z" fill="#2563EB"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>
  </div>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});

function MapEvents({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapCenterUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const prevRef = useRef({ lat, lng });
  useEffect(() => {
    const prev = prevRef.current;
    if (prev.lat !== lat || prev.lng !== lng) {
      map.flyTo([lat, lng], map.getZoom());
      prevRef.current = { lat, lng };
    }
  }, [lat, lng, map]);
  return null;
}

interface LeafletMapPickerProps {
  lat: number;
  lng: number;
  onMapClick: (lat: number, lng: number) => void;
  onMarkerDrag: (lat: number, lng: number) => void;
}

export default function LeafletMapPicker({ lat, lng, onMapClick, onMarkerDrag }: LeafletMapPickerProps) {
  return (
    <MapContainer
      key={`picker-${lat}-${lng}`}
      center={[lat, lng]}
      zoom={16}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%", zIndex: 0 }}
    >
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        attribution="&copy; <a href=&quot;https://www.esri.com/&quot;>Esri</a>" />
      <MapEvents onClick={onMapClick} />
      <MapCenterUpdater lat={lat} lng={lng} />
      <Marker
        position={[lat, lng]}
        icon={draggableIcon}
        draggable={true}
        eventHandlers={{
          dragend(e) {
            const marker = e.target;
            const pos = marker.getLatLng();
            onMarkerDrag(pos.lat, pos.lng);
          },
        }}
      />
    </MapContainer>
  );
}
