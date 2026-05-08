// components/AdminCustomerTable.tsx
"use client";

import { useState } from "react";

export default function AdminCustomerTable({ initialCustomers }: { initialCustomers: any[] }) {
  const [customerList, setCustomerList] = useState(initialCustomers);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // NEW: State to control our custom modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === customerList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customerList.map(c => c.id));
    }
  };

  // This just opens the modal now
  const handleBulkDeleteClick = () => {
    setShowConfirmModal(true);
  };

  // This is the actual execution function called BY the modal
  const executeBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/admin/customers/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!res.ok) throw new Error("Failed to delete customers");

      setCustomerList(prev => prev.filter(c => !selectedIds.includes(c.id)));
      setSelectedIds([]);
      setShowConfirmModal(false); // Close modal on success

    } catch (error) {
      alert("An error occurred while deleting.");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 relative">

      {/* Action Bar */}
      <div className="flex items-center justify-between h-14 mb-4">
        {selectedIds.length > 0 ? (
          <div className="flex w-full items-center justify-between rounded-[24px] bg-red-50 px-5 py-3 border border-red-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <span className="text-[14px] font-bold text-red-800">
              {selectedIds.length} selected
            </span>
            <button
              onClick={handleBulkDeleteClick}
              disabled={isDeleting}
              className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-[12px] font-bold text-white transition-all active:scale-95 disabled:opacity-50"
            >
              Bulk Delete
            </button>
          </div>
        ) : (
          <div className="flex w-full items-center justify-end">
            <span className="text-[13px] font-medium text-gray-400">Select records to manage</span>
          </div>
        )}
      </div>

      {/* The Data Table */}
      <div className="overflow-hidden rounded-[24px] bg-white shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px] select-none">
            <thead className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider font-black text-gray-500">
              <tr>
                <th className="p-4 w-12 text-center cursor-pointer" onClick={toggleSelectAll}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 pointer-events-none"
                    checked={selectedIds.length === customerList.length && customerList.length > 0}
                    readOnly
                  />
                </th>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Phone</th>
                <th className="p-4 hidden sm:table-cell">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customerList.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => toggleSelection(customer.id)}
                  className={`cursor-pointer transition-all active:scale-[0.99] ${selectedIds.includes(customer.id) ? 'bg-blue-50/80' : 'hover:bg-gray-50'
                    }`}
                >
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 pointer-events-none"
                      checked={selectedIds.includes(customer.id)}
                      readOnly
                    />
                  </td>
                  <td className="p-4 font-bold text-gray-900">{customer.name}</td>
                  <td className="p-4 font-medium text-gray-600">{customer.phoneNumber || "-"}</td>
                  <td className="p-4 font-medium text-gray-500 truncate max-w-[200px] hidden sm:table-cell">
                    {customer.address}
                  </td>
                </tr>
              ))}

              {customerList.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400 font-medium text-[14px]">
                    No customers found in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- CUSTOM CONFIRMATION MODAL --- */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          {/* Glass-morphic Backdrop */}
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isDeleting && setShowConfirmModal(false)}
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <h3 className="mb-2 text-xl font-black text-gray-900">Delete Customers?</h3>
            <p className="mb-6 text-[14px] font-medium text-gray-500 leading-relaxed">
              You are about to permanently delete <strong className="text-gray-900">{selectedIds.length}</strong> customer(s) and all of their linked waybills. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isDeleting}
                className="flex-1 rounded-full bg-gray-100 py-3.5 text-[14px] font-bold text-gray-700 transition-colors hover:bg-gray-200 active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executeBulkDelete}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-2 rounded-full bg-red-600 py-3.5 text-[14px] font-bold text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  "Yes, Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

