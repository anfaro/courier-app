"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useScrollLock } from "@/lib/useScrollLock";
import Icon from "@/components/Icon";

interface Customer {
  id: string;
  name: string;
  phoneNumber?: string;
  address?: string;
}

interface ParsedItem {
  rawName: string;
  packages: number;
  match: Customer | null;
  confidence: number;
}

interface ProcessedImage {
  url: string;
  entries: ParsedItem[];
}

interface ScanModalProps {
  show: boolean;
  onClose: () => void;
  onScan: (assignments: Record<string, number>, customerNames: Record<string, string>) => void;
  t: (key: string) => string;
}

const ADDRESS_PREFIXES = [
  "jl.", "jl ", "jalan ", "jln ", "rt ", "rw ", "no. ", "no ",
  "nomor ", "kec. ", "kec ", "kecamatan ", "kel. ", "kel ",
  "kelurahan ", "desa ", "kab. ", "kab ", "kota ", "prov. ", "prov ",
  "provinsi ", "gang ", "gg. ", "gg ", "perum ", "perumahan ",
  "komplek ", "kompleks ", "blok ", "block ", "dusun ", "dsn. ", "dsn ",
];

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function findBestMatch(rawName: string, customers: Customer[]): { match: Customer | null; confidence: number } {
  const normalized = normalizeName(rawName);
  if (!normalized) return { match: null, confidence: 0 };
  let best: Customer | null = null;
  let bestScore = Infinity;
  for (const c of customers) {
    const cn = normalizeName(c.name);
    const dist = levenshtein(normalized, cn);
    const score = dist / Math.max(normalized.length, cn.length);
    if (score < bestScore) { bestScore = score; best = c; }
  }
  for (const c of customers) {
    const cn = normalizeName(c.name);
    if (cn.includes(normalized) || normalized.includes(cn)) {
      if (0.1 < bestScore) { bestScore = 0.1; best = c; }
    }
  }
  const confidence = Math.max(0, Math.round((1 - bestScore) * 100));
  if (bestScore > 0.5) return { match: null, confidence: 0 };
  return { match: best, confidence };
}

function searchCustomers(query: string, customers: Customer[]): Customer[] {
  const q = query.toLowerCase();
  return customers.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      (c.phoneNumber && c.phoneNumber.includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
  );
}

function isWaybill(line: string): boolean { return /^\d{6,}$/.test(line); }

function isPhone(line: string): boolean {
  return /^(\+62|0|62)\d[\d\s-]{6,}$/.test(line.replace(/[-()\s]/g, ""));
}

function isAddress(line: string): boolean {
  const lower = line.toLowerCase().trim();
  if (ADDRESS_PREFIXES.some((pre) => lower.startsWith(pre))) return true;
  if (/\b\d{2,}\s*[A-Za-z]/.test(line) && /[A-Za-z]{2,}/.test(line)) return true;
  return false;
}

function isCustomerName(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 60) return false;
  if (isWaybill(trimmed)) return false;
  if (isPhone(trimmed)) return false;
  if (isAddress(trimmed)) return false;
  if (/^[\d\s/-]+$/.test(trimmed)) return false;
  if (/^[\d]+[A-Za-z]/.test(trimmed) && /[A-Za-z].*\d/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 0 && words.every((w) => /^[A-Za-z.']+$/.test(w.replace(/\./g, "")))) return true;
  return false;
}

function extractNames(text: string, customers: Customer[]): ParsedItem[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const results: ParsedItem[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const cleaned = line.replace(/^[-•·*|=_>\s]+/, "").replace(/[|=_]+$/, "").trim();
    if (!cleaned || seen.has(cleaned.toLowerCase())) continue;
    if (isCustomerName(cleaned)) {
      seen.add(cleaned.toLowerCase());
      const { match, confidence } = findBestMatch(cleaned, customers);
      results.push({ rawName: cleaned, packages: 1, match, confidence });
    }
  }
  return results;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function processFile(file: File): Promise<{ text: string; dataUrl: string }> {
  const [dataUrl, text] = await Promise.all([
    readFileAsDataURL(file),
    (async () => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/incoming/scan", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Scan failed");
      }
      const data = await res.json();
      return data.text || "";
    })(),
  ]);
  return { text, dataUrl };
}

