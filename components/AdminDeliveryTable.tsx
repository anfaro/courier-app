// components/AdminDeliveryTable.tsx
"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";
import { useConfirmation } from "@/components/ConfirmationProvider";

export default function AdminDeliveryTable({ initialDeliveries }: { initialDeliveries: any[] }) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { askConfirmation } = useConfirmation();
  
  const [deliveryList, setDeliveryList] = useState(initialDeliveries);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDeliveries = deliveryList.filter(d =>
    d.waybillNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    selectedIds.length === deliveryList.length ? setSelectedIds([]) : setSelectedIds(deliveryList.map(d => d.id));
  };

  const handleBulkDeleteClick = async () => {
    const confirmed = await askConfirmation({
      title: `${t("action.delete")} ${t("search.waybills")}?`,
      message: `You are about to permanently delete ${selectedIds.length} waybill(s). This action cannot be undone.`,
      confirmText: t("action.delete"),
      type: "danger"
    });

    if (confirmed) {
      executeBulkDelete();
    }
  };

  const executeBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/admin/deliveries/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) throw new Error("Failed to delete deliveries");
      setDeliveryList(prev => prev.filter(d => !selectedIds.includes(d.id)));
      showToast(`${selectedIds.length} ${t("search.waybills").toLowerCase()} deleted.`, "success");
      setSelectedIds([]);
    } catch (error) {
      showToast("An error occurred while deleting.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 relative">
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder={t("admin.search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-card-border bg-card pl-11 pr-4 py-3.5 text-[15px] font-medium text-primary shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none placeholder:text-secondary"
          />
        </div>

        {selectedIds.length > 0 ? (
          <div className="flex w-full sm:w-auto items-center justify-between gap-4 rounded-full bg-red-50 dark:bg-red-950/30 px-5 py-2.5 border border-red-100 dark:border-red-900 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <span className="text-[13px] font-bold text-red-800 dark:text-red-300 whitespace-nowrap">{selectedIds.length} {t("search.waybills")}</span>
            <button onClick={handleBulkDeleteClick} disabled={isDeleting} className="btn-danger flex items-center gap-2 px-4 py-1.5 text-[12px] shadow-md shadow-red-600/20">
              {isDeleting ? <span className="flex h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : t("admin.bulk_delete")}
            </button>
          </div>
        ) : (
          <div className="hidden sm:flex items-center justify-end">
            <span className="text-[12px] font-medium text-secondary">Select records to manage</span>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-[24px] bg-card shadow-sm border border-card-border dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px] select-none">
            <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-card-border dark:border-slate-800 text-[11px] uppercase tracking-wider font-black text-secondary">
              <tr>
                <th className="p-4 w-12 text-center cursor-pointer" onClick={toggleSelectAll}>
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300 dark:border-slate-700 bg-card dark:bg-slate-800 text-blue-600 focus:ring-blue-600 pointer-events-none" checked={selectedIds.length === deliveryList.length && deliveryList.length > 0} readOnly />
                </th>
                <th className="p-4">{t("search.waybills")}</th>
                <th className="p-4">Status</th>
                <th className="p-4 hidden sm:table-cell">COD Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border dark:divide-slate-800">
              {filteredDeliveries.map((delivery) => (
                <tr key={delivery.id} onClick={() => toggleSelection(delivery.id)} className={`cursor-pointer transition-all active:scale-[0.99] ${selectedIds.includes(delivery.id) ? 'bg-blue-50/80' : 'hover:bg-gray-50'}`}>
                  <td className="p-4 text-center">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 pointer-events-none" checked={selectedIds.includes(delivery.id)} readOnly />
                  </td>
                  <td className="p-4 font-bold text-primary">{delivery.waybillNumber}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${delivery.status === 'Pending' ? 'bg-orange-100 text-orange-700' : delivery.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {delivery.status}
                    </span>
                  </td>
                  <td className="p-4 font-black text-gray-700 hidden sm:table-cell">Rp {(delivery.codAmount || 0).toLocaleString('id-ID')}</td>
                </tr>
              ))}
              {filteredDeliveries.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400 font-medium text-[14px]">{t("search.no_results")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
