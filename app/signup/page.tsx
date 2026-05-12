// app/signup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import AuthLanguageSelector from "@/components/AuthLanguageSelector";
import AuthThemeSelector from "@/components/AuthThemeSelector";

export default function SignUpPage() {
  const { t } = useLanguage();
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
      setError(t("auth.passwords_not_match"));
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
        setError(data.message || t("auth.registration_failed"));
      }
    } catch (err) {
      setError(t("auth.unexpected_error"));
    } finally {
      setIsLoading(false);
    }
  };

  // M3 Expressive Input Style: Soft resting state, bright white active state with soft glow
  const inputClass = "w-full rounded-2xl border border-transparent bg-gray-100 dark:bg-slate-800 px-5 py-4 text-[15px] text-primary transition-all focus:border-blue-600 focus:bg-card focus:outline-none focus:ring-4 focus:ring-blue-600/15";

  return (
    <div className="flex min-h-screen flex-col justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <AuthLanguageSelector />
      <AuthThemeSelector />
      {/* M3 Header Section */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-blue-600 text-3xl shadow-md border border-blue-700">
          👋
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-primary">
          {t("auth.create_account")}
        </h2>
        <p className="mt-2 text-center text-[15px] text-secondary">
          {t("auth.signup_subtitle")}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* M3 Expressive Card */}
        <div className="rounded-[2.5rem] bg-card px-6 py-10 shadow-sm border border-card-border sm:px-10">

          {error && (
            <div className="mb-6 rounded-2xl bg-red-50 dark:bg-red-950/30 p-4 text-center text-[15px] font-medium text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/50 animate-[fadeIn_0.3s_ease-out]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-[15px] font-bold text-secondary">
                {t("auth.full_name")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder={t("auth.full_name_placeholder")}
              />
            </div>

            <div>
              <label className="mb-2 block text-[15px] font-bold text-secondary">
                {t("auth.email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
                placeholder={t("auth.email_placeholder")}
              />
            </div>

            <div>
              <label className="mb-2 block text-[15px] font-bold text-secondary">
                {t("auth.password")}
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  // Add padding to the right so text doesn't hide under the button
                  className={`${inputClass} pr-20`}
                  placeholder={t("auth.password_placeholder")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 rounded-xl bg-gray-200/50 dark:bg-slate-700/50 px-3 py-1.5 text-sm font-bold text-secondary transition hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-primary active:scale-90 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {showPassword ? t("auth.hide") : t("auth.show")}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[15px] font-bold text-secondary">
                {t("auth.confirm_password")}
              </label>
              <div className="relative flex items-center">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`${inputClass} pr-20`}
                  placeholder={t("auth.confirm_password_placeholder")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 rounded-xl bg-gray-200/50 dark:bg-slate-700/50 px-3 py-1.5 text-sm font-bold text-secondary transition hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-primary active:scale-90 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {showConfirmPassword ? t("auth.hide") : t("auth.show")}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-full bg-blue-600 px-8 py-4 text-[16px] font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-90 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:bg-blue-400 disabled:active:scale-100"
              >
                {isLoading ? t("auth.signing_up") : t("auth.signup")}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-[15px] text-secondary">
            {t("auth.already_have_account")}{" "}
            <Link href="/login" className="font-bold text-blue-600 dark:text-blue-400 transition hover:text-blue-500">
              {t("auth.login_here")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

