// app/gallery/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useLanguage } from "@/components/LanguageProvider";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { filterGalleryByName, galleryAspectRatio } from "@/lib/gallery";
import GalleryDetailModal from "@/components/GalleryDetailModal";
import GalleryImage from "@/components/GalleryImage";
import Icon from "@/components/Icon";

interface GalleryCustomer {
  id: string;
  name: string;
  phoneNumber: string | null;
  housePictures: string[];
  photoCount: number;
}

const PAGE_SIZE = 30;

export default function GalleryPage() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<GalleryCustomer[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [activeCustomer, setActiveCustomer] = useState<GalleryCustomer | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);

  const loadPage = useCallback(async (offset: number, append: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setFetchError("");
    try {
      const res = await fetchWithTimeout(`/api/gallery?limit=${PAGE_SIZE}&offset=${offset}`, {}, 60000);
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const data = await res.json();
      const list = data.customers || [];
      setCustomers((prev) => (append ? [...prev, ...list] : list));
      setHasMore(!!data.hasMore);
      offsetRef.current = offset + list.length;
    } catch (error: any) {
      setFetchError(
        error.name === "AbortError"
          ? "Request timed out. Check your connection."
          : error.message || "Failed to load gallery."
      );
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPage(0, false);
  }, [loadPage]);

  // Infinite scroll — load next page when the sentinel approaches the viewport.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || isLoading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !loadingRef.current) {
            loadPage(offsetRef.current, true);
          }
        });
      },
      { rootMargin: "400px 0px 400px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadPage]);

  const filtered = useMemo(() => filterGalleryByName(customers, query), [customers, query]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={t("nav.gallery")} />

      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-[30px] font-extrabold tracking-tight text-primary">{t("nav.gallery")}</h1>
          <p className="mt-1 text-[14px] font-medium text-secondary">{t("gallery.subtitle")}</p>
        </div>

        {/* Search — customer name only */}
        <div className="relative mb-6">
          <Icon name="search" size={18} strokeWidth={2.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder={t("gallery.search_placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full border-2 border-card-border bg-card py-3.5 pl-11 pr-11 text-[15px] font-bold text-primary outline-none focus:border-blue-500 transition-all placeholder:text-secondary/40"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label={t("action.clear")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary hover:text-primary active:scale-90"
            >
              <Icon name="close" size={18} strokeWidth={3} />
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="columns-2 [column-gap:12px] sm:columns-3 sm:[column-gap:14px]">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="mb-3 break-inside-avoid">
                <div className="overflow-hidden rounded-[28px] border border-card-border bg-card">
                  <div className="animate-pulse" style={{ aspectRatio: galleryAspectRatio(`skel${i}`) }} />
                  <div className="p-3 space-y-2">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-surface-hover" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-surface-hover" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : fetchError && customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] bg-card border border-card-border px-8 py-12 text-center">
            <span className="mb-3 text-[28px]">⚠️</span>
            <p className="text-[14px] font-medium text-secondary">{fetchError}</p>
            <button
              onClick={() => loadPage(0, false)}
              className="btn-outline mt-5 text-[13px]"
            >
              {t("action.retry")}
            </button>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] bg-card border border-card-border px-8 py-12 text-center">
            <span className="mb-3 text-[28px]">🏠</span>
            <p className="text-[14px] font-medium text-secondary">{t("gallery.empty")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] bg-card border border-card-border px-8 py-12 text-center">
            <span className="mb-3 text-[28px]">🔍</span>
            <p className="text-[14px] font-medium text-secondary">{t("gallery.no_matches")}</p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-[12px] font-mono text-secondary">
              <span className="font-bold text-primary">{filtered.length}</span> {t("gallery.items")}
            </p>

            {/* Masonry: native grid masonry when supported, multi-column fallback otherwise */}
            <div className="gallery-masonry">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCustomer(c)}
                  className="gallery-card mb-3 block w-full break-inside-avoid text-left"
                >
                  <div className="overflow-hidden rounded-[28px] border border-card-border bg-card shadow-sm transition-all hover:shadow-md active:scale-90">
                    <div className="relative overflow-hidden" style={{ aspectRatio: galleryAspectRatio(c.id) }}>
                      <GalleryImage srcs={c.housePictures} alt={c.name} />
                    </div>
                    <div className="p-3">
                      <p className="truncate text-[13px] font-bold text-primary">{c.name}</p>
                      <p className="truncate text-[11px] font-medium text-secondary mt-0.5">
                        {c.photoCount} 📷
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" aria-hidden />

            {isLoadingMore && (
              <div className="my-4 flex items-center justify-center gap-2 text-[12px] font-mono text-secondary">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-card-border border-t-transparent" />
                Loading…
              </div>
            )}
          </>
        )}
      </main>

      <GalleryDetailModal
        customer={activeCustomer}
        onClose={() => setActiveCustomer(null)}
      />
    </div>
  );
}