// components/ImageModal.tsx
"use client";

import { useState, useEffect } from "react";

export default function ImageModal({
  src,
  alt,
  thumbnailClassName
}: {
  src: string;
  alt: string;
  thumbnailClassName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [modalError, setModalError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.dispatchEvent(new CustomEvent("modal:change", { detail: { isOpen: true } }));
    } else {
      document.body.style.overflow = "";
      window.dispatchEvent(new CustomEvent("modal:change", { detail: { isOpen: false } }));
    }
    return () => {
      document.body.style.overflow = "";
      window.dispatchEvent(new CustomEvent("modal:change", { detail: { isOpen: false } }));
    };
  }, [isOpen]);

  return (
    <>
      {/* 1. The Thumbnail (What the user taps) */}
      {!thumbnailError ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onClick={() => setIsOpen(true)}
          onError={() => setThumbnailError(true)}
          className={`cursor-pointer transition-transform duration-300 hover:scale-[1.03] active:scale-90 ${thumbnailClassName}`}
          title="Tap to enlarge"
        />
      ) : (
        <div className={`flex items-center justify-center bg-secondary/30 ${thumbnailClassName}`}>
          <span className="text-3xl opacity-50">🖼️</span>
        </div>
      )}

      {/* 2. The Full-Screen Modal (What opens on tap) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 opacity-0 animate-[fadeIn_0.2s_ease-out_forwards]"
          onClick={() => setIsOpen(false)}
        >
          {/* Close Button - ADDED z-50 and darkened the background so it always pops! */}
          <button
            className="absolute right-6 top-6 z-50 rounded-full bg-black/40 p-3 text-white backdrop-blur transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white"
            onClick={() => setIsOpen(false)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* The Expanding Image */}
          {!modalError ? (
            <img
              src={src}
              alt={alt}
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
              onError={() => setModalError(true)}
              className="max-h-full max-w-full scale-95 rounded-[2rem] object-contain opacity-0 animate-[scaleUp_0.3s_ease-out_forwards] shadow-2xl"
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-white">
              <span className="text-6xl opacity-50">❌</span>
              <p className="text-[13px] font-bold opacity-70">Image failed to load</p>
            </div>
          )}

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; backdrop-filter: blur(0px); }
              to { opacity: 1; backdrop-filter: blur(12px); }
            }
            @keyframes scaleUp {
              from { transform: scale(0.90); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

