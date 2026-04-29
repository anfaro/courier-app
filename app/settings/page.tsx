// app/settings/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Header from "@/components/header";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session]);

  const inputClass = "w-full rounded-2xl border border-transparent bg-gray-100 px-5 py-4 text-[16px] text-gray-900 transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10";

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#F8F9FA] pb-20">
        <Header />
        <main className="mx-auto max-w-2xl p-4 sm:p-6">
          <div className="mt-4 flex min-h-[50vh] flex-col items-center justify-center rounded-[2.5rem] bg-white p-6 shadow-sm border border-gray-50">
            <div className="mb-4 flex h-16 w-16 animate-pulse items-center justify-center rounded-[1.5rem] border border-blue-100 bg-blue-50 text-3xl">
              ⏳
            </div>
            <p className="animate-pulse text-[16px] font-bold text-gray-500">Loading settings...</p>
          </div>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] pb-20">
        <Header />
        <main className="mx-auto max-w-2xl p-4 sm:p-6">
          <div className="mt-4 flex flex-col items-center justify-center rounded-[2.5rem] bg-white p-10 text-center shadow-sm border border-gray-50">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-2xl">🔒</div>
            <p className="text-lg font-bold text-gray-900">Please log in to view settings.</p>
          </div>
        </main>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.user?.email,
          newName: name
        }),
      });

      if (res.ok) {
        setMessage("Profile updated successfully!");
        await update({ name: name });
      } else {
        const data = await res.json();
        setError(data.message || "Failed to update profile.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header />
      <Breadcrumbs />

      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <div className="mt-4 rounded-[2.5rem] border border-gray-50 bg-white p-6 shadow-sm sm:p-10">

          {/* M3 Expressive Profile Header */}
          <div className="mb-8 flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left sm:gap-6">
            <div className="mb-4 flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.5rem] bg-blue-100 text-4xl font-extrabold text-blue-700 shadow-sm border border-blue-200 sm:mb-0">
              {session.user?.name ? session.user.name.charAt(0).toUpperCase() : "👤"}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Profile Settings</h1>
              <p className="mt-1 text-[15px] font-medium text-gray-500">Manage your account details</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-[15px] font-medium text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-6 rounded-2xl border border-green-100 bg-green-50 p-4 text-[15px] font-medium text-green-800">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-[15px] font-semibold text-gray-700">
                Email Address <span className="text-sm font-normal text-gray-400">(Read-only)</span>
              </label>
              <input
                type="email"
                value={session.user?.email || ""}
                disabled
                className="w-full cursor-not-allowed rounded-2xl border border-transparent bg-gray-50 px-5 py-4 text-[16px] text-gray-500 opacity-70"
              />
            </div>

            <div>
              <label className="mb-2 block text-[15px] font-semibold text-gray-700">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClass}
                placeholder="Your Name"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading || name === session.user?.name}
                className="flex w-full items-center justify-center rounded-full bg-blue-600 px-8 py-4 text-[16px] font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 active:scale-95 disabled:opacity-50 disabled:active:scale-100 sm:w-auto"
              >
                {isLoading ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