export default function ScanModal({ show, onClose, onScan, t }: ScanModalProps) {
  const [step, setStep] = useState<"pick" | "processing" | "match">("pick");
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState("");
  const [processingIndex, setProcessingIndex] = useState(0);
  const [processingTotal, setProcessingTotal] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickAddress, setQuickAddress] = useState("");
  const [quickAddError, setQuickAddError] = useState("");
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useScrollLock(show);

  useEffect(() => {
    if (show) {
      setStep("pick");
      setError("");
      setProcessingIndex(0);
      setProcessingTotal(0);
      setIsProcessing(false);
      setProcessedImages([]);
      setCurrentImageIndex(0);
      setEditingIndex(null);
      setShowQuickAdd(false);
      setQuickName("");
      setQuickPhone("");
      setQuickAddress("");
      setQuickAddError("");
    }
  }, [show]);

  useEffect(() => {
    if (!show) return;
    fetch("/api/customers?limit=9999")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setAllCustomers(data.customers || []))
      .catch(() => {});
  }, [show]);

  async function handleFiles(fileList: FileList | null) {
    if (isProcessing || !fileList || fileList.length === 0) return;
    setIsProcessing(true);
    setStep("processing");
    setError("");

    const files = Array.from(fileList);
    setProcessingTotal(files.length);

    const results: ProcessedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      setProcessingIndex(i + 1);
      try {
        const { text, dataUrl } = await processFile(files[i]);
        const entries = extractNames(text, allCustomers);
        results.push({ url: dataUrl, entries });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Scan failed");
        setIsProcessing(false);
        setStep("pick");
        return;
      }
    }

    setIsProcessing(false);
    setProcessedImages(results);
    setCurrentImageIndex(0);
    setStep("match");
  }

  function handleGallery(e: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
    if (e.target) e.target.value = "";
  }

  function handleCamera(e: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
    if (e.target) e.target.value = "";
  }

  function handlePrevImage() {
    setCurrentImageIndex((prev) => Math.max(0, prev - 1));
    setEditingIndex(null);
    setShowQuickAdd(false);
  }

  function handleNextImage() {
    setCurrentImageIndex((prev) => Math.min(processedImages.length - 1, prev + 1));
    setEditingIndex(null);
    setShowQuickAdd(false);
  }

  function handleEntryMatch(index: number, customer: Customer) {
    setProcessedImages((prev) => {
      const updated = [...prev];
      const entries = [...updated[currentImageIndex].entries];
      entries[index] = { ...entries[index], match: customer, confidence: 100 };
      updated[currentImageIndex] = { ...updated[currentImageIndex], entries };
      return updated;
    });
    setEditingIndex(null);
  }

  function handleEntryRemove(index: number) {
    setProcessedImages((prev) => {
      const updated = [...prev];
      const entries = updated[currentImageIndex].entries.filter((_, i) => i !== index);
      updated[currentImageIndex] = { ...updated[currentImageIndex], entries };
      return updated;
    });
    if (editingIndex === index) setEditingIndex(null);
  }

  function handlePackagesChange(index: number, delta: number) {
    setProcessedImages((prev) => {
      const updated = [...prev];
      const entries = [...updated[currentImageIndex].entries];
      entries[index] = {
        ...entries[index],
        packages: Math.max(1, entries[index].packages + delta),
      };
      updated[currentImageIndex] = { ...updated[currentImageIndex], entries };
      return updated;
    });
  }

  async function handleQuickAdd(name: string) {
    if (!name.trim()) return;
    setQuickAddSaving(true);
    setQuickAddError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phoneNumber: quickPhone.trim(),
          address: quickAddress.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newCustomer: Customer = data.customer || data;
        setAllCustomers((prev) => [newCustomer, ...prev]);
        if (editingIndex !== null) {
          handleEntryMatch(editingIndex, newCustomer);
        }
        setShowQuickAdd(false);
        setQuickName("");
        setQuickPhone("");
        setQuickAddress("");
      } else {
        const err = await res.json();
        setQuickAddError(err.message || err.error || "Failed to create customer");
      }
    } catch {
      setQuickAddError("Network error");
    } finally {
      setQuickAddSaving(false);
    }
  }

  function handleUse() {
    const assignments: Record<string, number> = {};
    const customerNames: Record<string, string> = {};
    for (const img of processedImages) {
      for (const entry of img.entries) {
        const id = entry.match?.id || entry.rawName;
        const name = entry.match?.name || entry.rawName;
        assignments[id] = (assignments[id] || 0) + entry.packages;
        customerNames[id] = name;
      }
    }
    onScan(assignments, customerNames);
    onClose();
  }

  const currentImage = processedImages[currentImageIndex];
  const totalEntries = processedImages.reduce((s, img) => s + img.entries.length, 0);

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-lg bg-card rounded-t-[32px] sm:rounded-[32px] flex flex-col max-h-[85vh] shadow-2xl"
          >
            {/* Header */}
            <div className="shrink-0 p-6 pb-3">
              <h2 className="text-[20px] font-extrabold text-primary mb-1">
                {step === "match" ? t("session.scan_title") : t("session.scan_title")}
              </h2>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-6">
              {step === "pick" && (
                <>
                  <p className="text-[13px] font-medium text-secondary mb-6">
                    {t("session.scan_desc")}
                  </p>
                  {error && (
                    <p className="text-[13px] font-bold text-red-500 mb-4 bg-red-50 dark:bg-red-950/30 rounded-2xl p-3">
                      {error}
                    </p>
                  )}
                  <div className="space-y-3">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full flex items-center gap-4 rounded-[24px] bg-surface-hover border border-card-border p-5 active:scale-90 transition-transform"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        <Icon name="camera" size={22} />
                      </div>
                      <div className="text-left">
                        <p className="text-[15px] font-bold text-primary">{t("session.scan_take")}</p>
                        <p className="text-[11px] font-medium text-secondary">Capture manifest with camera</p>
                      </div>
                    </motion.button>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      className="hidden"
                      onChange={handleCamera}
                    />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-4 rounded-[24px] bg-surface-hover border border-card-border p-5 active:scale-90 transition-transform"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <Icon name="image" size={22} />
                      </div>
                      <div className="text-left">
                        <p className="text-[15px] font-bold text-primary">{t("session.scan_gallery")}</p>
                        <p className="text-[11px] font-medium text-secondary">Choose multiple images from gallery</p>
                      </div>
                    </motion.button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleGallery}
                    />
                  </div>
                </>
              )}

              {step === "processing" && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <span className="h-10 w-10 rounded-full border-3 border-blue-500 border-t-transparent animate-spin" />
                  <p className="text-[15px] font-bold text-primary">{t("session.scan_processing")}</p>
                  {processingTotal > 1 && (
                    <p className="text-[13px] font-medium text-secondary">
                      {processingIndex} / {processingTotal}
                    </p>
                  )}
                </div>
              )}

              {step === "match" && currentImage && (
                <div className="pb-4">
                  {/* Image carousel */}
                  <div className="relative rounded-[20px] overflow-hidden bg-surface-hover border border-card-border mb-2">
                    <img
                      src={currentImage.url}
                      alt="Manifest"
                      className="w-full h-72 sm:h-80 object-contain bg-black/5"
                    />
                    {processedImages.length > 1 && (
                      <>
                        <button
                          onClick={handlePrevImage}
                          disabled={currentImageIndex === 0}
                          className="absolute left-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white disabled:opacity-20 active:scale-90"
                        >
                          <Icon name="chevron-left" size={18} />
                        </button>
                        <button
                          onClick={handleNextImage}
                          disabled={currentImageIndex === processedImages.length - 1}
                          className="absolute right-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white disabled:opacity-20 active:scale-90"
                        >
                          <Icon name="chevron-right" size={18} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Dots */}
                  {processedImages.length > 1 && (
                    <div className="flex items-center justify-center gap-1.5 mb-3">
                      {processedImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => { setCurrentImageIndex(i); setEditingIndex(null); setShowQuickAdd(false); }}
                          className={`h-1.5 rounded-full transition-all ${
                            i === currentImageIndex
                              ? "w-5 bg-blue-600"
                              : "w-1.5 bg-secondary/30"
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Entry count */}
                  <p className="text-[12px] font-bold text-secondary uppercase tracking-widest mb-2">
                    {currentImage.entries.length} {t("session.customers")}
                  </p>

                  {/* Entries */}
                  {currentImage.entries.length === 0 ? (
                    <p className="text-[13px] font-medium text-secondary text-center py-6">
                      {t("session.scan_no_text")}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {currentImage.entries.map((item, i) => {
                        const isEditing = editingIndex === i;
                        return (
                          <div key={i}>
                            <motion.div
                              layout
                              transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              className={`rounded-2xl border overflow-hidden ${
                                isEditing
                                  ? "border-blue-400 dark:border-blue-600"
                                  : "border-card-border"
                              }`}
                            >
                              {/* Entry header */}
                              <div className="flex items-center gap-2 p-3 bg-surface-hover">
                                <motion.button
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() => handleEntryRemove(i)}
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400 active:scale-90"
                                >
                                  <Icon name="close" size={10} strokeWidth={3} />
                                </motion.button>

                                {/* Package stepper */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <motion.button
                                    whileTap={{ scale: 0.85 }}
                                    onClick={() => handlePackagesChange(i, -1)}
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-hover text-primary font-black border border-card-border active:scale-90"
                                  >
                                    <Icon name="minus" size={10} />
                                  </motion.button>
                                  <span className="w-6 text-center text-[13px] font-black text-primary">
                                    {item.packages}
                                  </span>
                                  <motion.button
                                    whileTap={{ scale: 0.85 }}
                                    onClick={() => handlePackagesChange(i, 1)}
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-black active:scale-90"
                                  >
                                    <Icon name="plus" size={10} />
                                  </motion.button>
                                </div>

                                {/* Name + match status */}
                                <button
                                  onClick={() => {
                                    if (isEditing) { setEditingIndex(null); setShowQuickAdd(false); }
                                    else { setEditingIndex(i); setShowQuickAdd(false); }
                                  }}
                                  className="flex-1 min-w-0 text-left active:scale-90 transition-transform"
                                >
                                  <p className="text-[13px] font-bold text-primary truncate">{item.rawName}</p>
                                  {item.match ? (
                                    <p className="text-[11px] font-medium text-emerald-600 truncate">
                                      {item.match.name} · {item.confidence}%
                                    </p>
                                  ) : (
                                    <p className="text-[11px] font-medium text-amber-600">
                                      {t("session.scan_unmatched")} — tap to match
                                    </p>
                                  )}
                                </button>

                                {!isEditing && (
                                  <motion.button
                                    whileTap={{ scale: 0.85 }}
                                    onClick={() => { setEditingIndex(i); setShowQuickAdd(false); }}
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-hover text-secondary active:scale-90 border border-card-border"
                                  >
                                    <Icon name="edit" size={12} />
                                  </motion.button>
                                )}
                              </div>

                              {/* Expanded customer picker */}
                              {isEditing && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-3 pt-0 space-y-2 bg-surface-hover">
                                    {/* Quick Add form */}
                                    {showQuickAdd ? (
                                      <div className="rounded-2xl bg-card border border-card-border p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <p className="text-[11px] font-black uppercase tracking-widest text-secondary">Quick Add</p>
                                          <motion.button
                                            whileTap={{ scale: 0.85 }}
                                            onClick={() => { setShowQuickAdd(false); setQuickAddError(""); }}
                                            className="h-5 w-5 rounded-full bg-surface-hover flex items-center justify-center text-secondary active:scale-90 border border-card-border"
                                          >
                                            <Icon name="close" size={9} />
                                          </motion.button>
                                        </div>
                                        <input
                                          type="text"
                                          value={quickName}
                                          onChange={e => setQuickName(e.target.value)}
                                          placeholder={item.rawName}
                                          className="w-full rounded-full bg-surface-hover px-3 py-2 text-[12px] font-bold text-primary outline-none ring-1 ring-transparent focus:ring-blue-500/30 transition-all"
                                        />
                                        <input
                                          type="text"
                                          value={quickPhone}
                                          onChange={e => setQuickPhone(e.target.value)}
                                          placeholder="Phone number"
                                          className="w-full rounded-full bg-surface-hover px-3 py-2 text-[12px] font-bold text-primary outline-none ring-1 ring-transparent focus:ring-blue-500/30 transition-all"
                                        />
                                        <input
                                          type="text"
                                          value={quickAddress}
                                          onChange={e => setQuickAddress(e.target.value)}
                                          placeholder="Address"
                                          className="w-full rounded-full bg-surface-hover px-3 py-2 text-[12px] font-bold text-primary outline-none ring-1 ring-transparent focus:ring-blue-500/30 transition-all"
                                        />
                                        {quickAddError && (
                                          <p className="text-[11px] font-bold text-red-500">{quickAddError}</p>
                                        )}
                                        <div className="flex gap-2">
                                          <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => { setShowQuickAdd(false); setQuickAddError(""); }}
                                            className="btn-outline flex-1 py-1.5 text-[11px]"
                                          >
                                            Cancel
                                          </motion.button>
                                          <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            disabled={quickAddSaving}
                                            onClick={() => handleQuickAdd(quickName.trim() || item.rawName)}
                                            className="btn-primary flex-1 py-1.5 text-[11px]"
                                          >
                                            {quickAddSaving ? (
                                              <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                            ) : "Create"}
                                          </motion.button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <CustomerSearchSelect
                                          query={item.rawName}
                                          customers={allCustomers}
                                          selectedId={item.match?.id || null}
                                          onSelect={(c) => handleEntryMatch(i, c)}
                                          t={t}
                                        />
                                        <motion.button
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => {
                                            setShowQuickAdd(true);
                                            setQuickName(item.rawName);
                                            setQuickAddError("");
                                          }}
                                          className="w-full rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 px-3 py-2 text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest active:scale-90"
                                        >
                                          + New Customer
                                        </motion.button>
                                      </>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </motion.div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 p-6 pt-3 space-y-3">
              {step === "match" && totalEntries > 0 && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleUse}
                  className="btn-primary w-full"
                >
                  {t("session.copy_use")} · {totalEntries} {t("session.customers")}
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="btn-outline w-full"
              >
                {t("action.cancel")}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function CustomerSearchSelect({
  query,
  customers,
  selectedId,
  onSelect,
  t,
}: {
  query: string;
  customers: Customer[];
  selectedId: string | null;
  onSelect: (c: Customer) => void;
  t: (key: string) => string;
}) {
  const [search, setSearch] = useState(query);
  const results = searchCustomers(search, customers).slice(0, 8);

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search customers..."
        className="w-full rounded-full bg-card px-3 py-2 text-[12px] font-bold text-primary outline-none ring-1 ring-transparent focus:ring-blue-500/30 transition-all mb-1.5"
      />
      <div className="space-y-0.5 max-h-32 overflow-y-auto no-scrollbar">
        {results.length === 0 ? (
          <p className="text-[11px] font-medium text-secondary text-center py-2">
            No matches
          </p>
        ) : (
          results.map((c) => {
            const isSelected = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-left active:scale-90 transition-transform ${
                  isSelected
                    ? "bg-blue-100 dark:bg-blue-900/40"
                    : "hover:bg-surface-hover"
                }`}
              >
                <div className={`h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center ${
                  isSelected
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-secondary/30"
                }`}>
                  {isSelected && <Icon name="check" size={10} strokeWidth={3} />}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-primary truncate">{c.name}</p>
                  {c.address && (
                    <p className="text-[10px] font-medium text-secondary truncate">{c.address}</p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
