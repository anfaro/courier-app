// app/signup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Password states
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 1. Check if passwords match before doing anything else
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        router.push("/login");
      } else {
        const data = await res.json();
        setError(data.message || "Registration failed");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // M3 Expressive Input Style: Soft resting state, bright white active state with soft glow
  const inputClass = "w-full rounded-2xl border border-transparent bg-gray-100 px-5 py-4 text-[15px] text-gray-900 transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/15";

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#F8F9FA] py-12 px-4 sm:px-6 lg:px-8">
      {/* M3 Header Section */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-blue-600 text-3xl shadow-md border border-blue-700">
          👋
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-gray-900">
          Create an Account
        </h2>
        <p className="mt-2 text-center text-[15px] text-gray-600">
          Join the Courier SuperApp platform
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-[15px] font-bold text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="John Doe"
              />
            </div>

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

            <div>
              <label className="mb-2 block text-[15px] font-bold text-gray-700">
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  // Add padding to the right so text doesn't hide under the button
                  className={`${inputClass} pr-20`}
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 rounded-xl bg-gray-200/50 px-3 py-1.5 text-sm font-bold text-gray-600 transition hover:bg-gray-200 hover:text-gray-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[15px] font-bold text-gray-700">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`${inputClass} pr-20`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 rounded-xl bg-gray-200/50 px-3 py-1.5 text-sm font-bold text-gray-600 transition hover:bg-gray-200 hover:text-gray-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-full bg-blue-600 px-8 py-4 text-[16px] font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:bg-blue-400 disabled:active:scale-100"
              >
                {isLoading ? "Signing up..." : "Sign Up"}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-[15px] text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-blue-600 transition hover:text-blue-500">
              Log in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

