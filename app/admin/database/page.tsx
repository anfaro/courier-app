export const dynamic = "force-dynamic";

import Breadcrumbs from "@/components/Breadcrumbs";
import DatabaseAdmin from "@/components/DatabaseAdmin";

export default function DatabaseAdminPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <Breadcrumbs />

      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Database Administration</h1>
          <p className="text-[14px] font-medium text-secondary mt-1">Backup, restore, maintenance, and import/export.</p>
        </div>

        <DatabaseAdmin />
      </main>
    </div>
  );
}
