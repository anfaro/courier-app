// components/DatabaseAdmin.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";
import { useConfirmation } from "@/components/ConfirmationProvider";
import { motion, AnimatePresence } from "framer-motion";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

export default function DatabaseAdmin() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { askConfirmation } = useConfirmation();

  const [stats, setStats] = useState<{ tables: any[]; totalRows: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState("");

  // Wipe state
  const [showCodeStep, setShowCodeStep] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [isWiping, setIsWiping] = useState(false);

  // Maintenance state
  const [runningAction, setRunningAction] = useState<string | null>(null);

  // Import/Export state
  const [importMode, setImportMode] = useState<"customers" | "deliveries">("customers");
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError("");
    try {
      const res = await fetchWithTimeout("/api/admin/system/database", {}, 120000);
      if (!res.ok) { setStatsError(`Server error (${res.status})`); return; }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("json")) {
        const text = await res.text();
        setStatsError(`Unexpected response: ${text.slice(0, 100)}`);
        return;
      }
      setStats(await res.json());
    } catch (e: any) { setStatsError(e.message || "Request failed."); } finally { setLoadingStats(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleWipe = async () => {
    const step1 = await askConfirmation({
      title: t("admin.wipe_title"),
      message: t("admin.wipe_confirm_1_msg"),
      confirmText: t("action.confirm"),
      type: "warning",
    });
    if (!step1) return;
    const step2 = await askConfirmation({
      title: t("admin.wipe_confirm_final_title"),
      message: t("admin.wipe_confirm_final_msg"),
      confirmText: t("admin.wipe_execute_btn"),
      type: "danger",
    });
    if (step2) setShowCodeStep(true);
  };

  const executeWipe = async () => {
    if (userInput !== "CONFIRM-WIPE") { showToast("Invalid code", "error"); return; }
    setIsWiping(true);
    try {
      const res = await fetch("/api/admin/wipe-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmCode: "CONFIRM-WIPE" }),
      });
      if (res.ok) {
        showToast(t("admin.wipe_executing"), "success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast("Server rejected wipe request.", "error");
      }
    } catch {
      showToast("Critical error during wipe.", "error");
    } finally {
      setIsWiping(false);
      setShowCodeStep(false);
    }
  };

  const handleExport = async (table: string) => {
    const endpoint = table === "customers" ? "/api/customers" : table === "deliveries" ? "/api/deliveries" : `/api/clusters`;
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      const list = data.customers || data.deliveries || data.clusters || data || [];
      if (!list.length) { showToast("No data to export.", "warning"); return; }
      const headers = Object.keys(list[0]).join(",");
      const rows = list.map((item: any) => Object.values(item).join(",")).join("\n");
      const csv = `${headers}\n${rows}`;
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${table}-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${list.length} rows.`, "success");
    } catch {
      showToast("Export failed.", "error");
    }
  };

  const handleMaintenance = async (action: string, table?: string) => {
    setRunningAction(action + (table || ""));
    try {
      const res = await fetch("/api/admin/system/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, table }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Done.", "success");
        fetchStats();
      } else {
        showToast(data.error || "Failed.", "error");
      }
    } catch {
      showToast("Maintenance request failed.", "error");
    } finally {
      setRunningAction(null);
    }
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").filter(Boolean);
    if (lines.length < 2) { showToast("CSV must have a header row and at least one data row.", "error"); return; }
    const headers = lines[0].split(",").map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim());
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
      return obj;
    });
    setPreview(rows.slice(0, 5));
    importFileRef.current!.dataset.payload = JSON.stringify(rows);
    showToast(`Parsed ${rows.length} rows. Review then import.`, "info");
  };

  const handleImport = async () => {
    const payload = importFileRef.current?.dataset.payload;
    if (!payload) { showToast("Select a CSV file first.", "error"); return; }
    setImporting(true);
    try {
      const endpoint = importMode === "customers" ? "/api/customers/bulk" : "/api/deliveries/bulk";
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Import successful!", "success");
        setPreview([]);
        if (importFileRef.current) { importFileRef.current.value = ""; delete importFileRef.current.dataset.payload; }
        fetchStats();
      } else { showToast(data.message || "Import failed.", "error"); }
    } catch { showToast("Network error during import.", "error"); } finally { setImporting(false); }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    setBackupProgress(0);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180000);

      const res = await fetch("/api/admin/system/backup", { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error("Backup failed");

      const contentLength = Number(res.headers.get("Content-Length") || 0);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (contentLength > 0) {
          setBackupProgress(Math.round((received / contentLength) * 100));
        }
      }

      const blob = new Blob(chunks);
      const filename = `backup-${new Date().toISOString().slice(0, 10)}.json.gz`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      showToast("Backup downloaded.", "success");
    } catch { showToast("Backup download failed.", "error"); } finally { setBackingUp(false); setBackupProgress(0); }
  };

  const handleRestore = async (file: File | null) => {
    if (!file) return;
    const confirmed = await askConfirmation({ title: "Restore Backup", message: "This will insert backup data on top of existing records. Duplicates (same ID) will be skipped.", confirmText: "Restore", type: "warning" });
    if (!confirmed) return;
    setRestoring(true);
    try {
      let data: any;
      const buf = await file.arrayBuffer();
      // Detect gzip magic number (0x1f8b) or try as plain JSON
      const header = new Uint8Array(buf.slice(0, 2));
      if (header[0] === 0x1f && header[1] === 0x8b) {
        const ds = new DecompressionStream("gzip");
        const stream = new Blob([buf]).stream().pipeThrough(ds);
        const text = await new Response(stream).text();
        data = JSON.parse(text);
      } else {
        data = JSON.parse(new TextDecoder().decode(buf));
      }
      if (!data?.data) throw new Error("Invalid backup file");
      const res = await fetch("/api/admin/system/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await res.json();
      if (res.ok) { showToast(result.message || "Restore complete.", "success"); fetchStats(); }
      else { showToast(result.error || "Restore failed.", "error"); }
    } catch (e: any) { showToast(e.message || "Invalid or corrupt backup file.", "error"); } finally { setRestoring(false); }
  };

  const handleExportTable = async (table: string) => {
    const endpoint = table === "customers" ? "/api/customers" : table === "deliveries" ? "/api/deliveries" : "/api/clusters";
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      const list = data.customers || data.deliveries || data.clusters || data || [];
      if (!list.length) { showToast("No data to export.", "warning"); return; }
      const headers = Object.keys(list[0]).join(",");
      const rows = list.map((item: any) => Object.values(item).join(",")).join("\n");
      const csv = `${headers}\n${rows}`;
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${table}-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${list.length} rows.`, "success");
    } catch { showToast("Export failed.", "error"); }
  };

  return (
    <div className="px-4 sm:px-6 mb-8 space-y-6">
      <h2 className="text-[14px] font-bold tracking-tight text-primary uppercase tracking-widest opacity-60">Database Administration</h2>

      {/* Stats */}
      <div className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-primary text-[15px]">Overview</h3>
          {loadingStats && <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />}
        </div>
        {statsError && <p className="text-[12px] font-bold text-red-500 mb-4">{statsError}</p>}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="rounded-2xl bg-surface-hover p-4 text-center">
            <p className="text-xl font-black text-primary">{stats?.tables?.length ?? "—"}</p>
            <p className="text-[11px] font-bold text-secondary mt-1">Tables</p>
          </div>
          <div className="rounded-2xl bg-surface-hover p-4 text-center">
            <p className="text-xl font-black text-primary">{stats?.totalRows?.toLocaleString() || "—"}</p>
            <p className="text-[11px] font-bold text-secondary mt-1">Total Rows</p>
          </div>
        </div>

        {loadingStats && !stats ? (
          <div className="flex items-center justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" /></div>
        ) : null}
        {stats?.tables && stats.tables.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-secondary/60 border-b border-card-border">
                  <th className="text-left py-2 pr-3 font-bold">Table</th>
                  <th className="text-right py-2 pr-3 font-bold">Rows</th>
                  <th className="text-right py-2 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.tables.map((t: any) => (
                  <tr key={t.table_name} className="border-b border-card-border/50 hover:bg-surface-hover/50 transition-colors">
                    <td className="py-2.5 pr-3 font-bold text-primary">{t.table_name}</td>
                    <td className="py-2.5 pr-3 text-right text-primary">{t.row_count.toLocaleString()}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => handleMaintenance("vacuum", t.table_name)} disabled={runningAction === "vacuum" + t.table_name} className="rounded-lg bg-surface-hover px-2.5 py-1.5 text-[10px] font-bold text-primary active:scale-90 disabled:opacity-30 transition-all">Vacuum</button>
                        <button onClick={() => handleExport(t.table_name)} className="rounded-lg bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 active:scale-90 transition-all">CSV</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-card-border">
          <button onClick={() => handleMaintenance("vacuum")} disabled={!!runningAction} className="rounded-xl bg-surface-hover px-4 py-2 text-[11px] font-bold text-primary active:scale-90 disabled:opacity-30 transition-all">VACUUM ALL</button>
          <button onClick={() => handleMaintenance("analyze")} disabled={!!runningAction} className="rounded-xl bg-surface-hover px-4 py-2 text-[11px] font-bold text-primary active:scale-90 disabled:opacity-30 transition-all">ANALYZE ALL</button>
          <button onClick={() => handleMaintenance("reindex")} disabled={!!runningAction} className="rounded-xl bg-surface-hover px-4 py-2 text-[11px] font-bold text-primary active:scale-90 disabled:opacity-30 transition-all">REINDEX ALL</button>
          <button onClick={fetchStats} disabled={loadingStats} className="rounded-xl bg-surface-hover px-4 py-2 text-[11px] font-bold text-primary active:scale-90 disabled:opacity-30 transition-all">Refresh</button>
        </div>
      </div>

      {/* Wipe */}
      <div className="rounded-[24px] bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900 text-xl shadow-inner">☢️</div>
          <div>
            <h3 className="font-black text-red-900 dark:text-red-200 text-[15px]">{t("admin.danger_zone")}</h3>
            <p className="text-[12px] font-medium text-red-700 dark:text-red-400">{t("admin.wipe_desc")}</p>
          </div>
        </div>
        <button onClick={handleWipe} className="btn-danger w-full py-3.5 !bg-red-600 !text-white !border-none shadow-lg shadow-red-600/20 text-[13px]">{t("admin.wipe_btn")}</button>
      </div>

      {/* Wipe Modal */}
      <AnimatePresence>
        {showCodeStep && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !isWiping && setShowCodeStep(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm rounded-[40px] bg-card p-8 shadow-2xl border border-red-500/30">
              <h3 className="text-2xl font-black text-primary mb-2">{t("admin.wipe_verification")}</h3>
              <p className="text-[14px] font-medium text-secondary mb-6 leading-relaxed">{t("admin.wipe_type_code").replace("[CODE]", "CONFIRM-WIPE")}</p>
              <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value.toUpperCase())} placeholder="Type the code here..." className="w-full rounded-2xl border border-red-200 dark:border-red-900 bg-background px-5 py-4 text-[16px] font-black tracking-widest text-primary focus:ring-4 focus:ring-red-500/10 outline-none transition-all mb-6" autoFocus />
              <div className="flex flex-col gap-3">
                <button onClick={executeWipe} disabled={userInput !== "CONFIRM-WIPE" || isWiping} className="btn-danger w-full py-4 !bg-red-600 !text-white disabled:opacity-30">{isWiping ? t("admin.wipe_executing") : t("admin.wipe_execute_btn")}</button>
                <button onClick={() => setShowCodeStep(false)} disabled={isWiping} className="btn-outline w-full py-4">{t("action.cancel")}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import / Export */}
      <div className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm">
        <h3 className="font-black text-primary text-[15px] mb-4">Import / Export Data</h3>
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setImportMode("customers"); setPreview([]); }} className={`rounded-full px-4 py-2 text-[11px] font-bold transition-all active:scale-90 ${importMode === "customers" ? "bg-blue-600 text-white shadow-sm" : "bg-surface-hover text-secondary"}`}>Customers</button>
          <button onClick={() => { setImportMode("deliveries"); setPreview([]); }} className={`rounded-full px-4 py-2 text-[11px] font-bold transition-all active:scale-90 ${importMode === "deliveries" ? "bg-blue-600 text-white shadow-sm" : "bg-surface-hover text-secondary"}`}>Deliveries</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); handleImportFile(e.dataTransfer.files[0]); }} className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${dragOver ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10" : "border-card-border"}`}>
            <input ref={importFileRef} type="file" accept=".csv" onChange={(e) => handleImportFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
            <p className="text-2xl mb-2">📄</p>
            <p className="text-[13px] font-bold text-primary">Drop CSV here or click</p>
            <p className="text-[11px] text-secondary mt-1">Headers must match field names</p>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={handleImport} disabled={importing || !preview.length} className="btn-primary w-full py-3 text-[13px] disabled:opacity-40">{importing ? "Importing..." : `Import ${importMode}`}</button>
            <button onClick={() => handleExportTable(importMode)} className="btn-outline w-full py-3 text-[13px]">Export {importMode} as CSV</button>
          </div>
        </div>
        {preview.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-card-border">
            <p className="text-[11px] font-bold text-secondary p-3 pb-0">{preview.length} rows preview</p>
            <table className="w-full text-[11px]">
              <thead><tr className="bg-surface-hover">{Object.keys(preview[0]).map(h => <th key={h} className="px-3 py-2 font-bold text-primary text-left">{h}</th>)}</tr></thead>
              <tbody>{preview.map((row, i) => <tr key={i} className="border-t border-card-border">{Object.values(row).map((v: any, j) => <td key={j} className="px-3 py-2 text-secondary truncate max-w-[120px]">{v}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* Backup / Restore */}
      <div className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm">
        <h3 className="font-black text-primary text-[15px] mb-4">Backup / Restore</h3>
        <p className="text-[12px] text-secondary mb-4">Full backup exports all 8 tables as portable JSON. Image URLs are included; actual image files are not. Log tables are limited to the most recent rows (10k logs, 5k errors, 5k access logs) to prevent timeout.</p>

        {backingUp ? (
          <div className="w-full mb-4">
            <div className="rounded-2xl bg-surface-hover p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" />
                  <span className="text-[13px] font-bold text-primary">Downloading backup...</span>
                </div>
                <span className="text-[13px] font-bold text-blue-600">{backupProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-card-border overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-blue-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${backupProgress}%` }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                />
              </div>
            </div>
          </div>
        ) : (
          <button onClick={handleBackup} disabled={backingUp} className="btn-primary w-full py-3.5 text-[13px] disabled:opacity-40 mb-4">📥 Download Full Backup</button>
        )}

        <div className="relative rounded-2xl border-2 border-dashed border-card-border p-6 text-center hover:border-blue-400 transition-colors">
          {restoring && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/60 backdrop-blur-sm rounded-2xl">
              <div className="flex items-center gap-2"><div className="h-5 w-5 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" /><span className="text-[13px] font-bold text-primary">Restoring...</span></div>
            </div>
          )}
          <label className={`block cursor-pointer ${restoring ? "pointer-events-none" : ""}`}>
            <input type="file" accept=".json,.json.gz,.gz" onChange={(e) => handleRestore(e.target.files?.[0] || null)} className="hidden" />
            <span className="text-2xl mb-2 block">📤</span>
            <p className="text-[13px] font-bold text-primary">Click to restore backup</p>
            <p className="text-[11px] text-secondary mt-1">Accepts .json or .json.gz backup files</p>
          </label>
        </div>
      </div>
    </div>
  );
}
