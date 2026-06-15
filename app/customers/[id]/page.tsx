// app/customers/[id]/page.tsx
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import PageHeader from "@/components/PageHeader";
import SectionWrapper from "@/components/SectionWrapper";
import Link from "next/link";
import { notFound } from "next/navigation";
import ImageModal from "@/components/ImageModal";
import MapModal from "@/components/MapModal";
import ShareButton from "@/components/ShareButton";
import VisitManager from "@/components/VisitManager";
import Icon from "@/components/Icon";

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
      
      <PageHeader title={`${customerData.name} (${customerId})`} />

      <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <SectionWrapper className="flex flex-wrap items-center justify-between gap-4"
        >
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">{customerData.name}</h1>

          <div className="flex items-center gap-3">
            <ShareButton customerId={customerId} />

            <Link
              href={`/customers/${customerId}/edit`}
              className="btn-outline !h-12 !w-12 !p-0"
              title="Edit Customer"
            >
              <Icon name="edit" size={20} />
            </Link>

            {customerData.phoneNumber && (
              <a
                href={`https://wa.me/${customerData.phoneNumber.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition hover:shadow-md active:scale-90 focus:outline-none"
              >
                <Icon name="whatsapp" size={24} />
              </a>
            )}
          </div>
        </SectionWrapper>

        {/* Customer Info Card */}
        <SectionWrapper delay={0.05} className="flex flex-col gap-6 rounded-[2.5rem] border border-card-border bg-card p-6 shadow-sm sm:flex-row sm:p-8"
        >
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
        </SectionWrapper>

        {/* --- RECORD HISTORY TIMELINE --- */}
        <SectionWrapper delay={0.1} className="rounded-[2.5rem] bg-card p-6 sm:p-8 border border-card-border shadow-sm"
        >
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary mb-6 ml-1">Record Timeline</p>
           <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-card-border">
              {/* Created At */}
              <div className="relative">
                <div className="absolute -left-[19px] top-1.5 h-3 w-3 rounded-full bg-blue-500 border-2 border-card ring-4 ring-blue-500/10" />
                <div>
                  <p className="text-[14px] font-black text-primary leading-none mb-1">Customer Profile Created</p>
                  <p className="text-[12px] font-medium text-secondary">
                    {customerData.createdAt ? new Date(customerData.createdAt).toLocaleString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta'
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
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta'
                    }) : '-'}
                  </p>
                </div>
              </div>
           </div>
        </SectionWrapper>

        <SectionWrapper delay={0.15}>
          <VisitManager customerId={customerId} hideCheckIn={true} />
        </SectionWrapper>

      </main>
    </div>
  );
}
