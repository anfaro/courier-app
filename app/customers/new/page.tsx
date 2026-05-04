
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

  // --- NEW BULK STATE (Unified Draft vs List) ---
  const [bulkDraft, setBulkDraft] = useState({
    name: "", phoneNumber: "", address: "", notes: "", latitude: "", longitude: "", housePictureUrl: null as string | null
  });
  const [bulkList, setBulkList] = useState<any[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(true);

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
    setError("");

    if (pasteText.trim()) {
      setIsParsing(true);
      try {
        const lines = pasteText.trim().split("\n");
        const newCustomers = lines.map((line) => {
          const columns = line.includes("\t") ? line.split("\t") : line.split(",");
          return {
            name: columns[0]?.trim() || "Unknown",
            phoneNumber: columns[1]?.replace(/\D/g, "") || "",
            address: columns[2]?.trim() || "No Address",
            notes: columns[3]?.trim() || "",
            latitude: "",
            longitude: "",
            housePictureUrl: null
          };
        });
        setBulkList([...bulkList, ...newCustomers]);
        setPasteText("");
      } catch (err) {
        setError("Failed to parse paste data. Check your format.");
      } finally {
        setIsParsing(false);
      }
      return;
    }

    if (!bulkDraft.name || !bulkDraft.address) {
      setError("Please fill in Name and Address or paste data into the box.");
      return;
    }

    setBulkList([...bulkList, bulkDraft]);
    setBulkDraft({ name: "", phoneNumber: "", address: "", notes: "", latitude: "", longitude: "", housePictureUrl: null });
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

          {/* ================= BULK TAB (UNIFIED & ANIMATED) ================= */}
          {activeTab === "bulk" && (
            <div className="mt-8 space-y-6">
              {/* WORKSPACE HEADER with Toggle */}
              <div className="flex items-center justify-between px-4">
                <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em]">
                  {isFormVisible ? "Entry Workspace" : "Workspace Minimized"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormVisible(!isFormVisible)}
                  className={`group flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-black transition-all ${isFormVisible ? "bg-gray-100 text-gray-500" : "bg-blue-600 text-white shadow-md shadow-blue-200"
                    }`}
                >
                  {isFormVisible ? "CLOSE" : "OPEN FORM"}
                  <svg
                    className={`h-3 w-3 transition-transform duration-500 ${isFormVisible ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* ANIMATED COLLAPSIBLE CONTAINER */}
              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${isFormVisible ? "max-h-[1200px] opacity-100 mt-4" : "max-h-0 opacity-0 mt-0 pointer-events-none"
                  }`}
              >
                <div className="rounded-[2rem] border-2 border-blue-100 bg-white p-6 shadow-sm space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 italic">Option 1: Smart Paste</label>
                    <textarea
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder="Paste multiple rows here..."
                      rows={3}
                      className={`${inputClass} font-mono text-[13px] border-dashed border-gray-300 bg-gray-50/50`}
                    />
                  </div>

                  <div className="relative py-1 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                    <span className="relative bg-white px-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest">OR</span>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Option 2: Manual Entry</label>
                    <input type="text" value={bulkDraft.name} onChange={(e) => setBulkDraft({ ...bulkDraft, name: e.target.value })} placeholder="Full Name" className={inputClass} />

                    <div className="flex items-center rounded-2xl bg-gray-100 border border-transparent focus-within:border-blue-600 focus-within:bg-white transition-all">
                      <span className="pl-5 pr-2 text-[15px] font-bold text-gray-500">+62</span>
                      <input type="tel" value={bulkDraft.phoneNumber} onChange={(e) => setBulkDraft({ ...bulkDraft, phoneNumber: e.target.value.replace(/\D/g, "") })} placeholder="812 3456 7890" className="w-full bg-transparent py-4 text-[15px] font-medium text-gray-900 focus:outline-none" />
                    </div>

                    <textarea value={bulkDraft.address} onChange={(e) => setBulkDraft({ ...bulkDraft, address: e.target.value })} placeholder="Full Address" rows={2} className={inputClass} />

                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => getBulkLocation()} className="rounded-xl bg-blue-50 py-3 text-xs font-bold text-blue-700 active:scale-95 transition">📍 Pin GPS</button>
                      <div className="text-[10px] text-gray-400 font-mono flex items-center leading-tight">Lat: {bulkDraft.latitude?.slice(0, 8) || "-"}<br />Lng: {bulkDraft.longitude?.slice(0, 8) || "-"}</div>
                    </div>

                    <ImageInput label="House Photo" onImageChange={(img) => setBulkDraft({ ...bulkDraft, housePictureUrl: img })} />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddDraftToList}
                    disabled={isParsing}
                    className="w-full rounded-2xl bg-blue-600 py-4 font-black text-white shadow-md active:scale-95 transition-all"
                  >
                    {isParsing ? "Processing..." : (pasteText ? "✅ Parse & Add Paste" : "+ Add to List")}
                  </button>
                </div>
              </div>

              {/* FINAL SAVE BUTTON */}
              {bulkList.length > 0 && (
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="sticky top-4 z-10 w-full rounded-full bg-green-600 py-4 font-black text-white shadow-xl active:scale-95 transition-all disabled:bg-gray-200"
                >
                  {isLoading ? "Saving..." : `🚀 FINAL SAVE (${bulkList.length} CUSTOMERS)`}
                </button>
              )}

              {/* LIST RENDER */}
              {bulkList.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-4">
                    <div className="flex gap-2">
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">{bulkList.length} Total</span>
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-md">{bulkList.filter(c => c.housePictureUrl).length} Photos</span>
                    </div>
                    <button onClick={() => confirm("Clear all?") && setBulkList([])} className="text-[10px] font-bold text-red-400 uppercase">Clear All</button>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto space-y-3 pb-20 pr-1 custom-scrollbar">
                    {bulkList.map((c, i) => (
                      <div key={i} className="flex items-center gap-4 rounded-[1.5rem] bg-white border border-gray-100 p-3 shadow-sm">
                        <label className="relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-center">
                          {c.housePictureUrl ? <img src={c.housePictureUrl} className="h-full w-full object-cover" /> : <span className="text-xl">🏠</span>}
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const newList = [...bulkList];
                                newList[i].housePictureUrl = reader.result as string;
                                setBulkList(newList);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          />
                        </label>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 truncate text-[14px] leading-tight">{c.name}</p>
                          <p className="text-[11px] font-medium text-blue-600 truncate">📞 {c.phoneNumber || "No Phone"}</p>
                          <p className="text-[11px] text-gray-400 truncate">{c.address}</p>
                        </div>
                        <button type="button" onClick={() => setBulkList(bulkList.filter((_, idx) => idx !== i))} className="h-8 w-8 text-gray-300 hover:text-red-500">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

