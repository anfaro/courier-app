"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "./LanguageProvider";
import { useToast } from "./ToastProvider";
import Icon from "@/components/Icon";

interface ImageInputProps {
  label: string;
  existingImageUrl?: string | null;
  onImageChange: (url: string | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

export default function ImageInput({
  label,
  existingImageUrl,
  onImageChange,
  onUploadingChange,
}: ImageInputProps) {
  const [preview, setPreview] = useState<string | null>(existingImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const lastExistingRef = useRef(existingImageUrl);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const { showToast } = useToast();

  useEffect(() => {
    if (existingImageUrl !== lastExistingRef.current) {
      setPreview(existingImageUrl || null);
      lastExistingRef.current = existingImageUrl;
    }
  }, [existingImageUrl]);

  const readAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const convertToWebPBlob = (dataUrl: string): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("WebP not supported"));
          },
          "image/webp",
          0.8
        );
      };
      img.onerror = reject;
      img.src = dataUrl;
    });

  const processFile = async (file: File | null) => {
    if (file) {
      const dataUrl = await readAsDataUrl(file);
      setPreview(dataUrl);

      setIsUploading(true);
      onUploadingChange?.(true);
      try {
        const webpBlob = await convertToWebPBlob(dataUrl);
        const webpFile = new File(
          [webpBlob],
          file.name.replace(/\.[^.]+$/, ".webp"),
          { type: "image/webp" }
        );

        const formData = new FormData();
        formData.append("file", webpFile);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) {
          let msg = `Upload failed (${res.status})`;
          try { const err = await res.json(); if (err.message) msg = err.message; } catch {}
          throw new Error(msg);
        }
        const data = await res.json();
        setPreview(data.url);
        onImageChange(data.url);
      } catch (e) {
        setPreview(existingImageUrl || null);
        onImageChange(existingImageUrl || null);
        showToast(e instanceof Error ? e.message : "Image upload failed", "error");
      } finally {
        setIsUploading(false);
        onUploadingChange?.(false);
      }
    } else {
      setPreview(existingImageUrl || null);
      onImageChange(null);
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
            className={`h-32 w-32 rounded-[1.5rem] object-cover border border-card-border shadow-sm ${isUploading ? "opacity-50" : ""}`}
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-500 border-t-transparent" />
            </div>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-[13px] shadow-md transition-all hover:bg-red-600 active:scale-90"
          >
            <Icon name="close" size={14} strokeWidth={3} />
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => galleryInputRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-secondary transition-all hover:bg-gray-100 active:scale-90 disabled:opacity-50 dark:border-gray-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            {isUploading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-[2.5px] border-blue-500 border-t-transparent" />
            ) : (
              <Icon name="image" size={20} strokeWidth={2.5} />
            )}
            {isUploading ? "Uploading..." : t("image.gallery")}
          </button>
          <button
            type="button"
            disabled={isUploading}
            onClick={handleCameraClick}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-secondary transition-all hover:bg-gray-100 active:scale-90 disabled:opacity-50 dark:border-gray-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <Icon name="camera" size={20} strokeWidth={2.5} />
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
