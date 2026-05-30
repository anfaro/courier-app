"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
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

const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const visitedIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function createNumberedIcon(num: number, isLast: boolean): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${isLast ? "#dc2626" : "#0A2FFF"};color:white;font-size:13px;font-weight:900;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -32],
  });
}

function MapController({ flyTo, onReady }: { flyTo: [number, number] | null; onReady: (m: L.Map) => void }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, []);
  useEffect(() => {
    if (flyTo) map.flyTo(flyTo, 15, { duration: 0.8 });
  }, [flyTo]);
  return null;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatShortDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  if (m < 1) return "<1 min";
  return `${m} min`;
}

function formatDist(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

interface LegInfo {
  fromName: string;
  toName: string;
  distance: number;
  duration: number;
}

export default function RouteMap({ customers, clusters }: { customers: any[]; clusters: any[] }) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const mapRef = useRef<L.Map | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
  const [endCoords, setEndCoords] = useState<[number, number] | null>(null);
  const [startLink, setStartLink] = useState("");
  const [endLink, setEndLink] = useState("");
  const [isResolving, setIsResolving] = useState<"start" | "end" | null>(null);
  const [optimizedRoute, setOptimizedRoute] = useState<[number, number][]>([]);
  const [orderedStops, setOrderedStops] = useState<{ id: string; lat: number; lng: number; name: string }[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [routeStats, setRouteStats] = useState<{ duration: number; distance: number; stopCount: number; completionTime: string; legs: LegInfo[] } | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [clusterFilter, setClusterFilter] = useState<string>("all");
  const [locating, setLocating] = useState<"fly" | "start" | null>(null);
  const [visitsMap, setVisitsMap] = useState<Record<string, string>>({});
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [loadingSaved, setLoadingSaved] = useState(false);

  useEffect(() => {
    fetch("/api/visits")
      .then(r => r.json())
      .then(data => {
        const map: Record<string, string> = {};
        (data.visits || []).forEach((v: any) => {
          map[v.customer_id || v.customerId] = v.visited_at || v.visitedAt;
        });
        setVisitsMap(map);
      })
      .catch(() => {});
  }, []);

  const fetchSavedRoutes = async () => {
    setLoadingSaved(true);
    try {
      const res = await fetch("/api/saved-routes");
      if (res.ok) {
        const data = await res.json();
        setSavedRoutes(data.routes || []);
      }
    } catch {} finally { setLoadingSaved(false); }
  };

  useEffect(() => { fetchSavedRoutes(); }, []);

  const validCustomers = useMemo(() =>
    customers.filter((c: any) => {
      const lat = parseFloat(c.latitude);
      const lng = parseFloat(c.longitude);
      return !isNaN(lat) && isFinite(lat) && lat !== 0 &&
             !isNaN(lng) && isFinite(lng) && lng !== 0;
    }),
    [customers]
  );

  const customerMap = useMemo(() => {
    const map = new Map<string, any>();
    validCustomers.forEach(c => map.set(c.id, c));
    return map;
  }, [validCustomers]);

  const filteredCustomers = useMemo(() => {
    if (clusterFilter === "all") return validCustomers;
    return validCustomers.filter((c: any) => {
      const customerClusters = c.clusters || [];
      return customerClusters.some((cc: any) => cc.cluster?.name === clusterFilter);
    });
  }, [validCustomers, clusterFilter]);

  const selectedCustomers = useMemo(() =>
    filteredCustomers.filter((c: any) => selectedIds.has(c.id)),
    [filteredCustomers, selectedIds]
  );

  const toggleCustomer = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setOptimizedRoute([]);
    setOrderedStops([]);
    setRouteStats(null);
  };

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

  const loadRoute = async (saved: any) => {
    const ids: string[] = JSON.parse(saved.customerIds);
    const selected = new Set(ids);
    setSelectedIds(selected);
    if (saved.startLat && saved.startLng) setStartCoords([parseFloat(saved.startLat), parseFloat(saved.startLng)]);
    else setStartCoords(null);
    if (saved.endLat && saved.endLng) setEndCoords([parseFloat(saved.endLat), parseFloat(saved.endLng)]);
    else setEndCoords(null);
    setOptimizedRoute([]);
    setOrderedStops([]);
    setRouteStats(null);
    showToast(`Loaded route: ${saved.name}`, "success");
    calculateBestRouteWithIds(ids, saved.startLat, saved.startLng, saved.endLat, saved.endLng);
  };

  const calculateBestRouteWithIds = async (ids: string[], sLat?: string, sLng?: string, eLat?: string, eLng?: string) => {
    const stops = ids
      .map(id => customerMap.get(id))
      .filter(Boolean)
      .map((c: any) => ({ lat: parseFloat(c.latitude), lng: parseFloat(c.longitude), id: c.id, name: c.name }));

    if (stops.length === 0) { showToast("No valid customers found for this route", "error"); return; }

    setIsOptimizing(true);
    setRouteStats(null);

    const effectiveStart: [number, number] = sLat && sLng ? [parseFloat(sLat), parseFloat(sLng)] : [stops[0].lat, stops[0].lng];
    const effectiveEnd: [number, number] = eLat && eLng ? [parseFloat(eLat), parseFloat(eLng)] : [stops[stops.length - 1].lat, stops[stops.length - 1].lng];

    const remaining = [...stops];
    const sequence: [number, number][] = [effectiveStart];
    const ordered: typeof stops = [];

    if (effectiveStart[0] !== stops[0].lat || effectiveStart[1] !== stops[0].lng) {
      let nearestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const dist = Math.sqrt(Math.pow(effectiveStart[0] - remaining[i].lat, 2) + Math.pow(effectiveStart[1] - remaining[i].lng, 2));
        if (dist < minDist) { minDist = dist; nearestIdx = i; }
      }
      const first = remaining.splice(nearestIdx, 1)[0];
      ordered.push(first);
      sequence.push([first.lat, first.lng]);
    } else {
      const first = remaining.shift()!;
      ordered.push(first);
      sequence.push([first.lat, first.lng]);
    }

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;
      const current = sequence[sequence.length - 1];
      for (let i = 0; i < remaining.length; i++) {
        const dist = Math.sqrt(Math.pow(current[0] - remaining[i].lat, 2) + Math.pow(current[1] - remaining[i].lng, 2));
        if (dist < minDistance) { minDistance = dist; nearestIdx = i; }
      }
      const next = remaining.splice(nearestIdx, 1)[0];
      ordered.push(next);
      current[0] = next.lat; current[1] = next.lng;
      sequence.push([next.lat, next.lng]);
    }

    if (effectiveEnd[0] !== effectiveStart[0] || effectiveEnd[1] !== effectiveStart[1]) sequence.push(effectiveEnd);

    const legs: LegInfo[] = [];
    for (let i = 0; i < ordered.length; i++) {
      const from = i === 0 ? effectiveStart : [ordered[i - 1].lat, ordered[i - 1].lng] as [number, number];
      const to = [ordered[i].lat, ordered[i].lng] as [number, number];
      const d = Math.sqrt(Math.pow(to[0] - from[0], 2) * 111320) + Math.sqrt(Math.pow(to[1] - from[1], 2) * 111320 * Math.cos(from[0] * Math.PI / 180));
      const roughDist = d * 1000;
      const roughDur = roughDist / 8.33;
      const fromName = i === 0 ? "Start" : ordered[i - 1].name;
      legs.push({ fromName, toName: ordered[i].name, distance: roughDist, duration: roughDur });
    }

    if (effectiveEnd[0] !== ordered[ordered.length - 1].lat || effectiveEnd[1] !== ordered[ordered.length - 1].lng) {
      const from = [ordered[ordered.length - 1].lat, ordered[ordered.length - 1].lng] as [number, number];
      const to = effectiveEnd;
      const d = Math.sqrt(Math.pow(to[0] - from[0], 2) * 111320) + Math.sqrt(Math.pow(to[1] - from[1], 2) * 111320 * Math.cos(from[0] * Math.PI / 180));
      legs.push({ fromName: ordered[ordered.length - 1].name, toName: "End", distance: d * 1000, duration: d * 1000 / 8.33 });
    }

    setOrderedStops(ordered);

    try {
      const allPoints = [effectiveStart, ...ordered.map(s => [s.lat, s.lng] as [number, number]), ...(effectiveEnd[0] !== ordered[ordered.length - 1]?.lat || effectiveEnd[1] !== ordered[ordered.length - 1]?.lng ? [effectiveEnd] : [])];
      const coordsString = allPoints.map(s => `${s[1]},${s[0]}`).join(";");
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`);
      if (!res.ok) throw new Error("Routing service failed");
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const roadRoute: [number, number][] = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        setOptimizedRoute(roadRoute);
        const totalHandlingTime = ordered.length * 300;
        const totalTimeSeconds = route.duration + totalHandlingTime;
        const completionDate = new Date(Date.now() + totalTimeSeconds * 1000);

        const osrmLegs: LegInfo[] = [];
        if (route.legs) {
          let legIdx = 0;
          for (let i = 0; i < ordered.length; i++) {
            const fromName = i === 0 ? "Start" : ordered[i - 1].name;
            const leg = route.legs[legIdx];
            if (leg) {
              osrmLegs.push({ fromName, toName: ordered[i].name, distance: leg.distance, duration: leg.duration });
              legIdx++;
            }
          }
          if (legIdx < (route.legs?.length || 0)) {
            const lastLeg = route.legs[legIdx];
            if (lastLeg) osrmLegs.push({ fromName: ordered[ordered.length - 1].name, toName: "End", distance: lastLeg.distance, duration: lastLeg.duration });
          }
        }

        setRouteStats({
          duration: totalTimeSeconds,
          distance: route.distance,
          stopCount: ordered.length,
          completionTime: completionDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }),
          legs: osrmLegs.length > 0 ? osrmLegs : legs,
        });
      } else { setOptimizedRoute(sequence); setRouteStats({ duration: legs.reduce((s, l) => s + l.duration, 0), distance: legs.reduce((s, l) => s + l.distance, 0), stopCount: ordered.length, completionTime: "-", legs }); }
    } catch {
      setOptimizedRoute(sequence);
      setRouteStats({ duration: legs.reduce((s, l) => s + l.duration, 0), distance: legs.reduce((s, l) => s + l.distance, 0), stopCount: ordered.length, completionTime: "-", legs });
    } finally { setIsOptimizing(false); }
  };

  const calculateBestRoute = async () => {
    if (selectedCustomers.length === 0) {
      showToast(t("map.no_selection"), "warning");
      return;
    }
    calculateBestRouteWithIds(selectedCustomers.map(c => c.id));
  };

  const goToMyLocation = (setAs: "fly" | "start" | null = null) => {
    if (!navigator.geolocation) { showToast("Geolocation not supported", "error"); return; }
    setLocating(setAs || "fly");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setFlyToCoords(coords);
        if (setAs === "start") {
          setStartCoords(coords);
          showToast("Start location set to your position", "success");
        }
        setLocating(null);
      },
      () => { showToast("Could not get location", "error"); setLocating(null); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const panToCustomer = (customer: any) => {
    const lat = parseFloat(customer.latitude);
    const lng = parseFloat(customer.longitude);
    if (!isNaN(lat) && !isNaN(lng)) setFlyToCoords([lat, lng]);
  };

  const saveCurrentRoute = async () => {
    if (!routeName.trim()) { showToast("Route name is required", "error"); return; }
    if (orderedStops.length === 0) { showToast("Calculate a route first", "error"); return; }
    try {
      const res = await fetch("/api/saved-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: routeName.trim(),
          customerIds: orderedStops.map(s => s.id),
          startLat: startCoords?.[0]?.toString() ?? null,
          startLng: startCoords?.[1]?.toString() ?? null,
          endLat: endCoords?.[0]?.toString() ?? null,
          endLng: endCoords?.[1]?.toString() ?? null,
        }),
      });
      if (res.ok) {
        showToast("Route saved!", "success");
        setSaveDialogOpen(false);
        setRouteName("");
        fetchSavedRoutes();
      } else {
        showToast("Failed to save route", "error");
      }
    } catch { showToast("Network error", "error"); }
  };

  const deleteSavedRoute = async (id: string) => {
    try {
      const res = await fetch(`/api/saved-routes/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Route deleted", "success");
        fetchSavedRoutes();
      }
    } catch { showToast("Failed to delete route", "error"); }
  };

  const defaultCenter: [number, number] =
    validCustomers.length > 0
      ? [parseFloat(validCustomers[0].latitude), parseFloat(validCustomers[0].longitude)]
      : [-6.2088, 106.8456];

  const inputClass = "w-full rounded-2xl border border-card-border bg-background px-4 py-3 text-[13px] font-medium text-primary focus:border-blue-500 outline-none transition-all shadow-inner placeholder:text-secondary/50";

  const navigatableRoute = optimizedRoute.length > 0 ? `https://www.google.com/maps/dir/${optimizedRoute[0][0]},${optimizedRoute[0][1]}/${optimizedRoute[optimizedRoute.length - 1][0]},${optimizedRoute[optimizedRoute.length - 1][1]}` : null;

  return (
    <div className="flex flex-col gap-4 mx-4 sm:mx-6 mt-4">

      {/* --- CLUSTER FILTER + CONTROLS --- */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <select
            value={clusterFilter}
            onChange={(e) => setClusterFilter(e.target.value)}
            className="w-full rounded-2xl border border-card-border bg-background px-4 py-3 text-[13px] font-medium text-primary focus:border-blue-500 outline-none transition-all shadow-inner appearance-none cursor-pointer"
          >
            <option value="all">All Customers ({validCustomers.length})</option>
            {clusters.map((c: any) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">▼</span>
        </div>
        <button
          onClick={() => goToMyLocation("fly")}
          disabled={locating !== null}
          className="shrink-0 h-11 w-11 rounded-2xl border border-card-border bg-background flex items-center justify-center hover:bg-surface-hover transition-colors active:scale-90 disabled:opacity-50"
          title="My location"
        >
          {locating === "fly" ? (
            <span className="h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          ) : (
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>

      {/* --- SAVED ROUTES --- */}
      {savedRoutes.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
          {savedRoutes.map((sr) => (
            <button
              key={sr.id}
              onClick={() => loadRoute(sr)}
              className="shrink-0 rounded-full bg-card border border-card-border px-4 py-2 text-[12px] font-bold text-primary hover:bg-surface-hover transition-colors active:scale-90 flex items-center gap-2"
            >
              <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              {sr.name}
            </button>
          ))}
        </div>
      )}

      {/* --- CUSTOMER SELECTION LIST --- */}
      <div className="rounded-[24px] bg-card border border-card-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
          <p className="text-[13px] font-black text-primary">{t("map.select_customers")}</p>
          <p className="text-[12px] font-bold text-secondary">{selectedIds.size} selected</p>
        </div>
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-secondary font-medium text-[14px]">
            No customers with GPS coordinates found.
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto custom-scrollbar divide-y divide-card-border">
            {filteredCustomers.map((c: any) => (
              <button
                key={c.id}
                onClick={() => toggleCustomer(c.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:scale-[0.99] ${
                  selectedIds.has(c.id) ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-surface-hover"
                }`}
              >
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all ${
                  selectedIds.has(c.id) ? "bg-blue-600 text-white" : "border-2 border-card-border"
                }`}>
                  {selectedIds.has(c.id) && (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-primary truncate">{c.name}</p>
                  <p className="text-[11px] font-medium text-secondary truncate">{c.address}</p>
                  {visitsMap[c.id] && (
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                      ✅ {new Date(visitsMap[c.id]).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </p>
                  )}
                </div>
                <svg
                  onClick={(e) => { e.stopPropagation(); panToCustomer(c); }}
                  className="h-4 w-4 shrink-0 text-secondary hover:text-blue-500 transition-colors"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* --- ROUTING CONTROLS --- */}
      <div className="rounded-[32px] bg-card p-6 shadow-sm border border-card-border space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-secondary ml-2">{t("map.start_label")}</label>
            <div className="relative flex gap-2">
              <input
                type="text"
                placeholder={startCoords ? `📍 ${startCoords[0].toFixed(4)}, ${startCoords[1].toFixed(4)}` : "Paste Google Maps Link..."}
                value={startLink}
                onChange={(e) => { setStartLink(e.target.value); resolveLocation(e.target.value, "start"); }}
                className={inputClass}
              />
              <button
                onClick={() => goToMyLocation("start")}
                disabled={locating === "start"}
                className="shrink-0 h-[46px] w-[46px] rounded-2xl border border-card-border bg-background flex items-center justify-center hover:bg-surface-hover transition-colors active:scale-90 disabled:opacity-50"
                title="Use my location as start"
              >
                {locating === "start" ? (
                  <span className="h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                ) : (
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
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
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-tighter text-blue-500">{t("map.distance")}</p>
                <p className="text-[16px] font-black text-blue-700 dark:text-blue-300">{formatDist(routeStats.distance)}</p>
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

            {/* LEGS TABLE */}
            <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
              <div className="max-h-36 overflow-y-auto custom-scrollbar divide-y divide-card-border">
                {routeStats.legs.map((leg, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-[12px]">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-[10px] font-black text-blue-700 dark:text-blue-400">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-primary truncate">{leg.fromName} → {leg.toName}</p>
                    </div>
                    <p className="font-bold text-primary shrink-0">{formatDist(leg.distance)}</p>
                    <p className="font-medium text-secondary shrink-0 w-14 text-right">{formatShortDuration(leg.duration)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* NAVIGATION + SAVE BUTTONS */}
            <div className="flex gap-2">
              <a
                href={navigatableRoute || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 rounded-full bg-emerald-600 py-3 text-[13px] font-bold text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-90 flex items-center justify-center gap-2 ${!navigatableRoute ? "pointer-events-none opacity-50" : ""}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Navigate
              </a>
              <button
                onClick={() => setSaveDialogOpen(true)}
                className="flex-1 rounded-full bg-blue-600 py-3 text-[13px] font-bold text-white shadow-sm hover:bg-blue-700 transition-all active:scale-90 flex items-center justify-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Route
              </button>
            </div>
          </div>
        )}

        <button
          onClick={calculateBestRoute}
          disabled={selectedCustomers.length === 0 || isOptimizing}
          className="btn-primary w-full py-4 text-[15px] shadow-blue-600/30 disabled:bg-gray-200 dark:disabled:bg-slate-800 disabled:text-secondary disabled:shadow-none"
        >
          {isOptimizing ? t("map.calculating") : `🚀 ${t("map.calculate")}`}
        </button>

        {optimizedRoute.length > 0 && (
          <button onClick={() => { setOptimizedRoute([]); setOrderedStops([]); setRouteStats(null); }} className="w-full text-center text-[12px] font-bold text-red-600 hover:text-red-700 transition-colors active:scale-90">
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

          {/* Customer Markers */}
          {filteredCustomers.map((c: any) => {
            const lat = parseFloat(c.latitude);
            const lng = parseFloat(c.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;
            const isSelected = selectedIds.has(c.id);
            const lastVisit = visitsMap[c.id];
            let icon = defaultIcon;
            if (isSelected) icon = selectedIcon;
            else if (lastVisit) icon = visitedIcon;
            return (
              <Marker
                key={c.id}
                position={[lat, lng]}
                icon={icon}
                eventHandlers={{ click: () => toggleCustomer(c.id) }}
              >
                <Popup>
                  <div style={{padding:"4px",minWidth:"160px"}}>
                    <p style={{fontSize:"15px",fontWeight:"700",margin:"0 0 4px 0"}}>{c.name}</p>
                    <p style={{fontSize:"12px",color:"#6b7280",margin:"0 0 6px 0"}}>{c.address}</p>
                    {lastVisit && (
                      <p style={{fontSize:"11px",fontWeight:"600",color:"#059669",margin:"0 0 6px 0"}}>
                        ✅ {new Date(lastVisit).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                    <p style={{fontSize:"11px",fontWeight:"600",color: isSelected ? "#2563eb" : "#9ca3af",margin:0}}>
                      {isSelected ? "✓ Selected" : "Tap to select"}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Route Order Markers */}
          {orderedStops.length > 0 && orderedStops.map((stop, i) => (
            <Marker
              key={`order-${stop.id}`}
              position={[stop.lat, stop.lng]}
              icon={createNumberedIcon(i + 1, i === orderedStops.length - 1)}
            >
              <Popup>
                <div style={{padding:"4px",minWidth:"140px"}}>
                  <p style={{fontSize:"14px",fontWeight:"700",margin:"0 0 4px 0"}}>Stop #{i + 1}</p>
                  <p style={{fontSize:"13px",fontWeight:"600",margin:0}}>{stop.name}</p>
                  {routeStats?.legs[i] && (
                    <p style={{fontSize:"11px",color:"#6b7280",margin:"4px 0 0 0"}}>
                      {formatDist(routeStats.legs[i].distance)} · {formatShortDuration(routeStats.legs[i].duration)}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {optimizedRoute.length > 0 && (
            <Polyline positions={optimizedRoute} pathOptions={{ color: "#0A2FFF", weight: 6, opacity: 0.8, lineJoin: "round", lineCap: "round" }} />
          )}
        </MapContainer>
      </div>

      {/* Save Route Dialog */}
      {saveDialogOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[32px] bg-card p-6 shadow-2xl border border-card-border">
            <h3 className="text-xl font-black text-primary mb-1">Save Route</h3>
            <p className="text-[13px] text-secondary mb-5">Give your route a name for easy access later.</p>
            <input
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="e.g. Tuesday deliveries"
              className="w-full rounded-2xl border border-card-border bg-background px-4 py-3 text-[14px] font-medium text-primary focus:border-blue-500 outline-none transition-all shadow-inner placeholder:text-secondary/50"
              autoFocus
            />
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setSaveDialogOpen(false); setRouteName(""); }} className="flex-1 btn-outline">
                Cancel
              </button>
              <button onClick={saveCurrentRoute} className="flex-[2] btn-primary">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
