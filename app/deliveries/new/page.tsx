
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import Breadcrumbs from "@/components/Breadcrumbs";
import ImageInput from "@/components/ImageInput";

export default function GlobalDeliveryPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // --- BULK STATE ---
  const [bulkList, setBulkList] = useState<any[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(true);

  // --- QUICK ADD MODAL STATE ---
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [pendingLinkIndex, setPendingLinkIndex] = useState<number | null>(null);
  const [qaName, setQaName] = useState("");
  const [qaAddress, setQaAddress] = useState("");

  // --- SMART PARSER (Fixed "undefined" bug) ---
  const handleAddDraftToList = async () => {
    if (!pasteText.trim()) return;
    setIsParsing(true);
    setError("");

    try {
      // Fetching customers to match names
      const res = await fetch("/api/customers/search?q=");
      const allCustomers = await res.json();

      const lines = pasteText.trim().split("\n");
      const newEntries = lines.map((line) => {
        // Support both Tabs (Excel) and Commas (CSV)
        const columns = line.includes("\t") ? line.split("\t") : line.split(",");

        const waybill = columns[0]?.trim() || "";
        const cod = columns[1]?.replace(/\D/g, "") || "0";

        // Priority for Name: 
        // 1. Column 3 from Paste
        // 2. Current 'receiverName' state (if toggled)
        // 3. Fallback to "Unknown"
        const rawNameFromPaste = columns[2]?.trim();
        const effectiveName = rawNameFromPaste || receiverName || "Unknown Customer";

        // Attempt exact name match against DB
        const match = allCustomers.find(
          (c: any) => c.name.toLowerCase() === effectiveName.toLowerCase()
        );

        return {
          waybillNumber: waybill,
          codAmount: cod,
          status: "Pending",
          customerId: match ? match.id : null,
          customerName: match ? match.name : effectiveName, // Guaranteed string
          isUnlinked: !match
        };
      }).filter(item => item.waybillNumber !== "");

      setBulkList([...bulkList, ...newEntries]);
      setPasteText("");
    } catch (err) {
      console.error(err);
      setError("Failed to link customers. Check connection.");
    } finally {
      setIsParsing(false);
    }
  };


  // --- QUICK CREATE CUSTOMER ---
  const handleCreateAndLink = async () => {
    if (!qaName || !qaAddress) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: qaName,
          address: qaAddress,
          // Add dummy coords if your schema requires them
          latitude: "0",
          longitude: "0"
        }),
      });

      const data = await res.json();

      // FIX: Drizzle returns an array, so we check for data[0] 
      // or data depending on your API implementation
      const newCust = Array.isArray(data) ? data[0] : data;

      if (res.ok && pendingLinkIndex !== null && newCust) {
        const updatedList = [...bulkList];

        // Use a fallback to qaName if newCust.name is missing for some reason
        updatedList[pendingLinkIndex] = {
          ...updatedList[pendingLinkIndex],
          customerId: newCust.id,
          customerName: newCust.name || qaName,
          isUnlinked: false
        };

        setBulkList(updatedList);
        setShowQuickAdd(false);
        setQaName("");
        setQaAddress("");
        setPendingLinkIndex(null);
      } else {
        setError("API returned invalid data structure.");
      }
    } catch (err) {
      setError("Could not create customer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalSave = async () => {
    if (bulkList.some(item => item.isUnlinked)) {
      setError("Please link all customers before saving.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/deliveries/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bulkList.map(item => ({
          waybillNumber: item.waybillNumber,
          customerId: item.customerId,
          codAmount: parseInt(item.codAmount),
          status: item.status
        }))),
      });
      if (res.ok) router.push("/deliveries");
    } catch (err) {
      setError("Failed to save deliveries.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full rounded-2xl border border-transparent bg-gray-100 px-5 py-3.5 text-[15px] text-gray-900 focus:border-blue-600 focus:bg-white transition-all outline-none";

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      <Header />
      <Breadcrumbs />

      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <div className="mt-4 rounded-[2.5rem] bg-white p-6 shadow-sm border border-gray-50">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-8">Global Scan</h1>

          {error && <p className="mb-6 rounded-2xl bg-red-50 p-4 text-[15px] font-medium text-red-700">{error}</p>}

          <div className="space-y-6">
            {/* INPUT AREA */}
            <div className={`overflow-hidden transition-all duration-500 ${isFormVisible ? "max-h-[600px]" : "max-h-0 opacity-0"}`}>
              <div className="rounded-[2.2rem] border-2 border-blue-100 p-6 space-y-5 bg-blue-50/20">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Input Area</label>
                </div>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste: Waybill [Tab] COD [Tab] CustomerName"
                  className={`${inputClass} font-mono text-xs h-32 border-dashed border-blue-200`}
                />
                <button
                  onClick={handleAddDraftToList}
                  disabled={isParsing}
                  className="w-full rounded-full bg-blue-600 py-4 font-black text-white shadow-lg shadow-blue-200 active:scale-95 transition"
                >
                  {isParsing ? "Matching Records..." : "Process Paste Data"}
                </button>
              </div>
            </div>

            {/* LIST AREA WITH FIXED SPACING */}
            {bulkList.length > 0 && (
              <div className="space-y-10 pt-6"> {/* Major gap between Input and List */}

                {/* STICKY ACTION */}
                <button
                  onClick={handleFinalSave}
                  disabled={isLoading || bulkList.some(i => i.isUnlinked)}
                  className="sticky top-4 z-20 w-full rounded-full bg-green-600 py-4 font-black text-white shadow-xl shadow-green-100 active:scale-95 transition disabled:bg-gray-200 disabled:shadow-none"
                >
                  {isLoading ? "Saving..." : `🚀 UPLOAD ${bulkList.length} WAYBILLS`}
                </button>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-4 mb-4">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Verification List</span>
                    <button onClick={() => setBulkList([])} className="text-[10px] font-bold text-red-400 hover:text-red-600">CLEAR ALL</button>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto space-y-3 pb-20 pr-1 custom-scrollbar">
                    {bulkList.map((c, i) => (
                      <div key={i} className={`flex items-center gap-4 rounded-[1.5rem] p-3 border transition-all duration-300 ${c.isUnlinked ? 'border-orange-200 bg-orange-50/50 shadow-sm shadow-orange-50' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-white border border-gray-50 flex items-center justify-center shadow-sm">📦</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 truncate text-sm leading-tight">{c.waybillNumber}</p>
                          <p className={`text-[11px] font-black flex items-center gap-1 mt-0.5 ${c.isUnlinked ? 'text-orange-600' : 'text-blue-600'}`}>
                            {c.isUnlinked ? "⚠️ NEEDS LINKING" : `👤 ${c.customerName}`}
                          </p>
                        </div>
                        {c.isUnlinked && (
                          <button
                            onClick={() => { setPendingLinkIndex(i); setQaName(c.customerName); setShowQuickAdd(true); }}
                            className="bg-orange-600 text-white text-[10px] font-black px-4 py-2 rounded-full shadow-md shadow-orange-100 active:scale-90"
                          >
                            LINK
                          </button>
                        )}
                        <button onClick={() => setBulkList(bulkList.filter((_, idx) => idx !== i))} className="text-gray-300 px-2 hover:text-red-500 transition-colors">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* QUICK ADD DRAWER */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg rounded-[2.8rem] bg-white p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
            <h2 className="text-xl font-black text-gray-900 mb-2">New Customer</h2>
            <p className="text-sm text-gray-500 mb-8 font-medium">Add <b>{qaName}</b> to the system to complete this link.</p>

            <div className="space-y-4">
              <input value={qaName} onChange={(e) => setQaName(e.target.value)} placeholder="Full Name" className={inputClass} />
              <textarea value={qaAddress} onChange={(e) => setQaAddress(e.target.value)} placeholder="Full Address" className={inputClass} rows={3} />

              <div className="flex gap-4 pt-4">
                <button onClick={handleCreateAndLink} className="flex-1 rounded-full bg-blue-600 py-4 font-black text-white shadow-lg shadow-blue-100">Create & Link</button>
                <button onClick={() => setShowQuickAdd(false)} className="px-6 py-4 font-bold text-gray-400">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

