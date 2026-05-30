// app/share/[id]/page.tsx
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import ImageModal from "@/components/ImageModal";
import MapModal from "@/components/MapModal";

export default async function SharePage({
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
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-lg p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="text-center pt-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-3xl mb-4">
            🏠
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary">
            {customerData.name}
          </h1>
          {customerData.phoneNumber && (
            <a
              href={`https://wa.me/${customerData.phoneNumber.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-2 rounded-full bg-[#25D366] text-white px-5 py-2 text-[13px] font-bold hover:bg-[#20bd5a] transition-colors active:scale-90"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
              Contact via WhatsApp
            </a>
          )}
        </div>

        {/* Customer Info Card */}
        <div className="rounded-[2.5rem] border border-card-border bg-card p-6 shadow-sm space-y-5">
          {/* House Picture */}
          {customerData.housePictureUrl && (
            <ImageModal src={customerData.housePictureUrl} alt="House" thumbnailClassName="w-full h-48 rounded-[1.5rem] object-cover" />
          )}

          {/* Address */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Alamat / Address</p>
            <p className="text-[17px] font-medium text-primary leading-snug">{customerData.address}</p>
          </div>

          {/* Phone */}
          {customerData.phoneNumber && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Telepon / Phone</p>
              <p className="text-[17px] font-medium text-primary">{customerData.phoneNumber}</p>
            </div>
          )}

          {/* Notes */}
          {customerData.notes && (
            <div className="rounded-2xl border border-orange-100 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-950/20 p-4">
              <p className="text-[11px] font-black uppercase tracking-widest text-orange-800 dark:text-orange-400 mb-1">📌 Catatan / Notes</p>
              <p className="whitespace-pre-wrap text-[15px] text-primary">{customerData.notes}</p>
            </div>
          )}

          {/* Clusters */}
          {customerData.clusters && customerData.clusters.length > 0 && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-2">Klaster / Clusters</p>
              <div className="flex flex-wrap gap-2">
                {customerData.clusters.map((cItem: any) => (
                  <span key={cItem.cluster.id} className="inline-flex items-center gap-1 rounded-full border border-purple-100 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/30 px-3 py-1.5 text-[12px] font-bold text-purple-700 dark:text-purple-300">
                    📦 {cItem.cluster.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        {customerData.latitude && customerData.longitude && (
          <MapModal
            latitude={customerData.latitude}
            longitude={customerData.longitude}
            address={customerData.address}
          />
        )}

        {/* Footer */}
        <p className="text-center text-[11px] font-medium text-secondary pb-8">
          Shared from Courier App
        </p>
      </main>
    </div>
  );
}
