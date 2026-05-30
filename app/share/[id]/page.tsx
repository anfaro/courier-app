// app/share/[id]/page.tsx
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import ImageModal from "@/components/ImageModal";
import MapModal from "@/components/MapModal";
import { APP_VERSION } from "@/lib/version";

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
      {/* Hero Section */}
      <div className="relative h-[45vh] min-h-[320px] w-full overflow-hidden">
        {customerData.housePictureUrl ? (
          <ImageModal
            src={customerData.housePictureUrl}
            alt="House"
            thumbnailClassName="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-8xl">
            🏠
          </div>
        )}
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Customer Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-lg">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white/90 uppercase tracking-wider">
              Customer Location
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white drop-shadow-lg mb-1">
            {customerData.name}
          </h1>
          {customerData.address && (
            <p className="text-[15px] font-medium text-white/80 drop-shadow line-clamp-2">
              {customerData.address}
            </p>
          )}
        </div>

        {/* Floating WhatsApp Button */}
        {customerData.phoneNumber && (
          <a
            href={`https://wa.me/${customerData.phoneNumber.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-5 top-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition hover:scale-105 hover:shadow-xl active:scale-90 z-10"
          >
            <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
          </a>
        )}
      </div>

      {/* Content Section */}
      <div className="relative -mt-6 rounded-[2.5rem] bg-background px-5 pt-6 pb-8 space-y-5 z-10">
        {/* Quick Info Chips */}
        <div className="flex flex-wrap gap-2">
          {customerData.clusters && customerData.clusters.length > 0 && customerData.clusters.map((cItem: any) => (
            <span key={cItem.cluster.id} className="inline-flex items-center gap-1.5 rounded-full border border-purple-100 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/30 px-4 py-2 text-[12px] font-bold text-purple-700 dark:text-purple-300">
              📦 {cItem.cluster.name}
            </span>
          ))}
        </div>

        {/* Info Grid */}
        <div className="grid gap-4">
          {/* Phone */}
          {customerData.phoneNumber && (
            <div className="flex items-center gap-4 rounded-[1.75rem] border border-card-border bg-card p-5 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-secondary">Phone</p>
                <p className="text-[16px] font-bold text-primary truncate">{customerData.phoneNumber}</p>
              </div>
              <a
                href={`https://wa.me/${customerData.phoneNumber.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white active:scale-90 transition"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
              </a>
            </div>
          )}

          {/* Notes */}
          {customerData.notes && (
            <div className="rounded-[1.75rem] border border-orange-100 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-950/20 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📌</span>
                <p className="text-[11px] font-black uppercase tracking-widest text-orange-800 dark:text-orange-400">Notes</p>
              </div>
              <p className="whitespace-pre-wrap text-[15px] text-primary leading-relaxed">{customerData.notes}</p>
            </div>
          )}

          {/* Map */}
          {customerData.latitude && customerData.longitude && (
            <div className="rounded-[1.75rem] border border-card-border bg-card overflow-hidden shadow-sm">
              <MapModal
                latitude={customerData.latitude}
                longitude={customerData.longitude}
                address={customerData.address}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-card-border/50 px-6 py-6">
        <div className="mx-auto max-w-lg text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 border border-card-border">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-[10px] text-white font-black">C</div>
            <span className="text-[11px] font-bold text-secondary">Shared via Courier App</span>
          </div>
          <p className="mt-3 text-[11px] font-medium text-secondary/60">v{APP_VERSION}</p>
        </div>
      </div>
    </div>
  );
}
