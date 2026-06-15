// app/not-found.tsx
import Link from "next/link";
import { APP_VERSION } from "@/lib/version";
import Icon from "@/components/Icon";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-[32px] bg-card shadow-sm border border-card-border backdrop-blur-xl">
        <span className="text-5xl">🔍</span>
      </div>

      <h1 className="mb-2 text-6xl font-black tracking-tight text-primary">404</h1>
      <p className="mb-2 text-xl font-bold text-primary">Page not found</p>
      <p className="mb-10 max-w-xs text-[15px] font-medium text-secondary leading-relaxed">
        The page you are looking for does not exist or has been moved.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-4 text-[15px] font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-90"
      >
        <Icon name="home" size={20} />
        Back to Home
      </Link>

      <p className="mt-12 text-[12px] font-medium text-secondary/50">
        &copy; 2026 Courier Management System &bull; v{APP_VERSION}
      </p>
    </div>
  );
}
