"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { useLanguage } from "@/components/LanguageProvider";

function CustomersListContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const url = query 
          ? `/api/customers/search?q=${encodeURIComponent(query)}`
          : "/api/customers";
        const res = await fetch(url);
        const data = await res.json();
        setAllCustomers(data.customers || data || []);
      } catch (error) {
        console.error("Failed to fetch customers:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomers();
  }, [query]);

  return (
    <div className="min-h-screen bg-background pb-24">
      
      <Breadcrumbs />

      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-primary">
              {t("customer.db_title")}
            </h1>
            <p className="mt-1 text-sm font-medium text-secondary">
              {t("customer.db_subtitle")}
            </p>
          </div>

          <Link
            href="/customers/new"
            className="btn-primary"
          >
            <span className="mr-2 text-lg leading-none">+</span> {t("customer.add")}
          </Link>
        </div>

        <SearchBar />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 font-bold text-secondary">{t("action.loading")}</p>
          </div>
        ) : allCustomers.length === 0 ? (
          <div className="rounded-[2rem] bg-card p-10 text-center shadow-sm border border-card-border">
            <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-3xl">
              🕵️
            </div>
            <p className="text-lg font-medium text-primary">
              {query ? t("search.no_results") : "It's quiet here"}
            </p>
            <p className="mt-2 text-secondary">
              {query ? `We couldn't find anyone matching "${query}".` : "You haven't added any customers yet."}
            </p>
            {!query && (
              <Link
                href="/customers/new"
                className="btn-secondary mt-6 inline-block"
              >
                Add your first customer
              </Link>
            )}
          </div>
        ) : (
          /* M3 List Container */
          <div className="overflow-hidden rounded-[2rem] bg-card shadow-sm border border-card-border">
            <ul className="divide-y divide-card-border">
              {allCustomers.map((customer) => (
                <li
                  key={customer.id}
                  className="group relative flex items-center justify-between p-4 transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-900/10 sm:p-5"
                >
                  <Link
                    href={`/customers/${customer.id}`}
                    className="absolute inset-0 z-0 rounded-[2rem] transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-inset focus:ring-blue-500/20"
                    aria-label={`View details for ${customer.name}`}
                  />

                  <div className="z-10 flex min-w-0 flex-1 items-center gap-4 pointer-events-none">
                    {customer.housePictureUrl ? (
                      <img
                        src={customer.housePictureUrl}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-[1rem] object-cover border border-card-border"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1rem] bg-secondary text-2xl">
                        🏠
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[17px] font-bold tracking-tight text-primary">
                        {customer.name}
                      </h2>
                      <p className="mt-0.5 truncate text-[13px] font-medium text-secondary">
                        {customer.phoneNumber ? `📞 ${customer.phoneNumber}` : "No phone number"}
                      </p>
                      <p className="mt-0.5 truncate text-[13px] text-secondary/80">
                        {customer.address}
                      </p>
                      <p className="mt-1 text-[10px] font-medium text-secondary/50">
                        📅 {new Date(customer.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 ml-4 flex shrink-0 items-center gap-2">
                    {customer.phoneNumber && (
                      <a
                        href={`https://wa.me/${customer.phoneNumber.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition hover:bg-[#20bd5a] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-1"
                        title={t("customer.call")}
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                        </svg>
                      </a>
                    )}

                    {customer.latitude && customer.longitude && (
                      <a
                        href={`https://maps.google.com/?q=${customer.latitude},${customer.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow-sm transition hover:bg-blue-200 dark:hover:bg-blue-800/60 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        title={t("customer.pin")}
                      >
                        <span className="text-lg">📍</span>
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CustomersListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    }>
      <CustomersListContent />
    </Suspense>
  );
}
