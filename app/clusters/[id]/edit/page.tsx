// app/clusters/[id]/edit/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { useConfirmation } from "@/components/ConfirmationProvider";
import Icon from "@/components/Icon";

export default function EditClusterPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const clusterId = resolvedParams.id;

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const [customers, setCustomers] = useState<any[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedCustomersData, setSelectedCustomersData] = useState<Record<string, { name: string; address: string }>>({});
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [jumpInput, setJumpInput] = useState("");
  const totalPages = Math.ceil(totalCustomers / pageSize);
  const [fetchingCustomers, setFetchingCustomers] = useState(true);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  // NEW: Deletion state
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();

  const fetchPage = async (p: number) => {
    setFetchingCustomers(true);
    try {
      const res = await fetch(`/api/customers?limit=${pageSize}&offset=${p * pageSize}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        setTotalCustomers(data.total ?? 0);
      }
    } catch (err) {
      console.warn("Failed to fetch customers", err);
    } finally {
      setFetchingCustomers(false);
    }
  };

  useEffect(() => { fetchPage(page); }, [page, pageSize]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/clusters/${clusterId}`);
        if (!res.ok) throw new Error("Failed to load cluster data");
        const data = await res.json();

        setName(data.name || "");
        setNotes(data.notes || "");

        if (data.customers && Array.isArray(data.customers)) {
          const ids: string[] = [];
          const details: Record<string, { name: string; address: string }> = {};
          data.customers.forEach((c: any) => {
            ids.push(c.customer.id);
            details[c.customer.id] = { name: c.customer.name, address: c.customer.address };
          });
          setSelectedCustomerIds(ids);
          setSelectedCustomersData(details);
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
    setSelectedCustomerIds((prev) => {
      if (prev.includes(id)) {
        setSelectedCustomersData((d) => { const { [id]: _, ...rest } = d; return rest; });
        return prev.filter((item) => item !== id);
      } else {
        const c = customers.find(c => c.id === id);
        if (c) setSelectedCustomersData((d) => ({ ...d, [id]: { name: c.name, address: c.address } }));
        return [...prev, id];
      }
    });
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
      <PageHeader title={name ? `Edit ${name}` : "Edit Cluster"} />

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

            <div className="relative">
              <label className="mb-3 block text-[15px] font-semibold text-secondary">Manage Customers</label>
              <div className="relative rounded-3xl border border-card-border bg-surface-hover/50 p-2 space-y-2 min-h-[120px] overflow-hidden">
                {fetchingCustomers && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/60 backdrop-blur-sm rounded-[1.5rem]">
                    <div className="flex h-12 w-12 animate-spin items-center justify-center rounded-full bg-surface-hover text-2xl border border-card-border">
                      ⏳
                    </div>
                  </div>
                )}

                {customers.length === 0 ? (
                  <p className="p-4 text-center text-sm text-secondary">No customers available</p>
                ) : (
                  <>
                    {customers.map((customer) => {
                      const isSelected = selectedCustomerIds.includes(customer.id);
                      return (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => toggleCustomer(customer.id)}
                          className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all active:scale-90 ${isSelected
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
                    })}

                    {totalPages > 0 && (
                      <div className="flex items-center justify-between px-1 py-1">
                        <button
                          type="button"
                          onClick={() => { setFetchingCustomers(true); setPage(p => Math.max(0, p - 1)); }}
                          disabled={page === 0}
                          className="rounded-xl bg-card px-3.5 py-2 text-[12px] font-bold text-primary active:scale-90 disabled:opacity-30 transition-all border border-card-border"
                        >
                          ← Prev
                        </button>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={jumpInput}
                            onChange={e => setJumpInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                const p = parseInt(e.currentTarget.value);
                                if (!isNaN(p) && p >= 1 && p <= totalPages) { setFetchingCustomers(true); setPage(p - 1); setJumpInput(""); }
                              }
                            }}
                            onBlur={() => setJumpInput("")}
                            className="w-9 text-center text-[12px] font-bold text-secondary bg-transparent border border-transparent focus:border-purple-500 focus:bg-card rounded-lg px-1 py-0.5 outline-none"
                            placeholder={String(page + 1)}
                          />
                          <span className="text-[12px] font-bold text-secondary">/ {totalPages}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setFetchingCustomers(true); setPage(p => Math.min(totalPages - 1, p + 1)); }}
                          disabled={page >= totalPages - 1}
                          className="rounded-xl bg-card px-3.5 py-2 text-[12px] font-bold text-primary active:scale-90 disabled:opacity-30 transition-all border border-card-border"
                        >
                          Next →
                        </button>
                        <select
                          value={pageSize}
                          onChange={e => { setPageSize(Number(e.target.value)); setPage(0); setJumpInput(""); }}
                          className="ml-1 rounded-xl bg-card px-2 py-1.5 text-[11px] font-bold text-primary border border-card-border outline-none cursor-pointer active:scale-90 transition-all"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>

              {selectedCustomerIds.length > 0 && (
                <div className="mt-4">
                  <h4 className="mb-2 text-[14px] font-semibold text-secondary">
                    Selected Customers ({selectedCustomerIds.length})
                  </h4>
                  <div className="rounded-2xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 p-3 space-y-2 max-h-48 overflow-y-auto">
                    {selectedCustomerIds.map(id => {
                      const c = selectedCustomersData[id];
                      if (!c) return null;
                      return (
                        <div key={id} className="flex items-center justify-between rounded-xl bg-card px-4 py-3 border border-card-border">
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-bold text-primary truncate">{c.name}</p>
                            <p className="text-[12px] text-secondary truncate">{c.address}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleCustomer(id)}
                            className="ml-3 shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 active:scale-90 transition-all"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
                <Icon name="trash" size={20} />
                {isDeleting ? "Deleting..." : "Delete Cluster"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
