// app/forgot-password/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        // Show success message regardless of whether the email actually exists
        setMessage(data.message);
        setEmail(""); // Clear the input
      } else {
        setError(data.message || "Something went wrong.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full rounded-2xl border border-transparent bg-gray-100 px-5 py-4 text-[15px] text-gray-900 transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/15";

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#F8F9FA] py-12 px-4 sm:px-6 lg:px-8">
      {/* M3 Header Section */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-orange-100 text-3xl shadow-sm border border-orange-200">
          🔐
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-gray-900">
          Forgot Password
        </h2>
        <p className="mt-2 text-center text-[15px] text-gray-600 px-4">
          Enter your email address and we will send you a link to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* M3 Expressive Card */}
        <div className="rounded-[2.5rem] bg-white px-6 py-10 shadow-sm border border-gray-50 sm:px-10">

          {error && (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-center text-[15px] font-medium text-red-700 border border-red-100 animate-[fadeIn_0.3s_ease-out]">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-6 rounded-2xl bg-green-50 p-4 text-center text-[15px] font-medium text-green-800 border border-green-100 animate-[fadeIn_0.3s_ease-out]">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-[15px] font-bold text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
                placeholder="jsmith@example.com"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-full bg-blue-600 px-8 py-4 text-[16px] font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:bg-blue-400 disabled:active:scale-100"
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-[15px] text-gray-600">
            Remembered your password?{" "}
            <Link href="/login" className="font-bold text-blue-600 transition hover:text-blue-500">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

