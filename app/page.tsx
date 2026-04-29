// app/page.tsx
import Header from "@/components/header";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header />

      <main className="mx-auto max-w-3xl p-4 sm:p-6 space-y-6">

        {/* M3 Expressive Welcome Banner */}
        <div className="rounded-[2.5rem] bg-blue-600 p-8 sm:p-10 text-white shadow-md relative overflow-hidden">
          {/* Background decorative shape */}
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/50 blur-2xl pointer-events-none"></div>

          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
              Hello, Courier! 👋
            </h1>
            <p className="text-blue-100 text-[15px] font-medium max-w-xs leading-relaxed">
              Ready to hit the road? Let's get these packages delivered safely.
            </p>
          </div>
        </div>

        <div className="pt-4 px-2">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Quick Actions</h2>
        </div>

        {/* Tactile Navigation Grid */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6">

          {/* Customers Module */}
          <Link
            href="/customers"
            className="group flex flex-col items-center justify-center gap-4 rounded-[2rem] bg-white p-6 shadow-sm border border-gray-50 transition-all hover:bg-blue-50/50 active:scale-95 active:bg-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-blue-50 text-3xl transition-transform group-hover:scale-110 group-active:scale-95 shadow-sm border border-blue-100">
              👥
            </div>
            <span className="text-[16px] font-bold text-gray-800">Customers</span>
          </Link>

          {/* Clusters Module */}
          <Link
            href="/clusters"
            className="group flex flex-col items-center justify-center gap-4 rounded-[2rem] bg-white p-6 shadow-sm border border-gray-50 transition-all hover:bg-purple-50/50 active:scale-95 active:bg-purple-100 focus:outline-none focus:ring-4 focus:ring-purple-500/20"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-purple-50 text-3xl transition-transform group-hover:scale-110 group-active:scale-95 shadow-sm border border-purple-100">
              📦
            </div>
            <span className="text-[16px] font-bold text-gray-800">Clusters</span>
          </Link>

          {/* Add Customer Shortcut */}
          <Link
            href="/customers/new"
            className="group flex flex-col items-center justify-center gap-4 rounded-[2rem] bg-white p-6 shadow-sm border border-gray-50 transition-all hover:bg-green-50/50 active:scale-95 active:bg-green-100 focus:outline-none focus:ring-4 focus:ring-green-500/20"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-green-50 text-3xl transition-transform group-hover:scale-110 group-active:scale-95 shadow-sm border border-green-100">
              ➕
            </div>
            <span className="text-[16px] font-bold text-gray-800 text-center">Add<br />Customer</span>
          </Link>

          {/* Add Cluster Shortcut */}
          <Link
            href="/clusters/new"
            className="group flex flex-col items-center justify-center gap-4 rounded-[2rem] bg-white p-6 shadow-sm border border-gray-50 transition-all hover:bg-orange-50/50 active:scale-95 active:bg-orange-100 focus:outline-none focus:ring-4 focus:ring-orange-500/20"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-orange-50 text-3xl transition-transform group-hover:scale-110 group-active:scale-95 shadow-sm border border-orange-100">
              📍
            </div>
            <span className="text-[16px] font-bold text-gray-800 text-center">New<br />Cluster</span>
          </Link>

        </div>
      </main>
    </div>
  );
}

