// app/customers/[id]/edit/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
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

  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // NEW: State for multi-select clusters
  const [availableClusters, setAvailableClusters] = useState<any[]>([]);
  const [selectedClusters, setSelectedClusters] = useState<number[]>([]);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter();

  // Load the existing customer data AND available clusters
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch customer and clusters in parallel for speed
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

        // Pre-select existing clusters!
        if (data.clusters && Array.isArray(data.clusters)) {
          // Depending on API response, it might be nested under 'cluster' or 'clusterId'
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
        (err) => setError("Could not get location. Ensure permissions are enabled.")
      );
    } else {
      setError("Geolocation is not supported by this browser.");
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyNumbers = e.target.value.replace(/\D/g, "");
    setPhoneNumber(onlyNumbers);
  };

  // Toggle cluster selection
  const toggleCluster = (id: number) => {
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
        if (!uploadRes.ok) throw new Error("Failed to upload new image.");

        const uploadData = await uploadRes.json();
        finalImageUrl = uploadData.url;
      }

      const formattedPhoneNumber = phoneNumber ? `+62${phoneNumber}` : "";

      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phoneNumber: formattedPhoneNumber,
          address,
          latitude,
          longitude,
          housePictureUrl: finalImageUrl,
          notes,
          clusterIds: selectedClusters // NEW: Send the updated array of cluster IDs
        }),
      });

      if (res.ok) {
        router.push(`/customers/${customerId}`);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to update customer");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Delete handler function
  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this customer? This action cannot be undone."
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/customers");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to delete customer");
        setIsDeleting(false);
      }
    } catch (err) {
      setError("An unexpected error occurred during deletion.");
      setIsDeleting(false);
    }
  };

  const inputClass = "w-full rounded-2xl border border-transparent bg-gray-100 px-5 py-3.5 text-[15px] text-gray-900 transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10";

  if (isFetching) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] pb-20">
        <Header />
        <main className="mx-auto max-w-2xl p-4 sm:p-6">
          <div className="mt-4 flex min-h-[50vh] flex-col items-center justify-center rounded-[2.5rem] bg-white p-6 shadow-sm border border-gray-50">
            <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-[1.5rem] bg-blue-50 text-3xl mb-4 border border-blue-100">⏳</div>
            <p className="text-[16px] font-bold text-gray-500 animate-pulse">Loading customer data...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      <Header />
      <Breadcrumbs />

      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <div className="mt-4 rounded-[2.5rem] bg-white p-6 sm:p-10 shadow-sm border border-gray-50">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Edit Customer</h1>
            <p className="mt-2 text-base text-gray-500">Update customer details or change their location.</p>
          </div>

          {error && <p className="mb-6 rounded-2xl bg-red-50 p-4 text-[15px] font-medium text-red-700">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-[15px] font-semibold text-gray-700">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
            </div>

            <div>
              <label className="mb-2 block text-[15px] font-semibold text-gray-700">Phone Number</label>
              <div className="flex items-center overflow-hidden rounded-2xl border border-transparent bg-gray-100 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-600/10">
                <span className="flex select-none items-center pl-5 pr-2 font-bold text-gray-500">+62</span>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  className="w-full bg-transparent py-3.5 pr-5 text-[15px] text-gray-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[15px] font-semibold text-gray-700">Address</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} required rows={3} className={inputClass} />
            </div>

            {/* NEW: Multi-Select Cluster Chips */}
            {availableClusters.length > 0 && (
              <div>
                <label className="mb-3 block text-[15px] font-semibold text-gray-700">Assign to Clusters</label>
                <div className="flex flex-wrap gap-2">
                  {availableClusters.map((cluster) => {
                    const isSelected = selectedClusters.includes(cluster.id);
                    return (
                      <button
                        key={cluster.id}
                        type="button"
                        onClick={() => toggleCluster(cluster.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all active:scale-95 ${isSelected
                          ? "bg-purple-600 text-white shadow-sm border border-purple-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent"
                          }`}
                      >
                        <span>📦</span> {cluster.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-[15px] font-semibold text-gray-700">Additional Notes <span className="text-gray-400 font-normal">(Optional)</span></label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} placeholder="e.g., Leave package at the side door..." />
            </div>

            <div className="rounded-[2rem] bg-blue-50/50 p-6 border border-blue-100">
              <div className="mb-4 flex items-center justify-between">
                <label className="block text-[15px] font-bold text-blue-900">GPS Coordinates</label>
                <button type="button" onClick={getLocation} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-50 transition">
                  📍 Update Location
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500" placeholder="Latitude" />
                <input type="text" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500" placeholder="Longitude" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[15px] font-semibold text-gray-700">
                Update House Picture <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              {existingImageUrl && !imageFile && (
                <div className="mb-3">
                  <img src={existingImageUrl} alt="Current house" className="h-24 w-24 rounded-xl object-cover border border-gray-200" />
                  <p className="text-xs text-gray-500 mt-1">Current picture. Uploading a new one will replace it.</p>
                </div>
              )}
              <input type="file" accept="image/*" onChange={(e) => { if (e.target.files) setImageFile(e.target.files[0]); }} className="w-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-blue-100 file:px-6 file:py-2.5 file:text-[15px] file:font-semibold file:text-blue-700 hover:file:bg-blue-200 transition" />
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button type="submit" disabled={isLoading} className="flex-1 rounded-full bg-blue-600 px-8 py-4 text-[15px] font-bold text-white shadow-sm transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/30 disabled:bg-blue-400 sm:flex-none">
                {isLoading ? "Updating..." : "Save Changes"}
              </button>
              <button type="button" onClick={() => router.back()} className="flex-1 rounded-full bg-gray-100 px-8 py-4 text-[15px] font-bold text-gray-700 transition hover:bg-gray-200 sm:flex-none">
                Cancel
              </button>

              {/* NEW: Danger Zone / Delete Button */}
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading || isDeleting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-red-50 px-8 py-4 text-[15px] font-bold text-red-700 transition hover:bg-red-100 active:scale-95 disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {isDeleting ? "Deleting..." : "Delete Customer"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

