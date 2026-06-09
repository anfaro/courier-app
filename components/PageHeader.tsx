// components/PageHeader.tsx

"use client";

import { useRouter, usePathname } from "next/navigation";

type PageHeaderProps = {
  title: string;
};

export default function PageHeader({ title }: PageHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const paths = pathname.split("/").filter(Boolean);

  const hasBack = paths.length > 1;

  return (
    <div className="flex items-center gap-3 bg-background px-4 py-3 sm:px-6 transition-colors">
      {hasBack && (
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card/80 dark:bg-slate-900/80 text-secondary shadow-sm ring-1 ring-gray-200/50 dark:ring-slate-800 active:scale-90 backdrop-blur-md"
          aria-label="Back"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <h1 className="truncate text-[15px] font-extrabold tracking-tight text-primary">
        {title}
      </h1>
    </div>
  );
}
