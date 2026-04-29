// components/ImageInput.tsx
"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";

interface ImageInputProps {
  label: string;
  onImageChange: (imageDataUrl: string | null) => void;
  initialImageUrl?: string | null;
  className?: string;
}

export default function ImageInput({ label, onImageChange, initialImageUrl, className }: ImageInputProps) {
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(initialImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview if the initial image URL changes (during editing)
  useEffect(() => {
    setImagePreviewUrl(initialImageUrl || null);
  }, [initialImageUrl]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreviewUrl(result);
        onImageChange(result);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreviewUrl(null);
      onImageChange(null);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents the parent button click from triggering
    setImagePreviewUrl(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
  };

  return (
    <div className={className}>
      <label className="mb-2 block text-[15px] font-semibold text-gray-700">{label}</label>

      {/* Hidden file input with native camera capture */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center gap-4">
        {/* Compact Image Preview/Capture Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-gray-200 bg-gray-50 text-gray-500 transition hover:border-blue-400 hover:bg-blue-50 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
        >
          {imagePreviewUrl ? (
            <img
              src={imagePreviewUrl}
              alt="Preview"
              className="absolute inset-0 h-full w-full rounded-[1.4rem] object-cover"
            />
          ) : (
            <>
              <span className="text-3xl transition-transform group-hover:scale-110">📸</span>
              <span className="mt-1 text-center text-xs font-medium text-gray-500">Tap to Capture</span>
            </>
          )}

          {/* Icon hint on hover if image is present */}
          {imagePreviewUrl && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[1.4rem] bg-black/10 opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur-sm">
              <span className="text-sm font-bold text-white bg-black/30 px-2.5 py-1 rounded-full">Tap to Change</span>
            </div>
          )}
        </button>

        {/* Action Button */}
        {imagePreviewUrl && (
          <button
            type="button"
            onClick={clearImage}
            className="rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700 border border-red-100 shadow-sm transition hover:bg-red-100 active:scale-95"
          >
            Clear Image
          </button>
        )}
      </div>
    </div>
  );
}

