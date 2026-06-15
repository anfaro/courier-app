// app/share/[token]/page.tsx
import { db } from "@/lib/db";
import { customers, customerVisits } from "@/lib/schema";
import { eq, desc, count } from "drizzle-orm";
import { notFound } from "next/navigation";
import ImageModal from "@/components/ImageModal";
import MapModal from "@/components/MapModal";
import SharePageActions from "@/components/SharePageActions";
import { APP_VERSION } from "@/lib/version";
import Icon from "@/components/Icon";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = await params;
  const shareToken = resolvedParams.token;

  const customerData = await db.query.customers.findFirst({
    where: eq(customers.shareToken, shareToken),
    with: {
      clusters: {
        with: {
          cluster: true,
        },
      },
    },
  });

  if (!customerData) return notFound();
  if (customerData.shareTokenExpiresAt && new Date(customerData.shareTokenExpiresAt) < new Date()) return notFound();

  const [visitCount, lastVisit] = await Promise.all([
    db.select({ count: count() }).from(customerVisits).where(eq(customerVisits.customerId, customerData.id)).then(r => r[0]?.count ?? 0),
    db.query.customerVisits.findFirst({
      where: eq(customerVisits.customerId, customerData.id),
      orderBy: [desc(customerVisits.visitedAt)],
    }),
  ]);

  const initials = customerData.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const hasCoords = customerData.latitude && customerData.longitude;
  const createdAt = customerData.createdAt ? new Date(customerData.createdAt) : null;

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
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
            <span className="text-7xl sm:text-8xl font-black text-white/90 drop-shadow-2xl select-none">
              {initials}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

        <div className="absolute bottom-0 left-0 right-0 p-6 pb-8">
          <h1 className="text-3xl font-extrabold text-white drop-shadow-lg mb-1">
            {customerData.name}
          </h1>
          {customerData.address && (
            <p className="text-[15px] font-medium text-white/80 drop-shadow line-clamp-2">
              {customerData.address}
            </p>
          )}
          {createdAt && (
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-white/80 uppercase tracking-wider">
                Customer since {createdAt.toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" })}
              </span>
            </div>
          )}
        </div>

        {customerData.phoneNumber && (
          <a
            href={`https://wa.me/${customerData.phoneNumber.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-5 top-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition hover:scale-105 hover:shadow-xl active:scale-90 z-10"
          >
            <Icon name="whatsapp" size={28} />
          </a>
        )}
      </div>

      {/* Content Section */}
      <div className="relative -mt-6 rounded-[2.5rem] bg-background px-5 pt-6 pb-8 space-y-5 z-10">
        {/* Cluster Chips */}
        {customerData.clusters && customerData.clusters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customerData.clusters.map((cItem: any) => (
              <span key={cItem.cluster.id} className="inline-flex items-center gap-1.5 rounded-full border border-purple-100 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/30 px-4 py-2 text-[12px] font-bold text-purple-700 dark:text-purple-300">
                📦 {cItem.cluster.name}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          {hasCoords && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${customerData.latitude},${customerData.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-[24px] bg-card border border-card-border p-4 shadow-sm hover:bg-surface-hover transition-all active:scale-90"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <Icon name="map-pin" size={20} />
              </div>
              <span className="text-[11px] font-bold text-primary">Navigate</span>
            </a>
          )}
          {customerData.phoneNumber && (
            <>
              <a
                href={`tel:${customerData.phoneNumber.replace(/\D/g, "")}`}
                className="flex flex-col items-center gap-2 rounded-[24px] bg-card border border-card-border p-4 shadow-sm hover:bg-surface-hover transition-all active:scale-90"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400">
                  <Icon name="phone" size={20} />
                </div>
                <span className="text-[11px] font-bold text-primary">Call</span>
              </a>
              <a
                href={`https://wa.me/${customerData.phoneNumber.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 rounded-[24px] bg-card border border-card-border p-4 shadow-sm hover:bg-surface-hover transition-all active:scale-90"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
<Icon name="whatsapp" size={20} />
                </div>
                <span className="text-[11px] font-bold text-primary">WhatsApp</span>
              </a>
            </>
          )}
        </div>

        {/* Address Card */}
        {customerData.address && (
          <div className="flex items-center gap-4 rounded-[1.75rem] border border-card-border bg-card p-5 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Icon name="map-pin" size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-widest text-secondary">Address</p>
              <p className="text-[15px] font-bold text-primary leading-snug mt-0.5">{customerData.address}</p>
            </div>
            {hasCoords && (
              <a
                href={`https://maps.google.com/?q=${customerData.latitude},${customerData.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 active:scale-90 transition"
              >
                <span className="text-lg">📍</span>
              </a>
            )}
          </div>
        )}

        {/* Phone Card */}
        {customerData.phoneNumber && (
          <div className="flex items-center gap-4 rounded-[1.75rem] border border-card-border bg-card p-5 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              <Icon name="phone" size={24} />
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
              <Icon name="whatsapp" size={20} />
            </a>
          </div>
        )}

        {/* Visit Summary */}
        {visitCount > 0 && (
          <div className="flex items-center gap-4 rounded-[1.75rem] border border-card-border bg-card p-5 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Icon name="clock" size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-widest text-secondary">Visit History</p>
              <p className="text-[15px] font-bold text-primary mt-0.5">
                {visitCount} visit{visitCount !== 1 ? "s" : ""} recorded
              </p>
              {lastVisit && (
                <p className="text-[12px] font-medium text-secondary mt-0.5">
                  Last visited {new Date(lastVisit.visitedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })}
                  {lastVisit.userName && ` by ${lastVisit.userName}`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {customerData.notes ? (
          <div className="rounded-[1.75rem] border border-orange-100 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-950/20 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📌</span>
              <p className="text-[11px] font-black uppercase tracking-widest text-orange-800 dark:text-orange-400">Notes</p>
            </div>
            <p className="whitespace-pre-wrap text-[15px] text-primary leading-relaxed">{customerData.notes}</p>
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-card-border bg-card/30 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-hover text-secondary/50">
                <Icon name="edit" size={20} />
              </div>
              <p className="text-[13px] font-medium text-secondary/60">No notes added</p>
            </div>
          </div>
        )}

        {/* Map */}
        {hasCoords ? (
          <div className="rounded-[1.75rem] border border-card-border bg-card overflow-hidden shadow-sm">
            <MapModal
              latitude={customerData.latitude}
              longitude={customerData.longitude}
              address={customerData.address}
            />
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-card-border bg-card/30 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-hover text-secondary/50">
                <Icon name="route" size={20} />
              </div>
              <p className="text-[13px] font-medium text-secondary/60">No location set</p>
            </div>
          </div>
        )}

        {/* Copy Link */}
        <SharePageActions shareToken={shareToken} />
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
