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
import Link from "next/link";
import { motion } from "framer-motion";

interface GalleryCustomer {
  id: string;
  name: string;
  phoneNumber: string | null;
  housePictures: string[];
  photoCount: number;
}

const PAGE_SIZE = 30;

interface AnalyticsData {
  total: number;
  withPhotos: number;
  brokenUrls: number;
  noPhotos: number;
}

export default function GalleryPage() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<GalleryCustomer[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [activeCustomer, setActiveCustomer] = useState<GalleryCustomer | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
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

  useEffect(() => {
    fetch("/api/gallery/analytics")
      .then((r) => r.json())
      .then((d) => { if (!d.message) setAnalytics(d); })
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
  }, []);

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

        {/* Analytics */}
        <div className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm mb-4">
          <h2 className="text-[14px] font-bold tracking-tight text-primary mb-4">{t("gallery.analytics_title")}</h2>
          {analyticsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1.5">
                    <div className="h-3 w-20 animate-pulse rounded bg-surface-hover" />
                    <div className="h-3 w-12 animate-pulse rounded bg-surface-hover" />
                  </div>
                  <div className="h-2 w-full animate-pulse rounded-full bg-surface-hover" />
                </div>
              ))}
            </div>
          ) : analytics ? (
            <div className="space-y-3">
              {[
                { label: t("gallery.with_photos"), count: analytics.withPhotos, color: "bg-emerald-500" },
                { label: t("gallery.broken_urls"), count: analytics.brokenUrls, color: "bg-red-500" },
                { label: t("gallery.no_photos"), count: analytics.noPhotos, color: "bg-gray-400 dark:bg-gray-600" },
              ].map((row) => {
                const pct = analytics.total > 0 ? Math.round((row.count / analytics.total) * 100) : 0;
                return (
                  <div key={row.label}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[12px] font-medium text-secondary">{row.label}</span>
                      <span className="text-[12px] font-bold text-primary">{row.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-hover overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full rounded-full ${row.color}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Editor Button */}
        <Link
          href="/gallery/editor"
          className="flex items-center justify-between rounded-[24px] bg-blue-600 p-4 text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all hover:bg-blue-700 mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center text-[18px]">🖊️</div>
            <div className="flex flex-col items-start">
              <span className="font-black leading-tight text-[15px]">{t("gallery.editor")}</span>
              <span className="text-[10px] font-bold opacity-70 uppercase tracking-tighter">{t("gallery.editor_subtitle")}</span>
            </div>
          </div>
          <Icon name="chevron-right" size={20} strokeWidth={3} className="text-white/70" />
        </Link>

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