// app/clusters/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";

type Customer = {
  id: string;
  name: string;
  address: string;
};

export default function NewClusterPage() {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
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

  const toggleCustomer = (id: string) => {
    setSelectedCustomerIds((prev) => {
      if (prev.includes(id)) {
        setSelectedCustomersData((d) => { const { [id]: _, ...rest } = d; return rest; });
        return prev.filter((cId) => cId !== id);
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
      const res = await fetch("/api/clusters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, notes, customerIds: selectedCustomerIds }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to create cluster");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full rounded-2xl border border-card-border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-5 py-3.5 text-[15px] text-primary dark:text-slate-100 transition-all focus:border-blue-600 focus:bg-card dark:focus:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-600/10 placeholder:text-secondary";

  return (
    <div className="min-h-screen bg-background pb-20">
      <Breadcrumbs />

      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <div className="mt-4 rounded-[2.5rem] bg-card p-6 sm:p-10 shadow-sm border border-card-border">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-primary">New Cluster</h1>
            <p className="mt-2 text-base text-secondary">Group your customers into a new region.</p>
          </div>

          {error && <p className="mb-6 rounded-2xl bg-red-50 dark:bg-red-950/20 p-4 text-[15px] font-medium text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/50">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="mb-2 block text-[15px] font-semibold text-secondary">Cluster Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClass}
                placeholder="e.g., North District"
              />
            </div>

            <div>
              <label className="mb-2 block text-[15px] font-semibold text-secondary">Cluster Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={inputClass}
                placeholder="e.g., Gate code is 1234#..."
              />
            </div>

            <hr className="border-card-border" />

            <div className="relative">
              <h3 className="mb-4 text-xl font-bold text-primary">
                Assign Customers <span className="ml-2 rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-sm text-blue-800 dark:text-blue-300">{selectedCustomerIds.length}</span>
              </h3>

              <div className="relative min-h-[120px] rounded-[2rem] overflow-hidden p-2">
                {fetchingCustomers && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/60 backdrop-blur-sm rounded-[2rem]">
                    <div className="flex h-12 w-12 animate-spin items-center justify-center rounded-full bg-surface-hover text-2xl border border-card-border">
                      ⏳
                    </div>
                  </div>
                )}

                {customers.length === 0 ? (
                  <div className="rounded-[2rem] border-2 border-dashed border-card-border p-8 text-center">
                    <p className="text-secondary font-medium">No customers found.</p>
                  </div>
                ) : (
                  <>
                    <ul className="space-y-3">
                      {customers.map((customer) => {
                        const isSelected = selectedCustomerIds.includes(customer.id);
                        return (
                          <li key={customer.id}>
                            <button
                              type="button"
                              onClick={() => toggleCustomer(customer.id)}
                              className={`flex w-full items-center rounded-[1.5rem] p-4 text-left transition-all border-2 active:scale-90 ${isSelected
                                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-600"
                                : "bg-card border-card-border hover:border-blue-400 dark:hover:border-blue-600 hover:bg-surface-hover"
                                }`}
                            >
                              <div className={`mr-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${isSelected ? "bg-blue-600 text-white" : "border-2 border-card-border"
                                }`}>
                                {isSelected && (
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className={`text-[17px] font-bold truncate ${isSelected ? "text-blue-900 dark:text-blue-200" : "text-primary"}`}>
                                  {customer.name}
                                </p>
                                <p className="text-sm text-secondary truncate mt-0.5">
                                  {customer.address}
                                </p>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    {totalPages > 0 && (
                      <div className="flex items-center justify-between mt-4">
                        <button
                          type="button"
                          onClick={() => { setFetchingCustomers(true); setPage(p => Math.max(0, p - 1)); }}
                          disabled={page === 0}
                          className="rounded-xl bg-surface-hover px-4 py-2 text-[13px] font-bold text-primary active:scale-90 disabled:opacity-30 transition-all"
                        >
                          ← Previous
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
                            className="w-10 text-center text-[13px] font-bold text-secondary bg-transparent border border-transparent focus:border-purple-500 focus:bg-card rounded-lg px-1 py-0.5 outline-none"
                            placeholder={String(page + 1)}
                          />
                          <span className="text-[13px] font-bold text-secondary">/ {totalPages}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setFetchingCustomers(true); setPage(p => Math.min(totalPages - 1, p + 1)); }}
                          disabled={page >= totalPages - 1}
                          className="rounded-xl bg-surface-hover px-4 py-2 text-[13px] font-bold text-primary active:scale-90 disabled:opacity-30 transition-all"
                        >
                          Next →
                        </button>
                        <select
                          value={pageSize}
                          onChange={e => { setPageSize(Number(e.target.value)); setPage(0); setJumpInput(""); }}
                          className="ml-1 rounded-xl bg-surface-hover px-2 py-1.5 text-[11px] font-bold text-primary border border-card-border outline-none cursor-pointer active:scale-90 transition-all"
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
                <div className="mt-6">
                  <h4 className="mb-3 text-[15px] font-semibold text-secondary">
                    Selected Customers ({selectedCustomerIds.length})
                  </h4>
                  <div className="rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-3 space-y-2 max-h-48 overflow-y-auto">
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

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button type="submit" disabled={isLoading} className="flex-1 rounded-[32px] bg-blue-600 px-8 py-4 text-[15px] font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/30 active:scale-90 disabled:bg-blue-400 sm:flex-none">
                {isLoading ? "Saving..." : "Save Cluster"}
              </button>
              <button type="button" onClick={() => router.back()} className="flex-1 rounded-[32px] bg-surface-hover px-8 py-4 text-[15px] font-bold text-secondary transition hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-90 border border-card-border sm:flex-none">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
