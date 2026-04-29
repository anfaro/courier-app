// components/Breadcrumbs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Breadcrumbs() {
  const pathname = usePathname();
  const paths = pathname.split("/").filter((path) => path);

  if (paths.length === 0) return null;

  return (
    // 1. overflow-x-auto enables swiping
    // 2. The custom bracket classes hide the native scrollbar cleanly
    <nav className="flex w-full items-center overflow-x-auto px-4 py-3 sm:px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* whitespace-nowrap prevents any wrapping */}
      <ol className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-gray-500">
        <li>
          <Link
            href="/"
            className="rounded-full bg-white px-4 py-2 shadow-sm border border-gray-100 transition hover:bg-gray-50 hover:text-blue-600 active:scale-95"
          >
            Home
          </Link>
        </li>

        {paths.map((path, index) => {
          const href = `/${paths.slice(0, index + 1).join("/")}`;
          const isLast = index === paths.length - 1;

          // Format text (e.g., "new-waybill" -> "New Waybill")
          const formattedPath = path
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

          return (
            <li key={path} className="flex items-center gap-2">
              <span className="text-gray-300">›</span>
              {isLast ? (
                <span className="rounded-full bg-blue-50 px-4 py-2 font-bold text-blue-700 border border-blue-100">
                  {formattedPath}
                </span>
              ) : (
                <Link
                  href={href}
                  className="rounded-full bg-white px-4 py-2 shadow-sm border border-gray-100 transition hover:bg-gray-50 hover:text-blue-600 active:scale-95"
                >
                  {formattedPath}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

