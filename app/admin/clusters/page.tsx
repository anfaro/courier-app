// app/admin/clusters/page.tsx
import Breadcrumbs from "@/components/Breadcrumbs";

export default function AdminClustersPage() {
  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      <div className="shrink-0 z-30 bg-background">
        <Breadcrumbs />
      </div>
      <main className="flex-1 overflow-y-auto p-6">
        <h1 className="text-3xl font-extrabold text-primary">Zone Intelligence</h1>
        <p className="text-secondary mt-2">Manage neighborhood clusters and region assignments.</p>
        <div className="mt-10 p-20 border-2 border-dashed border-card-border rounded-[32px] text-center">
          <span className="text-4xl mb-4 block">📍</span>
          <p className="font-bold text-secondary">Cluster management interface is in development.</p>
        </div>
      </main>
    </div>
  );
}
