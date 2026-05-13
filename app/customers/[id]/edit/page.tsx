// app/customers/[id]/edit/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [mapsLink, setMapsLink] = useState("");

  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [availableClusters, setAvailableClusters] = useState<any[]>([]);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
        setLatitude(data.latitude || "");
        setLongitude(data.longitude || "");
        setExistingImageUrl(data.housePictureUrl || null);

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

  useEffect(() => {
    const resolveUrl = async () => {
      const trimmed = mapsLink.trim();
      if (trimmed.includes("google.com/maps") || trimmed.includes("goo.gl/maps") || trimmed.includes("googleusercontent.com") || trimmed.includes("maps.app.goo.gl")) {
        setIsResolving(true);
        setError("");
        try {
          const res = await fetch("/api/resolve-maps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: trimmed }),
          });
          const data = await res.json();

          if (data.lat && data.lng) {
            setLatitude(data.lat.toString());
            setLongitude(data.lng.toString());
            setMapsLink("");
          } else {
            setError(data.error || "Coordinates not found in this link.");
          }
        } catch (err) {
          setError("Failed to reach location resolver.");
        } finally {
          setIsResolving(false);
        }
      }
    };

    if (mapsLink) resolveUrl();
  }, [mapsLink]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      let finalImageUrl = existingImageUrl;
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("type", "house");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) throw new Error("Image upload failed.");
        const uploadData = await uploadRes.json();
        finalImageUrl = uploadData.url;
      }

      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phoneNumber: phoneNumber ? `+62${phoneNumber}` : "",
          address,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          housePictureUrl: finalImageUrl,
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
        
        <Breadcrumbs />

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
          <div className="mt-4 rounded-[2.5rem] bg-card p-6 sm:p-10 shadow-sm border border-card-border">
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
                      <button key={cluster.id} type="button" onClick={() => toggleCluster(cluster.id)} className={`rounded-full px-4 py-2 text-[14px] font-semibold transition-all active:scale-95 ${selectedClusters.includes(cluster.id) ? "bg-purple-600 text-white shadow-md" : "bg-surface-hover text-secondary hover:bg-gray-200 dark:hover:bg-slate-700 border border-card-border"}`}>
                        📦 {cluster.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-[15px] font-semibold text-secondary">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} placeholder="e.g. Near the mosque..." />
              </div>

              <div className="rounded-[2rem] bg-blue-50/50 dark:bg-blue-900/10 p-6 border border-blue-100/50 dark:border-blue-900/30 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-[15px] font-semibold text-blue-900 dark:text-blue-400">Location Data</label>
                  <button type="button" onClick={getLocation} className="rounded-full bg-card dark:bg-slate-900 px-4 py-2 text-[13px] font-semibold text-blue-700 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/50 active:scale-95 transition-all">
                    📍 Update GPS
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={mapsLink}
                    placeholder="Paste Google Maps link here..."
                    className={inputClass}
                    onChange={(e) => setMapsLink(e.target.value)}
                  />
                  {isResolving && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-900 px-3 py-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-300 shadow-sm animate-pulse">
                      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Resolving
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[12px] font-medium text-blue-700 dark:text-blue-400 ml-2">Latitude</span>
                    <input type="text" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="w-full rounded-xl border border-blue-100 dark:border-blue-900/50 bg-card/60 dark:bg-slate-900/60 px-4 py-3 text-[14px] font-medium text-blue-900 dark:text-blue-300 focus:bg-card dark:focus:bg-slate-900 focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[12px] font-medium text-blue-700 dark:text-blue-400 ml-2">Longitude</span>
                    <input type="text" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="w-full rounded-xl border border-blue-100 dark:border-blue-900/50 bg-card/60 dark:bg-slate-900/60 px-4 py-3 text-[14px] font-medium text-blue-900 dark:text-blue-300 focus:bg-card dark:focus:bg-slate-900 focus:outline-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[15px] font-semibold text-secondary">House Picture</label>
                {existingImageUrl && !imageFile && <img src={existingImageUrl} alt="Current" className="h-24 w-24 rounded-2xl object-cover mb-3 border border-card-border" />}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => { if (e.target.files) setImageFile(e.target.files[0]); }}
                  className="w-full rounded-2xl border border-dashed border-card-border bg-gray-50 dark:bg-slate-800 p-4 text-[14px] text-secondary file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 dark:file:bg-blue-900/30 file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                <button type="submit" disabled={isLoading} className="flex-1 rounded-full bg-blue-600 py-4 text-[15px] font-bold text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:bg-blue-400">
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" onClick={() => router.back()} className="flex-1 rounded-full bg-surface-hover py-4 text-[15px] font-bold text-secondary active:scale-95 transition-all hover:bg-gray-200 dark:hover:bg-slate-700 border border-card-border">Cancel</button>
                <button type="button" onClick={() => setShowDeleteModal(true)} disabled={isDeleting} className="w-full rounded-full bg-red-50 dark:bg-red-950/30 py-4 text-[15px] font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-95 border border-red-100 dark:border-red-900/30">
                  {isDeleting ? "Deleting..." : "Delete Customer"}
                </button>
              </div>
            </form>
          </div>
        </main>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => !isDeleting && setShowDeleteModal(false)}
          ></div>

          <div className="relative w-full max-w-sm rounded-[28px] bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-4 border border-card-border">

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-1">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <div>
              <h2 className="text-[22px] font-bold text-primary">Delete {name || "Customer"}?</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-secondary">
                This action cannot be undone. All data and delivery history associated with this customer will be permanently removed.
              </p>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="rounded-full px-5 py-2.5 text-[14px] font-bold text-secondary transition-colors hover:bg-surface-hover active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={isDeleting}
                className="rounded-full bg-red-600 px-5 py-2.5 text-[14px] font-bold text-white shadow-sm transition-all hover:bg-red-700 active:scale-95 disabled:bg-red-400"
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
