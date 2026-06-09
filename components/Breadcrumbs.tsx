// components/Breadcrumbs.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type BreadcrumbsProps = {
  segmentLabels?: Record<string, string>;
  title?: string;
};

export default function Breadcrumbs({ segmentLabels, title }: BreadcrumbsProps = {}) {
  const pathname = usePathname();
  const paths = pathname.split("/").filter((path) => path);

  if (paths.length === 0) return null;

  return (
    <nav className="flex w-full items-center overflow-x-auto bg-background px-4 py-2.5 sm:px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] transition-colors duration-300">
      <ol className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium">

        {/* Home Icon Button */}
        <li>
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 dark:bg-slate-900/80 text-secondary dark:text-slate-400 shadow-sm ring-1 ring-gray-200/50 dark:ring-slate-800 transition-all hover:text-blue-600 dark:hover:text-blue-400 active:scale-90 backdrop-blur-md"
            title="Home" aria-label="Home"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
          </Link>
        </li>

        {paths.map((path, index) => {
          const href = `/${paths.slice(0, index + 1).join("/")}`;
          const isLast = index === paths.length - 1;

          const formattedPath = path
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

          const displayLabel = isLast && title
            ? title
            : segmentLabels?.[path] ?? formattedPath;

          return (
            <li key={path} className="flex items-center gap-1.5">
              <span className="text-gray-300 dark:text-slate-700 font-bold">/</span>
              {isLast ? (
                <span className="rounded-full bg-blue-600 dark:bg-blue-600 px-4 py-1.5 text-[13px] font-black tracking-wide text-white shadow-md shadow-blue-600/20">
                  {displayLabel}
                </span>
              ) : (
                <Link
                  href={href}
                  className="rounded-full bg-card/80 dark:bg-slate-900/80 px-4 py-1.5 text-[13px] font-bold text-secondary dark:text-slate-300 shadow-sm ring-1 ring-gray-200/50 dark:ring-slate-800 transition-all hover:text-blue-600 dark:hover:text-blue-400 active:scale-90 backdrop-blur-md"
                >
                  {displayLabel}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
