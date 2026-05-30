// app/customers/[id]/page.tsx
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import { notFound } from "next/navigation";
import ImageModal from "@/components/ImageModal";
import MapModal from "@/components/MapModal";
import VisitsManager from "@/components/VisitsManager";

export default async function CustomerDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const customerId = resolvedParams.id;

  const customerData = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
    with: {
      clusters: {
        with: {
          cluster: true, 
        },
      },
    },
  });

  if (!customerData) return notFound();

  return (
    <div className="min-h-screen bg-background pb-24">
      
      <Breadcrumbs />

      <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        {/* Header Section with Edit & WhatsApp Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">{customerData.name}</h1>

          <div className="flex items-center gap-3">
            <Link
              href={`/customers/${customerId}/edit`}
              className="btn-outline !h-12 !w-12 !p-0"
              title="Edit Customer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </Link>

            {customerData.phoneNumber && (
              <a
                href={`https://wa.me/${customerData.phoneNumber.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition hover:shadow-md active:scale-90 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
              </a>
            )}
          </div>
        </div>

        {/* Customer Info Card */}
        <div className="flex flex-col gap-6 rounded-[2.5rem] border border-card-border bg-card p-6 shadow-sm sm:flex-row sm:p-8">
          {customerData.housePictureUrl ? (
            <ImageModal src={customerData.housePictureUrl} alt="House" thumbnailClassName="h-32 w-full sm:w-32 rounded-[1.5rem] object-cover shrink-0" />
          ) : (
            <div className="flex h-32 w-full shrink-0 items-center justify-center rounded-[1.5rem] bg-secondary text-4xl sm:w-32 text-primary">🏠</div>
          )}
          <div className="flex-1">
            <p className="mb-1 text-[11px] font-black uppercase tracking-widest text-secondary opacity-60">Address</p>
            <p className="mb-4 text-[17px] font-medium text-primary leading-snug">{customerData.address}</p>
            {customerData.latitude && customerData.longitude && (
              <MapModal
                latitude={customerData.latitude}
                longitude={customerData.longitude}
                address={customerData.address}
              />
            )}

            {/* Notes Section */}
            {customerData.notes && (
              <div className="mb-5 mt-4 rounded-2xl border border-orange-100 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-950/20 p-4">
                <p className="mb-1 text-[11px] font-black uppercase tracking-widest text-orange-800 dark:text-orange-400">📌 Notes</p>
                <p className="whitespace-pre-wrap text-[15px] text-primary">{customerData.notes}</p>
              </div>
            )}

            {/* Clusters Chips Container */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {customerData.clusters && customerData.clusters.length > 0 ? (
                customerData.clusters.map((cItem: any) => (
                  <Link
                    key={cItem.cluster.id}
                    href={`/clusters/${cItem.cluster.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-purple-100 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/30 px-4 py-2 text-sm font-bold text-purple-700 dark:text-purple-300 transition hover:bg-purple-100 active:scale-90"
                    title={`Go to ${cItem.cluster.name}`}
                  >
                    <span>📦</span> {cItem.cluster.name}
                  </Link>
                ))
              ) : (
                <span className="text-[11px] font-black uppercase tracking-widest text-secondary opacity-40">No clusters assigned</span>
              )}
            </div>
          </div>
        </div>

        {/* --- RECORD HISTORY TIMELINE --- */}
        <div className="rounded-[2.5rem] bg-card p-6 sm:p-8 border border-card-border shadow-sm">
           <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-6 ml-1 tracking-[0.2em]">Record Timeline</p>
           <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-card-border">
              {/* Created At */}
              <div className="relative">
                <div className="absolute -left-[19px] top-1.5 h-3 w-3 rounded-full bg-blue-500 border-2 border-card ring-4 ring-blue-500/10" />
                <div>
                  <p className="text-[14px] font-black text-primary leading-none mb-1">Customer Profile Created</p>
                  <p className="text-[12px] font-medium text-secondary">
                    {customerData.createdAt ? new Date(customerData.createdAt).toLocaleString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '-'}
                  </p>
                </div>
              </div>
              {/* Updated At */}
              <div className="relative">
                <div className="absolute -left-[19px] top-1.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card ring-4 ring-emerald-500/10" />
                <div>
                  <p className="text-[14px] font-black text-primary leading-none mb-1">Last Information Update</p>
                  <p className="text-[12px] font-medium text-secondary">
                    {customerData.updatedAt ? new Date(customerData.updatedAt).toLocaleString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '-'}
                  </p>
                </div>
              </div>
           </div>
        </div>

        <VisitsManager customerId={customerId} />

      </main>
    </div>
  );
}
