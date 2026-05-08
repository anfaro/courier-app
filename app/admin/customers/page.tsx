// app/admin/customers/page.tsx
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import Header from "@/components/header";
import Breadcrumbs from "@/components/Breadcrumbs";
import AdminCustomerTable from "@/components/AdminCustonerTable";

export default async function AdminCustomersPage() {
  // Fetch all customers from the database
  const allCustomers = await db.select().from(customers);

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F8F9FA] overflow-hidden">
      <div className="shrink-0 z-30 bg-[#F8F9FA]">
        <Header />
        <Breadcrumbs />
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar pb-32">
        <div className="pt-4 px-4 sm:px-6 mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Database Management</h1>
          <p className="text-[14px] font-medium text-gray-500 mt-1">Bulk manage and clean up customer records.</p>
        </div>

        {/* Pass the data to our interactive Client Component */}
        <AdminCustomerTable initialCustomers={allCustomers} />
      </main>
    </div>
  );
}
