"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

type Customer = { id: string; name: string; address: string };

export default function ClusterCustomerList({
  clusterId,
  initialTotal,
}: {
  clusterId: string;
  initialTotal: number;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [jumpInput, setJumpInput] = useState("");
  const [loading, setLoading] = useState(true);
  const totalPages = Math.ceil(total / pageSize);

  const fetchPage = async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clusters/${clusterId}?limit=${pageSize}&offset=${p * pageSize}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers?.map((c: any) => c.customer) || []);
        setTotal(data.total ?? 0);
      }
    } catch (err) {
      console.warn("Failed to fetch customers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(0); fetchPage(0); }, [pageSize]);

  const goToPage = (p: number) => {
    setPage(p);
    fetchPage(p);
  };

  if (total === 0 && !loading) {
    return (
      <div className="rounded-[2rem] border border-card-border bg-card p-8 text-center shadow-sm">
        <p className="font-medium text-secondary">No customers assigned to this cluster.</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-card-border bg-card shadow-sm">
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/60 backdrop-blur-sm rounded-[2rem]">
          <div className="flex h-12 w-12 animate-spin items-center justify-center rounded-full bg-surface-hover text-2xl border border-card-border">
            ⏳
          </div>
        </div>
      )}
      <ul className="divide-y divide-card-border">
        {customers.map((customer) => (
          <li key={customer.id} className="group relative flex items-center justify-between p-4 transition-all hover:bg-surface-hover active:bg-surface-hover sm:p-5">
            <Link href={`/customers/${customer.id}`} className="absolute inset-0 z-0 focus:outline-none" />
            <div className="z-10 flex min-w-0 flex-1 items-center gap-3 pointer-events-none transition-transform duration-200 group-active:scale-[0.98]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-hover text-sm font-bold text-primary">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[15px] font-bold tracking-tight text-primary">{customer.name}</h2>
                <p className="mt-0.5 truncate text-[13px] text-secondary">{customer.address}</p>
              </div>
            </div>
            <div className="z-10 text-secondary/30 transition group-hover:text-purple-500">
              <Icon name="chevron-right" size={20} />
            </div>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-card-border px-4 py-3">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 0}
            className="rounded-xl bg-surface-hover px-4 py-2 text-[13px] font-bold text-primary active:scale-90 transition-all hover:bg-surface-hover/80 disabled:opacity-30 disabled:cursor-not-allowed"
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
                  if (!isNaN(p) && p >= 1 && p <= totalPages) { goToPage(p - 1); setJumpInput(""); }
                }
              }}
              onBlur={() => setJumpInput("")}
              className="w-10 text-center text-[13px] font-bold text-secondary bg-transparent border border-transparent focus:border-purple-500 focus:bg-card rounded-lg px-1 py-0.5 outline-none"
              placeholder={String(page + 1)}
            />
            <span className="text-[13px] font-bold text-secondary">/ {totalPages}</span>
          </div>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages - 1}
            className="rounded-xl bg-surface-hover px-4 py-2 text-[13px] font-bold text-primary active:scale-90 transition-all hover:bg-surface-hover/80 disabled:opacity-30 disabled:cursor-not-allowed"
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
    </div>
  );
}
