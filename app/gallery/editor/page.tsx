// app/gallery/editor/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import ImageGalleryInput from "@/components/ImageGalleryInput";
import Icon from "@/components/Icon";
import { AnimatePresence, motion } from "framer-motion";
import { useScrollLock } from "@/lib/useScrollLock";

interface Customer {
  id: string;
  name: string;
  phoneNumber: string | null;
  address: string;
  latitude: string | null;
  longitude: string | null;
  housePictureUrl: string | null;
  landmark: string | null;
  accessInfo: string | null;
  notes: string | null;
}

const PAGE_SIZE = 30;

export default function GalleryEditorPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);

  useScrollLock(editingCustomer !== null);

  const loadPage = useCallback(async (offset: number, append: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setFetchError("");
    try {
      const res = await fetchWithTimeout(`/api/customers?limit=${PAGE_SIZE}&offset=${offset}&sort=oldest`, {}, 60000);
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
          : error.message || "Failed to load customers."
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

  const filtered = customers.filter((c) =>
    !query.trim() || c.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  async function handleOpenEdit(customer: Customer) {
    setEditingCustomer(customer);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        let images: string[] = [];
        if (data.housePictures) {
          try {
            const parsed = JSON.parse(data.housePictures);
            if (Array.isArray(parsed)) images = parsed;
          } catch {}
        }
        if (images.length === 0 && data.housePictureUrl) {
          images = [data.housePictureUrl];
        }
        setEditImages(images);
      } else {
        const fallback = customer.housePictureUrl ? [customer.housePictureUrl] : [];
        setEditImages(fallback);
      }
    } catch {
      const fallback = customer.housePictureUrl ? [customer.housePictureUrl] : [];
      setEditImages(fallback);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSave() {
    if (!editingCustomer) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingCustomer.name,
          phoneNumber: editingCustomer.phoneNumber || "",
          address: editingCustomer.address,
          latitude: editingCustomer.latitude,
          longitude: editingCustomer.longitude,
          housePictures: editImages,
          landmark: editingCustomer.landmark,
          accessInfo: editingCustomer.accessInfo,
          notes: editingCustomer.notes,
        }),
      });
      if (res.ok) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === editingCustomer.id
              ? { ...c, housePictureUrl: editImages[0] || null }
              : c
          )
        );
        showToast(t("gallery.saved"), "success");
        setEditingCustomer(null);
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to save", "error");
      }
    } catch {
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={t("gallery.editor_title")} />
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-[30px] font-extrabold tracking-tight text-primary">{t("gallery.editor_title")}</h1>
          <p className="mt-1 text-[14px] font-medium text-secondary">{t("gallery.editor_page_subtitle")}</p>
        </div>

        {/* Search */}
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
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-[20px] bg-card border border-card-border p-4 animate-pulse">
                <div className="h-12 w-12 rounded-xl bg-surface-hover shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-surface-hover" />
                  <div className="h-3 w-1/2 rounded bg-surface-hover" />
                </div>
              </div>
            ))}
          </div>
        ) : fetchError && customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] bg-card border border-card-border px-8 py-12 text-center">
            <span className="mb-3 text-[28px]">⚠️</span>
            <p className="text-[14px] font-medium text-secondary">{fetchError}</p>
            <button onClick={() => loadPage(0, false)} className="btn-outline mt-5 text-[13px]">{t("action.retry")}</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] bg-card border border-card-border px-8 py-12 text-center">
            <span className="mb-3 text-[28px]">🔍</span>
            <p className="text-[14px] font-medium text-secondary">{t("gallery.no_customers")}</p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-[12px] font-mono text-secondary">
              <span className="font-bold text-primary">{filtered.length}</span> {t("gallery.items")}
            </p>

            <div className="space-y-3">
              {filtered.map((c, i) => (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 10) * 0.03, duration: 0.2, ease: "easeOut" }}
                  onClick={() => handleOpenEdit(c)}
                  className="flex items-center gap-4 w-full rounded-[20px] bg-card border border-card-border p-4 shadow-sm text-left active:scale-95 transition-all hover:shadow-md"
                >
                  {c.housePictureUrl ? (
                    <img
                      src={c.housePictureUrl}
                      alt={c.name}
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 rounded-xl object-cover border border-card-border shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-surface-hover flex items-center justify-center text-[18px] shrink-0">🏠</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[14px] font-bold text-primary">{c.name}</p>
                    <p className="truncate text-[12px] font-medium text-secondary mt-0.5">{c.address}</p>
                  </div>
                  <Icon name="chevron-right" size={18} strokeWidth={2.5} className="text-secondary/40 shrink-0" />
                </motion.button>
              ))}
            </div>

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

      {/* Edit Modal */}
      <AnimatePresence>
        {editingCustomer && (
          <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/60 dark:bg-slate-950/80 backdrop-blur-sm"
              onClick={() => !saving && setEditingCustomer(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative w-full sm:max-w-md max-h-[85vh] overflow-y-auto no-scrollbar rounded-t-[32px] sm:rounded-[32px] border border-card-border bg-card shadow-2xl"
            >
              {/* Handle bar (mobile) */}
              <div className="flex justify-center pt-3 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-card-border" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between p-5 pb-3">
                <div>
                  <h2 className="truncate text-[18px] font-black text-primary">{editingCustomer.name}</h2>
                  <p className="text-[12px] font-medium text-secondary mt-0.5">{t("gallery.editor_subtitle")}</p>
                </div>
                <button
                  onClick={() => !saving && setEditingCustomer(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-secondary hover:text-primary active:scale-90"
                >
                  <Icon name="close" size={16} strokeWidth={3} />
                </button>
              </div>

              {/* Image Input */}
              <div className="px-5 pb-4">
                {detailLoading ? (
                  <div className="space-y-3">
                    <div className="h-4 w-32 animate-pulse rounded bg-surface-hover" />
                    <div className="flex gap-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 w-24 animate-pulse rounded-[1rem] bg-surface-hover" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <ImageGalleryInput
                    label={t("customer.house_photos")}
                    images={editImages}
                    onImagesChange={setEditImages}
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-5 pt-2 border-t border-card-border/60">
                <button
                  onClick={() => !saving && setEditingCustomer(null)}
                  disabled={saving}
                  className="flex-1 rounded-full border border-card-border bg-surface-hover py-3 text-[13px] font-bold text-secondary hover:bg-card-border/30 active:scale-95 transition-all disabled:opacity-50"
                >
                  {t("action.cancel")}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || detailLoading}
                  className="flex-1 btn-primary py-3 text-[13px] disabled:opacity-50"
                >
                  {saving ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
                  ) : (
                    t("gallery.save")
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
