// app/map/loading.tsx
import Breadcrumbs from "@/components/Breadcrumbs";

export default function MapLoading() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <Breadcrumbs />
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="h-9 w-48 rounded-full bg-surface-hover animate-pulse mb-2" />
        <div className="h-5 w-72 rounded-full bg-surface-hover animate-pulse mb-6" />

        <div className="rounded-[24px] bg-surface-hover p-5 animate-pulse mb-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-card/50" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-40 rounded-full bg-card/50" />
              <div className="h-4 w-full rounded-full bg-card/50" />
              <div className="h-4 w-3/4 rounded-full bg-card/50" />
            </div>
          </div>
        </div>

        <div className="flex h-[60vh] items-center justify-center rounded-[32px] bg-card border border-card-border shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" />
            <span className="text-[14px] font-bold text-secondary animate-pulse">Loading map data...</span>
          </div>
        </div>
      </main>
    </div>
  );
}
