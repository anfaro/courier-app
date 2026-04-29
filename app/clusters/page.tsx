// app/clusters/page.tsx
import { db } from "@/lib/db";
import { clusters, customerClusters } from "@/lib/schema"; // FIXED: Import customerClusters
import { eq, sql } from "drizzle-orm";
import Header from "@/components/header"; // Note: ensure this matches your actual casing, e.g., "@/components/Header"
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";

export default async function ClustersListPage() {
  // FIXED: Fetch clusters and count how many records exist in the join table
  const allClusters = await db
    .select({
      id: clusters.id,
      name: clusters.name,
      // Count the matching customer IDs in the join table
      customerCount: sql<number>`count(${customerClusters.customerId})`.mapWith(Number),
    })
    .from(clusters)
    .leftJoin(customerClusters, eq(clusters.id, customerClusters.clusterId)) // FIXED: Join via the join table
    .groupBy(clusters.id)
    .orderBy(clusters.name);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header />
      <Breadcrumbs />

      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Clusters</h1>
          <Link
            href="/clusters/new"
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
          >
            <span className="mr-2 text-lg leading-none">+</span> Add
          </Link>
        </div>

        {allClusters.length === 0 ? (
          <div className="rounded-[2.5rem] bg-white p-10 text-center shadow-sm border border-gray-50">
            <p className="text-gray-500 font-medium">No clusters created yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm border border-gray-50">
            <ul className="divide-y divide-gray-50">
              {allClusters.map((cluster) => (
                <li key={cluster.id} className="group relative flex items-center justify-between p-5 transition-colors hover:bg-purple-50/50 active:bg-purple-100">
                  {/* Fixed rounded corner syntax below */}
                  <Link href={`/clusters/${cluster.id}`} className="absolute inset-0 z-0 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-purple-500/20 rounded-[2rem]" />

                  <div className="z-10 flex items-center gap-4 pointer-events-none transition-transform duration-200 group-active:scale-[0.98]">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-purple-100 text-xl text-purple-700 shadow-sm border border-purple-200">📦</div>
                    <div>
                      <h2 className="text-[17px] font-bold tracking-tight text-gray-900">{cluster.name}</h2>
                      <p className="text-sm font-medium text-gray-500">{cluster.customerCount} Customers</p>
                    </div>
                  </div>

                  <div className="relative z-10 text-gray-400 group-hover:text-purple-600 transition">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

