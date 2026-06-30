// app/customers/[id]/edit/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import ImageGalleryInput from "@/components/ImageGalleryInput";
import LocationPicker from "@/components/LocationPicker";
import { useScrollLock } from "@/lib/useScrollLock";
import { useLanguage } from "@/components/LanguageProvider";
import Icon from "@/components/Icon";

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useLanguage();
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [landmark, setLandmark] = useState("");
  const [accessInfo, setAccessInfo] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [housePictures, setHousePictures] = useState<string[]>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const [availableClusters, setAvailableClusters] = useState<any[]>([]);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  useScrollLock(showDeleteModal);

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customerRes, clustersRes] = await Promise.all([
          fetch(`/api/customers/${customerId}`),
          fetch("/api/clusters")
        ]);

        if (!customerRes.ok) throw new Error("Failed to load customer data");
        const data = await customerRes.json();

        setName(data.name || "");
        setAddress(data.address || "");
        setNotes(data.notes || "");
        setLandmark(data.landmark || "");
        setAccessInfo(data.accessInfo || "");
        setLatitude(data.latitude || "");
        setLongitude(data.longitude || "");

        if (data.housePictures) {
          try {
            const parsed = JSON.parse(data.housePictures);
            setHousePictures(Array.isArray(parsed) ? parsed : []);
          } catch {
            setHousePictures(data.housePictureUrl ? [data.housePictureUrl] : []);
          }
        } else if (data.housePictureUrl) {
          setHousePictures([data.housePictureUrl]);
        }

        if (data.clusters && Array.isArray(data.clusters)) {
          const currentClusterIds = data.clusters.map((c: any) => c.cluster?.id || c.clusterId);
          setSelectedClusters(currentClusterIds.filter(Boolean));
        }

        if (clustersRes.ok) {
          const clustersData = await clustersRes.json();
          setAvailableClusters(clustersData.clusters || []);
        }

        if (data.phoneNumber && data.phoneNumber.startsWith("+62")) {
          setPhoneNumber(data.phoneNumber.substring(3));
        } else if (data.phoneNumber) {
          setPhoneNumber(data.phoneNumber);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, [customerId]);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
        },
        (err) => setError("Ensure location permissions are enabled.")
      );
    } else {
      setError("Geolocation not supported.");
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value.replace(/\D/g, ""));
  };

  const toggleCluster = (id: string) => {
    setSelectedClusters(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleLocationConfirm = (lat: string, lng: string) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phoneNumber: phoneNumber ? `+62${phoneNumber}` : "",
          address,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          housePictures,
          landmark,
          accessInfo,
          notes,
          clusterIds: selectedClusters
        }),
      });

      if (res.ok) {
        router.push(`/customers/${customerId}`);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to update customer.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/customers");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || "Delete failed.");
        setIsDeleting(false);
        setShowDeleteModal(false);
      }
    } catch (err) {
      setError("Error during deletion.");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const inputClass = "w-full rounded-2xl border border-card-border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-5 py-3.5 text-[15px] font-medium text-primary dark:text-slate-100 transition-all focus:border-blue-500 focus:bg-card dark:focus:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-secondary";

  return (
    <>
      <div className="min-h-screen bg-background pb-20">
        
        <PageHeader title={name ? `Edit ${name}` : "Edit Customer"} />

        {isFetching ? (
          <main className="mx-auto max-w-2xl p-4 sm:p-6">
            <div className="mt-4 flex min-h-[50vh] flex-col items-center justify-center rounded-[2.5rem] bg-card p-6 shadow-sm border border-card-border">
              <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-[1.5rem] bg-surface-hover text-3xl mb-4 border border-card-border">
                ⏳
              </div>
              <p className="text-[16px] font-bold text-secondary animate-pulse">Loading customer...</p>
            </div>
          </main>
        ) : (

        <main className="mx-auto max-w-2xl p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="mt-4 rounded-[2.5rem] bg-card p-6 sm:p-10 shadow-sm border border-card-border"
          >
            <h1 className="text-3xl font-bold text-primary mb-8">Edit Customer</h1>

            {error && <p className="mb-6 rounded-2xl bg-red-50 dark:bg-red-950/30 p-4 text-[15px] font-medium text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-[15px] font-semibold text-secondary">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
              </div>

              <div>
                <label className="mb-2 block text-[15px] font-semibold text-secondary">Phone Number</label>
                <div className="flex items-center rounded-2xl border border-card-border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus-within:border-blue-500 focus-within:bg-card dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all overflow-hidden">
                  <span className="pl-5 pr-2 font-medium text-secondary/60">+62</span>
                  <input type="tel" value={phoneNumber} onChange={handlePhoneChange} className="w-full bg-transparent py-3.5 pr-5 text-[15px] font-medium text-primary dark:text-slate-100 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[15px] font-semibold text-secondary">Address</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} required rows={3} className={inputClass} />
              </div>

              {availableClusters.length > 0 && (
                <div>
                  <label className="mb-3 block text-[15px] font-semibold text-secondary">Clusters</label>
                  <div className="flex flex-wrap gap-2">
                    {availableClusters.map((cluster) => (
                      <button key={cluster.id} type="button" onClick={() => toggleCluster(cluster.id)} className={`rounded-full px-4 py-2 text-[14px] font-semibold transition-all active:scale-90 ${selectedClusters.includes(cluster.id) ? "bg-purple-600 text-white shadow-md" : "bg-surface-hover text-secondary hover:bg-gray-200 dark:hover:bg-slate-700 border border-card-border"}`}>
                        📦 {cluster.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Landmark */}
              <div>
                <label className="mb-2 block text-[13px] font-black text-secondary uppercase tracking-widest ml-1">{t("customer.landmark")}</label>
                <input type="text" value={landmark} onChange={(e) => setLandmark(e.target.value)} className={inputClass} placeholder={t("customer.landmark_placeholder")} />
              </div>

              {/* Access Info */}
              <div>
                <label className="mb-2 block text-[13px] font-black text-secondary uppercase tracking-widest ml-1">{t("customer.access_info")}</label>
                <textarea value={accessInfo} onChange={(e) => setAccessInfo(e.target.value)} rows={2} className={inputClass} placeholder={t("customer.access_info_placeholder")} />
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-black text-secondary uppercase tracking-widest ml-1">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} placeholder="e.g. Near the mosque..." />
              </div>

              {/* Location Picker */}
              <div className="rounded-[2rem] bg-surface-hover p-6 border border-card-border">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-[15px] font-black text-primary">{t("customer.pin")}</label>
                  <button type="button" onClick={getLocation} className="btn-secondary px-4 py-2 text-[12px] shadow-sm">📍 GPS</button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  className="w-full rounded-2xl border-2 border-dashed border-card-border bg-card/60 p-5 text-center transition hover:bg-card hover:border-blue-300 active:scale-90"
                >
                  {latitude && longitude ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">📍</span>
                      <span className="text-[12px] font-mono font-bold text-blue-600 dark:text-blue-400">
                        {latitude}, {longitude}
                      </span>
                      <span className="text-[10px] font-medium text-secondary">{t("customer.pin_map_desc")}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-3xl mb-1">🗺️</span>
                      <span className="text-[14px] font-bold text-primary">{t("customer.pin_on_map")}</span>
                      <span className="text-[11px] font-medium text-secondary">{t("customer.pin_map_desc")}</span>
                    </div>
                  )}
                </button>
              </div>

              <ImageGalleryInput
                label={t("customer.house_photos")}
                images={housePictures}
                onImagesChange={setHousePictures}
              />

              <div className="flex flex-wrap gap-4 pt-4">
                <button type="submit" disabled={isLoading} className="flex-1 rounded-full bg-blue-600 py-4 text-[15px] font-bold text-white shadow-lg shadow-blue-500/20 active:scale-90 transition-all disabled:bg-blue-400 flex items-center justify-center gap-2">
                  {isLoading ? <><div className="h-5 w-5 animate-spin rounded-full border-[2.5px] border-white border-t-transparent" /> Saving...</> : "Save Changes"}
                </button>
                <button type="button" onClick={() => router.back()} className="flex-1 rounded-full bg-surface-hover py-4 text-[15px] font-bold text-secondary active:scale-90 transition-all hover:bg-gray-200 dark:hover:bg-slate-700 border border-card-border">Cancel</button>
                <button type="button" onClick={() => setShowDeleteModal(true)} disabled={isDeleting} className="w-full rounded-full bg-red-50 dark:bg-red-950/30 py-4 text-[15px] font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-90 border border-red-100 dark:border-red-900/30">
                  {isDeleting ? "Deleting..." : "Delete Customer"}
                </button>
              </div>
            </form>
          </motion.div>
        </main>
        )}
      </div>

      {showLocationPicker && (
        <LocationPicker
          initialLat={latitude}
          initialLng={longitude}
          onConfirm={handleLocationConfirm}
          onClose={() => setShowLocationPicker(false)}
        />
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => !isDeleting && setShowDeleteModal(false)}
          ></div>

          <div className="relative w-full max-w-sm rounded-[28px] bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-4 border border-card-border">

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-1">
              <Icon name="trash" size={24} />
            </div>

            <div>
              <h2 className="text-[22px] font-bold text-primary">Delete {name || "Customer"}?</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-secondary">
                This action cannot be undone. All data associated with this customer will be permanently removed.
              </p>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="rounded-full px-5 py-2.5 text-[14px] font-bold text-secondary transition-colors hover:bg-surface-hover active:scale-90 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={isDeleting}
                className="rounded-full bg-red-600 px-5 py-2.5 text-[14px] font-bold text-white shadow-sm transition-all hover:bg-red-700 active:scale-90 disabled:bg-red-400"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
