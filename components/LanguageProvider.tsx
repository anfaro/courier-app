// components/LanguageProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Locale = "en" | "id";

interface Translations {
  [key: string]: {
    [key in Locale]: string;
  };
}

export const translations: Translations = {
  // Navigation
  "nav.home": { en: "Home", id: "Beranda" },
  "nav.customers": { en: "Customers", id: "Pelanggan" },
  "nav.deliveries": { en: "Deliveries", id: "Pengiriman" },
  "nav.clusters": { en: "Clusters", id: "Klaster" },
  "nav.map": { en: "Map", id: "Peta" },
  "nav.admin": { en: "Admin", id: "Admin" },
  "nav.settings": { en: "Settings", id: "Pengaturan" },
  
  // Settings Page
  "settings.title": { en: "Profile Settings", id: "Pengaturan Profil" },
  "settings.subtitle": { en: "Manage your account details", id: "Kelola detail akun Anda" },
  "settings.appearance": { en: "Appearance", id: "Tampilan" },
  "settings.light": { en: "Light", id: "Terang" },
  "settings.dark": { en: "Dark", id: "Gelap" },
  "settings.language": { en: "Language", id: "Bahasa" },
  "settings.save": { en: "Save Changes", id: "Simpan Perubahan" },
  "settings.saving": { en: "Saving Changes...", id: "Menyimpan..." },
  "settings.success": { en: "Profile updated successfully!", id: "Profil berhasil diperbarui!" },
  "settings.name_label": { en: "Display Name", id: "Nama Tampilan" },
  "settings.email_label": { en: "Email Address", id: "Alamat Email" },
  "settings.readonly": { en: "Read-only", id: "Hanya-baca" },
  
  // Home Page
  "home.good_morning": { en: "Good morning,", id: "Selamat pagi," },
  "home.snapshot": { en: "Daily Snapshot", id: "Ringkasan Harian" },
  "home.pending_waybills": { en: "Pending Waybills", id: "Waybill Pending" },
  "home.to_collect": { en: "To Collect (COD)", id: "COD untuk Ditagih" },
  "home.command_center": { en: "Command Center", id: "Pusat Komando" },
  "home.entry_hub": { en: "Global Entry Hub", id: "Pusat Input Global" },
  "home.entry_hub_desc": { en: "Paste Excel data or scan barcodes instantly.", id: "Tempel data Excel atau pindai barcode instan." },
  "home.manage_db": { en: "Manage Database", id: "Kelola Database" },
  "home.manage_db_desc": { en: "View customers, pinned GPS locations, and notes.", id: "Lihat pelanggan, lokasi GPS, dan catatan." },
  "home.field_tools": { en: "Field Tools", id: "Alat Lapangan" },
  "home.live_route": { en: "Live Route Map", id: "Peta Rute Langsung" },
  "home.live_route_desc": { en: "View GPS density of pending orders", id: "Lihat kepadatan GPS pesanan tertunda" },
  "home.clusters": { en: "Neighborhood Clusters", id: "Klaster Lingkungan" },
  "home.clusters_desc": { en: "Manage delivery zones and regions", id: "Kelola zona dan wilayah pengiriman" },

  // Map Page
  "map.title": { en: "Intelligent Routing", id: "Rute Cerdas" },
  "map.subtitle": { en: "Optimize your field delivery sequence.", id: "Optimalkan urutan pengiriman lapangan Anda." },
  "map.planner_title": { en: "Smart Route Planner", id: "Perencana Rute Pintar" },
  "map.start_label": { en: "Start Point (HQ/Home)", id: "Titik Mulai (Pusat/Rumah)" },
  "map.end_label": { en: "End Point (Finish)", id: "Titik Akhir (Selesai)" },
  "map.calculate": { en: "Calculate Best Route Possible", id: "Hitung Rute Terbaik" },
  "map.calculating": { en: "Calculating Metrics...", id: "Menghitung Metrik..." },
  "map.distance": { en: "Distance", id: "Jarak" },
  "map.duration": { en: "Duration", id: "Durasi" },
  "map.etc": { en: "ETC", id: "Estimasi Selesai" },
  "map.clear": { en: "Clear Route", id: "Hapus Rute" },

  // Admin / General Tables
  "admin.fleet_mgmt": { en: "Fleet Management", id: "Manajemen Armada" },
  "admin.db_mgmt": { en: "Database Management", id: "Manajemen Database" },
  "admin.waybill_mgmt": { en: "Waybill Management", id: "Manajemen Waybill" },
  "admin.cluster_mgmt": { en: "Cluster Management", id: "Manajemen Klaster" },
  "admin.add_user": { en: "Add New User", id: "Tambah Pengguna Baru" },
  "admin.add_customer": { en: "Add Customer", id: "Tambah Pelanggan" },
  "admin.bulk_delete": { en: "Bulk Delete", id: "Hapus Massal" },
  "admin.offboard": { en: "Offboard User", id: "Berhentikan Pengguna" },
  "admin.promote": { en: "Promote to Admin", id: "Promosikan ke Admin" },
  "admin.demote": { en: "Demote to Courier", id: "Turunkan ke Kurir" },
  "admin.change_pw": { en: "Change Password", id: "Ubah Kata Sandi" },
  "admin.search_placeholder": { en: "Search...", id: "Cari..." },
  "admin.confirm_role_title": { en: "Confirm Role Change", id: "Konfirmasi Perubahan Peran" },
  "admin.confirm_role_msg": { en: "Are you sure you want to change this user's role to", id: "Apakah Anda yakin ingin mengubah peran pengguna ini menjadi" },
  "admin.confirm_offboard_title": { en: "Confirm Offboarding", id: "Konfirmasi Pemberhentian" },
  "admin.confirm_offboard_msg": { en: "Are you sure you want to permanently delete this user? This will offboard them from the system.", id: "Apakah Anda yakin ingin menghapus pengguna ini secara permanen? Ini akan memberhentikan mereka dari sistem." },
  "admin.danger_zone": { en: "Danger Zone", id: "Zona Bahaya" },
  "admin.wipe_title": { en: "Wipe System Data", id: "Hapus Data Sistem" },
  "admin.wipe_desc": { en: "Administrative maintenance actions", id: "Tindakan pemeliharaan administratif" },
  "admin.wipe_btn": { en: "Wipe All Operational Data", id: "Hapus Semua Data Operasional" },
  "admin.wipe_confirm_1_msg": { en: "This will delete ALL customers, waybills, and clusters. This action is extremely dangerous.", id: "Ini akan menghapus SEMUA pelanggan, waybill, dan klaster. Tindakan ini sangat berbahaya." },
  "admin.wipe_confirm_final_title": { en: "Final Warning", id: "Peringatan Terakhir" },
  "admin.wipe_confirm_final_msg": { en: "Are you ABSOLUTELY sure? There is no backup and no undo. All operational history will be lost.", id: "Apakah Anda BENAR-BENAR yakin? Tidak ada cadangan dan tidak bisa dibatalkan. Semua riwayat operasional akan hilang." },
  "admin.wipe_verification": { en: "Security Verification", id: "Verifikasi Keamanan" },
  "admin.wipe_type_code": { en: "To prevent accidental wipes, please type [CODE] below to execute the deletion.", id: "Untuk mencegah penghapusan tidak sengaja, silakan ketik [CODE] di bawah ini untuk mengeksekusi penghapusan." },
  "admin.wipe_executing": { en: "Executing Wipe...", id: "Mengeksekusi Penghapusan..." },
  "admin.wipe_execute_btn": { en: "Execute Permanent Wipe", id: "Eksekusi Penghapusan Permanen" },
  "role.admin": { en: "Admin", id: "Admin" },
  "role.courier": { en: "Courier", id: "Kurir" },
  
  // Generic Actions
  "action.save": { en: "Save", id: "Simpan" },
  "action.cancel": { en: "Cancel", id: "Batal" },
  "action.delete": { en: "Delete", id: "Hapus" },
  "action.edit": { en: "Edit", id: "Ubah" },
  "action.view": { en: "View Details", id: "Lihat Detail" },
  "action.loading": { en: "Loading...", id: "Memuat..." },
  "action.confirm": { en: "Confirm", id: "Konfirmasi" },
  "action.clear_all": { en: "Clear All", id: "Bersihkan Semua" },
  "action.resolve": { en: "Resolve", id: "Selesaikan" },
  
  // Search Results
  "search.no_results": { en: "No matches found", id: "Tidak ada hasil ditemukan" },
  "search.staff": { en: "Fleet Staff", id: "Staf Armada" },
  "search.customers": { en: "Customers", id: "Pelanggan" },
  "search.waybills": { en: "Waybills", id: "Waybill" },

  // Customer Page specific
  "customer.db_title": { en: "Customer Database", id: "Basis Data Pelanggan" },
  "customer.db_subtitle": { en: "Find pinned locations and contacts.", id: "Temukan lokasi tersemat dan kontak." },
  "customer.add": { en: "Add Customer", id: "Tambah Pelanggan" },
  "customer.pin": { en: "Pin Location", id: "Sematkan Lokasi" },
  "customer.call": { en: "Call", id: "Telepon" },

  // Delivery Page specific
  "delivery.hub_title": { en: "New Deliveries", id: "Pengiriman Baru" },
  "delivery.manual": { en: "Manual Entry", id: "Input Manual" },
  "delivery.bulk": { en: "Bulk Paste", id: "Tempel Massal" },
  "delivery.assign_to": { en: "Assign To Customer", id: "Tugaskan ke Pelanggan" },
  "delivery.waybill_num": { en: "Waybill Number", id: "Nomor Waybill" },
  "delivery.cod": { en: "COD Amount", id: "Jumlah COD" },
  "delivery.receiver": { en: "Receiver Name", id: "Nama Penerima" },
  "delivery.add_list": { en: "Add to List", id: "Tambah ke Daftar" },
  "delivery.extract_list": { en: "Extract & Add to List", id: "Ekstrak & Tambah ke Daftar" },
  "delivery.pending_list": { en: "Pending List", id: "Daftar Tunggu" },
  "delivery.items_ready": { en: "items ready", id: "item siap" },
  "delivery.save_db": { en: "SAVE WAYBILLS", id: "SIMPAN WAYBILL" },
  "delivery.unknown_cust": { en: "Unknown Customer", id: "Pelanggan Tidak Dikenal" },
  "delivery.resolve_auto": { en: "Resolve All Automatically", id: "Selesaikan Semua Otomatis" },
  "delivery.resolve_cust": { en: "Resolve Unknown Customer", id: "Selesaikan Pelanggan Tidak Dikenal" },
  "delivery.select_cust": { en: "Select Customer", id: "Pilih Pelanggan" },

  // Auth Pages
  "auth.welcome": { en: "Welcome Back", id: "Selamat Datang Kembali" },
  "auth.login_subtitle": { en: "Please enter your credentials to access the fleet.", id: "Silakan masukkan kredensial Anda untuk mengakses armada." },
  "auth.join": { en: "Join the Fleet", id: "Bergabung dengan Armada" },
  "auth.create_account": { en: "Create an Account", id: "Buat Akun Baru" },
  "auth.signup_subtitle": { en: "Register to start managing your field deliveries.", id: "Daftar untuk mulai mengelola pengiriman lapangan Anda." },
  "auth.login": { en: "Log In", id: "Masuk" },
  "auth.signup": { en: "Sign Up", id: "Daftar" },
  "auth.signing_up": { en: "Signing Up...", id: "Mendaftar..." },
  "auth.email": { en: "Email Address", id: "Alamat Email" },
  "auth.email_placeholder": { en: "name@example.com", id: "nama@contoh.com" },
  "auth.email_or_name": { en: "Email or Name", id: "Email atau Nama" },
  "auth.email_or_name_placeholder": { en: "name@example.com or username", id: "nama@contoh.com atau username" },
  "auth.username": { en: "Username", id: "Nama Pengguna" },
  "auth.username_placeholder": { en: "Enter your username", id: "Masukkan nama pengguna Anda" },
  "auth.password": { en: "Password", id: "Kata Sandi" },
  "auth.password_placeholder": { en: "At least 6 characters", id: "Minimal 6 karakter" },
  "auth.confirm_password": { en: "Confirm Password", id: "Konfirmasi Kata Sandi" },
  "auth.confirm_password_placeholder": { en: "Repeat your password", id: "Ulangi kata sandi Anda" },
  "auth.passwords_not_match": { en: "Passwords do not match.", id: "Kata sandi tidak cocok." },
  "auth.password_min_length": { en: "Password must be at least 6 characters long.", id: "Kata sandi minimal harus 6 karakter." },
  "auth.forgot_pw": { en: "Forgot password?", id: "Lupa kata sandi?" },
  "auth.forgot_pw_link": { en: "Forgot password?", id: "Lupa kata sandi?" },
  "auth.forgot_pw_title": { en: "Reset Password", id: "Atur Ulang Sandi" },
  "auth.forgot_pw_subtitle": { en: "Enter your email to receive a recovery link.", id: "Masukkan email untuk menerima tautan pemulihan." },
  "auth.reset_pw": { en: "Set New Password", id: "Setel Sandi Baru" },
  "auth.reset_pw_subtitle": { en: "Please enter your new password below.", id: "Silakan masukkan kata sandi baru Anda di bawah ini." },
  "auth.dont_have_account": { en: "Don't have an account?", id: "Belum punya akun?" },
  "auth.already_have_account": { en: "Already have an account?", id: "Sudah punya akun?" },
  "auth.register_here": { en: "Register here", id: "Daftar di sini" },
  "auth.login_here": { en: "Log in here", id: "Masuk di sini" },
  "auth.send_reset_link": { en: "Send Reset Link", id: "Kirim Tautan" },
  "auth.sending": { en: "Sending...", id: "Mengirim..." },
  "auth.back_to_login": { en: "Back to Login", id: "Kembali ke Masuk" },
  "auth.remembered_pw": { en: "Remembered your password?", id: "Ingat kata sandi Anda?" },
  "auth.pw_reset_success": { en: "Password Reset!", id: "Sandi Berhasil Diatur Ulang!" },
  "auth.pw_updated": { en: "Your password has been updated successfully.", id: "Kata sandi Anda telah berhasil diperbarui." },
  "auth.show": { en: "Show", id: "Tampilkan" },
  "auth.hide": { en: "Hide", id: "Sembunyikan" },
  "auth.no_token": { en: "No reset token found.", id: "Token atur ulang tidak ditemukan." },
  "auth.invalid_creds": { en: "Invalid credentials. Please check your info.", id: "Kredensial salah. Silakan periksa kembali." },
  "auth.registration_failed": { en: "Registration failed. Please try again.", id: "Pendaftaran gagal. Silakan coba lagi." },
  "auth.unexpected_error": { en: "An unexpected error occurred.", id: "Terjadi kesalahan yang tidak terduga." },
  "auth.something_wrong": { en: "Something went wrong.", id: "Terjadi kesalahan." },
};

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const savedLocale = localStorage.getItem("locale");
    if (savedLocale === "en" || savedLocale === "id") {
      setLocaleState(savedLocale);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
  };

  const t = (key: string) => {
    return translations[key]?.[locale] || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
