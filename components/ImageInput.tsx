// components/ImageInput.tsx
"use client";

import { useState, useEffect } from "react";

interface ImageInputProps {
  label: string;
  existingImageUrl?: string | null;
  onImageChange: (base64String: string | null) => void;
  inputType?: string;
}

export default function ImageInput({
  label,
  existingImageUrl,
  onImageChange,
  inputType,
}: ImageInputProps) {
  // 1. Hold the current image to display (either the existing URL or a new local file preview)
  const [preview, setPreview] = useState<string | null>(existingImageUrl || null);

  // 2. CRITICAL FIX: If the parent changes the existing image (e.g., clicking a new waybill), 
  // this forces the preview to instantly update!
  useEffect(() => {
    setPreview(existingImageUrl || null);
  }, [existingImageUrl]);

  // 3. Handle file selection and convert to Base64 so it can be sent via JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreview(base64String); // Show the new image locally
        onImageChange(base64String); // Send the Base64 string back to the parent form
      };
      reader.readAsDataURL(file);
    } else {
      // If they cancel the file selection, revert to the existing image
      setPreview(existingImageUrl || null);
      onImageChange(null);
    }
  };

  return (
    <div>
      <label className="mb-3 block text-[15px] font-semibold text-gray-700">
        {label}
      </label>

      {/* Image Preview Container */}
      {preview && (
        <div className="mb-4">
          <img
            src={preview}
            alt="Preview"
            className="h-32 w-32 rounded-[1.5rem] object-cover border border-gray-200 shadow-sm"
          />
        </div>
      )}

      {/* M3 Styled File Input */}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="w-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-600 transition-all hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-blue-500/20 file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-blue-100 file:px-5 file:py-2.5 file:text-[14px] file:font-bold file:text-blue-700 hover:file:bg-blue-200 active:file:scale-95"
      />
    </div>
  );
}

