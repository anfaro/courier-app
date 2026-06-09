// components/MapModal.tsx
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamically import the Leaflet map so it doesn't crash Next.js Server Side Rendering
const MapComponent = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-blue-50 text-blue-400">
      <span className="animate-pulse font-bold text-sm">Loading Map...</span>
    </div>
  ),
});

interface MapModalProps {
  latitude: string | number;
  longitude: string | number;
  address?: string;
}

export default function MapModal({ latitude, longitude, address }: MapModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const lat = Number(latitude);
  const lng = Number(longitude);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.dispatchEvent(new CustomEvent("modal:change", { detail: { isOpen: true } }));
    } else {
      document.body.style.overflow = "";
      window.dispatchEvent(new CustomEvent("modal:change", { detail: { isOpen: false } }));
    }
    return () => {
      document.body.style.overflow = "";
      window.dispatchEvent(new CustomEvent("modal:change", { detail: { isOpen: false } }));
    };
  }, [isOpen]);

  // Official Google Maps Deep Link for Directions
  const navigateUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <>
      {/* 1. The Small Map Tile (Trigger) */}
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        className="group relative mt-2 mb-4 h-28 w-full sm:w-64 overflow-hidden rounded-[1.5rem] border border-card-border shadow-sm transition-all active:scale-90 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
      >
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/5 transition-colors group-hover:bg-black/10">
          <div className="pointer-events-none rounded-full bg-card/90 px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm backdrop-blur-md transition-transform group-hover:scale-105">
            📍 Tap to expand map
          </div>
        </div>

        {/* Render the non-interactive map for the small tile */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <MapComponent lat={lat} lng={lng} interactive={false} />
        </div>
      </button>

      {/* 2. The Full Screen Hero Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative z-10 flex h-full max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-2xl transition-all transform animate-[scaleUp_0.3s_ease-out]">

            {/* FIXED HEADER: Centered and Wrapping Address */}
            <div className="relative z-10 flex flex-col items-center border-b border-card-border bg-card px-4 py-5 shadow-sm sm:px-6">
              {/* Absolute positioned close button so it doesn't squish the text */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-secondary transition hover:bg-gray-200 active:scale-90"
                aria-label="Close map"
              >
                ✕
              </button>

              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-xl">
                🗺️
              </div>
              <h3 className="px-6 text-center text-[15px] font-bold leading-snug text-primary sm:text-lg">
                {address || "Customer Location"}
              </h3>
            </div>

            {/* Interactive Leaflet Map Area */}
            <div className="relative z-0 w-full flex-1 bg-gray-100">
              <MapComponent lat={lat} lng={lng} interactive={true} />
            </div>

            {/* Footer Action */}
            <div className="z-10 border-t border-card-border bg-card p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] sm:p-6">
              <a
                href={navigateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-8 py-4 text-[16px] font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 active:scale-90"
              >
                📍 Navigate on Google Maps
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

