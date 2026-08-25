// components/BackgroundBlobs.tsx
export default function BackgroundBlobs() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-blobs">
      {/* Vivid gradient base — the color that bleeds through every glass panel */}
      <div className="absolute inset-0" style={{ background: "var(--backdrop-grad)" }} />

      {/* Floating color blobs — palette driven by CSS vars (swappable) */}
      <div className="absolute -top-24 -left-16 h-80 w-80 rounded-full blur-3xl" style={{ background: "var(--blob-1)" }} />
      <div className="absolute top-1/3 -right-24 h-88 w-88 rounded-full blur-3xl" style={{ background: "var(--blob-2)" }} />
      <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full blur-3xl" style={{ background: "var(--blob-3)" }} />
      <div className="absolute bottom-1/4 right-1/3 h-64 w-64 rounded-full blur-3xl" style={{ background: "var(--blob-4)" }} />

      {/* Neutral contrast scrim — keeps text on the backdrop readable */}
      <div className="absolute inset-0" style={{ background: "var(--backdrop-scrim)" }} />
    </div>
  );
}