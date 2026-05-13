// components/DeliveryMap.tsx

"use client";

import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

// Fix default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom Icons for Start and End
const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function DeliveryMap({ deliveries }: { deliveries: any[] }) {
  const { t, locale } = useLanguage();

  // --- COORDINATE RESOLVER LOGIC ---
  const [startLink, setStartLink] = useState("");
  const [endLink, setEndLink] = useState("");
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
  const [endCoords, setEndCoords] = useState<[number, number] | null>(null);
  const [isResolving, setIsResolving] = useState<"start" | "end" | null>(null);
  
  // --- ROUTING STATE ---
  const [optimizedRoute, setOptimizedRoute] = useState<[number, number][]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // --- ESTIMATION STATE ---
  const [routeStats, setRouteStats] = useState<{
    duration: number; // in seconds
    distance: number; // in meters
    stopCount: number;
    completionTime: string;
  } | null>(null);

  const validDeliveries = deliveries.filter(
    (d) => d.customer?.latitude && d.customer?.longitude && d.customer.latitude !== "0"
  );

  const resolveLocation = async (url: string, type: "start" | "end") => {
    const trimmed = url.trim();
    if (trimmed.includes("google.com/maps") || trimmed.includes("goo.gl/maps") || trimmed.includes("maps.app.goo.gl")) {
      setIsResolving(type);
      try {
        const res = await fetch("/api/resolve-maps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });
        const data = await res.json();
        if (data.lat && data.lng) {
          const coords: [number, number] = [parseFloat(data.lat), parseFloat(data.lng)];
          if (type === "start") {
            setStartCoords(coords);
            setStartLink("");
          } else {
            setEndCoords(coords);
            setEndLink("");
          }
        }
      } catch (err) {
        console.warn("Failed to resolve location", err);
      } finally {
        setIsResolving(null);
      }
    }
  };

  // --- ROAD-AWARE BEST ROUTE LOGIC WITH ESTIMATIONS ---
  const calculateBestRoute = async () => {
    if (!startCoords || !endCoords) {
      alert("Please set both Start and End points first.");
      return;
    }

    setIsOptimizing(true);
    setRouteStats(null);
    
    // 1. Calculate optimal sequence (Nearest Neighbor TSP heuristic)
    const stops = validDeliveries.map(d => ({
      lat: parseFloat(d.customer.latitude),
      lng: parseFloat(d.customer.longitude),
    }));

    let current = startCoords;
    const remaining = [...stops];
    const sequence: [number, number][] = [startCoords];

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const dist = Math.sqrt(
          Math.pow(current[0] - remaining[i].lat, 2) + 
          Math.pow(current[1] - remaining[i].lng, 2)
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }

      const next = remaining.splice(nearestIdx, 1)[0];
      current = [next.lat, next.lng];
      sequence.push(current);
    }
    sequence.push(endCoords);

    // 2. Fetch actual road paths and metrics from OSRM
    try {
      const coordsString = sequence.map(s => `${s[1]},${s[0]}`).join(';');
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;
      
      const res = await fetch(osrmUrl);
      if (!res.ok) throw new Error("Routing service failed");
      
      const data = await res.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const roadRoute: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        setOptimizedRoute(roadRoute);

        // 3. Calculate Completion Metrics
        const travelDuration = route.duration; // seconds
        const totalDistance = route.distance; // meters
        const stopCount = validDeliveries.length;
        
        // HANDLING TIME: Assume 5 minutes per stop (300 seconds)
        const totalHandlingTime = stopCount * 300;
        const totalTimeSeconds = travelDuration + totalHandlingTime;
        
        const now = new Date();
        const completionDate = new Date(now.getTime() + totalTimeSeconds * 1000);
        
        setRouteStats({
          duration: totalTimeSeconds,
          distance: totalDistance,
          stopCount,
          completionTime: completionDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
        });

      } else {
        setOptimizedRoute(sequence);
      }
    } catch (err) {
      console.warn("OSRM Error:", err);
      setOptimizedRoute(sequence);
    } finally {
      setIsOptimizing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const defaultCenter: [number, number] = startCoords || (validDeliveries.length > 0
    ? [parseFloat(validDeliveries[0].customer.latitude), parseFloat(validDeliveries[0].customer.longitude)]
    : [-6.2088, 106.8456]);

  const inputClass = "w-full rounded-2xl border border-card-border bg-background px-4 py-3 text-[13px] font-medium text-primary focus:border-blue-500 outline-none transition-all shadow-inner placeholder:text-secondary/50";

  return (
    <div className="flex flex-col gap-4 mx-4 sm:mx-6 mt-4">
      
      {/* --- ROUTING CONTROLS --- */}
      <div className="rounded-[32px] bg-card p-6 shadow-sm border border-card-border space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-secondary ml-2">{t("map.start_label")}</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder={startCoords ? `📍 ${startCoords[0].toFixed(4)}, ${startCoords[1].toFixed(4)}` : "Paste Google Maps Link..."}
                value={startLink}
                onChange={(e) => { setStartLink(e.target.value); resolveLocation(e.target.value, "start"); }}
                className={inputClass}
              />
              {isResolving === "start" && <span className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />}
              {startCoords && !startLink && <button onClick={() => setStartCoords(null)} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 font-bold">✕</button>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-secondary ml-2">{t("map.end_label")}</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder={endCoords ? `📍 ${endCoords[0].toFixed(4)}, ${endCoords[1].toFixed(4)}` : "Paste Google Maps Link..."}
                value={endLink}
                onChange={(e) => { setEndLink(e.target.value); resolveLocation(e.target.value, "end"); }}
                className={inputClass}
              />
              {isResolving === "end" && <span className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />}
              {endCoords && !endLink && <button onClick={() => setEndCoords(null)} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 font-bold">✕</button>}
            </div>
          </div>
        </div>

        {/* --- ESTIMATION DASHBOARD --- */}
        {routeStats && (
          <div className="grid grid-cols-3 gap-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl animate-in fade-in zoom-in-95">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-tighter text-blue-500">{t("map.distance")}</p>
              <p className="text-[16px] font-black text-blue-700 dark:text-blue-300">{(routeStats.distance / 1000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km</p>
            </div>
            <div className="text-center border-x border-blue-100 dark:border-blue-800">
              <p className="text-[10px] font-black uppercase tracking-tighter text-blue-500">{t("map.duration")}</p>
              <p className="text-[16px] font-black text-blue-700 dark:text-blue-300">{formatDuration(routeStats.duration)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-tighter text-emerald-500">{t("map.etc")}</p>
              <p className="text-[16px] font-black text-emerald-600 dark:text-emerald-400">{routeStats.completionTime}</p>
            </div>
          </div>
        )}

        <button 
          onClick={calculateBestRoute}
          disabled={!startCoords || !endCoords || isOptimizing}
          className="btn-primary w-full py-4 text-[15px] shadow-blue-600/30 disabled:bg-gray-200 dark:disabled:bg-slate-800 disabled:text-secondary disabled:shadow-none"
        >
          {isOptimizing ? t("map.calculating") : `🚀 ${t("map.calculate")}`}
        </button>

        {optimizedRoute.length > 0 && (
          <button 
            onClick={() => { setOptimizedRoute([]); setRouteStats(null); }}
            className="w-full text-center text-[12px] font-bold text-red-600 hover:text-red-700 transition-colors"
          >
            {t("map.clear")}
          </button>
        )}
      </div>

      {/* --- THE MAP --- */}
      <div className="overflow-hidden rounded-[32px] shadow-lg border border-card-border bg-card relative z-0">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          className="h-[60vh] w-full z-0"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {/* Start & End Markers */}
          {startCoords && (
            <Marker position={startCoords} icon={startIcon}>
              <Popup><strong>Start Point</strong></Popup>
            </Marker>
          )}
          {endCoords && (
            <Marker position={endCoords} icon={endIcon}>
              <Popup><strong>End Point</strong></Popup>
            </Marker>
          )}

          {/* Delivery Points */}
          {validDeliveries.map((delivery) => {
            const lat = parseFloat(delivery.customer.latitude);
            const lng = parseFloat(delivery.customer.longitude);

            return (
              <CircleMarker
                key={delivery.id}
                center={[lat, lng]}
                radius={10}
                pathOptions={{
                  fillColor: "#0A2FFF",
                  fillOpacity: 0.6,
                  color: "#FFFFFF",
                  weight: 2,
                }}
              >
                <Popup className="custom-popup rounded-2xl">
                  <div className="p-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{delivery.waybillNumber}</p>
                    <p className="font-bold text-[15px] text-primary leading-tight">{delivery.customer.name}</p>
                    <Link href={`/deliveries/${delivery.id}`} className="mt-3 block w-full rounded-full bg-blue-600 py-2 text-center text-[11px] font-bold !text-white hover:!text-white transition-all active:scale-90">View Details</Link>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* The Road-Aware Route Line */}
          {optimizedRoute.length > 0 && (
            <Polyline 
              positions={optimizedRoute} 
              pathOptions={{ 
                color: '#0A2FFF', 
                weight: 6, 
                opacity: 0.8,
                lineJoin: 'round',
                lineCap: 'round'
              }} 
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
