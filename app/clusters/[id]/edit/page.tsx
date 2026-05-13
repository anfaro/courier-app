// app/clusters/[id]/edit/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useConfirmation } from "@/components/ConfirmationProvider";

export default function EditClusterPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const clusterId = resolvedParams.id;

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const [availableCustomers, setAvailableCustomers] = useState<any[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  // NEW: Deletion state
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const custRes = await fetch("/api/customers");
        if (custRes.ok) {
          const custData = await custRes.json();
          setAvailableCustomers(custData.customers || []);
        }

        const res = await fetch(`/api/clusters/${clusterId}`);
        if (!res.ok) throw new Error("Failed to load cluster data");
        const data = await res.json();

        setName(data.name || "");
        setNotes(data.notes || "");

        if (data.customers && Array.isArray(data.customers)) {
          const existingIds = data.customers.map((c: any) => c.customer.id);
          setSelectedCustomerIds(existingIds);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
  }, [clusterId]);

  const toggleCustomer = (id: string) => {
    setSelectedCustomerIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`/api/clusters/${clusterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          notes,
          customerIds: selectedCustomerIds
        }),
      });

      if (res.ok) {
        router.push(`/clusters/${clusterId}`);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to update cluster");
      }
    } catch (err: any) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const { askConfirmation } = useConfirmation();

  // NEW: Delete handler function
  const handleDelete = async () => {
    const confirmed = await askConfirmation({
      title: "Delete Cluster",
      message: "Are you sure you want to delete this cluster? This action cannot be undone.",
      confirmText: "Delete",
      type: "danger",
    });
    if (!confirmed) return;

    setIsDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/clusters/${clusterId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Redirect back to the main clusters list after successful deletion
        router.push("/clusters");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to delete cluster");
        setIsDeleting(false);
      }
    } catch (err) {
      setError("An unexpected error occurred during deletion.");
      setIsDeleting(false);
    }
  };

  const inputClass = "w-full rounded-2xl border border-card-border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-5 py-3.5 text-[15px] font-medium text-primary dark:text-slate-100 transition-all focus:border-blue-500 focus:bg-card dark:focus:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-secondary shadow-inner";

  if (isFetching) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <main className="mx-auto max-w-2xl p-4 sm:p-6">
          <div className="mt-4 flex min-h-[40vh] flex-col items-center justify-center rounded-[2.5rem] bg-card p-6 shadow-sm border border-card-border">
            <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-[1.5rem] bg-surface-hover text-3xl mb-4 border border-card-border">
              ⏳
            </div>
            <p className="text-[16px] font-bold text-secondary animate-pulse">Loading Cluster...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Breadcrumbs />

      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <div className="mt-4 rounded-[2.5rem] bg-card p-6 sm:p-10 shadow-sm border border-card-border">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-primary">Edit Cluster</h1>
            <p className="mt-2 text-base text-secondary">Update details and manage customer list.</p>
          </div>

          {error && <p className="mb-6 rounded-2xl bg-red-50 dark:bg-red-950/20 p-4 text-[15px] font-medium text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/50">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-[15px] font-semibold text-secondary">Cluster Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
            </div>

            <div>
              <label className="mb-3 block text-[15px] font-semibold text-secondary">Manage Customers</label>
              <div className="max-h-64 overflow-y-auto rounded-3xl border border-card-border bg-surface-hover/50 p-2 space-y-2">
                {availableCustomers.length === 0 ? (
                  <p className="p-4 text-center text-sm text-secondary">No customers available</p>
                ) : (
                  availableCustomers.map((customer) => {
                    const isSelected = selectedCustomerIds.includes(customer.id);
                    return (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => toggleCustomer(customer.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all active:scale-[0.98] ${isSelected
                          ? "bg-purple-600 text-white shadow-md"
                          : "bg-card text-primary hover:bg-surface-hover border border-card-border"
                          }`}
                      >
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isSelected ? "border-white bg-white/20" : "border-card-border"}`}>
                          {isSelected && <span className="text-[10px]">✔</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-bold ${isSelected ? "text-white" : "text-primary"}`}>{customer.name}</p>
                          <p className={`truncate text-[11px] ${isSelected ? "text-purple-100" : "text-secondary"}`}>{customer.address}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[15px] font-semibold text-secondary">Cluster Notes (Optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} placeholder="e.g., Gate code is 1234#..." />
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button type="submit" disabled={isLoading || isDeleting} className="flex-1 rounded-[32px] bg-purple-600 px-8 py-4 text-[15px] font-bold text-white shadow-sm transition hover:bg-purple-700 active:scale-90 disabled:bg-purple-400 sm:flex-none">
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
              <button type="button" onClick={() => router.back()} disabled={isLoading || isDeleting} className="flex-1 rounded-[32px] btn-outline px-8 py-4 text-[15px] font-bold active:scale-90 sm:flex-none">
                Cancel
              </button>
            </div>

            {/* NEW: Danger Zone / Delete Button */}
            <div className="mt-8 border-t border-red-50 pt-8">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading || isDeleting}
                className="flex w-full items-center justify-center gap-2 rounded-[32px] bg-red-50 px-8 py-4 text-[15px] font-bold text-red-700 transition hover:bg-red-100 active:scale-90 disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {isDeleting ? "Deleting..." : "Delete Cluster"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
