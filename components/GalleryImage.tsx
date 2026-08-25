// components/GalleryImage.tsx
"use client";

import { useEffect, useRef, useState } from "react";

export default function GalleryImage({ srcs, alt }: { srcs: string[]; alt: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [index, setIndex] = useState(0);

  // Load when the card approaches the viewport. IntersectionObserver is
  // reliable inside multi-column/masonry layouts, unlike loading="lazy",
  // whose distance calculation breaks under CSS fragmentation (images
  // near/after the fold never fetch — the "fast scroll → blank" bug).
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }
    const el = boxRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "600px 0px 600px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const currentSrc = srcs[index] || null;

  // Sync state for images that finish BEFORE React attaches onLoad
  // (cached / local images complete synchronously). Without this the image
  // would sit at opacity-0 forever, looking like it never loaded.
  useEffect(() => {
    const img = imgRef.current;
    if (!shouldLoad || !img) return;
    if (img.complete) {
      if (img.naturalWidth > 0) setStatus("loaded");
      else if (index < srcs.length - 1) setIndex((i) => i + 1);
      else setStatus("error");
    }
  }, [shouldLoad, index, srcs.length]);

  const showPlaceholder = !currentSrc || status === "error";

  return (
    <div ref={boxRef} className="absolute inset-0 overflow-hidden">
      {shouldLoad && currentSrc && status !== "error" && (
        <img
          key={currentSrc}
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setStatus("loaded")}
          onError={() => {
            if (index < srcs.length - 1) setIndex((i) => i + 1);
            else setStatus("error");
          }}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            status === "loaded" ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      {showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-hover">
          {status === "error" || !currentSrc ? (
            <span className="text-[22px] opacity-50">🏠</span>
          ) : (
            <div className="h-6 w-6 animate-pulse rounded-full bg-card-border/40" />
          )}
        </div>
      )}
    </div>
  );
}