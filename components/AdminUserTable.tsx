// components/AdminUserTable.tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";
import { useConfirmation } from "@/components/ConfirmationProvider";

export default function AdminUserTable({ initialUsers }: { initialUsers: any[] }) {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { askConfirmation } = useConfirmation();
  const [userList, setUserList] = useState(initialUsers);
  const [isLoading, setIsLoading] = useState<number | string | null>(null);
  const [error, setError] = useState("");

  // --- PASSWORD VISIBILITY STATE ---
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showAddConfirmPassword, setShowAddConfirmPassword] = useState(false);

  // --- PASSWORD MODAL STATE ---
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [targetUser, setTargetUser] = useState<{ id: number; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // --- ADD USER MODAL STATE ---
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "courier"
  });
  const [isAddingUser, setIsAddingUser] = useState(false);

  // --- SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = userList.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateRole = async (userId: number, currentRole: string) => {
    const newRole = currentRole === "superadmin" ? "courier" : "superadmin";
    
    const confirmed = await askConfirmation({
      title: t("admin.confirm_role_title"),
      message: `${t("admin.confirm_role_msg")} ${newRole === "superadmin" ? t("role.admin") : t("role.courier")}?`,
      confirmText: t("action.confirm"),
      type: "warning"
    });

    if (!confirmed) return;

    setIsLoading(userId);
    setError("");

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }

      setUserList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showToast(newRole === "superadmin" ? "User promoted to Superadmin!" : "User demoted to Courier.", "success");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(null);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    const confirmed = await askConfirmation({
      title: t("admin.confirm_offboard_title"),
      message: t("admin.confirm_offboard_msg"),
      confirmText: t("admin.offboard"),
      type: "danger"
    });

    if (!confirmed) return;

    setIsLoading(userId);
    setError("");

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete user");
      }

      setUserList(prev => prev.filter(u => u.id !== userId));
      showToast("User offboarded successfully.", "success");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(null);
    }
  };

  const handleOpenPasswordModal = (user: { id: number; name: string }) => {
    setTargetUser(user);
    setNewPassword("");
    setShowPasswordModal(true);
    setShowResetPassword(false);
    setError("");
  };

  const handleUpdatePassword = async () => {
    if (!targetUser || !newPassword) return;
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsUpdatingPassword(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update password");
      }

      setShowPasswordModal(false);
      showToast(`Password for ${targetUser.name} updated.`, "success");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.confirmPassword) {
        setError("All fields are required.");
        return;
    }
    if (newUser.password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
    }
    if (newUser.password !== newUser.confirmPassword) {
        setError("Passwords do not match.");
        return;
    }

    setIsAddingUser(true);
    setError("");

    try {
      const { confirmPassword, ...payload } = newUser;
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      setUserList(prev => [data.user, ...prev]);
      showToast(`User ${data.user.name} created successfully.`, "success");
      setShowAddUserModal(false);
      setNewUser({ name: "", email: "", password: "", confirmPassword: "", role: "courier" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAddingUser(false);
    }
  };

  const inputClass = "w-full rounded-2xl border border-card-border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-5 py-4 text-[15px] font-medium text-primary dark:text-slate-100 focus:border-blue-500 focus:bg-card dark:focus:bg-slate-900 outline-none transition-all shadow-sm placeholder:text-gray-400";
  const toggleBtnClass = "absolute right-3 rounded-xl bg-gray-200/50 dark:bg-slate-700/50 px-3 py-1.5 text-sm font-bold text-secondary dark:text-slate-300 transition hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-primary dark:hover:text-white active:scale-90 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="px-4 sm:px-6">
      {/* TOP ACTION BAR */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder={t("admin.search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-card-border bg-card pl-11 pr-4 py-3.5 text-[15px] font-medium text-primary shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none placeholder:text-secondary"
          />
        </div>
        <button
          onClick={() => { setShowAddUserModal(true); setShowAddPassword(false); setShowAddConfirmPassword(false); setError(""); }}
          className="btn-primary whitespace-nowrap"
        >
          <span className="text-xl leading-none">+</span>
          {t("admin.add_user")}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 dark:bg-red-950/30 p-4 text-[14px] font-bold text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900 animate-in fade-in">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {filteredUsers.map((user) => {
          const isMe = session?.user?.email === user.email;
          const isWorking = isLoading === user.id;

          return (
            <div key={user.id} className="flex flex-col rounded-[32px] bg-card shadow-sm border border-card-border dark:border-slate-800 transition-all hover:shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 p-6 pb-0">
                <div className="flex items-center gap-4">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-black shadow-inner border ${
                    user.role === 'superadmin' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-800' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800'
                    }`}>
                    {user.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-[17px] font-black text-primary truncate">{user.name}</h3>
                        {isMe && (
                            <span className="rounded-full bg-gray-900 dark:bg-slate-100 px-2 py-0.5 text-[10px] font-black text-white dark:text-slate-900 uppercase tracking-tighter">You</span>
                        )}
                    </div>
                    <p className="text-[13px] font-medium text-secondary truncate">{user.email}</p>
                    <div className="mt-1 flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                        user.role === 'superadmin' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300' : 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300'
                        }`}>
                        {user.role}
                        </span>
                    </div>
                    </div>
                </div>
              </div>

              {/* ACTION BAR */}
              <div className="flex flex-col gap-2 p-6 pt-4 border-t border-card-border dark:border-slate-800">
                <div className="flex flex-wrap gap-2">
                    <button
                    disabled={isWorking || isMe}
                    onClick={() => handleUpdateRole(user.id, user.role)}
                    className={`flex-1 min-w-[140px] disabled:opacity-50 ${
                        user.role === 'superadmin' 
                        ? 'btn-outline' 
                        : 'btn-primary'
                    }`}
                    >
                    <span className="text-lg">{user.role === 'superadmin' ? '📉' : '🚀'}</span>
                    {user.role === 'superadmin' ? t("admin.demote") : t("admin.promote")}
                    </button>

                    <button
                    disabled={isWorking || isMe}
                    onClick={() => handleOpenPasswordModal({ id: user.id, name: user.name })}
                    className="btn-secondary flex-1 min-w-[140px] disabled:opacity-50"
                    >
                    <span className="text-lg">🔑</span>
                    {t("admin.change_pw")}
                    </button>
                </div>

                <button
                    disabled={isWorking || isMe}
                    onClick={() => handleDeleteUser(user.id, user.name)}
                    className="btn-danger w-full disabled:opacity-50"
                >
                    {isWorking && isLoading === user.id ? (
                        <span className="h-5 w-5 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
                    ) : (
                        <span className="text-lg">🗑️</span>
                    )}
                    {t("admin.offboard")}
                </button>
              </div>
            </div>
          );
        })}

        {userList.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-secondary font-medium">No users found.</p>
          </div>
        )}
      </div>

      {/* --- PASSWORD RESET MODAL --- */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => !isUpdatingPassword && setShowPasswordModal(false)} />
            
            <div className="relative w-full max-w-md rounded-[32px] bg-card p-6 shadow-2xl border border-card-border dark:border-slate-800 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
                <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-gray-200 dark:bg-slate-700 sm:hidden"></div>

                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <span className="text-2xl">🔑</span>
                </div>

                <h3 className="text-xl font-black text-primary">{t("admin.change_pw")}</h3>
                <p className="mt-1 mb-6 text-[14px] font-medium text-secondary">
                    Assign a new login password for <strong className="text-primary">{targetUser?.name}</strong>.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="mb-2 block text-[12px] font-black text-secondary uppercase tracking-wider">New Password</label>
                        <div className="relative flex items-center">
                            <input
                                type={showResetPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                                className={`${inputClass} pr-20`}
                                autoFocus
                            />
                            <button 
                                type="button"
                                onClick={() => setShowResetPassword(!showResetPassword)}
                                className={toggleBtnClass}
                            >
                                {showResetPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => setShowPasswordModal(false)}
                            disabled={isUpdatingPassword}
                            className="btn-outline flex-1 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpdatePassword}
                            disabled={isUpdatingPassword || !newPassword}
                            className="btn-primary flex-[2] disabled:opacity-50"
                        >
                            {isUpdatingPassword ? "Updating..." : "Update Password"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- ADD NEW USER MODAL --- */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => !isAddingUser && setShowAddUserModal(false)} />
            
            <div className="relative w-full max-w-md rounded-[32px] bg-card p-6 shadow-2xl border border-card-border dark:border-slate-800 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-gray-200 dark:bg-slate-700 sm:hidden"></div>

                <h3 className="text-xl font-black text-primary">{t("admin.add_user")}</h3>
                <p className="mt-1 mb-6 text-[14px] font-medium text-secondary">
                    Create a new courier or admin account for your fleet.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-[11px] font-black text-secondary uppercase tracking-wider">Username</label>
                        <input
                            type="text"
                            value={newUser.name}
                            onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                            placeholder="e.g. johndoe"
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-black text-secondary uppercase tracking-wider">Email Address</label>
                        <input
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                            placeholder="e.g. john@example.com"
                            className={inputClass}
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="relative flex flex-col">
                            <label className="mb-1 block text-[11px] font-black text-secondary uppercase tracking-wider">Initial Password</label>
                            <div className="relative flex items-center">
                                <input
                                    type={showAddPassword ? "text" : "password"}
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                    placeholder="Min. 6 characters"
                                    className={`${inputClass} pr-20`}
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowAddPassword(!showAddPassword)}
                                    className={toggleBtnClass}
                                >
                                    {showAddPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        <div className="relative flex flex-col">
                            <label className="mb-1 block text-[11px] font-black text-secondary uppercase tracking-wider">Confirm Password</label>
                            <div className="relative flex items-center">
                                <input
                                    type={showAddConfirmPassword ? "text" : "password"}
                                    value={newUser.confirmPassword}
                                    onChange={(e) => setNewUser({...newUser, confirmPassword: e.target.value})}
                                    placeholder="Re-type password"
                                    className={`${inputClass} pr-20 ${newUser.confirmPassword && newUser.password !== newUser.confirmPassword ? 'border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30' : ''}`}
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowAddConfirmPassword(!showAddConfirmPassword)}
                                    className={toggleBtnClass}
                                >
                                    {showAddConfirmPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-black text-secondary uppercase tracking-wider">Assigned Role</label>
                        <div className="flex rounded-[20px] bg-gray-100 dark:bg-slate-800 p-1">
                            <button 
                                onClick={() => setNewUser({...newUser, role: "courier"})}
                                className={`flex-1 rounded-[16px] py-2.5 text-[13px] font-bold transition-all ${newUser.role === 'courier' ? 'bg-card dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-secondary'}`}
                            >
                                Courier
                            </button>
                            <button 
                                onClick={() => setNewUser({...newUser, role: "superadmin"})}
                                className={`flex-1 rounded-[16px] py-2.5 text-[13px] font-bold transition-all ${newUser.role === 'superadmin' ? 'bg-card dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-sm' : 'text-secondary'}`}
                            >
                                Superadmin
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => setShowAddUserModal(false)}
                            disabled={isAddingUser}
                            className="btn-outline flex-1 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateUser}
                            disabled={isAddingUser}
                            className="btn-primary flex-[2] disabled:opacity-50"
                        >
                            {isAddingUser ? "Creating..." : "Create User"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
