// app/deliveries/new/page.tsx

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/header";
import Breadcrumbs from "@/components/Breadcrumbs";
import ScannerModal from "@/components/ScannerModal";

function DeliveryHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlCustomerId = searchParams.get("customerId");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // --- UI STATE ---
  const [inputMode, setInputMode] = useState<"manual" | "bulk">("manual");
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // --- QUICK RESOLVE UNKNOWN CUSTOMER STATE ---
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [pendingLinkIndex, setPendingLinkIndex] = useState<number | null>(null);
  const [qaName, setQaName] = useState("");
  const [qaAddress, setQaAddress] = useState("");
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [isResolvingAll, setIsResolvingAll] = useState(false);

  // --- CUSTOMER DATA ---
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("auto");
  const [isLocked, setIsLocked] = useState(false);

  // --- MANUAL INPUT STATE ---
  const [manualWaybill, setManualWaybill] = useState("");
  const [manualCod, setManualCod] = useState("");
  const [manualReceiver, setManualReceiver] = useState("");

  // --- BULK INPUT STATE ---
  const [pasteText, setPasteText] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  // --- UNIFIED PENDING LIST ---
  const [pendingList, setPendingList] = useState<any[]>([]);

  useEffect(() => {
    const initData = async () => {
      try {
        const res = await fetch("/api/customers");
        const data = await res.json();
        setCustomers(data.customers || data || []);

        if (urlCustomerId) {
          setSelectedCustomerId(urlCustomerId);
          setIsLocked(true);
        } else {
          if (data.length > 0 && inputMode === "manual") {
            setSelectedCustomerId(data[0].id.toString());
          }
        }
      } catch (err) {
        setError("Failed to load customers.");
      }
    };
    initData();
  }, [urlCustomerId]);

  useEffect(() => {
    if (!isLocked && customers.length > 0) {
      if (inputMode === "manual" && selectedCustomerId === "auto") {
        setSelectedCustomerId(customers[0].id.toString());
      }
    }
  }, [inputMode, isLocked, customers]);

  // --- SCANNER SUCCESS CALLBACK ---
  const handleScanSuccess = (decodedText: string) => {
    setManualWaybill(decodedText);
    setIsScannerOpen(false);
  };

  const handleAddManual = () => {
    if (!manualWaybill.trim()) {
      setError("Waybill number is required.");
      return;
    }
    if (selectedCustomerId === "auto" || !selectedCustomerId) {
      setError("Please select a customer.");
      return;
    }

    const customer = customers.find(c => c.id.toString() === selectedCustomerId);

    const newEntry = {
      waybillNumber: manualWaybill.trim(),
      codAmount: manualCod.replace(/\D/g, "") || "0",
      receiverName: manualReceiver.trim() || customer?.name,
      customerId: customer?.id,
      customerName: customer?.name,
      status: "Pending",
      isUnlinked: false
    };

    setPendingList(prev => [newEntry, ...prev]);

    setManualWaybill("");
    setManualCod("");
    setManualReceiver("");
    setError("");
  };

  const handleAddBulk = async () => {
    if (!pasteText.trim()) return;
    setIsParsing(true);
    setError("");

    try {
      const lines = pasteText.trim().split("\n");
      const newEntries = lines.map((line) => {
        const columns = line.includes("\t") ? line.split("\t") : line.split(",");
        const waybill = columns[0]?.trim() || "";
        const cod = columns[1]?.replace(/\D/g, "") || "0";
        const rawReceiver = columns[2]?.trim() || "";

        let match;
        let finalReceiver = rawReceiver;

        if (selectedCustomerId !== "auto") {
          match = customers.find(c => c.id.toString() === selectedCustomerId);
          if (!finalReceiver) finalReceiver = match?.name;
        } else {
          match = customers.find(c => c.name.toLowerCase() === rawReceiver.toLowerCase());
        }

        return {
          waybillNumber: waybill,
          codAmount: cod,
          receiverName: finalReceiver || "Unknown",
          status: "Pending",
          customerId: match ? match.id : null,
          customerName: match ? match.name : rawReceiver || "Unknown",
          isUnlinked: !match
        };
      }).filter(item => item.waybillNumber !== "");

      setPendingList(prev => [...newEntries, ...prev]);
      setPasteText("");
    } catch (err) {
      setError("Failed to parse data.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleFinalSave = async () => {
    if (pendingList.length === 0) return;
    if (pendingList.some(item => item.isUnlinked)) {
      setError("Cannot save. Some bulk entries have unknown customers.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/deliveries/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingList.map(item => ({
          waybillNumber: item.waybillNumber,
          customerId: item.customerId,
          codAmount: parseInt(item.codAmount),
          receiverName: item.receiverName,
          status: item.status
        }))),
      });

      if (res.ok) router.push("/deliveries");
      else throw new Error("Server rejected save.");
    } catch (err) {
      setError("Failed to save deliveries.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAndLink = async () => {
    if (!qaName.trim()) return;
    const finalAddress = qaAddress.trim() || "Address not provided";
    setIsQuickAdding(true);
    setError("");

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: qaName.trim(),
          address: finalAddress,
          latitude: "0",
          longitude: "0",
        }),
      });

      if (!res.ok) throw new Error("Failed to create customer in database.");

      const fetchRes = await fetch("/api/customers");
      const fetchData = await fetchRes.json();
      const updatedCustomersList = fetchData.customers || fetchData || [];
      const newCust = updatedCustomersList.find((c: any) => c.name === qaName.trim());

      if (pendingLinkIndex !== null && newCust) {
        const updatedList = [...pendingList];
        updatedList[pendingLinkIndex] = {
          ...updatedList[pendingLinkIndex],
          customerId: newCust.id,
          customerName: newCust.name,
          isUnlinked: false
        };

        setPendingList(updatedList);
        setCustomers(updatedCustomersList);
        setShowQuickAdd(false);
        setQaName("");
        setQaAddress("");
        setPendingLinkIndex(null);
      } else {
        setError("Customer created, but failed to link automatically.");
      }
    } catch (err: any) {
      setError(err.message || "Error creating customer.");
    } finally {
      setIsQuickAdding(false);
    }
  };

  const handleResolveAll = async () => {
    setIsResolvingAll(true);
    setError("");

    try {
      const unlinkedNames = Array.from(new Set(pendingList.filter(item => item.isUnlinked).map(item => item.customerName)));

      if (unlinkedNames.length === 0) return;

      const bulkPayload = unlinkedNames.map((name) => ({
        name: name.trim(),
        address: "Address not provided",
        latitude: "0",
        longitude: "0",
        phoneNumber: null,
        housePictureUrl: null,
        notes: null
      }));

      const res = await fetch("/api/customers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bulkPayload),
      });

      if (!res.ok) {
        throw new Error("Failed to bulk resolve customers.");
      }

      const fetchRes = await fetch("/api/customers");
      const fetchData = await fetchRes.json();
      const updatedCustomersList = fetchData.customers || fetchData || [];

      setPendingList(prevList => prevList.map(item => {
        if (item.isUnlinked) {
          const match = updatedCustomersList.find((c: any) => c.name === item.customerName);
          if (match) {
            return {
              ...item,
              customerId: match.id,
              isUnlinked: false
            };
          }
        }
        return item;
      }));

      setCustomers(updatedCustomersList);

    } catch (err: any) {
      setError(err.message || "An error occurred while resolving all customers.");
    } finally {
      setIsResolvingAll(false);
    }
  };

  const getSelectedCustomerName = () => {
    if (selectedCustomerId === "auto") return "✨ Auto-Detect from Pasted Text";
    const cust = customers.find(c => c.id.toString() === selectedCustomerId);
    return cust ? cust.name : "Select a Customer...";
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    (c.phoneNumber && c.phoneNumber.includes(customerSearchQuery)) ||
    (c.address && c.address.toLowerCase().includes(customerSearchQuery.toLowerCase()))
  );

  const inputClass = "w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-[15px] font-medium text-gray-800 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-400 shadow-sm";

  const unlinkedCount = pendingList.filter(i => i.isUnlinked).length;

  return (
    <>
      <main className="mx-auto max-w-2xl p-4 sm:p-6 pb-32">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">New Deliveries</h1>
          {isLocked && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-[12px] font-bold text-purple-700">
              🔒 Locked to Customer ID: {urlCustomerId}
            </div>
          )}
        </div>

        {error && <p className="mb-6 rounded-2xl bg-red-50 p-4 text-[14px] font-bold text-red-600 border border-red-100">{error}</p>}

        <div className="rounded-[32px] bg-white p-2 shadow-sm border border-gray-100 mb-8 relative z-10">
          <div className="flex rounded-[24px] bg-gray-100 p-1 mb-6">
            <button onClick={() => setInputMode("manual")} className={`flex-1 rounded-[20px] py-3 text-[14px] font-bold transition-all duration-300 ${inputMode === "manual" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              Manual Entry
            </button>
            <button onClick={() => setInputMode("bulk")} className={`flex-1 rounded-[20px] py-3 text-[14px] font-bold transition-all duration-300 ${inputMode === "bulk" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              Bulk Paste
            </button>
          </div>

          <div className="px-4 pb-4 space-y-5">
            <div>
              <label className="mb-2 block text-[13px] font-black text-gray-800 uppercase tracking-wide">Assign To Customer</label>
              <button type="button" onClick={() => { if (!isLocked) { setCustomerSearchQuery(""); setIsCustomerModalOpen(true); } }} className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-[15px] font-bold transition-all shadow-sm ${isLocked ? "border-transparent bg-gray-100 text-gray-500 cursor-not-allowed opacity-80" : "border-gray-200 bg-gray-50 text-gray-900 hover:border-blue-400 focus:border-blue-500 focus:bg-white active:scale-[0.98]"}`}>
                <span className="truncate">{getSelectedCustomerName()}</span>
                {isLocked ? (
                  <svg className="h-5 w-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                ) : (
                  <svg className="h-5 w-5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                )}
              </button>
            </div>

            {inputMode === "manual" ? (
              <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
                <div>
                  <label className="mb-2 block text-[13px] font-black text-gray-800 uppercase tracking-wide">Waybill Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={manualWaybill}
                      onChange={(e) => setManualWaybill(e.target.value)}
                      placeholder="e.g. JP123456789 or scan..."
                      className={`${inputClass} pr-16`}
                    />
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="absolute right-2 top-2 bottom-2 flex w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 transition-all hover:bg-blue-200 active:scale-95"
                      title="Scan Barcode"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4M4 8h16M4 16h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-[13px] font-black text-gray-800 uppercase tracking-wide">COD Amount</label>
                    <input type="text" value={manualCod} onChange={(e) => setManualCod(e.target.value)} placeholder="0" className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-black text-gray-800 uppercase tracking-wide">Receiver Name</label>
                    <input type="text" value={manualReceiver} onChange={(e) => setManualReceiver(e.target.value)} placeholder="(Optional)" className={inputClass} />
                  </div>
                </div>
                <button onClick={handleAddManual} className="w-full rounded-full bg-blue-600 py-4 text-[15px] font-black text-white shadow-md active:scale-95 transition-all mt-2 hover:bg-blue-700">
                  + Add to List
                </button>
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="mb-2 block text-[13px] font-black text-gray-800 uppercase tracking-wide">Paste Data</label>
                  <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Waybill [Tab] COD Amount [Tab] Receiver Name" className={`${inputClass} font-mono text-sm h-32 border-dashed`} />
                </div>
                <button onClick={handleAddBulk} disabled={isParsing} className="w-full rounded-full bg-blue-600 py-4 text-[15px] font-black text-white shadow-md active:scale-95 transition-all disabled:bg-blue-300 mt-2 hover:bg-blue-700">
                  {isParsing ? "Parsing..." : "Extract & Add to List"}
                </button>
              </div>
            )}
          </div>
        </div>

        {pendingList.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 relative z-0">

            {/* RESOLVE ALL BANNER */}
            {unlinkedCount > 0 && (
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[24px] bg-orange-50 border border-orange-200 p-4 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-bold">
                    ⚠️
                  </div>
                  <div>
                    <p className="font-bold text-orange-900">{unlinkedCount} Unknown Customers</p>
                    <p className="text-[12px] font-medium text-orange-700">Quickly create them all at once.</p>
                  </div>
                </div>
                <button
                  onClick={handleResolveAll}
                  disabled={isResolvingAll}
                  className="rounded-xl bg-orange-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-sm active:scale-95 transition-all disabled:bg-orange-300"
                >
                  {isResolvingAll ? "Resolving..." : "Resolve All Automatically"}
                </button>
              </div>
            )}

            <div className="flex items-end justify-between mb-4 px-2 mt-6">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">Pending List</h2>
                <p className="text-sm font-medium text-gray-500">{pendingList.length} items ready</p>
              </div>
              <button onClick={() => setPendingList([])} className="text-[13px] font-bold text-red-500 hover:text-red-700 active:scale-95 transition-all">
                Clear All
              </button>
            </div>

            <div className="space-y-3 custom-scrollbar">
              {pendingList.map((item, i) => (
                <div key={i} className={`p-4 rounded-[24px] border transition-all ${item.isUnlinked ? 'bg-orange-50/50 border-orange-200' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 w-full pr-4">
                      <p className="text-[16px] font-black text-gray-900">{item.waybillNumber}</p>

                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {item.isUnlinked ? (
                          <>
                            <span className="inline-flex items-center rounded-md bg-orange-100 px-2 py-1 text-[11px] font-bold text-orange-800 ring-1 ring-inset ring-orange-600/20">
                              ⚠️ Unknown: {item.customerName}
                            </span>
                            <button
                              onClick={() => {
                                setPendingLinkIndex(i);
                                setQaName(item.customerName);
                                setShowQuickAdd(true);
                              }}
                              className="inline-flex items-center rounded-lg bg-orange-600 px-3 py-1 text-[11px] font-bold text-white shadow-sm active:scale-95 transition-transform"
                            >
                              RESOLVE
                            </button>
                          </>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            👤 {item.customerName}
                          </span>
                        )}
                      </div>

                      <p className="text-[13px] font-medium text-gray-500 mt-2">
                        <span className="font-bold text-gray-700">Receiver:</span> {item.receiverName}
                        <span className="mx-2 text-gray-300">|</span>
                        <span className="font-bold text-gray-700">COD:</span> Rp {parseInt(item.codAmount).toLocaleString('id-ID')}
                      </p>
                    </div>

                    <button onClick={() => setPendingList(pendingList.filter((_, idx) => idx !== i))} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-4 mt-8 z-20">
              <button
                onClick={handleFinalSave}
                disabled={isLoading || unlinkedCount > 0}
                className="w-full rounded-full bg-[#111827] py-4 text-[16px] font-black text-white shadow-xl hover:bg-black active:scale-95 transition-all disabled:bg-gray-300 disabled:shadow-none"
              >
                {isLoading ? "Saving Database..." : `SAVE ${pendingList.length} WAYBILLS`}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* --- QUICK ADD / RESOLVE MODAL --- */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowQuickAdd(false)}></div>
          <div className="relative w-full max-w-md rounded-[32px] bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-gray-200 sm:hidden"></div>

            <h2 className="text-xl font-extrabold text-gray-900">Resolve Unknown Customer</h2>
            <p className="mt-1 mb-6 text-[14px] font-medium text-gray-500">
              Create a new customer profile for <strong className="text-gray-800">{qaName}</strong> to link this waybill.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[12px] font-bold text-gray-700 uppercase">Full Name</label>
                <input value={qaName} onChange={(e) => setQaName(e.target.value)} className={inputClass} placeholder="Customer Name" />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-bold text-gray-700 uppercase">Address <span className="text-gray-400 normal-case font-medium">(Optional)</span></label>
                <textarea value={qaAddress} onChange={(e) => setQaAddress(e.target.value)} className={inputClass} placeholder="Full Address" rows={2} />
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowQuickAdd(false)} className="flex-1 rounded-full bg-gray-100 py-3.5 text-[14px] font-bold text-gray-700 active:scale-95 transition-all">
                  Cancel
                </button>
                <button onClick={handleCreateAndLink} disabled={isQuickAdding || !qaName.trim()} className="flex-[2] rounded-full bg-blue-600 py-3.5 text-[14px] font-bold text-white shadow-md active:scale-95 transition-all disabled:bg-blue-300">
                  {isQuickAdding ? "Saving..." : "Create & Link"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SEARCHABLE CUSTOMER MODAL --- */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={() => setIsCustomerModalOpen(false)}></div>
          <div className="relative w-full max-w-md flex flex-col max-h-[85vh] rounded-[32px] bg-white shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 bg-white z-10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-extrabold text-gray-900">Select Customer</h2>
                <button onClick={() => setIsCustomerModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">✕</button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input type="text" autoFocus placeholder="Search name, phone, or address..." value={customerSearchQuery} onChange={(e) => setCustomerSearchQuery(e.target.value)} className="w-full rounded-2xl border-none bg-gray-100 pl-11 pr-4 py-3.5 text-[15px] font-medium text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none placeholder:text-gray-400" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {inputMode === "bulk" && !customerSearchQuery && (
                <button onClick={() => { setSelectedCustomerId("auto"); setIsCustomerModalOpen(false); }} className="w-full flex items-center gap-4 rounded-2xl p-4 transition-all hover:bg-blue-50/50 active:scale-[0.98] mb-2">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl shadow-inner">✨</div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-bold text-blue-700 text-[15px] truncate">Auto-Detect Customer</p>
                    <p className="text-[12px] font-medium text-blue-500/80 truncate">Extracts names directly from pasted text</p>
                  </div>
                </button>
              )}

              {filteredCustomers.length > 0 ? (
                <div className="space-y-1">
                  {filteredCustomers.map((c) => (
                    <button key={c.id} onClick={() => { setSelectedCustomerId(c.id.toString()); setIsCustomerModalOpen(false); }} className={`w-full flex items-center justify-between rounded-2xl p-4 transition-all active:scale-[0.98] ${selectedCustomerId === c.id.toString() ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-4 text-left w-full min-w-0">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold shadow-sm border ${selectedCustomerId === c.id.toString() ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-100'}`}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <p className={`font-bold text-[15px] truncate leading-tight ${selectedCustomerId === c.id.toString() ? 'text-blue-900' : 'text-gray-900'}`}>{c.name}</p>
                          <p className={`text-[12px] font-medium mt-0.5 ${selectedCustomerId === c.id.toString() ? 'text-blue-600' : 'text-gray-500'}`}>{c.phoneNumber || "No phone number"}</p>
                          <p className="text-[11px] font-medium text-gray-400 truncate mt-0.5">{c.address || "No address provided"}</p>
                        </div>
                      </div>
                      {selectedCustomerId === c.id.toString() && (
                        <svg className="h-6 w-6 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center px-4">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">🔍</div>
                  <p className="text-[15px] font-bold text-gray-900">No customers found</p>
                  <p className="text-[13px] font-medium text-gray-500 mt-1">Try a different name, phone, or address.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- SCANNER MODAL --- */}
      {isScannerOpen && (
        <ScannerModal
          onScanSuccess={handleScanSuccess}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </>
  );
}

// -------------------------------------------------------------
// MAIN PAGE EXPORT: Fixed to use the 100dvh sticky layout
// -------------------------------------------------------------
export default function GlobalDeliveryPage() {
  return (
    <div className="flex flex-col h-[100dvh] bg-[#F8F9FA] overflow-hidden">

      {/* Fixed Header & Breadcrumbs */}
      <div className="shrink-0 z-30 bg-[#F8F9FA]">
        <Header />
        <Breadcrumbs />
      </div>

      {/* Scrollable Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        <Suspense fallback={
          <div className="flex h-full items-center justify-center">
            <span className="animate-pulse font-bold text-gray-400">Loading Hub...</span>
          </div>
        }>
          <DeliveryHubContent />
        </Suspense>
      </div>

    </div>
  );
}

