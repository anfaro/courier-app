// app/admin/users/page.tsx
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import Breadcrumbs from "@/components/Breadcrumbs";
import AdminUserTable from "@/components/AdminUserTable";

export default async function AdminUsersPage() {
  // Fetch all users from the database
  const allUsers = await db.select().from(users);

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      <div className="shrink-0 z-30 bg-background">
        <Breadcrumbs />
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar pb-32">
        <div className="pt-4 px-4 sm:px-6 mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Fleet Management</h1>
          <p className="text-[14px] font-medium text-secondary mt-1">Manage usernames, roles, and security for couriers.</p>
        </div>

        <AdminUserTable initialUsers={allUsers} />
      </main>
    </div>
  );
}
