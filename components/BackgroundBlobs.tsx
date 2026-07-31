// components/BackgroundBlobs.tsx
export default function BackgroundBlobs() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-blobs">
      <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-indigo-400/25 blur-3xl" />
      <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-pink-400/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/3 h-56 w-56 rounded-full bg-purple-400/15 blur-3xl" />
    </div>
  );
}
