// app/reset-password/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import AuthLanguageSelector from "@/components/AuthLanguageSelector";

function ResetPasswordForm() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError(t("auth.no_token"));
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.message || "Something went wrong.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full rounded-2xl border border-transparent bg-gray-100 px-5 py-4 text-[15px] text-gray-900 transition-all focus:border-blue-600 focus:bg-card focus:outline-none focus:ring-4 focus:ring-blue-600/15";

  if (success) {
    return (
      <div className="text-center animate-[fadeIn_0.3s_ease-out]">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-green-50 text-4xl shadow-sm border border-green-100">
          ✅
        </div>
        <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-gray-900">{t("auth.pw_reset_success")}</h2>
        <p className="mb-8 text-[15px] text-gray-600 leading-relaxed">
          {t("auth.pw_updated")}
        </p>
        <Link
          href="/login"
          className="flex w-full justify-center rounded-full bg-blue-600 px-8 py-4 text-[16px] font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-90 focus:outline-none focus:ring-4 focus:ring-blue-500/30"
        >
          {t("auth.back_to_login")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-gray-900">{t("auth.reset_pw")}</h2>
        <p className="mt-2 text-center text-[15px] text-gray-600">
          {t("auth.reset_pw_subtitle")}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-center text-[15px] font-medium text-red-700 border border-red-100 animate-[fadeIn_0.3s_ease-out]">
          {error}
        </div>
      )}

      {!token ? (
        <div className="rounded-2xl bg-red-50 p-6 text-center text-[15px] font-medium text-red-700 border border-red-100">
          {t("auth.no_token")}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-[15px] font-bold text-gray-700">
              {t("auth.password")}
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`${inputClass} pr-20`}
                placeholder={t("auth.password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 rounded-xl bg-gray-200/50 px-3 py-1.5 text-sm font-bold text-gray-600 transition hover:bg-gray-200 hover:text-gray-900 active:scale-90 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {showPassword ? t("auth.hide") : t("auth.show")}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[15px] font-bold text-gray-700">
              {t("auth.confirm_password")}
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={inputClass}
              placeholder={t("auth.confirm_password")}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center rounded-full bg-blue-600 px-8 py-4 text-[16px] font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-90 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:bg-blue-400 disabled:active:scale-100"
            >
              {isLoading ? t("auth.sending") : t("auth.reset_pw")}
            </button>
          </div>
        </form>
      )}
    </>
  );
}

// The main page wrapper
export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <AuthLanguageSelector />
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-blue-100 text-3xl shadow-sm border border-blue-200">
          🔑
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* M3 Expressive Card */}
        <div className="rounded-[2.5rem] bg-card px-6 py-10 shadow-sm border border-gray-50 sm:px-10">
          <Suspense fallback={<div className="py-10 text-center text-[15px] font-medium text-gray-500">Loading secure form...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
