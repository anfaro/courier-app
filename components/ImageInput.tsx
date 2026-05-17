"use client";

import { useState, useRef } from "react";
import { useLanguage } from "./LanguageProvider";

interface ImageInputProps {
  label: string;
  existingImageUrl?: string | null;
  onImageChange: (base64String: string | null) => void;
  onFileChange?: (file: File | null) => void;
}

export default function ImageInput({
  label,
  existingImageUrl,
  onImageChange,
  onFileChange,
}: ImageInputProps) {
  const [preview, setPreview] = useState<string | null>(existingImageUrl || null);
  const lastExistingRef = useRef(existingImageUrl);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  if (existingImageUrl !== lastExistingRef.current) {
    setPreview(existingImageUrl || null);
    lastExistingRef.current = existingImageUrl;
  }

  const processFile = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreview(base64String);
        onImageChange(base64String);
        onFileChange?.(file);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(existingImageUrl || null);
      onImageChange(null);
      onFileChange?.(null);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFile(e.target.files?.[0] || null);
  };

  const handleCameraClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    (input as any).capture = "environment";
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      processFile(target.files?.[0] || null);
    };
    input.click();
  };

  const handleRemove = () => {
    setPreview(null);
    onImageChange(null);
    onFileChange?.(null);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  return (
    <div>
      <label className="mb-3 block text-[15px] font-semibold text-gray-700 dark:text-gray-300">
        {label}
      </label>

      {preview ? (
        <div className="relative mb-4 inline-block">
          <img
            src={preview}
            alt="Preview"
            className="h-32 w-32 rounded-[1.5rem] object-cover border border-card-border shadow-sm"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-[13px] shadow-md transition-all hover:bg-red-600 active:scale-90"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-secondary transition-all hover:bg-gray-100 active:scale-90 dark:border-gray-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {t("image.gallery")}
          </button>
          <button
            type="button"
            onClick={handleCameraClick}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-secondary transition-all hover:bg-gray-100 active:scale-90 dark:border-gray-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t("image.camera")}
          </button>
        </div>
      )}

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleGalleryChange}
        className="hidden"
      />

    </div>
  );
}
