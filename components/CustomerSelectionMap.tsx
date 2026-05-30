"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const selectedIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const unselectedIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const startIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
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

interface Customer {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  address: string;
  phoneNumber?: string;
  clusters?: { cluster: { id: string; name: string } }[];
}

interface Cluster {
  id: string;
  name: string;
}

export default function CustomerSelectionMap({ customers, clusters }: { customers: Customer[]; clusters: Cluster[] }) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const mapRef = useRef<L.Map | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
  const [startLink, setStartLink] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<[number, number][]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [routeStats, setRouteStats] = useState<{ duration: number; distance: number; stopCount: number; completionTime: string } | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [clusterFilter, setClusterFilter] = useState<string>("all");
  const [locating, setLocating] = useState(false);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [savedTrips, setSavedTrips] = useState<any[]>([]);
  const [showSavedRoutes, setShowSavedRoutes] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);

  const validCustomers = useMemo(() => customers.filter(c => {
    const lat = parseFloat(c.latitude);
    const lng = parseFloat(c.longitude);
    return !isNaN(lat) && isFinite(lat) && lat !== 0 &&
           !isNaN(lng) && isFinite(lng) && lng !== 0;
  }), [customers]);

  const filteredCustomers = useMemo(() => clusterFilter === "all"
    ? validCustomers
    : validCustomers.filter(c => {
        const cClusters = c.clusters || [];
        return cClusters.some((cc: any) => cc.cluster?.name === clusterFilter);
      }), [validCustomers, clusterFilter]);

  const toggleCustomer = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const resolveLocation = async (url: string) => {
    const trimmed = url.trim();
    if (trimmed.includes("google.com/maps") || trimmed.includes("goo.gl/maps") || trimmed.includes("maps.app.goo.gl")) {
      setIsResolving(true);
      try {
        const res = await fetch("/api/resolve-maps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });
        const data = await res.json();
        if (data.lat && data.lng) {
          const coords: [number, number] = [parseFloat(data.lat), parseFloat(data.lng)];
          setStartCoords(coords);
          setStartLink("");
        } else {
          showToast(data.error || "Could not extract coordinates from that link", "error");
        }
      } catch {
        showToast("Failed to resolve location", "error");
      } finally { setIsResolving(false); }
    }
  };

  const selectedCustomers = useMemo(() =>
    filteredCustomers.filter(c => selectedIds.has(c.id)),
    [filteredCustomers, selectedIds]
  );

  const calculateBestRoute = async () => {
    if (selectedCustomers.length === 0) {
      showToast("Please select at least one customer", "error");
      return;
    }
    setIsOptimizing(true);
    setRouteStats(null);

    const stops = selectedCustomers.map(c => ({
      lat: parseFloat(c.latitude),
      lng: parseFloat(c.longitude),
    }));

    const origin = startCoords || stops[0];
    let current = origin;
    const remaining = [...stops];
    const sequence: [number, number][] = [origin];
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
    if (startCoords) sequence.push(startCoords);

    try {
      const coordsString = sequence.map(s => `${s[1]},${s[0]}`).join(";");
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`);
      if (!res.ok) throw new Error("Routing service failed");
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const roadRoute: [number, number][] = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        setOptimizedRoute(roadRoute);
        const totalHandlingTime = selectedCustomers.length * 300;
        const totalTimeSeconds = route.duration + totalHandlingTime;
        const completionDate = new Date(Date.now() + totalTimeSeconds * 1000);
        setRouteStats({
          duration: totalTimeSeconds,
          distance: route.distance,
          stopCount: selectedCustomers.length,
          completionTime: completionDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }),
        });
      } else { setOptimizedRoute(sequence); }
    } catch {
      setOptimizedRoute(sequence);
    } finally { setIsOptimizing(false); }
  };

  const goToMyLocation = () => {
    if (!navigator.geolocation) { showToast("Geolocation not supported", "error"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setFlyToCoords([pos.coords.latitude, pos.coords.longitude]); setStartCoords([pos.coords.latitude, pos.coords.longitude]); setLocating(false); },
      () => { showToast("Could not get location", "error"); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const fetchSavedTrips = async () => {
    setIsLoadingTrips(true);
    try {
      const res = await fetch("/api/trips");
      if (res.ok) {
        const data = await res.json();
        setSavedTrips(data.trips || []);
      }
    } catch { /* silent */ }
    finally { setIsLoadingTrips(false); }
  };

  const handleSaveRoute = async () => {
    if (!saveName.trim() || !routeStats) return;
    setIsSaving(true);
    try {
      const stopIds = selectedCustomers.map(c => c.id);
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName.trim(),
          customerIds: stopIds,
          startLat: startCoords?.[0],
          startLng: startCoords?.[1],
          totalDistance: Math.round(routeStats.distance),
          totalDuration: Math.round(routeStats.duration),
          routeGeometry: optimizedRoute.map(p => [p[1], p[0]]),
          stopCount: selectedCustomers.length,
        }),
      });
      if (res.ok) {
        showToast(t("map.route_saved"), "success");
        setShowSaveModal(false);
        setSaveName("");
        fetchSavedTrips();
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to save", "error");
      }
    } catch {
      showToast("Failed to save route", "error");
    } finally { setIsSaving(false); }
  };

  const loadTrip = (trip: any) => {
    const ids: string[] = JSON.parse(trip.customerIds || "[]");
    setSelectedIds(new Set(ids));
    if (trip.startLat && trip.startLng) {
      setStartCoords([parseFloat(trip.startLat), parseFloat(trip.startLng)]);
    }
    setShowSavedRoutes(false);
    showToast(`${t("map.load_route")}: ${trip.name}`, "success");
  };

  const deleteTrip = async (id: string) => {
    try {
      const res = await fetch(`/api/trips/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSavedTrips(prev => prev.filter(t => t.id !== id));
        showToast(t("map.route_deleted"), "success");
      }
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  const defaultCenter: [number, number] = startCoords || (filteredCustomers.length > 0
    ? [parseFloat(filteredCustomers[0].latitude), parseFloat(filteredCustomers[0].longitude)]
    : [-6.2088, 106.8456]);

  const inputClass = "w-full rounded-2xl border border-card-border bg-background px-4 py-3 text-[13px] font-medium text-primary focus:border-blue-500 outline-none transition-all shadow-inner placeholder:text-secondary/50";

  return (
    <div className="flex flex-col gap-4 mx-4 sm:mx-6 mt-4">
      {/* Filter + Controls Row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <select
            value={clusterFilter}
            onChange={(e) => setClusterFilter(e.target.value)}
            className="w-full rounded-2xl border border-card-border bg-background px-4 py-3 text-[13px] font-medium text-primary focus:border-blue-500 outline-none transition-all shadow-inner appearance-none cursor-pointer"
          >
            <option value="all">All Customers ({filteredCustomers.length})</option>
            {clusters.map((c: any) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">▼</span>
        </div>
        <button
          onClick={() => setShowCustomerList(!showCustomerList)}
          className="shrink-0 h-11 w-11 rounded-2xl border border-card-border bg-background flex items-center justify-center hover:bg-surface-hover transition-colors active:scale-90"
          title="Customer list"
        >
          <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
        <button
          onClick={() => { setShowSavedRoutes(!showSavedRoutes); if (!showSavedRoutes && savedTrips.length === 0) fetchSavedTrips(); }}
          className={`shrink-0 h-11 w-11 rounded-2xl border flex items-center justify-center transition-colors active:scale-90 ${showSavedRoutes ? 'bg-purple-100 dark:bg-purple-900/40 border-purple-200 dark:border-purple-800' : 'border-card-border bg-background hover:bg-surface-hover'}`}
          title="Saved routes"
        >
          <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
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

      {/* Customer List Panel */}
      {showCustomerList && (
        <div className="rounded-[24px] bg-card border border-card-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
            <span className="text-[13px] font-bold text-primary">{selectedIds.size} selected</span>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-[11px] font-bold text-blue-600 active:scale-90">All</button>
              <button onClick={deselectAll} className="text-[11px] font-bold text-secondary active:scale-90">None</button>
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-card-border">
            {filteredCustomers.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleCustomer(c.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors active:scale-[0.99] ${selectedIds.has(c.id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
              >
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${selectedIds.has(c.id) ? 'bg-blue-600 border-blue-600' : 'border-card-border'}`}>
                  {selectedIds.has(c.id) && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="h-8 w-8 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-[13px] font-black text-blue-700 dark:text-blue-400">
                  {c.name[0]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-primary truncate">{c.name}</p>
                  <p className="text-[11px] font-medium text-secondary truncate">{c.address}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Saved Routes Panel */}
      {showSavedRoutes && (
        <div className="rounded-[24px] bg-card border border-card-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
            <span className="text-[13px] font-bold text-primary">{t("map.saved_routes")}</span>
            <span className="text-[11px] font-medium text-secondary">{savedTrips.length}</span>
          </div>
          {isLoadingTrips ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            </div>
          ) : savedTrips.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] font-medium text-secondary">
              {t("map.no_saved_routes")}
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-card-border">
              {savedTrips.map((trip: any) => (
                <div key={trip.id} className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => loadTrip(trip)}
                    className="flex-1 flex items-center gap-3 text-left hover:bg-surface-hover transition-colors active:scale-[0.99] rounded-xl p-1"
                  >
                    <span className="h-8 w-8 shrink-0 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-[13px] font-black text-purple-700 dark:text-purple-400">
                      📍
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-primary truncate">{trip.name || "Untitled"}</p>
                      <p className="text-[11px] font-medium text-secondary">
                        {trip.stopCount || "-"} stops &middot; {trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "-"}
                        {trip.totalDistance ? ` &middot; ${(Number(trip.totalDistance) / 1000).toFixed(1)} km` : ""}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => deleteTrip(trip.id)}
                    className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-90"
                    title="Delete"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Start Point Input */}
      <div className="rounded-[32px] bg-card p-6 shadow-sm border border-card-border space-y-4">
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-secondary ml-2">{t("map.start_label")}</label>
          <div className="relative">
            <input
              type="text"
              placeholder={startCoords ? `📍 ${startCoords[0].toFixed(4)}, ${startCoords[1].toFixed(4)}` : "Paste Google Maps Link or use My Location..."}
              value={startLink}
              onChange={(e) => { setStartLink(e.target.value); resolveLocation(e.target.value); }}
              className={inputClass}
            />
            {isResolving && <span className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />}
            {startCoords && !startLink && <button onClick={() => setStartCoords(null)} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 font-bold active:scale-90">✕</button>}
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
          disabled={selectedCustomers.length === 0 || isOptimizing}
          className="btn-primary w-full py-4 text-[15px] shadow-blue-600/30 disabled:bg-gray-200 dark:disabled:bg-slate-800 disabled:text-secondary disabled:shadow-none"
        >
          {isOptimizing ? t("map.calculating") : `🚀 ${t("map.calculate")} (${selectedIds.size})`}
        </button>

        {optimizedRoute.length > 0 && (
          <div className="flex gap-2">
            <button onClick={() => setShowSaveModal(true)} className="flex-1 rounded-full bg-purple-600 py-3 text-[13px] font-bold text-white shadow-sm transition hover:bg-purple-700 active:scale-90">
              💾 {t("map.save_route")}
            </button>
            <button onClick={() => { setOptimizedRoute([]); setRouteStats(null); }} className="flex-1 text-center text-[12px] font-bold text-red-600 hover:text-red-700 transition-colors active:scale-90 border border-red-200 dark:border-red-900/50 rounded-full py-3">
              {t("map.clear")}
            </button>
          </div>
        )}
      </div>

      {/* Save Route Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowSaveModal(false)} />
          <div className="relative w-full max-w-sm rounded-[28px] bg-card p-6 shadow-2xl border border-card-border animate-in fade-in zoom-in-95">
            <h3 className="text-[18px] font-extrabold text-primary mb-1">{t("map.save_title")}</h3>
            <p className="text-[13px] text-secondary mb-5">{t("map.save_desc")}</p>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={t("map.save_name_placeholder")}
              className="w-full rounded-2xl border border-card-border bg-background px-4 py-3 text-[15px] font-medium text-primary focus:border-purple-500 outline-none transition-all"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveRoute(); }}
            />
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowSaveModal(false)} className="flex-1 rounded-full bg-surface-hover py-3 text-[14px] font-bold text-secondary transition hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-90 border border-card-border">
                Cancel
              </button>
              <button onClick={handleSaveRoute} disabled={!saveName.trim() || isSaving} className="flex-[2] rounded-full bg-purple-600 py-3 text-[14px] font-bold text-white shadow-sm transition hover:bg-purple-700 active:scale-90 disabled:bg-purple-400">
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* The Map */}
      <div className="overflow-hidden rounded-[32px] shadow-lg border border-card-border bg-card relative z-0">
        <MapContainer center={defaultCenter} zoom={13} className="h-[60vh] w-full z-0" zoomControl={false}>
          <TileLayer attribution="&copy; CARTO" url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <MapController flyTo={flyToCoords} onReady={(m) => { mapRef.current = m; }} />

          {startCoords && (
            <Marker position={startCoords} icon={startIcon}>
              <Popup><strong>Start Point</strong></Popup>
            </Marker>
          )}

          {filteredCustomers.map((c) => {
            const lat = parseFloat(c.latitude);
            const lng = parseFloat(c.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;
            const isSelected = selectedIds.has(c.id);
            return (
              <Marker
                key={c.id}
                position={[lat, lng]}
                icon={isSelected ? selectedIcon : unselectedIcon}
                eventHandlers={{ click: () => toggleCustomer(c.id) }}
              >
                <Popup>
                  <div className="min-w-[160px]">
                    <p className="text-[15px] font-bold">{c.name}</p>
                    <p className="text-[12px] text-gray-500 mt-1">{c.address}</p>
                    <button
                      onClick={() => toggleCustomer(c.id)}
                      className={`mt-2 w-full rounded-full py-2 text-[11px] font-bold text-white transition-colors ${isSelected ? 'bg-red-500' : 'bg-blue-600'}`}
                    >
                      {isSelected ? "Remove from route" : "Add to route"}
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {optimizedRoute.length > 0 && (
            <Polyline positions={optimizedRoute} pathOptions={{ color: "#0A2FFF", weight: 6, opacity: 0.8, lineJoin: "round", lineCap: "round" }} />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
