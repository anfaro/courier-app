// app/customers/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import ImageInput from "@/components/ImageInput";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";

export default function NewCustomerPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const router = useRouter();

  // --- PRESERVED SINGLE CUSTOMER STATE ---
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
  const [isImageUploading, setIsImageUploading] = useState(false);

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

  // --- PRESERVED SINGLE HELPERS ---
  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
          showToast("Location pinned!", "success");
        },
        (err) => showToast("Location permission denied", "error")
      );
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
        showToast("GPS captured", "success");
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
        showToast(`Parsed ${newCustomers.length} customers`, "success");
      } catch (err) {
        setError("Failed to parse paste data.");
      } finally {
        setIsParsing(false);
      }
      return;
    }

    if (!bulkDraft.name || !bulkDraft.address) {
      setError("Name and Address are required.");
      return;
    }

    setBulkList([...bulkList, bulkDraft]);
    setBulkDraft({ name: "", phoneNumber: "", address: "", notes: "", latitude: "", longitude: "", housePictureUrl: null });
    showToast("Added to list", "info");
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
        showToast(t("settings.success"), "success");
        router.push("/customers");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to add customer");
      }
    } catch (err: any) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full rounded-2xl border border-card-border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-5 py-3.5 text-[15px] font-medium text-primary dark:text-slate-100 transition-all focus:border-blue-500 focus:bg-card dark:focus:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-secondary shadow-inner";

  return (
    <div className="min-h-screen bg-background pb-20">
      
      <PageHeader title="New Customer" />

      <main className="mx-auto max-w-2xl p-4 sm:p-6">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
        {/* TABS - Standardized MD3 Pill Design */}
        <div className="mb-8 flex rounded-full bg-surface-hover p-1 shadow-inner ring-1 ring-black/5 dark:ring-white/5">
          <button 
            onClick={() => setActiveTab("single")} 
            className={`flex-1 rounded-full py-3 text-[14px] font-black transition-all active:scale-90 ${activeTab === "single" ? "bg-card text-blue-700 dark:text-blue-400 shadow-sm" : "text-secondary hover:text-primary"}`}
          >
            Single
          </button>
          <button 
            onClick={() => setActiveTab("bulk")} 
            className={`flex-1 rounded-full py-3 text-[14px] font-black transition-all active:scale-90 ${activeTab === "bulk" ? "bg-card text-blue-700 dark:text-blue-400 shadow-sm" : "text-secondary hover:text-primary"}`}
          >
            Bulk
          </button>
        </div>

        <div className="rounded-[2.5rem] bg-card p-6 sm:p-10 shadow-sm border border-card-border">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">
            {activeTab === "single" ? t("customer.add") : t("home.manage_db")}
          </h1>
          {error && <p className="mt-4 rounded-2xl bg-red-50 dark:bg-red-950/20 p-4 text-[14px] font-bold text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50">{error}</p>}

          {/* ================= SINGLE FORM ================= */}
          {activeTab === "single" && (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label className="mb-2 block text-[13px] font-black text-secondary uppercase tracking-widest ml-1">{t("auth.username")}</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="e.g. John Doe" />
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-black text-secondary uppercase tracking-widest ml-1">{t("settings.email_label")} / Phone</label>
                <div className="flex items-center overflow-hidden rounded-2xl border border-card-border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 transition-all focus-within:border-blue-600 focus-within:bg-card dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-blue-600/10 shadow-inner">
                  <span className="flex select-none items-center pl-5 pr-2 font-black text-secondary">+62</span>
                  <input type="tel" value={phoneNumber} onChange={handlePhoneChange} className="w-full bg-transparent py-4 pr-5 text-[15px] font-medium text-primary dark:text-slate-100 focus:outline-none" placeholder="812 3456 7890" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-black text-secondary uppercase tracking-widest ml-1">Address</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} required rows={3} className={inputClass} placeholder="123 Main St..." />
              </div>

              <div className="rounded-[2.5rem] bg-surface-hover p-6 border border-card-border">
                <div className="mb-4 flex items-center justify-between">
                  <label className="block text-[15px] font-black text-primary">GPS Coordinates</label>
                  <button type="button" onClick={getLocation} className="btn-secondary px-4 py-2 text-[12px] shadow-sm">📍 {t("customer.pin")}</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="w-full rounded-2xl border border-card-border dark:border-slate-700 bg-card dark:bg-slate-900 px-4 py-3 text-sm text-primary dark:text-slate-100 shadow-sm font-mono focus:border-blue-500 focus:outline-none" placeholder="Latitude" />
                  <input type="text" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="w-full rounded-2xl border border-card-border dark:border-slate-700 bg-card dark:bg-slate-900 px-4 py-3 text-sm text-primary dark:text-slate-100 shadow-sm font-mono focus:border-blue-500 focus:outline-none" placeholder="Longitude" />
                </div>
              </div>

              <div><ImageInput label="House Photo" onImageChange={setImageFile} onUploadingChange={setIsImageUploading} /></div>

              <div>
                <label className="mb-2 block text-[13px] font-black text-secondary uppercase tracking-widest ml-1">Notes (Optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} placeholder="..." />
              </div>

              <button type="submit" disabled={isLoading || isImageUploading} className="btn-primary w-full py-4 text-[16px] mt-4">
                {isLoading ? t("action.loading") : isImageUploading ? t("action.loading") : t("action.save")}
              </button>
            </form>
          )}

          {/* ================= BULK TAB ================= */}
          {activeTab === "bulk" && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">
                  {isFormVisible ? "Workspace Active" : "Workspace Minimized"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormVisible(!isFormVisible)}
                  className={`group flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-black transition-all active:scale-90 ${isFormVisible ? "bg-surface-hover text-secondary" : "btn-primary !py-1.5"
                    }`}
                >
                  {isFormVisible ? "HIDE" : "OPEN"}
                </button>
              </div>

              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${isFormVisible ? "max-h-[1500px] opacity-100 mt-4" : "max-h-0 opacity-0 mt-0 pointer-events-none"
                  }`}
              >
                <div className="rounded-[2.5rem] border border-card-border bg-surface-hover/50 p-6 shadow-inner space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-secondary uppercase ml-2 italic opacity-60">Paste Excel/Tabular Data</label>
                    <textarea
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder="Name [Tab] Phone [Tab] Address..."
                      rows={3}
                      className={`${inputClass} font-mono text-[13px] border-dashed border-card-border`}
                    />
                  </div>

                  <div className="relative py-1 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-card-border"></div></div>
                    <span className="relative bg-surface-hover px-4 text-[10px] font-black text-secondary/30 uppercase tracking-widest">OR</span>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-secondary uppercase ml-2">Manual Entry</label>
                    <input type="text" value={bulkDraft.name} onChange={(e) => setBulkDraft({ ...bulkDraft, name: e.target.value })} placeholder="Customer Name" className={inputClass} />

                    <div className="flex items-center rounded-2xl bg-gray-50 dark:bg-slate-800 border border-card-border dark:border-slate-700 focus-within:border-blue-600 focus-within:bg-card dark:focus-within:bg-slate-900 transition-all shadow-inner">
                      <span className="pl-5 pr-2 text-[15px] font-black text-secondary">+62</span>
                      <input type="tel" value={bulkDraft.phoneNumber} onChange={(e) => setBulkDraft({ ...bulkDraft, phoneNumber: e.target.value.replace(/\D/g, "") })} placeholder="812 3456 7890" className="w-full bg-transparent py-4 text-[15px] font-medium text-primary dark:text-slate-100 focus:outline-none" />
                    </div>

                    <textarea value={bulkDraft.address} onChange={(e) => setBulkDraft({ ...bulkDraft, address: e.target.value })} placeholder="Full Address" rows={2} className={inputClass} />

                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => getBulkLocation()} className="btn-secondary !py-3 !text-[12px]">📍 {t("customer.pin")}</button>
                      <div className="text-[10px] text-secondary font-mono flex items-center leading-tight">Lat: {bulkDraft.latitude?.slice(0, 8) || "-"}<br />Lng: {bulkDraft.longitude?.slice(0, 8) || "-"}</div>
                    </div>

                    <ImageInput label="House Photo" onImageChange={(img) => setBulkDraft({ ...bulkDraft, housePictureUrl: img })} />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddDraftToList}
                    disabled={isParsing}
                    className="btn-primary w-full py-4 text-[15px]"
                  >
                    {isParsing ? t("action.loading") : (pasteText ? "✅ Parse & Add" : "+ Add to List")}
                  </button>
                </div>
              </div>

              {/* FINAL SAVE BUTTON */}
              {bulkList.length > 0 && (
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="sticky top-4 z-10 btn-primary !bg-emerald-600 !shadow-emerald-600/20 w-full py-5 text-[16px] uppercase tracking-wider"
                >
                  {isLoading ? t("action.loading") : `🚀 ${t("action.save")} (${bulkList.length})`}
                </button>
              )}

              {/* LIST RENDER */}
              {bulkList.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-4">
                    <div className="flex gap-2">
                      <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full uppercase">{bulkList.length} Total</span>
                    </div>
                    <button onClick={() => setBulkList([])} className="text-[11px] font-black text-red-500 uppercase tracking-wider active:scale-90 transition-transform">{t("action.clear_all")}</button>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto space-y-3 pb-20 pr-1 custom-scrollbar">
                    {bulkList.map((c, i) => (
                      <div key={i} className="flex items-center gap-4 rounded-[2rem] bg-card border border-card-border p-3 shadow-sm">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-surface-hover border border-card-border flex items-center justify-center">
                          {c.housePictureUrl ? <img src={c.housePictureUrl} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <span className="text-xl">🏠</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-primary truncate text-[15px] leading-tight">{c.name}</p>
                          <p className="text-[12px] font-bold text-blue-600 dark:text-blue-400 truncate">📞 {c.phoneNumber || "No Phone"}</p>
                        </div>
                        <button type="button" onClick={() => setBulkList(bulkList.filter((_, idx) => idx !== i))} className="h-10 w-10 flex items-center justify-center rounded-full bg-surface-hover text-secondary hover:text-red-500 transition-colors">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
      </main>
    </div>
  );
}
