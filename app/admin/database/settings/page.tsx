export const dynamic = "force-dynamic";

import Breadcrumbs from "@/components/Breadcrumbs";
import DatabaseSettings from "@/components/DatabaseSettings";

export default function DatabaseConnectionPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <Breadcrumbs />

      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Database Connection</h1>
          <p className="text-[14px] font-medium text-secondary mt-1">Configure and hot-reload the database connection.</p>
        </div>

        <DatabaseSettings />
      </main>
    </div>
  );
}
