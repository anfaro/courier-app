
"use client";

import { useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/header";
import Breadcrumbs from "@/components/Breadcrumbs";
import ImageInput from "@/components/ImageInput";

export default function NewWaybillPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;

  const searchParams = useSearchParams();
  const defaultReceiverName = searchParams.get("name") || "Customer";

  // --- PRESERVED SINGLE WAYBILL STATE ---
  const [waybillNumber, setWaybillNumber] = useState("");
  const [codAmount, setCodAmount] = useState("");
  const [receiverName, setReceiverName] = useState(defaultReceiverName);
  const [isOtherReceiver, setIsOtherReceiver] = useState(false);
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [status, setStatus] = useState("Pending");

  // --- BULK STATE ---
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  const [bulkList, setBulkList] = useState<any[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(true);
  const [bulkDraft, setBulkDraft] = useState({
    waybillNumber: "",
    codAmount: "",
    status: "Pending",
  });

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    setCodAmount(rawValue);
  };

  const handleAddDraftToList = () => {
    setError("");

    // SCENARIO 1: Smart Paste (Tracking | COD | Optional Name)
    if (pasteText.trim()) {
      setIsParsing(true);
      try {
        const lines = pasteText.trim().split("\n");
        const newWaybills = lines.map((line) => {
          const columns = line.includes("\t") ? line.split("\t") : line.split(",");

          // Use provided name from 3rd column, else fallback to current receiverName state
          const pastedName = columns[2]?.trim();

          return {
            waybillNumber: columns[0]?.trim() || "",
            codAmount: columns[1]?.replace(/\D/g, "") || "0",
            status: "Pending",
            receiverName: pastedName || receiverName,
          };
        }).filter(item => item.waybillNumber !== "");

        setBulkList([...bulkList, ...newWaybills]);
        setPasteText("");
      } catch (err) {
        setError("Failed to parse paste data.");
      } finally {
        setIsParsing(false);
      }
      return;
    }

    // SCENARIO 2: Manual Entry
    if (!bulkDraft.waybillNumber) {
      setError("Enter a Tracking Number.");
      return;
    }
    // Manual uses the current receiverName state (which respects the toggle)
    setBulkList([...bulkList, { ...bulkDraft, receiverName: receiverName }]);
    setBulkDraft({ waybillNumber: "", codAmount: "", status: "Pending" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      let payload;
      let endpoint = "/api/deliveries";
      if (activeTab === "single") {
        payload = {
          customerId: parseInt(customerId),
          waybillNumber,
          codAmount: codAmount ? parseInt(codAmount) : 0,
          receiverName,
          proofOfDeliveryUrl: imageFile,
          status,
        };
      } else {
        endpoint = "/api/deliveries/bulk";
        payload = bulkList.map(item => ({
          ...item,
          customerId: parseInt(customerId),
          codAmount: parseInt(item.codAmount || "0")
        }));
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.push(`/customers/${customerId}`);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to save");
      }
    } catch (err: any) { setError(err.message); }
    finally { setIsLoading(false); }
  };

  const inputClass = "w-full rounded-2xl border border-transparent bg-gray-100 px-5 py-3.5 text-[15px] text-gray-900 transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10";

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      <Header />
      <Breadcrumbs />
      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <div className="mb-6 flex rounded-full bg-gray-200/60 p-1 shadow-inner">
          <button onClick={() => setActiveTab("single")} className={`flex-1 rounded-full py-3 text-sm font-bold transition ${activeTab === "single" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}>Single Waybill</button>
          <button onClick={() => setActiveTab("bulk")} className={`flex-1 rounded-full py-3 text-sm font-bold transition ${activeTab === "bulk" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}>Bulk Import</button>
        </div>

        <div className="mt-4 rounded-[2.5rem] bg-white p-6 sm:p-10 shadow-sm border border-gray-50">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-6">
            {activeTab === "single" ? "Add Waybill" : "Bulk Waybills"}
          </h1>
          {error && <p className="mb-6 rounded-2xl bg-red-50 p-4 text-[15px] font-medium text-red-700">{error}</p>}

          {activeTab === "single" && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-[15px] font-semibold text-gray-700">Waybill Number</label>
                <input type="text" value={waybillNumber} onChange={(e) => setWaybillNumber(e.target.value)} required className={inputClass} placeholder="e.g., JD0123" />
              </div>

              <div>
                <label className="mb-2 block text-[15px] font-semibold text-gray-700">Delivery Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} appearance-none cursor-pointer`}>
                  <option value="Pending">Pending</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[15px] font-semibold text-gray-700">Receiver Name</label>
                  <button
                    type="button"
                    onClick={() => setIsOtherReceiver(!isOtherReceiver)}
                    className={`flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold transition-all ${isOtherReceiver ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}
                  >
                    {isOtherReceiver ? "✓ Received by Other" : "Received by Other?"}
                  </button>
                </div>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  readOnly={!isOtherReceiver}
                  className={`${inputClass} ${!isOtherReceiver ? "opacity-60 grayscale cursor-not-allowed" : "border-blue-200 bg-blue-50/30"}`}
                />
              </div>

              <div className="rounded-[2rem] bg-red-50/50 p-6 border border-red-100">
                <label className="mb-2 block text-[15px] font-bold text-red-900">Total COD Amount (Rp)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-5 font-bold text-gray-500">Rp</span>
                  <input type="text" value={codAmount ? parseInt(codAmount).toLocaleString("id-ID") : ""} onChange={handleCodChange} className="w-full rounded-2xl border-none bg-white py-4 pl-12 pr-5 text-lg font-bold text-gray-900" placeholder="0" />
                </div>
              </div>

              <ImageInput label="Proof of Delivery" onImageChange={setImageFile} />

              <button type="submit" disabled={isLoading} className="w-full rounded-full bg-blue-600 py-4 font-bold text-white shadow-sm disabled:bg-blue-400">
                {isLoading ? "Saving..." : "Save Waybill"}
              </button>
            </form>
          )}

          {activeTab === "bulk" && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-widest italic">Bulk Data Entry</h3>
                <button
                  onClick={() => setIsFormVisible(!isFormVisible)}
                  className={`rounded-full px-4 py-1.5 text-[10px] font-black transition-all ${isFormVisible ? "bg-gray-100 text-gray-500" : "bg-blue-600 text-white shadow-md shadow-blue-200"}`}
                >
                  {isFormVisible ? "CLOSE" : "OPEN FORM"}
                </button>
              </div>

              <div className={`overflow-hidden transition-all duration-500 ${isFormVisible ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"}`}>
                <div className="rounded-[2.5rem] border-2 border-blue-100 bg-white p-6 shadow-sm space-y-5">

                  {/* Bulk Receiver Override */}
                  <div className="rounded-2xl bg-blue-50/50 p-4 border border-blue-100/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-black text-blue-700 uppercase">Receiver for this Batch</span>
                      <button
                        type="button"
                        onClick={() => setIsOtherReceiver(!isOtherReceiver)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md transition ${isOtherReceiver ? "bg-blue-600 text-white" : "bg-white text-blue-600 border border-blue-200"}`}
                      >
                        {isOtherReceiver ? "✓ Custom Name" : "Use Customer Name"}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      readOnly={!isOtherReceiver}
                      className={`${inputClass} ${!isOtherReceiver ? "bg-transparent border-none p-0 h-auto font-bold opacity-60" : "bg-white"}`}
                    />
                  </div>

                  {/* Option 1: Paste Area */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 italic">Option 1: Smart Paste (Tracking | COD | Name)</label>
                    <textarea
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder="Paste columns from Excel..."
                      rows={3}
                      className={`${inputClass} font-mono text-xs border-dashed border-gray-300 bg-gray-50/50`}
                    />
                  </div>

                  <div className="relative py-1 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                    <span className="relative bg-white px-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest">OR</span>
                  </div>

                  {/* Option 2: Manual Waybill */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Option 2: Manual Waybill</label>

                    <input
                      type="text"
                      value={bulkDraft.waybillNumber}
                      onChange={(e) => setBulkDraft({ ...bulkDraft, waybillNumber: e.target.value })}
                      placeholder="Tracking Number"
                      className={inputClass}
                    />

                    {/* Manual COD Entry */}
                    <div className="rounded-[2rem] bg-red-50/50 p-6 border border-red-100">
                      <label className="mb-2 block text-[13px] font-bold text-red-900">COD Amount (Rp)</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-5 font-bold text-gray-500">Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={bulkDraft.codAmount ? parseInt(bulkDraft.codAmount).toLocaleString("id-ID") : ""}
                          onChange={(e) => setBulkDraft({
                            ...bulkDraft,
                            codAmount: e.target.value.replace(/\D/g, "")
                          })}
                          placeholder="0"
                          className="w-full rounded-2xl border-none bg-white py-4 pl-12 pr-5 text-lg font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddDraftToList}
                    className="w-full rounded-2xl bg-blue-600 py-4 font-black text-white shadow-md active:scale-95 transition-all"
                  >
                    {pasteText ? "✅ Parse & Add to List" : "+ Add to Bulk List"}
                  </button>
                </div>
              </div>

              {/* LIST DISPLAY */}
              {bulkList.length > 0 && (
                <div className="space-y-8 pt-4"> {/* Spacing between button and list */}
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="sticky top-4 z-10 w-full rounded-full bg-green-600 py-4 font-black text-white shadow-xl active:scale-95 transition-all disabled:bg-gray-200"
                  >
                    {isLoading ? "Saving..." : `🚀 FINAL SAVE (${bulkList.length} WAYBILLS)`}
                  </button>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-4 mb-2">
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Ready to Upload</span>
                      <button
                        type="button"
                        onClick={() => confirm("Clear all items?") && setBulkList([])}
                        className="text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors"
                      >
                        CLEAR ALL
                      </button>
                    </div>

                    <div className="max-h-[50vh] overflow-y-auto space-y-3 pb-10 pr-1 custom-scrollbar">
                      {bulkList.map((c, i) => (
                        <div key={i} className="group flex items-center gap-4 rounded-[1.5rem] bg-white border border-gray-100 p-3 shadow-sm animate-in fade-in duration-200 hover:border-blue-200 transition-colors">
                          <div className="h-12 w-12 shrink-0 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-xl shadow-inner">
                            📦
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 truncate text-[14px] leading-tight">
                              {c.waybillNumber}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[11px] font-black text-blue-600">
                                Rp {parseInt(c.codAmount || "0").toLocaleString("id-ID")}
                              </p>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 truncate max-w-[120px]">
                                👤 {c.receiverName}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setBulkList(bulkList.filter((_, idx) => idx !== i))}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <span className="text-lg">✕</span>
                          </button>
                        </div>
                      ))}
                    </div>
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

