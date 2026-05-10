// app/clusters/[id]/page.tsx
import { db } from "@/lib/db";
import { clusters } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ClusterDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const clusterId = parseInt(resolvedParams.id);

  // 1. Fetch the Cluster details along with its associated customers via the join table
  const clusterWithCustomers = await db.query.clusters.findFirst({
    where: eq(clusters.id, clusterId),
    with: {
      customers: {
        with: {
          customer: true, // Fetch the actual customer data for each link
        },
      },
    },
  });

  if (!clusterWithCustomers) return notFound();

  // Extract customers for easier mapping
  const customersList = clusterWithCustomers.customers.map((c) => c.customer);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Breadcrumbs />

      <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            {clusterWithCustomers.name}
          </h1>

          <Link
            href={`/clusters/${clusterId}/edit`}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-700 shadow-sm transition hover:bg-purple-200"
            title="Edit Cluster"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </Link>
        </div>

        {/* Cluster Notes Card */}
        {clusterWithCustomers.notes && (
          <div className="rounded-[2.5rem] border border-yellow-100 bg-yellow-50/80 p-6 shadow-sm sm:p-8">
            <p className="mb-2 text-sm font-bold text-yellow-800">📌 Cluster Notes</p>
            <p className="whitespace-pre-wrap text-[15px] text-gray-800">{clusterWithCustomers.notes}</p>
          </div>
        )}

        <hr className="my-8 border-dashed border-gray-200" />

        <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900">
          Customers ({customersList.length})
        </h2>

        {customersList.length === 0 ? (
          <div className="rounded-[2rem] border border-gray-50 bg-card p-8 text-center shadow-sm">
            <p className="font-medium text-gray-500">No customers assigned to this cluster.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[2rem] border border-gray-50 bg-card shadow-sm">
            <ul className="divide-y divide-gray-100">
              {customersList.map((customer) => (
                <li key={customer.id} className="group relative flex items-center justify-between p-4 transition-all hover:bg-blue-50/50 active:bg-blue-100 sm:p-5">
                  <Link href={`/customers/${customer.id}`} className="absolute inset-0 z-0 focus:outline-none" />

                  <div className="z-10 flex min-w-0 flex-1 items-center gap-4 pointer-events-none transition-transform duration-200 group-active:scale-[0.98]">
                    {customer.housePictureUrl ? (
                      <img src={customer.housePictureUrl} alt="" className="h-14 w-14 shrink-0 rounded-[1rem] border border-gray-100 object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1rem] bg-gray-100 text-2xl">🏠</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[17px] font-bold tracking-tight text-gray-900">{customer.name}</h2>
                      <p className="mt-0.5 truncate text-[13px] text-gray-500">{customer.address}</p>
                    </div>
                  </div>

                  <div className="z-10 text-gray-300 transition group-hover:text-blue-500">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
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

