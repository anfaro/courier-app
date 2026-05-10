// app/not-mobile/page.tsx
import Link from "next/link";

export default function NotMobilePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-5xl shadow-inner">
        📱
      </div>
      
      <h1 className="mb-3 text-3xl font-black tracking-tight text-gray-900">Mobile Only Experience</h1>
      <p className="mb-8 max-w-sm text-[15px] font-medium leading-relaxed text-gray-500">
        Our Courier Superapp is currently optimized strictly for field operations on mobile devices. 
        <br/><br/>
        Please open this link on your smartphone to continue managing your deliveries.
      </p>

      <div className="w-full max-w-xs space-y-4">
        <div className="rounded-[24px] bg-card p-6 shadow-sm border border-gray-100">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Desktop Version</p>
            <p className="text-[14px] font-bold text-gray-700">Coming Soon: HQ Dispatcher View</p>
        </div>
        
        <Link 
            href="/login" 
            className="block w-full rounded-full bg-gray-900 py-4 text-[15px] font-bold text-white shadow-lg active:scale-90 transition-all"
        >
            Try Login Anyway
        </Link>
      </div>

      <p className="mt-12 text-[12px] font-medium text-gray-400">
        &copy; 2026 Courier Management System • v0.1.0
      </p>
    </div>
  );
}
