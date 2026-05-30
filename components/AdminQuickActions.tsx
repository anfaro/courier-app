// components/AdminQuickActions.tsx
"use client";

import { useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { useToast } from "./ToastProvider";

export default function AdminQuickActions() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "courier"
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) {
      setError("All fields are required");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      showToast(`User ${data.user.name} created!`, "success");
      setShowModal(false);
      setNewUser({ name: "", email: "", password: "", role: "courier" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeocode = async () => {
    setGeocoding(true);
    try {
      const res = await fetch("/api/admin/geocode", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showToast(t("admin.geocode_success").replace("{count}", data.updated || 0), "success");
      } else {
        showToast(data.error || t("admin.geocode_error"), "error");
      }
    } catch {
      showToast(t("admin.geocode_error"), "error");
    } finally {
      setGeocoding(false);
    }
  };

  const inputClass = "w-full rounded-2xl border border-card-border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-5 py-3 text-[14px] font-medium text-primary dark:text-slate-100 outline-none focus:border-blue-500 transition-all";

  return (
    <div className="px-4 sm:px-6 mb-8">
      <h2 className="text-[14px] font-bold tracking-tight text-primary mb-3 uppercase tracking-widest opacity-60">Quick Actions</h2>
      <div className="flex gap-3">
        <button 
          onClick={() => setShowModal(true)}
          className="flex-1 flex items-center gap-3 rounded-[24px] bg-blue-600 p-4 text-white shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all hover:bg-blue-700"
        >
          <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">👤</div>
          <div className="flex flex-col items-start">
            <span className="font-black leading-tight text-[15px]">New User</span>
            <span className="text-[10px] font-bold opacity-70 uppercase tracking-tighter">Instant Onboarding</span>
          </div>
        </button>

        <button
          onClick={handleGeocode}
          disabled={geocoding}
          className="flex-1 flex items-center gap-3 rounded-[24px] bg-emerald-600 p-4 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all hover:bg-emerald-700 disabled:opacity-50"
        >
          <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">🌍</div>
          <div className="flex flex-col items-start">
            <span className="font-black leading-tight text-[15px]">{geocoding ? t("admin.geocode_processing") : t("admin.geocode_button")}</span>
            <span className="text-[10px] font-bold opacity-70 uppercase tracking-tighter">{t("admin.geocode_desc")}</span>
          </div>
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-[32px] bg-card p-6 shadow-2xl border border-card-border dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-primary mb-1">Onboard New Staff</h3>
            <p className="text-secondary text-[13px] mb-6">Create credentials for a new courier or administrator.</p>
            
            <form onSubmit={handleCreate} className="space-y-4">
              {error && <p className="text-red-500 text-[12px] font-bold bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-100 dark:border-red-900">{error}</p>}
              
              <input 
                type="text" 
                placeholder="Full Name" 
                value={newUser.name}
                onChange={e => setNewUser({...newUser, name: e.target.value})}
                className={inputClass}
              />
              <input 
                type="email" 
                placeholder="Email Address" 
                value={newUser.email}
                onChange={e => setNewUser({...newUser, email: e.target.value})}
                className={inputClass}
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={newUser.password}
                onChange={e => setNewUser({...newUser, password: e.target.value})}
                className={inputClass}
              />
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "courier", label: "Courier", icon: "📦" },
                  { value: "dispatcher", label: "Dispatcher", icon: "📡" },
                  { value: "hubmanager", label: "Hub Manager", icon: "🏢" },
                  { value: "superadmin", label: "Superadmin", icon: "🚀" }
                ].map((role) => {
                  const isSelected = newUser.role === role.value;
                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setNewUser({...newUser, role: role.value})}
                      className={`flex flex-col items-center justify-center rounded-[24px] p-4 text-center transition-all border-2 ${
                        isSelected 
                        ? "bg-blue-50/50 dark:bg-blue-900/20 border-blue-600 shadow-sm" 
                        : "bg-surface-hover border-transparent hover:border-gray-200 dark:hover:border-slate-700"
                      }`}
                    >
                      <span className="text-2xl mb-1">{role.icon}</span>
                      <span className={`text-[11px] font-black uppercase tracking-tight ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-secondary"}`}>
                        {role.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] btn-primary"
                >
                  {isLoading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
