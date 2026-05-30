import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    const customer = await db.query.customers.findFirst({ where: eq(customers.id, id) });
    if (!customer) return { title: "Customer Not Found" };
    return {
      title: `${customer.name} - Customer Info`,
      description: `Address: ${customer.address}`,
      openGraph: {
        title: customer.name,
        description: customer.address,
      },
    };
  } catch {
    return { title: "Customer Info" };
  }
}

export default async function SharedCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, id),
    with: {
      clusters: {
        with: {
          cluster: true,
        },
      },
    },
  });

  if (!customer) notFound();

  const hasCoords = customer.latitude && customer.longitude;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${customer.latitude},${customer.longitude}`
    : null;
  const waUrl = customer.phoneNumber
    ? `https://wa.me/${customer.phoneNumber.replace(/\D/g, "")}`
    : null;

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-md p-4 sm:p-6 pt-8">
        <div className="rounded-[32px] bg-card border border-card-border shadow-sm overflow-hidden">
          {customer.housePictureUrl && (
            <div className="aspect-[16/9] w-full overflow-hidden">
              <img
                src={customer.housePictureUrl}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div className="p-6 space-y-5">
            <div>
              <h1 className="text-2xl font-extrabold text-primary">{customer.name}</h1>
              {customer.phoneNumber && (
                <p className="text-[15px] font-medium text-secondary mt-1">{customer.phoneNumber}</p>
              )}
            </div>

            <div className="rounded-[20px] bg-background p-4 border border-card-border">
              <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Address</p>
              <p className="text-[15px] font-medium text-primary">{customer.address}</p>
            </div>

            {customer.notes && (
              <div className="rounded-[20px] bg-orange-50 dark:bg-orange-950/20 p-4 border border-orange-100 dark:border-orange-900/40">
                <p className="text-[11px] font-black uppercase tracking-widest text-orange-800 dark:text-orange-400 mb-1">Notes</p>
                <p className="text-[14px] text-primary whitespace-pre-wrap">{customer.notes}</p>
              </div>
            )}

            {customer.clusters && customer.clusters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customer.clusters.map((cc: any) => (
                  <span key={cc.cluster.id} className="inline-flex rounded-full bg-purple-100 dark:bg-purple-900/30 px-3 py-1.5 text-[12px] font-bold text-purple-700 dark:text-purple-300">
                    📦 {cc.cluster.name}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-[15px] font-bold text-white active:scale-95 transition-all"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Open in Google Maps
                </a>
              )}
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-4 text-[15px] font-bold text-white active:scale-95 transition-all"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
                  Contact via WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-[12px] font-medium text-secondary">
          Shared via Courier SuperApp
        </p>
      </main>
    </div>
  );
}
