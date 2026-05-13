// app/login/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import AuthLanguageSelector from "@/components/AuthLanguageSelector";
import AuthThemeSelector from "@/components/AuthThemeSelector";

export default function LoginPage() {
  const { t } = useLanguage();
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
      setError(t("auth.invalid_creds"));
    } else {
      router.push("/");
      router.refresh();
    }
  };

  // M3 Expressive Input Style: Soft resting state, dynamic themed background
  const inputClass = "w-full rounded-2xl border border-card-border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-5 py-4 text-[15px] font-medium text-primary dark:text-slate-100 transition-all focus:border-blue-500 focus:bg-card dark:focus:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-secondary shadow-inner";

  return (
    <div className="flex min-h-screen flex-col justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <AuthLanguageSelector />
      <AuthThemeSelector />
      {/* M3 Header Section */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-blue-600 text-3xl shadow-md border border-blue-700">
          📦
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-primary">
          {t("auth.welcome")}
        </h2>
        <p className="mt-2 text-center text-[15px] text-secondary">
          {t("auth.login_subtitle")}
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
                {t("auth.email_or_name")}
              </label>
              <input
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                required
                className={inputClass}
                placeholder={t("auth.email_or_name_placeholder")}
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
                  className={`${inputClass} pr-20`}
                  placeholder="••••••••"
                />

                {/* M3 Styled Show/Hide Toggle Chip */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 rounded-xl bg-surface-hover/80 dark:bg-slate-700/50 px-3 py-1.5 text-sm font-bold text-secondary transition hover:bg-surface-hover dark:hover:bg-slate-700 hover:text-primary active:scale-90 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {showPassword ? t("auth.hide") : t("auth.show")}
                </button>
              </div>

              {/* NEW: Forgot Password Link */}
              <div className="mt-3 flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-[14px] font-bold text-blue-600 dark:text-blue-400 transition hover:text-blue-500 hover:underline"
                >
                  {t("auth.forgot_pw_link")}
                </Link>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="flex w-full justify-center rounded-full bg-blue-600 px-8 py-4 text-[16px] font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-90 focus:outline-none focus:ring-4 focus:ring-blue-500/30"
              >
                {t("auth.login")}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-[15px] text-secondary">
            {t("auth.dont_have_account")}{" "}
            <Link href="/register" className="font-bold text-blue-600 dark:text-blue-400 transition hover:text-blue-500">
              {t("auth.register_here")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

