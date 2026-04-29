// app/clusters/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import Breadcrumbs from "@/components/Breadcrumbs";

type Customer = {
  id: number;
  name: string;
  address: string;
};

export default function NewClusterPage() {
  const [name, setName] = useState("");
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch("/api/customers");
        if (res.ok) {
          const data = await res.json();
          // FIXED: Extract the 'customers' array from the JSON response
          setAvailableCustomers(data.customers || []);
        }
      } catch (err) {
        console.error("Failed to fetch customers", err);
      }
    };
    fetchCustomers();
  }, []);

  const toggleCustomer = (id: number) => {
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

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      <Header />
      <Breadcrumbs />

      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <div className="mt-4 rounded-[2.5rem] bg-white p-6 sm:p-10 shadow-sm border border-gray-50">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">New Cluster</h1>
            <p className="mt-2 text-base text-gray-500">Group your customers into a new region.</p>
          </div>

          {error && <p className="mb-6 rounded-2xl bg-red-50 p-4 text-[15px] font-medium text-red-700">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="mb-2 block text-[15px] font-semibold text-gray-700">Cluster Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-2xl border border-transparent bg-gray-100 px-5 py-3.5 text-[15px] text-gray-900 transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10"
                placeholder="e.g., North District"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button type="submit" disabled={isLoading} className="flex-1 rounded-full bg-blue-600 px-8 py-4 text-[15px] font-bold text-white shadow-sm transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/30 disabled:bg-blue-400 sm:flex-none">
                {isLoading ? "Saving..." : "Save Cluster"}
              </button>
              <button type="button" onClick={() => router.back()} className="flex-1 rounded-full bg-gray-100 px-8 py-4 text-[15px] font-bold text-gray-700 transition hover:bg-gray-200 sm:flex-none">
                Cancel
              </button>
            </div>

            <hr className="border-gray-100" />

            <div>
              <h3 className="mb-4 text-xl font-bold text-gray-900">
                Assign Customers <span className="ml-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">{selectedCustomerIds.length}</span>
              </h3>

              {availableCustomers.length === 0 ? (
                <div className="rounded-[2rem] border-2 border-dashed border-gray-200 p-8 text-center">
                  <p className="text-gray-500 font-medium">No unassigned customers found.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {availableCustomers.map((customer) => {
                    const isSelected = selectedCustomerIds.includes(customer.id);
                    return (
                      <li key={customer.id}>
                        {/* M3 Selectable Item: Entire area acts as a soft button */}
                        <button
                          type="button"
                          onClick={() => toggleCustomer(customer.id)}
                          className={`flex w-full items-center rounded-[1.5rem] p-4 text-left transition-all ${isSelected
                            ? "bg-blue-50 border-2 border-blue-600"
                            : "bg-white border-2 border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                        >
                          <div className={`mr-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${isSelected ? "bg-blue-600 text-white" : "border-2 border-gray-300"
                            }`}>
                            {isSelected && (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>

                          <div>
                            <p className={`text-[17px] font-bold ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
                              {customer.name}
                            </p>
                            <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
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

