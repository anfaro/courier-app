"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import Breadcrumbs from "@/components/Breadcrumbs";
import ImageInput from "@/components/ImageInput";

export default function NewCustomerPage() {
  // --- PRESERVED SINGLE CUSTOMER STATE (UNTOUCHED) ---
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  // --- SYSTEM STATE ---
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // --- TABS STATE ---
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  const [bulkMethod, setBulkMethod] = useState<"manual" | "paste">("manual");

  // --- NEW BULK STATE (Draft vs List) ---
  const [bulkDraft, setBulkDraft] = useState({
    name: "", phoneNumber: "", address: "", notes: "", latitude: "", longitude: "", housePictureUrl: null as string | null
  });
  const [bulkList, setBulkList] = useState<any[]>([]);
  const [pasteText, setPasteText] = useState("");

  // --- PRESERVED SINGLE HELPERS (UNTOUCHED) ---
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

  // --- BULK HELPERS ---
  const getBulkLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setBulkDraft({ ...bulkDraft, latitude: pos.coords.latitude.toString(), longitude: pos.coords.longitude.toString() });
      });
    }
  };

  const handleAddDraftToList = () => {
    if (!bulkDraft.name || !bulkDraft.address) {
      setError("Name and Address are required for the list.");
      return;
    }
    setBulkList([...bulkList, bulkDraft]);
    setBulkDraft({ name: "", phoneNumber: "", address: "", notes: "", latitude: "", longitude: "", housePictureUrl: null });
    setError("");
  };

  // --- SUBMISSION LOGIC ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      let payload;
      let endpoint = "/api/customers";

      if (activeTab === "single") {
        payload = {
          name,
          phoneNumber: phoneNumber ? `+62${phoneNumber}` : "",
          address,
          latitude,
          longitude,
          housePictureUrl: imageFile,
          notes
        };
      } else {
        endpoint = "/api/customers/bulk";
        payload = bulkList.map(c => ({ ...c, phoneNumber: c.phoneNumber ? `+62${c.phoneNumber}` : "" }));
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push("/customers");
        router.refresh();
      } else {
        const data = await res.json();
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

        {/* TABS */}
        <div className="mb-6 flex rounded-full bg-gray-200/60 p-1 shadow-inner">
          <button onClick={() => setActiveTab("single")} className={`flex-1 rounded-full py-3 text-sm font-bold transition ${activeTab === "single" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}>Single Customer</button>
          <button onClick={() => setActiveTab("bulk")} className={`flex-1 rounded-full py-3 text-sm font-bold transition ${activeTab === "bulk" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}>Bulk Import</button>
        </div>

        <div className="mt-4 rounded-[2.5rem] bg-white p-6 sm:p-10 shadow-sm border border-gray-50">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            {activeTab === "single" ? "New Customer" : "Bulk Add"}
          </h1>
          {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-[15px] font-medium text-red-700">{error}</p>}

          {/* ================= SINGLE FORM (EXACTLY AS YOU HAD IT) ================= */}
          {activeTab === "single" && (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label className="mb-2 block text-[15px] font-semibold text-gray-700">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="John Doe" />
              </div>

              <div>
                <label className="mb-2 block text-[15px] font-semibold text-gray-700">Phone Number</label>
                <div className="flex items-center overflow-hidden rounded-2xl border border-transparent bg-gray-100 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-600/10">
                  <span className="flex select-none items-center pl-5 pr-2 font-bold text-gray-500">+62</span>
                  <input type="tel" value={phoneNumber} onChange={handlePhoneChange} className="w-full bg-transparent py-3.5 pr-5 text-[15px] text-gray-900 focus:outline-none" placeholder="812 3456 7890" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[15px] font-semibold text-gray-700">Address</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} required rows={3} className={inputClass} placeholder="123 Main St..." />
              </div>

              <div className="rounded-[2rem] bg-blue-50/50 p-6 border border-blue-100">
                <div className="mb-4 flex items-center justify-between">
                  <label className="block text-[15px] font-bold text-blue-900">GPS Coordinates</label>
                  <button type="button" onClick={getLocation} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-50 transition">📍 Get Location</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm text-gray-900 shadow-sm" placeholder="Latitude" />
                  <input type="text" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm text-gray-900 shadow-sm" placeholder="Longitude" />
                </div>
              </div>

              <div><ImageInput label="House Picture (Optional)" onImageChange={setImageFile} /></div>

              <div>
                <label className="mb-2 block text-[15px] font-semibold text-gray-700">Additional Notes (Optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} placeholder="e.g., Leave package at side door..." />
              </div>

              <button type="submit" disabled={isLoading} className="w-full rounded-full bg-blue-600 py-4 font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:bg-blue-400">
                {isLoading ? "Saving..." : "Save Customer"}
              </button>
            </form>
          )}

          {/* ================= BULK TAB (NEW DRAFTING LOGIC) ================= */}
          {activeTab === "bulk" && (
            <div className="mt-8 space-y-8">
              <div className="flex justify-center gap-2">
                <button onClick={() => setBulkMethod("manual")} className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest transition ${bulkMethod === "manual" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"}`}>Manual</button>
                <button onClick={() => setBulkMethod("paste")} className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest transition ${bulkMethod === "paste" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"}`}>Paste</button>
              </div>

              {bulkMethod === "manual" ? (
                <div className="space-y-6">
                  {/* ACTIVE DRAFT AREA */}
                  <div className="rounded-[2rem] border-2 border-blue-100 bg-white p-6 shadow-sm space-y-4">
                    <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em]">Active Entry</h3>

                    {/* Name */}
                    <input
                      type="text"
                      value={bulkDraft.name}
                      onChange={(e) => setBulkDraft({ ...bulkDraft, name: e.target.value })}
                      placeholder="Full Name"
                      className={inputClass}
                    />

                    {/* Phone Number - Fixed Visibility */}
                    <div className="flex items-center rounded-2xl bg-gray-100 border border-transparent focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-600/10 transition-all">
                      <span className="flex select-none items-center pl-5 pr-2 text-[15px] font-bold text-gray-500">
                        +62
                      </span>
                      <input
                        type="tel"
                        value={bulkDraft.phoneNumber}
                        onChange={(e) => setBulkDraft({ ...bulkDraft, phoneNumber: e.target.value.replace(/\D/g, "") })}
                        placeholder="812 3456 7890"
                        className="w-full bg-transparent py-4 pr-5 text-[15px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none"
                      />
                    </div>

                    {/* Address */}
                    <textarea
                      value={bulkDraft.address}
                      onChange={(e) => setBulkDraft({ ...bulkDraft, address: e.target.value })}
                      placeholder="Full Address"
                      rows={2}
                      className={inputClass}
                    />

                    {/* GPS */}
                    <div className="grid grid-cols-2 gap-3 items-center">
                      <button
                        type="button"
                        onClick={() => getLocation("bulk")}
                        className="rounded-xl bg-blue-50 py-3 text-xs font-bold text-blue-700 active:scale-95 transition"
                      >
                        📍 Pin GPS
                      </button>
                      <div className="text-[10px] text-gray-400 font-mono leading-tight">
                        Lat: {bulkDraft.latitude || "-"}<br />Lng: {bulkDraft.longitude || "-"}
                      </div>
                    </div>

                    {/* Photo */}
                    <ImageInput
                      label="House Photo"
                      onImageChange={(img) => setBulkDraft({ ...bulkDraft, housePictureUrl: img })}
                    />

                    {/* Notes */}
                    <input
                      type="text"
                      value={bulkDraft.notes}
                      onChange={(e) => setBulkDraft({ ...bulkDraft, notes: e.target.value })}
                      placeholder="Notes (Optional)"
                      className={inputClass}
                    />

                    {/* Add to List Button */}
                    <button
                      type="button"
                      onClick={handleAddDraftToList}
                      className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-md active:scale-95 transition-all"
                    >
                      + Add to List
                    </button>
                  </div>


                  {/* SAVE ALL BUTTON */}
                  <button onClick={handleSubmit} disabled={isLoading || bulkList.length === 0} className="w-full rounded-full bg-green-600 py-4 font-black text-white shadow-xl disabled:bg-gray-200">
                    {isLoading ? "Saving..." : `🚀 Final Save (${bulkList.length})`}
                  </button>

                  {/* CARDS BELOW BUTTON */}
                  <div className="space-y-3">
                    {/* CONDENSED CARD LIST - Now with full details */}
                    {bulkList.length > 0 && (
                      <div className="space-y-3 pt-6 border-t border-gray-100 mt-6">
                        <h4 className="px-4 text-[11px] font-black uppercase tracking-widest text-gray-400">
                          Ready to Upload ({bulkList.length})
                        </h4>
                        {bulkList.map((c, i) => (
                          <div key={i} className="group flex items-center gap-4 rounded-[1.5rem] bg-gray-50 border border-gray-100 p-3 shadow-sm animate-[fadeIn_0.2s_ease-out]">

                            {/* Thumbnail Image */}
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white bg-white shadow-sm flex items-center justify-center">
                              {c.housePictureUrl ? (
                                <img src={c.housePictureUrl} className="h-full w-full object-cover" alt="" />
                              ) : (
                                <span className="text-2xl">🏠</span>
                              )}
                            </div>

                            {/* Details Text */}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 truncate text-[15px]">{c.name}</p>
                              <div className="flex flex-col gap-0.5">
                                <p className="text-[12px] font-medium text-blue-600 truncate">
                                  {c.phoneNumber ? `📞 +62${c.phoneNumber}` : "No Phone"}
                                </p>
                                <p className="text-[12px] text-gray-500 truncate leading-tight">
                                  {c.address}
                                </p>
                              </div>
                            </div>

                            {/* Remove Button */}
                            <button
                              type="button"
                              onClick={() => setBulkList(bulkList.filter((_, idx) => idx !== i))}
                              className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-300 shadow-sm transition hover:text-red-500 active:scale-90"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Paste Excel rows here..." rows={6} className={`${inputClass} font-mono text-xs`} />
                  <button onClick={handleSubmit} className="w-full rounded-full bg-blue-600 py-4 font-black text-white">Save Bulk Paste</button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

