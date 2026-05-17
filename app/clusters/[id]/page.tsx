import { db } from "@/lib/db";
import { clusters } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import { notFound } from "next/navigation";
import ClusterCustomerList from "./ClusterCustomerList";

export default async function ClusterDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const clusterId = resolvedParams.id;

  const cluster = await db.query.clusters.findFirst({
    where: eq(clusters.id, clusterId),
    columns: { id: true, name: true, notes: true },
  });

  if (!cluster) return notFound();

  const totalResult = await db.execute(
    sql`SELECT COUNT(*)::int AS count FROM customer_clusters WHERE cluster_id = ${clusterId}`
  );
  const totalCustomers = Number(totalResult[0]?.count ?? 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Breadcrumbs />

      <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <div className="flex justify-end">
          <Link
            href={`/clusters/${clusterId}/edit`}
            className="btn-primary !py-2.5 !px-5"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit
          </Link>
        </div>
        <div className="rounded-[2.5rem] bg-card border border-card-border p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1rem] bg-purple-100 dark:bg-purple-900/30 text-2xl shadow-sm border border-purple-200 dark:border-purple-800">
              📦
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
                {cluster.name}
              </h1>
              <p className="mt-1 text-[14px] font-medium text-secondary">{totalCustomers} customer{totalCustomers !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {cluster.notes && (
            <div className="mt-6 rounded-2xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 p-4">
              <p className="mb-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Notes</p>
              <p className="whitespace-pre-wrap text-[14px] text-primary leading-relaxed">{cluster.notes}</p>
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
          Customers
          <span className="rounded-full bg-surface-hover px-3 py-0.5 text-[13px] font-bold text-secondary">{totalCustomers}</span>
        </h2>

        <ClusterCustomerList clusterId={clusterId} initialTotal={totalCustomers} />
      </main>
    </div>
  );
}
