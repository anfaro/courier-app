"use client";

import { useState, useRef } from "react";
import { useLanguage } from "./LanguageProvider";
import { useToast } from "./ToastProvider";
import Icon from "@/components/Icon";

interface ImageGalleryInputProps {
  label: string;
  images: string[];
  onImagesChange: (urls: string[]) => void;
}

export default function ImageGalleryInput({ label, images, onImagesChange }: ImageGalleryInputProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

  const uploadFile = async (file: File): Promise<string> => {
    const dataUrl = await readAsDataUrl(file);
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
    return data.url;
  };

  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentFiles = Array.from(files);
    const newImages = [...images];

    for (let i = 0; i < currentFiles.length; i++) {
      const idx = newImages.length;
      setUploadingIndex(idx);
      try {
        const url = await uploadFile(currentFiles[i]);
        newImages.push(url);
        onImagesChange([...newImages]);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Upload failed", "error");
      }
    }
    setUploadingIndex(null);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleCameraCapture = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    (input as any).capture = "environment";
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      const idx = images.length;
      setUploadingIndex(idx);
      try {
        const url = await uploadFile(file);
        onImagesChange([...images, url]);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Upload failed", "error");
      }
      setUploadingIndex(null);
    };
    input.click();
  };

  const handleRemove = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onImagesChange(updated);
  };

  return (
    <div>
      <label className="mb-3 block text-[13px] font-black text-secondary uppercase tracking-widest ml-1">
        {label}
      </label>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {images.map((url, i) => (
            <div key={i} className="relative group">
              <img
                src={url}
                alt={`House ${i + 1}`}
                referrerPolicy="no-referrer"
                className="h-24 w-24 rounded-[1rem] object-cover border border-card-border shadow-sm"
              />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-[13px] shadow-md transition-all hover:bg-red-600 active:scale-90 opacity-0 group-hover:opacity-100"
              >
                <Icon name="close" size={14} strokeWidth={3} />
              </button>
            </div>
          ))}

          {uploadingIndex !== null && uploadingIndex >= images.length && (
            <div className="h-24 w-24 rounded-[1rem] border-2 border-dashed border-blue-300 bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-500 border-t-transparent" />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={uploadingIndex !== null}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-dashed border-card-border bg-surface-hover px-4 py-4 text-[13px] font-medium text-secondary transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-90 disabled:opacity-50"
        >
          <Icon name="image" size={20} strokeWidth={2.5} />
          {t("image.gallery")}
        </button>
        <button
          type="button"
          onClick={handleCameraCapture}
          disabled={uploadingIndex !== null}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-dashed border-card-border bg-surface-hover px-4 py-4 text-[13px] font-medium text-secondary transition-all hover:bg-green-50 dark:hover:bg-green-900/20 active:scale-90 disabled:opacity-50"
        >
          <Icon name="camera" size={20} strokeWidth={2.5} />
          {t("image.camera")}
        </button>
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleAddImages}
        className="hidden"
      />
    </div>
  );
}
