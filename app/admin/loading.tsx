// app/admin/loading.tsx
import PageHeader from "@/components/PageHeader";

export default function AdminLoading() {
  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      <div className="shrink-0 z-30 bg-background"><PageHeader title="Admin" /></div>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="h-9 w-48 rounded-full bg-surface-hover animate-pulse mb-2" />
        <div className="h-5 w-72 rounded-full bg-surface-hover animate-pulse mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-card border border-card-border p-4 animate-pulse"><div className="h-6 w-12 rounded-full bg-surface-hover mx-auto mb-2" /><div className="h-4 w-16 rounded-full bg-surface-hover mx-auto" /></div>
          ))}
        </div>
        <div className="flex h-40 items-center justify-center rounded-[24px] bg-card border border-card-border">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" />
        </div>
      </main>
    </div>
  );
}
