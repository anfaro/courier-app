"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useScrollLock } from "@/lib/useScrollLock";
import Icon from "@/components/Icon";

const MapPicker = dynamic(() => import("./LeafletMapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface-hover">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-500 border-t-transparent" />
        <span className="text-[12px] font-bold text-secondary animate-pulse">Loading map...</span>
      </div>
    </div>
  ),
});

interface LocationPickerProps {
  initialLat?: string;
  initialLng?: string;
  onConfirm: (lat: string, lng: string, address: string) => void;
  onClose: () => void;
}

export default function LocationPicker({ initialLat, initialLng, onConfirm, onClose }: LocationPickerProps) {
  useScrollLock(true);
  const [lat, setLat] = useState(initialLat ? Number(initialLat) : -6.2088);
  const [lng, setLng] = useState(initialLng ? Number(initialLng) : 106.8456);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&accept-language=id`
        );
        const data = await res.json();
        setSearchResults(data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const handleSelectResult = (result: any) => {
    setLat(Number(result.lat));
    setLng(Number(result.lon));
    setResolvedAddress(result.display_name);
    setSearchQuery(result.display_name);
    setSearchResults([]);
  };

  const handleMapClick = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    setResolvedAddress("");
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=id`
      );
      const data = await res.json();
      if (data?.display_name) setResolvedAddress(data.display_name);
    } catch {}
  };

  const handleMarkerDrag = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    setResolvedAddress("");
    reverseGeocode(newLat, newLng);
  };

  const handleConfirm = () => {
    onConfirm(lat.toFixed(6), lng.toFixed(6), resolvedAddress);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="shrink-0 bg-background px-4 pb-3 pt-4 border-b border-card-border">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover active:scale-90 transition">
            <Icon name="close" size={18} strokeWidth={2.5} />
          </button>
          <h2 className="text-[16px] font-extrabold text-primary">Pin Location</h2>
          <button onClick={handleConfirm} className="rounded-full bg-blue-600 px-5 py-2 text-[13px] font-bold text-white active:scale-90 transition">
            Confirm
          </button>
        </div>

        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
            <Icon name="search" size={16} strokeWidth={2.5} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search address or place..."
            className="w-full rounded-2xl border border-card-border bg-surface-hover pl-10 pr-4 py-3 text-[14px] font-medium text-primary outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-[2px] border-blue-500 border-t-transparent" />
            </div>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="mt-2 rounded-2xl bg-card border border-card-border shadow-lg overflow-hidden max-h-48 overflow-y-auto">
            {searchResults.map((r: any, i: number) => (
              <button
                key={i}
                onClick={() => handleSelectResult(r)}
                className="w-full text-left px-4 py-3 text-[13px] text-primary hover:bg-surface-hover border-b border-card-border last:border-0 transition"
              >
                <span className="line-clamp-2">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}

        {resolvedAddress && (
          <div className="mt-2 flex items-start gap-2 rounded-2xl bg-blue-50 dark:bg-blue-950/20 p-3 border border-blue-100 dark:border-blue-900/50">
            <span className="text-blue-500 shrink-0 mt-0.5">📍</span>
            <p className="text-[12px] font-medium text-blue-800 dark:text-blue-300 leading-snug">{resolvedAddress}</p>
          </div>
        )}
      </div>

      <div className="flex-1 relative">
        <MapPicker
          lat={lat}
          lng={lng}
          onMapClick={handleMapClick}
          onMarkerDrag={handleMarkerDrag}
        />
      </div>

      <div className="shrink-0 bg-background border-t border-card-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-secondary">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </span>
        </div>
        <p className="text-[10px] font-medium text-secondary/60">Drag marker to adjust</p>
      </div>
    </div>
  );
}
