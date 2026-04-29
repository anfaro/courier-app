// app/customers/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import Breadcrumbs from "@/components/Breadcrumbs";
import ImageInput from "@/components/ImageInput";

export default function NewCustomerPage() {
  const [name, setName] = useState("");
  // We now only store the local part of the number in state (e.g., "8123456789")
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const router = useRouter();

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
    // Automatically strip out any spaces, dashes, or letters the user might paste
    const onlyNumbers = e.target.value.replace(/\D/g, "");

    // Optional: Prevent them from typing the starting '0' if they accidentally do
    // const cleanNumber = onlyNumbers.startsWith("0") ? onlyNumbers.substring(1) : onlyNumbers;

    setPhoneNumber(onlyNumbers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      /**
      let finalImageUrl = null;

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("type", "house");

        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) throw new Error("Failed to upload the image.");

        const uploadData = await uploadRes.json();
        finalImageUrl = uploadData.url;
      }
      **/

      // Combine +62 with the inputted number right before sending it to the database
      const formattedPhoneNumber = phoneNumber ? `+62${phoneNumber}` : "";

      const customerRes = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phoneNumber: formattedPhoneNumber, // Send the combined number
          address,
          latitude,
          longitude,
          housePictureUrl: imageFile,
          notes
        }),
      });

      if (customerRes.ok) {
        router.push("/customers");
        router.refresh();
      } else {
        const data = await customerRes.json();
        setError(data.message || "Failed to add customer");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full rounded-2xl border border-transparent bg-gray-100 px-5 py-3.5 text-[15px] text-gray-900 transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10";

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      <Header />
      <Breadcrumbs />

      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <div className="mt-4 rounded-[2.5rem] bg-white p-6 sm:p-10 shadow-sm border border-gray-50">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">New Customer</h1>
            <p className="mt-2 text-base text-gray-500">Enter details and snap a picture of their location.</p>
          </div>

          {error && <p className="mb-6 rounded-2xl bg-red-50 p-4 text-[15px] font-medium text-red-700">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-[15px] font-semibold text-gray-700">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="John Doe" />
            </div>

            {/* M3 Custom Phone Input Group */}
            <div>
              <label className="mb-2 block text-[15px] font-semibold text-gray-700">Phone Number</label>
              {/* focus-within allows the parent div to glow when the input is clicked! */}
              <div className="flex items-center overflow-hidden rounded-2xl border border-transparent bg-gray-100 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-600/10">
                <span className="flex select-none items-center pl-5 pr-2 font-bold text-gray-500">
                  +62
                </span>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  className="w-full bg-transparent py-3.5 pr-5 text-[15px] text-gray-900 focus:outline-none"
                  placeholder="812 3456 7890"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[15px] font-semibold text-gray-700">Address</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} required rows={3} className={inputClass} placeholder="123 Main St..." />
            </div>

            <div className="rounded-[2rem] bg-blue-50/50 p-6 border border-blue-100">
              <div className="mb-4 flex items-center justify-between">
                <label className="block text-[15px] font-bold text-blue-900">GPS Coordinates</label>
                <button type="button" onClick={getLocation} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-50 transition">
                  📍 Get Location
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500" placeholder="Latitude" />
                <input type="text" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500" placeholder="Longitude" />
              </div>
            </div>

            <div>
              <ImageInput label="House Picture (Optional)" onImageChange={setImageFile} />
              {/**
              <label className="mb-2 block text-[15px] font-semibold text-gray-700">
                House Picture <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input type="file" accept="image/*" onChange={(e) => { if (e.target.files) setImageFile(e.target.files[0]); }} className="w-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-blue-100 file:px-6 file:py-2.5 file:text-[15px] file:font-semibold file:text-blue-700 hover:file:bg-blue-200 transition" />
              **/}
            </div>

            {/* NEW: Notes Input (Place this right below the Address textarea) */}
            <div>
              <label className="mb-2 block text-[15px] font-semibold text-gray-700">
                Additional Notes <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={inputClass}
                placeholder="e.g., Leave package at the side door..."
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button type="submit" disabled={isLoading} className="flex-1 rounded-full bg-blue-600 px-8 py-4 text-[15px] font-bold text-white shadow-sm transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/30 disabled:bg-blue-400 sm:flex-none">
                {isLoading ? "Saving..." : "Save Customer"}
              </button>
              <button type="button" onClick={() => router.back()} className="flex-1 rounded-full bg-gray-100 px-8 py-4 text-[15px] font-bold text-gray-700 transition hover:bg-gray-200 sm:flex-none">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

