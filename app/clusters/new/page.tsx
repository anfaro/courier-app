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
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch("/api/customers");
        if (res.ok) {
          const data = await res.json();
          setAvailableCustomers(data.customers || []);
        }
      } catch (err) {
        console.warn("Failed to fetch customers", err);
      }
    };
    fetchCustomers();
  }, []);

  const toggleCustomer = (id: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/clusters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, customerIds: selectedCustomerIds }),
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

            <div className="flex flex-wrap items-center gap-4">
              <button type="submit" disabled={isLoading} className="flex-1 rounded-[32px] bg-blue-600 px-8 py-4 text-[15px] font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/30 active:scale-90 disabled:bg-blue-400 sm:flex-none">
                {isLoading ? "Saving..." : "Save Cluster"}
              </button>
              <button type="button" onClick={() => router.back()} className="flex-1 rounded-[32px] bg-surface-hover px-8 py-4 text-[15px] font-bold text-secondary transition hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-90 border border-card-border sm:flex-none">
                Cancel
              </button>
            </div>

            <hr className="border-card-border" />

            <div>
              <h3 className="mb-4 text-xl font-bold text-primary">
                Assign Customers <span className="ml-2 rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-sm text-blue-800 dark:text-blue-300">{selectedCustomerIds.length}</span>
              </h3>

              {availableCustomers.length === 0 ? (
                <div className="rounded-[2rem] border-2 border-dashed border-card-border p-8 text-center">
                  <p className="text-secondary font-medium">No unassigned customers found.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {availableCustomers.map((customer) => {
                    const isSelected = selectedCustomerIds.includes(customer.id);
                    return (
                      <li key={customer.id}>
                        <button
                          type="button"
                          onClick={() => toggleCustomer(customer.id)}
                          className={`flex w-full items-center rounded-[1.5rem] p-4 text-left transition-all border-2 active:scale-[0.98] ${isSelected
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
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
