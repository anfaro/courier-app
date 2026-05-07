// components/DeliveryMap.tsx

"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css"; // CRITICAL: Leaflet will break without its CSS
import L from "leaflet";
import Link from "next/link";

// Fix default icon paths just in case we need standard markers later
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function DeliveryMap({ deliveries }: { deliveries: any[] }) {
  // Filter out deliveries that don't have valid coordinates
  const validDeliveries = deliveries.filter(
    (d) => d.customer?.latitude && d.customer?.longitude && d.customer.latitude !== "0"
  );

  // Default center (Jakarta coordinates as fallback, or use the first delivery's location)
  const defaultCenter: [number, number] = validDeliveries.length > 0
    ? [parseFloat(validDeliveries[0].customer.latitude), parseFloat(validDeliveries[0].customer.longitude)]
    : [-6.2088, 106.8456];

  if (validDeliveries.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center rounded-[32px] bg-white p-6 text-center border border-gray-100 shadow-sm mt-4 mx-4 sm:mx-6">
        <div className="text-4xl mb-4">🗺️</div>
        <h3 className="text-xl font-black text-gray-900">No GPS Data Found</h3>
        <p className="mt-2 text-[14px] font-medium text-gray-500">
          None of your pending deliveries have valid GPS coordinates pinned to their customer profiles yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[32px] shadow-lg border border-gray-100 bg-white mx-4 sm:mx-6 mt-4 relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        className="h-[60vh] w-full z-0"
        zoomControl={false} // We can hide default zoom for cleaner mobile UI
      >
        {/* Beautiful Map Tiles (CartoDB Positron for a clean, modern look) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {validDeliveries.map((delivery) => {
          const lat = parseFloat(delivery.customer.latitude);
          const lng = parseFloat(delivery.customer.longitude);

          return (
            <CircleMarker
              key={delivery.id}
              center={[lat, lng]}
              radius={16} // Size of the heatmap dot
              pathOptions={{
                fillColor: "#0A2FFF", // Deep Blue
                fillOpacity: 0.4,     // Semi-transparent so overlapping dots get darker!
                color: "#0A2FFF",     // Border color
                weight: 2,            // Border width
              }}
            >
              <Popup className="custom-popup rounded-2xl">
                <div className="p-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                    {delivery.waybillNumber}
                  </p>
                  <p className="font-bold text-[15px] text-gray-900 leading-tight">
                    {delivery.customer.name}
                  </p>
                  <p className="text-[13px] font-medium text-gray-600 mt-1 line-clamp-2">
                    {delivery.customer.address}
                  </p>
                  <Link
                    href={`/deliveries/${delivery.id}`}
                    // THE FIX: Added !text-white and hover:!text-white to override Leaflet's default link colors
                    className="mt-3 block w-full rounded-full bg-blue-600 py-2 text-center text-[12px] font-bold !text-white hover:!text-white transition-all active:scale-95"
                  >
                    View Details
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

