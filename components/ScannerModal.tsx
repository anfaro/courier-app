// components/ScannerModal.tsx

"use client";

import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface ScannerModalProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export default function ScannerModal({ onScanSuccess, onClose }: ScannerModalProps) {
  const [error, setError] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // NEW: React 18 Strict Mode Lock
  const isInitialized = useRef(false);

  useEffect(() => {
    // If React Strict Mode tries to double-fire this useEffect, we block the second one.
    if (isInitialized.current) return;
    isInitialized.current = true;

    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const startScanning = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 300, height: 150 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // SUCCESS CALBACK
            // Make sure it's actually scanning before trying to stop
            if (html5QrCode.isScanning) {
              html5QrCode.stop().then(() => {
                onScanSuccess(decodedText);
              }).catch(err => console.error("Error stopping scanner", err));
            }
          },
          (errorMessage) => {
            // FAILURE CALLBACK (Runs constantly when no code is in frame, so we ignore it)
          }
        );
      } catch (err: any) {
        console.error("Camera access error:", err);
        setError("Could not access camera. Please check your browser permissions.");
      }
    };

    startScanning();

    // CLEANUP
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Failed to stop", err));
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm px-4">

      <div className="absolute top-12 left-0 right-0 text-center z-10 px-6">
        <h2 className="text-2xl font-black text-white tracking-tight mb-2">Scan Waybill</h2>
        <p className="text-[14px] font-medium text-gray-300">
          Position the barcode inside the frame.
        </p>
      </div>

      {error && (
        <div className="absolute top-32 z-20 mx-4 rounded-2xl bg-red-500/20 p-4 border border-red-500/50 backdrop-blur-md">
          <p className="text-sm font-bold text-red-200">{error}</p>
        </div>
      )}

      {/* Camera Container */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-[32px] bg-[#111827] shadow-2xl ring-4 ring-white/10 flex items-center justify-center min-h-[300px]">

        <div id="reader" className="w-full h-full flex items-center justify-center"></div>

        {/* UPDATED: Stricter CSS to force the video to fill the box and hide duplicate canvases */}
        <style dangerouslySetInnerHTML={{
          __html: `
          #reader { border: none !important; }
          #reader img, #reader a, #reader span { display: none !important; }
          #reader video { 
            object-fit: cover !important; 
            border-radius: 32px !important; 
            width: 100% !important; 
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #qr-canvas-visible { display: none !important; }
        `}} />
      </div>

      <div className="absolute bottom-12 left-0 right-0 px-6 flex justify-center">
        <button
          onClick={onClose}
          className="flex h-16 w-full max-w-sm items-center justify-center rounded-full bg-card/10 border border-white/20 text-[16px] font-black text-white backdrop-blur-md transition-all active:bg-card/20 active:scale-90 shadow-xl"
        >
          Cancel Scanning
        </button>
      </div>
    </div>
  );
}

