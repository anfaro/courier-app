// app/login/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await signIn("credentials", {
      usernameOrEmail,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid credentials. Please check your info and try again.");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  // M3 Expressive Input Style: Soft resting state, bright white active state with soft glow
  const inputClass = "w-full rounded-2xl border border-transparent bg-gray-100 px-5 py-4 text-[15px] text-gray-900 transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/15";

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#F8F9FA] py-12 px-4 sm:px-6 lg:px-8">
      {/* M3 Header Section */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-blue-600 text-3xl shadow-md border border-blue-700">
          📦
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-gray-900">
          Welcome Back
        </h2>
        <p className="mt-2 text-center text-[15px] text-gray-600">
          Sign in to your Courier SuperApp
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
                Email or Name
              </label>
              <input
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                required
                className={inputClass}
                placeholder="jsmith@example.com or John Doe"
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
                  className={`${inputClass} pr-20`}
                  placeholder="••••••••"
                />

                {/* M3 Styled Show/Hide Toggle Chip */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 rounded-xl bg-gray-200/50 px-3 py-1.5 text-sm font-bold text-gray-600 transition hover:bg-gray-200 hover:text-gray-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {/* NEW: Forgot Password Link */}
              <div className="mt-3 flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-[14px] font-bold text-blue-600 transition hover:text-blue-500 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="flex w-full justify-center rounded-full bg-blue-600 px-8 py-4 text-[16px] font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-500/30"
              >
                Log In
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-[15px] text-gray-600">
            Don't have an account?{" "}
            <Link href="/signup" className="font-bold text-blue-600 transition hover:text-blue-500">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

