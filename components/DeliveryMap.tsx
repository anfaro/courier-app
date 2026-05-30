"use client";

import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const startIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const endIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapController({ flyTo, onReady }: { flyTo: [number, number] | null; onReady: (m: L.Map) => void }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, []);
  useEffect(() => {
    if (flyTo) map.flyTo(flyTo, 15, { duration: 0.8 });
  }, [flyTo]);
  return null;
}

function MarkerClusterLayer({ deliveries }: { deliveries: any[] }) {
  const map = useMap();

  useEffect(() => {
    const mcg = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
    });

    deliveries.forEach((d) => {
      const lat = parseFloat(d.customer.latitude);
      const lng = parseFloat(d.customer.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: "#0A2FFF",
        fillOpacity: 0.6,
        color: "#FFFFFF",
        weight: 2,
      });

      marker.bindPopup(`
        <div style="padding:4px;min-width:160px;">
          <p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin:0 0 4px 0;">${d.waybillNumber}</p>
          <p style="font-size:15px;font-weight:700;margin:0 0 0 0;">${d.customer.name}</p>
        </div>
      `);

      mcg.addLayer(marker);
    });

    map.addLayer(mcg);
    return () => { map.removeLayer(mcg); };
  }, [deliveries, map]);

  return null;
}

export default function DeliveryMap({ deliveries, clusters }: { deliveries: any[]; clusters: any[] }) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const router = useRouter();
  const mapRef = useRef<L.Map | null>(null);

  const [startLink, setStartLink] = useState("");
  const [endLink, setEndLink] = useState("");
  const [startCoords, setStartCoords] = useState<[number, number] | null>([-8.1668, 113.6879]);
  const [endCoords, setEndCoords] = useState<[number, number] | null>(null);
  const [isResolving, setIsResolving] = useState<"start" | "end" | null>(null);
  const [optimizedRoute, setOptimizedRoute] = useState<[number, number][]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [routeStats, setRouteStats] = useState<{ duration: number; distance: number; stopCount: number; completionTime: string } | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [clusterFilter, setClusterFilter] = useState<string>("all");
  const [showDeliveryList, setShowDeliveryList] = useState(false);
  const [locating, setLocating] = useState(false);

  const validDeliveries = deliveries.filter(d => {
    if (!d.customer) return false;
    const lat = parseFloat(d.customer.latitude);
    const lng = parseFloat(d.customer.longitude);
    return !isNaN(lat) && isFinite(lat) && lat !== 0 &&
           !isNaN(lng) && isFinite(lng) && lng !== 0;
  });

  const filteredDeliveries = clusterFilter === "all"
    ? validDeliveries
    : validDeliveries.filter(d => {
        const customerClusters = d.customer?.clusters || [];
        return customerClusters.some((cc: any) => cc.cluster?.name === clusterFilter);
      });

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
          if (type === "start") { setStartCoords(coords); setStartLink(""); }
          else { setEndCoords(coords); setEndLink(""); }
        } else {
          showToast(data.error || "Could not extract coordinates from that link", "error");
        }
      } catch {
        showToast("Failed to resolve location", "error");
      } finally { setIsResolving(null); }
    }
  };

  const calculateBestRoute = async () => {
    if (!startCoords || !endCoords) { alert("Please set both Start and End points first."); return; }
    setIsOptimizing(true);
    setRouteStats(null);

    const stops = filteredDeliveries.map(d => ({
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
        const dist = Math.sqrt(Math.pow(current[0] - remaining[i].lat, 2) + Math.pow(current[1] - remaining[i].lng, 2));
        if (dist < minDistance) { minDistance = dist; nearestIdx = i; }
      }
      const next = remaining.splice(nearestIdx, 1)[0];
      current = [next.lat, next.lng];
      sequence.push(current);
    }
    sequence.push(endCoords);

    try {
      const coordsString = sequence.map(s => `${s[1]},${s[0]}`).join(";");
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`);
      if (!res.ok) throw new Error("Routing service failed");
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const roadRoute: [number, number][] = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        setOptimizedRoute(roadRoute);
        const totalHandlingTime = filteredDeliveries.length * 300;
        const totalTimeSeconds = route.duration + totalHandlingTime;
        const completionDate = new Date(Date.now() + totalTimeSeconds * 1000);
        setRouteStats({
          duration: totalTimeSeconds,
          distance: route.distance,
          stopCount: filteredDeliveries.length,
          completionTime: completionDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }),
        });
      } else { setOptimizedRoute(sequence); }
    } catch {
      setOptimizedRoute(sequence);
    } finally { setIsOptimizing(false); }
  };

  const updateStatus = async (deliveryId: string, newStatus: string) => {
    setStatusUpdating(deliveryId);
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      showToast(`Marked as ${newStatus}`, "success");
      router.refresh();
    } catch {
      showToast("Failed to update status", "error");
    } finally { setStatusUpdating(null); }
  };

  const goToMyLocation = () => {
    if (!navigator.geolocation) { showToast("Geolocation not supported", "error"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setFlyToCoords([pos.coords.latitude, pos.coords.longitude]); setLocating(false); },
      () => { showToast("Could not get location", "error"); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const panToDelivery = (delivery: any) => {
    const lat = parseFloat(delivery.customer.latitude);
    const lng = parseFloat(delivery.customer.longitude);
    if (!isNaN(lat) && !isNaN(lng)) setFlyToCoords([lat, lng]);
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const defaultCenter: [number, number] = startCoords || (filteredDeliveries.length > 0
    ? [parseFloat(filteredDeliveries[0].customer.latitude), parseFloat(filteredDeliveries[0].customer.longitude)]
    : [-6.2088, 106.8456]);

  const inputClass = "w-full rounded-2xl border border-card-border bg-background px-4 py-3 text-[13px] font-medium text-primary focus:border-blue-500 outline-none transition-all shadow-inner placeholder:text-secondary/50";

  return (
    <div className="flex flex-col gap-4 mx-4 sm:mx-6 mt-4">

      {/* --- CLUSTER FILTER + DELIVERY COUNT --- */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <select
            value={clusterFilter}
            onChange={(e) => setClusterFilter(e.target.value)}
            className="w-full rounded-2xl border border-card-border bg-background px-4 py-3 text-[13px] font-medium text-primary focus:border-blue-500 outline-none transition-all shadow-inner appearance-none cursor-pointer"
          >
            <option value="all">All Clusters ({filteredDeliveries.length})</option>
            {clusters.map((c: any) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">▼</span>
        </div>
        <button
          onClick={() => setShowDeliveryList(!showDeliveryList)}
          className="shrink-0 h-11 w-11 rounded-2xl border border-card-border bg-background flex items-center justify-center hover:bg-surface-hover transition-colors active:scale-90"
          title="Delivery list"
        >
          <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
        <button
          onClick={goToMyLocation}
          disabled={locating}
          className="shrink-0 h-11 w-11 rounded-2xl border border-card-border bg-background flex items-center justify-center hover:bg-surface-hover transition-colors active:scale-90 disabled:opacity-50"
          title="My location"
        >
          {locating ? (
            <span className="h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          ) : (
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>

      {/* --- DELIVERY LIST --- */}
      {showDeliveryList && filteredDeliveries.length > 0 && (
        <div className="rounded-[24px] bg-card border border-card-border shadow-sm overflow-hidden">
          <div className="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-card-border">
            {filteredDeliveries.map((d) => (
              <button
                key={d.id}
                onClick={() => { panToDelivery(d); setShowDeliveryList(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors active:scale-[0.99]"
              >
                <span className="h-8 w-8 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-[13px] font-black text-blue-700 dark:text-blue-400">
                  {d.waybillNumber?.[0] || "?"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-primary truncate">{d.waybillNumber}</p>
                  <p className="text-[11px] font-medium text-secondary truncate">{d.customer?.name || "Unknown"}</p>
                </div>
                <svg className="h-4 w-4 shrink-0 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

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
              {startCoords && !startLink && <button onClick={() => setStartCoords(null)} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 font-bold active:scale-90">✕</button>}
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
              {endCoords && !endLink && <button onClick={() => setEndCoords(null)} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 font-bold active:scale-90">✕</button>}
            </div>
          </div>
        </div>

        {routeStats && (
          <div className="grid grid-cols-3 gap-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-tighter text-blue-500">{t("map.distance")}</p>
              <p className="text-[16px] font-black text-blue-700 dark:text-blue-300">{(routeStats.distance / 1000).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km</p>
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
          <button onClick={() => { setOptimizedRoute([]); setRouteStats(null); }} className="w-full text-center text-[12px] font-bold text-red-600 hover:text-red-700 transition-colors active:scale-90">
            {t("map.clear")}
          </button>
        )}
      </div>

      {/* --- THE MAP --- */}
      <div className="overflow-hidden rounded-[32px] shadow-lg border border-card-border bg-card relative z-0">
        <MapContainer center={defaultCenter} zoom={13} className="h-[60vh] w-full z-0" zoomControl={false}>
          <TileLayer attribution="&copy; CARTO" url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <MapController flyTo={flyToCoords} onReady={(m) => { mapRef.current = m; }} />

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

          {/* Delivery Points (clustered) */}
          <MarkerClusterLayer deliveries={filteredDeliveries} />

          {optimizedRoute.length > 0 && (
            <Polyline positions={optimizedRoute} pathOptions={{ color: "#0A2FFF", weight: 6, opacity: 0.8, lineJoin: "round", lineCap: "round" }} />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
