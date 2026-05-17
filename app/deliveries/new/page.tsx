// app/deliveries/new/page.tsx

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import ScannerModal from "@/components/ScannerModal";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";

function DeliveryHubContent() {
  const { t } = useLanguage();
  const { showToast } = useToast();
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

  const fetchSingleCustomer = async (id: string) => {
    const res = await fetch(`/api/customers/${id}`);
    if (!res.ok) throw new Error("Failed to fetch customer");
    return res.json();
  };

  const fetchCustomersPage = async (lim = 500) => {
    const res = await fetch(`/api/customers?limit=${lim}`);
    const data = await res.json();
    return data.customers || data || [];
  };

  useEffect(() => {
    const initData = async () => {
      try {
        if (urlCustomerId) {
          const customer = await fetchSingleCustomer(urlCustomerId);
          setCustomers([customer]);
          setSelectedCustomerId(urlCustomerId);
          setIsLocked(true);
        } else {
          const list = await fetchCustomersPage();
          setCustomers(list);
          if (list.length > 0 && inputMode === "manual") {
            setSelectedCustomerId(list[0].id.toString());
          }
        }
      } catch (err) {
        setError(t("action.loading"));
      }
    };
    initData();
  }, [urlCustomerId, t, inputMode]);

  useEffect(() => {
    if (!isLocked && customers.length > 0) {
      if (inputMode === "manual" && selectedCustomerId === "auto") {
        setSelectedCustomerId(customers[0].id.toString());
      }
    }
  }, [inputMode, isLocked, customers, selectedCustomerId]);

  // --- SCANNER SUCCESS CALLBACK ---
  const handleScanSuccess = (decodedText: string) => {
    setManualWaybill(decodedText);
    setIsScannerOpen(false);
    showToast("Barcode scanned!", "success");
  };

  const handleAddManual = () => {
    if (!manualWaybill.trim()) {
      setError(t("delivery.err_waybill_req") || "Waybill number is required.");
      return;
    }
    if (selectedCustomerId === "auto" || !selectedCustomerId) {
      setError(t("delivery.err_customer_req") || "Please select a customer.");
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
    showToast("Added to list", "info");
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
      showToast(`Parsed ${newEntries.length} items`, "success");
    } catch (err) {
      setError(t("delivery.err_parse") || "Failed to parse data.");
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

      if (res.ok) {
        showToast(`Saved ${pendingList.length} deliveries!`, "success");
        router.push("/deliveries");
      }
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create customer in database.");

      const newCust = data.customer;

      if (pendingLinkIndex !== null && newCust) {
        const updatedList = [...pendingList];
        updatedList[pendingLinkIndex] = {
          ...updatedList[pendingLinkIndex],
          customerId: newCust.id,
          customerName: newCust.name,
          isUnlinked: false
        };

        setPendingList(updatedList);
        setCustomers(prev => [newCust, ...prev]);
        setShowQuickAdd(false);
        setQaName("");
        setQaAddress("");
        setPendingLinkIndex(null);
        showToast(`Linked to ${newCust.name}`, "success");
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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to bulk resolve customers.");
      }

      const createdCustomers: any[] = data.customers || [];

      setPendingList(prevList => prevList.map(item => {
        if (item.isUnlinked) {
          const match = createdCustomers.find((c: any) => c.name === item.customerName);
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

      setCustomers(prev => [...createdCustomers, ...prev]);
      showToast(`Resolved ${unlinkedNames.length} customers`, "success");

    } catch (err: any) {
      setError(err.message || "An error occurred while resolving all customers.");
    } finally {
      setIsResolvingAll(false);
    }
  };

  const getSelectedCustomerName = () => {
    if (selectedCustomerId === "auto") return `✨ ${t("delivery.auto_detect")}`;
    const cust = customers.find(c => c.id.toString() === selectedCustomerId);
    return cust ? cust.name : t("delivery.select_cust");
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    (c.phoneNumber && c.phoneNumber.includes(customerSearchQuery)) ||
    (c.address && c.address.toLowerCase().includes(customerSearchQuery.toLowerCase()))
  );

  const inputClass = "w-full rounded-2xl border border-card-border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-5 py-3.5 text-[15px] font-medium text-primary dark:text-slate-100 transition-all focus:border-blue-500 focus:bg-card dark:focus:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-secondary shadow-inner";

  const unlinkedCount = pendingList.filter(i => i.isUnlinked).length;

  return (
    <>
      <main className="mx-auto max-w-2xl p-4 sm:p-6 pb-32">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">{t("delivery.hub_title")}</h1>
          {isLocked && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-[12px] font-bold text-blue-700 dark:text-blue-300">
              🔒 Locked to Customer ID: {urlCustomerId}
            </div>
          )}
        </div>

        {error && <p className="mb-6 rounded-2xl bg-red-50 dark:bg-red-950/20 p-4 text-[14px] font-bold text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50">{error}</p>}

        <div className="rounded-[32px] bg-card p-2 shadow-sm border border-card-border mb-8 relative z-10">
          <div className="flex rounded-full bg-surface-hover p-1 mb-6">
            <button 
              onClick={() => setInputMode("manual")} 
              className={`flex-1 rounded-full py-3 text-[14px] font-black transition-all active:scale-95 ${inputMode === "manual" ? "bg-card text-blue-700 dark:text-blue-400 shadow-sm" : "text-secondary hover:text-primary"}`}
            >
              {t("delivery.manual")}
            </button>
            <button 
              onClick={() => setInputMode("bulk")} 
              className={`flex-1 rounded-full py-3 text-[14px] font-black transition-all active:scale-95 ${inputMode === "bulk" ? "bg-card text-blue-700 dark:text-blue-400 shadow-sm" : "text-secondary hover:text-primary"}`}
            >
              {t("delivery.bulk")}
            </button>
          </div>

          <div className="px-4 pb-4 space-y-5">
            <div>
              <label className="mb-2 block text-[13px] font-black text-secondary uppercase tracking-wide ml-1">{t("delivery.assign_to")}</label>
              <button type="button" onClick={() => { if (!isLocked) { setCustomerSearchQuery(""); setIsCustomerModalOpen(true); } }} className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-[15px] font-bold transition-all shadow-sm ${isLocked ? "border-transparent bg-surface-hover text-secondary cursor-not-allowed opacity-80" : "border-card-border bg-gray-50 dark:bg-slate-800 text-primary hover:border-blue-400 focus:border-blue-500 focus:bg-card dark:focus:bg-slate-900 active:scale-[0.98]"}`}>
                <span className="truncate">{getSelectedCustomerName()}</span>
                {isLocked ? (
                  <svg className="h-5 w-5 text-secondary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                ) : (
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                )}
              </button>
            </div>

            {inputMode === "manual" ? (
              <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
                <div>
                  <label className="mb-2 block text-[13px] font-black text-secondary uppercase tracking-wide ml-1">{t("delivery.waybill_num")}</label>
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
                      className="absolute right-2 top-2 bottom-2 flex w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-all hover:bg-blue-200 dark:hover:bg-blue-800/50 active:scale-90"
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
                    <label className="mb-2 block text-[13px] font-black text-secondary uppercase tracking-wide ml-1">{t("delivery.cod")}</label>
                    <input type="text" value={manualCod} onChange={(e) => setManualCod(e.target.value)} placeholder="0" className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-black text-secondary uppercase tracking-wide ml-1">{t("delivery.receiver")}</label>
                    <input type="text" value={manualReceiver} onChange={(e) => setManualReceiver(e.target.value)} placeholder="(Optional)" className={inputClass} />
                  </div>
                </div>
                <button onClick={handleAddManual} className="btn-primary w-full py-4 text-[15px] mt-2">
                  {t("delivery.add_list")}
                </button>
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="mb-2 block text-[13px] font-black text-secondary uppercase tracking-wide ml-1">{t("delivery.bulk")}</label>
                  <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Waybill [Tab] COD Amount [Tab] Receiver Name" className={`${inputClass} font-mono text-sm h-32 border-dashed`} />
                </div>
                <button onClick={handleAddBulk} disabled={isParsing} className="btn-primary w-full py-4 text-[15px] mt-2 disabled:bg-blue-300 dark:disabled:bg-blue-900/50">
                  {isParsing ? t("action.loading") : t("delivery.extract_list")}
                </button>
              </div>
            )}
          </div>
        </div>

        {pendingList.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 relative z-0">

            {/* RESOLVE ALL BANNER */}
            {unlinkedCount > 0 && (
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[24px] bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 p-4 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 font-bold">
                    ⚠️
                  </div>
                  <div>
                    <p className="font-bold text-orange-900 dark:text-orange-100">{unlinkedCount} {t("delivery.unknown_cust")}</p>
                    <p className="text-[12px] font-medium text-orange-700 dark:text-orange-300">Quickly create them all at once.</p>
                  </div>
                </div>
                <button
                  onClick={handleResolveAll}
                  disabled={isResolvingAll}
                  className="rounded-xl bg-orange-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-sm active:scale-90 transition-all disabled:bg-orange-300"
                >
                  {isResolvingAll ? t("action.loading") : t("delivery.resolve_auto")}
                </button>
              </div>
            )}

            <div className="flex items-end justify-between mb-4 px-2 mt-6">
              <div>
                <h2 className="text-xl font-extrabold text-primary">{t("delivery.pending_list")}</h2>
                <p className="text-sm font-medium text-secondary">{pendingList.length} {t("delivery.items_ready")}</p>
              </div>
              <button onClick={() => setPendingList([])} className="text-[13px] font-black text-red-500 uppercase tracking-wider active:scale-90 transition-transform">
                {t("action.clear_all")}
              </button>
            </div>

            <div className="space-y-3 custom-scrollbar">
              {pendingList.map((item, i) => (
                <div key={i} className={`p-4 rounded-[24px] border transition-all ${item.isUnlinked ? 'bg-orange-50/50 dark:bg-orange-950/10 border-orange-200 dark:border-orange-900/40' : 'bg-card border-card-border shadow-sm'}`}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 w-full pr-4">
                      <p className="text-[16px] font-black text-primary">{item.waybillNumber}</p>

                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {item.isUnlinked ? (
                          <>
                            <span className="inline-flex items-center rounded-md bg-orange-100 dark:bg-orange-900/40 px-2 py-1 text-[11px] font-bold text-orange-800 dark:text-orange-300 ring-1 ring-inset ring-orange-600/20">
                              ⚠️ Unknown: {item.customerName}
                            </span>
                            <button
                              onClick={() => {
                                setPendingLinkIndex(i);
                                setQaName(item.customerName);
                                setShowQuickAdd(true);
                              }}
                              className="inline-flex items-center rounded-lg bg-orange-600 px-3 py-1 text-[11px] font-bold text-white shadow-sm active:scale-90 transition-transform"
                            >
                              {t("action.resolve")}
                            </button>
                          </>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/40 px-2 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10">
                            👤 {item.customerName}
                          </span>
                        )}
                      </div>

                      <p className="text-[13px] font-medium text-secondary mt-2">
                        <span className="font-bold text-primary">{t("delivery.receiver")}:</span> {item.receiverName}
                        <span className="mx-2 text-secondary/30">|</span>
                        <span className="font-bold text-primary">{t("delivery.cod")}:</span> Rp {parseInt(item.codAmount).toLocaleString('id-ID')}
                      </p>
                    </div>

                    <button onClick={() => setPendingList(pendingList.filter((_, idx) => idx !== i))} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-hover text-secondary hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors active:scale-90">
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
                className="btn-primary !bg-gray-900 dark:!bg-slate-100 !text-white dark:!text-slate-900 w-full py-5 text-[16px] uppercase tracking-wider"
              >
                {isLoading ? t("action.loading") : t("delivery.save_db").replace("[N]", pendingList.length.toString())}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* --- QUICK ADD / RESOLVE MODAL --- */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-gray-900/60 dark:bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setShowQuickAdd(false)}></div>
          <div className="relative w-full max-w-md rounded-[32px] bg-card p-6 shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-surface-hover sm:hidden"></div>

            <h2 className="text-xl font-extrabold text-primary">{t("delivery.unknown_cust")}</h2>
            <p className="mt-1 mb-6 text-[14px] font-medium text-secondary">
              Create a new customer profile for <strong className="text-primary">{qaName}</strong> to link this waybill.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[12px] font-black text-secondary uppercase tracking-widest ml-1">{t("auth.username")}</label>
                <input value={qaName} onChange={(e) => setQaName(e.target.value)} className={inputClass} placeholder="Customer Name" />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-black text-secondary uppercase tracking-widest ml-1">Address <span className="text-secondary/50 normal-case font-medium">(Optional)</span></label>
                <textarea value={qaAddress} onChange={(e) => setQaAddress(e.target.value)} className={inputClass} placeholder="Full Address" rows={2} />
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowQuickAdd(false)} className="btn-outline flex-1">
                  {t("action.cancel")}
                </button>
                <button onClick={handleCreateAndLink} disabled={isQuickAdding || !qaName.trim()} className="btn-primary flex-[2]">
                  {isQuickAdding ? t("action.loading") : t("action.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SEARCHABLE CUSTOMER MODAL --- */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setIsCustomerModalOpen(false)}></div>
          <div className="relative w-full max-w-md flex flex-col max-h-[85vh] rounded-[32px] bg-card shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-card-border bg-card z-10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-extrabold text-primary">{t("delivery.select_cust")}</h2>
                <button onClick={() => setIsCustomerModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-secondary hover:bg-secondary/80 transition-colors active:scale-90">✕</button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input type="text" autoFocus placeholder={t("admin.search_placeholder")} value={customerSearchQuery} onChange={(e) => setCustomerSearchQuery(e.target.value)} className="w-full rounded-2xl border-none bg-surface-hover pl-11 pr-4 py-3.5 text-[15px] font-medium text-primary focus:bg-card focus:ring-4 focus:ring-blue-500/10 transition-all outline-none placeholder:text-secondary" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {inputMode === "bulk" && !customerSearchQuery && (
                <button onClick={() => { setSelectedCustomerId("auto"); setIsCustomerModalOpen(false); }} className="w-full flex items-center gap-4 rounded-2xl p-4 transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/10 active:scale-[0.98] mb-2">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-xl shadow-inner">✨</div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-bold text-blue-700 dark:text-blue-400 text-[15px] truncate">{t("delivery.auto_detect")}</p>
                    <p className="text-[12px] font-medium text-blue-500/80 dark:text-blue-300/60 truncate">Extracts names directly from pasted text</p>
                  </div>
                </button>
              )}

              {filteredCustomers.length > 0 ? (
                <div className="space-y-1">
                  {filteredCustomers.map((c) => (
                    <button key={c.id} onClick={() => { setSelectedCustomerId(c.id.toString()); setIsCustomerModalOpen(false); }} className={`w-full flex items-center justify-between rounded-2xl p-4 transition-all active:scale-[0.98] ${selectedCustomerId === c.id.toString() ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-surface-hover'}`}>
                      <div className="flex items-center gap-4 text-left w-full min-w-0">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold shadow-sm border ${selectedCustomerId === c.id.toString() ? 'bg-blue-600 text-white border-blue-700' : 'bg-card text-primary border-card-border'}`}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <p className={`font-bold text-[15px] truncate leading-tight ${selectedCustomerId === c.id.toString() ? 'text-blue-900 dark:text-blue-200' : 'text-primary'}`}>{c.name}</p>
                          <p className={`text-[12px] font-medium mt-0.5 ${selectedCustomerId === c.id.toString() ? 'text-blue-600 dark:text-blue-400' : 'text-secondary'}`}>{c.phoneNumber || "No phone number"}</p>
                        </div>
                      </div>
                      {selectedCustomerId === c.id.toString() && (
                        <svg className="h-6 w-6 text-blue-600 dark:text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center px-4">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface-hover text-2xl">🔍</div>
                  <p className="text-[15px] font-bold text-primary">{t("search.no_results")}</p>
                  <p className="text-[13px] font-medium text-secondary mt-1">Try a different name, phone, or address.</p>
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
// MAIN PAGE EXPORT
// -------------------------------------------------------------
export default function GlobalDeliveryPage() {
  return (
    <div className="min-h-screen bg-background">
      <Breadcrumbs />
      <Suspense fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <span className="animate-pulse font-bold text-secondary">Loading Hub...</span>
        </div>
      }>
        <DeliveryHubContent />
      </Suspense>
    </div>
  );
}
