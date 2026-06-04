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
  "nav.dashboard": { en: "Dashboard", id: "Dasbor" },
  "dashboard.recent_visits": { en: "Recent Visits", id: "Kunjungan Terbaru" },
  "dashboard.no_visits_yet": { en: "No visits recorded yet. Visit a customer to get started.", id: "Belum ada kunjungan. Kunjungi pelanggan untuk memulai." },
  "nav.customers": { en: "Customers", id: "Pelanggan" },
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
  "settings.rate_label": { en: "Rate per Package", id: "Tarif per Paket" },
  "settings.rate_hint": { en: "Earnings are calculated based on this rate", id: "Pendapatan dihitung berdasarkan tarif ini" },
  "settings.rate_updated": { en: "Rate updated!", id: "Tarif diperbarui!" },
  
  // Home Page
  "home.good_morning": { en: "Good morning,", id: "Selamat pagi," },
  "home.snapshot": { en: "Daily Snapshot", id: "Ringkasan Harian" },
  "home.total_customers": { en: "Total Customers", id: "Total Pelanggan" },
  "home.total_clusters": { en: "Total Clusters", id: "Total Klaster" },
  "home.command_center": { en: "Command Center", id: "Pusat Komando" },
  "home.manage_db": { en: "Manage Database", id: "Kelola Database" },
  "home.manage_db_desc": { en: "View customers, pinned GPS locations, and notes.", id: "Lihat pelanggan, lokasi GPS, dan catatan." },
  "home.field_tools": { en: "Field Tools", id: "Alat Lapangan" },
  "home.live_route": { en: "Route Map", id: "Peta Rute" },
  "home.live_route_desc": { en: "Select customers and plan your visit route", id: "Pilih pelanggan dan rencanakan rute kunjungan" },
  "home.clusters": { en: "Neighborhood Clusters", id: "Klaster Lingkungan" },
  "home.clusters_desc": { en: "Manage zones and regions", id: "Kelola zona dan wilayah" },

  // Map Page
  "map.title": { en: "Route Planner", id: "Perencana Rute" },
  "map.subtitle": { en: "Select customers to visit and generate the best route.", id: "Pilih pelanggan yang akan dikunjungi dan buat rute terbaik." },
  "map.planner_title": { en: "Route Planner", id: "Perencana Rute" },
  "map.start_label": { en: "Start Point (HQ/Home)", id: "Titik Mulai (Pusat/Rumah)" },
  "map.end_label": { en: "End Point (Finish)", id: "Titik Akhir (Selesai)" },
  "map.calculate": { en: "Generate Best Route", id: "Buat Rute Terbaik" },
  "map.calculating": { en: "Calculating...", id: "Menghitung..." },
  "map.select_customers": { en: "Select Customers to Visit", id: "Pilih Pelanggan untuk Dikunjungi" },
  "map.selected_count": { en: "[N] selected", id: "[N] dipilih" },
  "map.no_selection": { en: "Select customers above to plan a route", id: "Pilih pelanggan di atas untuk merencanakan rute" },
  "map.distance": { en: "Distance", id: "Jarak" },
  "map.duration": { en: "Duration", id: "Durasi" },
  "map.etc": { en: "ETC", id: "Estimasi Selesai" },
  "map.clear": { en: "Clear Route", id: "Hapus Rute" },
  "map.save_route": { en: "Save Route", id: "Simpan Rute" },
  "map.saved_routes": { en: "Saved Routes", id: "Rute Tersimpan" },
  "map.route_saved": { en: "Route saved!", id: "Rute disimpan!" },
  "map.route_deleted": { en: "Route deleted", id: "Rute dihapus" },
  "map.load_route": { en: "Loaded", id: "Dimuat" },
  "map.no_saved_routes": { en: "No saved routes yet", id: "Belum ada rute tersimpan" },
  "map.save_title": { en: "Save Current Route", id: "Simpan Rute Saat Ini" },
  "map.save_desc": { en: "Give your route a name so you can load it later.", id: "Beri nama rute Anda agar dapat dimuat kembali nanti." },
  "map.save_name_placeholder": { en: "e.g. Tuesday Morning Route", id: "cth. Rute Selasa Pagi" },

  // Customer Page
  "customer.share": { en: "Share", id: "Bagikan" },
  "customer.share_copied": { en: "Link copied!", id: "Tautan disalin!" },
  "customer.visit": { en: "Visit", id: "Kunjungi" },
  "customer.visit_now": { en: "Visit Now", id: "Kunjungi Sekarang" },
  "customer.visit_notes": { en: "Visit Notes (optional)", id: "Catatan Kunjungan (opsional)" },
  "customer.visit_recorded": { en: "Visit recorded!", id: "Kunjungan tercatat!" },
  "customer.visit_history": { en: "Visit History", id: "Riwayat Kunjungan" },
  "customer.last_visited": { en: "Last visited", id: "Terakhir dikunjungi" },
  "customer.no_visits": { en: "No visits recorded yet", id: "Belum ada kunjungan" },
  "customer.visited_by": { en: "by", id: "oleh" },
  "customer.visited_at": { en: "Visited at", id: "Dikunjungi pada" },
  "customer.check_in": { en: "Check In", id: "Check In" },
  "customer.check_out": { en: "Check Out", id: "Check Out" },
  "customer.checked_in": { en: "Checked in", id: "Sedang berkunjung" },
  "customer.checked_out": { en: "Checked out!", id: "Check Out berhasil!" },
  "customer.duration": { en: "Duration", id: "Durasi" },

  // Share Page
  "share.title": { en: "Customer Info", id: "Info Pelanggan" },
  "share.address": { en: "Address", id: "Alamat" },
  "share.phone": { en: "Phone", id: "Telepon" },
  "share.notes": { en: "Notes", id: "Catatan" },
  "share.clusters": { en: "Clusters", id: "Klaster" },
  "share.view_map": { en: "View on Map", id: "Lihat di Peta" },

  // Admin / General Tables
  "admin.fleet_mgmt": { en: "Fleet Management", id: "Manajemen Armada" },
  "admin.db_mgmt": { en: "Database Management", id: "Manajemen Database" },
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
  "admin.wipe_confirm_1_msg": { en: "This will delete ALL customers and clusters. This action is extremely dangerous.", id: "Ini akan menghapus SEMUA pelanggan dan klaster. Tindakan ini sangat berbahaya." },
  "admin.wipe_confirm_final_title": { en: "Final Warning", id: "Peringatan Terakhir" },
  "admin.wipe_confirm_final_msg": { en: "Are you ABSOLUTELY sure? There is no backup and no undo. All operational history will be lost.", id: "Apakah Anda BENAR-BENAR yakin? Tidak ada cadangan dan tidak bisa dibatalkan. Semua riwayat operasional akan hilang." },
  "admin.wipe_verification": { en: "Security Verification", id: "Verifikasi Keamanan" },
  "admin.wipe_type_code": { en: "To prevent accidental wipes, please type [CODE] below to execute the deletion.", id: "Untuk mencegah penghapusan tidak sengaja, silakan ketik [CODE] di bawah ini untuk mengeksekusi penghapusan." },
  "admin.wipe_executing": { en: "Executing Wipe...", id: "Mengeksekusi Penghapusan..." },
  "admin.wipe_execute_btn": { en: "Execute Permanent Wipe", id: "Eksekusi Penghapusan Permanen" },
  "admin.geocode_title": { en: "Geocode All Customers", id: "Geocode Semua Pelanggan" },
  "admin.geocode_desc": { en: "Auto-resolve coordinates for customers missing GPS location.", id: "Selesaikan otomatis koordinat untuk pelanggan tanpa lokasi GPS." },
  "admin.geocode_button": { en: "Geocode All", id: "Geocode Semua" },
  "admin.geocode_processing": { en: "Geocoding...", id: "Memproses Geocode..." },
  "admin.geocode_success": { en: "Geocoding complete! {count} customers updated.", id: "Geocode selesai! {count} pelanggan diperbarui." },
  "admin.geocode_error": { en: "Geocoding failed. Check console for details.", id: "Geocode gagal. Periksa konsol untuk detail." },
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
  "action.show_more": { en: "Show More", id: "Lihat Lebih" },
  "action.show_less": { en: "Show Less", id: "Tutup" },
  
  // Search Results
  "search.no_results": { en: "No matches found", id: "Tidak ada hasil ditemukan" },
  "search.staff": { en: "Fleet Staff", id: "Staf Armada" },
  "search.customers": { en: "Customers", id: "Pelanggan" },
  "search.clusters": { en: "Clusters", id: "Klaster" },
  // Customer Page specific
  "customer.db_title": { en: "Customer Database", id: "Basis Data Pelanggan" },
  "customer.db_subtitle": { en: "Find pinned locations and contacts.", id: "Temukan lokasi tersemat dan kontak." },
  "customer.add": { en: "Add Customer", id: "Tambah Pelanggan" },
  "customer.pin": { en: "Pin Location", id: "Sematkan Lokasi" },
  "customer.call": { en: "Call", id: "Telepon" },
  "customer.add_single": { en: "Manual Entry", id: "Input Manual" },
  "customer.add_bulk": { en: "Bulk Paste", id: "Tempel Massal" },
  "customer.house_picture": { en: "House Picture", id: "Foto Rumah" },

  // Auth Pages
  "auth.welcome": { en: "Welcome Back", id: "Selamat Datang Kembali" },
  "auth.login_subtitle": { en: "Please enter your credentials to access the fleet.", id: "Silakan masukkan kredensial Anda untuk mengakses armada." },
  "auth.join": { en: "Join the Fleet", id: "Bergabung dengan Armada" },
  "auth.create_account": { en: "Create an Account", id: "Buat Akun Baru" },
  "auth.signup_subtitle": { en: "Register to start managing your customers and routes.", id: "Daftar untuk mulai mengelola pelanggan dan rute Anda." },
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

  // Visit Tracking
  "visit.title": { en: "Visits", id: "Kunjungan" },
  "visit.check_in": { en: "Check In", id: "Check In" },
  "visit.check_out": { en: "Check Out", id: "Check Out" },
  "visit.active": { en: "Active Visit", id: "Kunjungan Aktif" },
  "visit.checked_in": { en: "Checked in!", id: "Berhasil check in!" },
  "visit.checked_out": { en: "Checked out!", id: "Berhasil check out!" },
  "visit.notes_placeholder": { en: "Add notes (optional)...", id: "Tambahkan catatan (opsional)..." },
  "visit.confirm_check_in": { en: "Start Visit", id: "Mulai Kunjungan" },
  "visit.no_visits": { en: "No visits recorded yet", id: "Belum ada kunjungan" },
  "visit.visit_completed": { en: "Visit Completed", id: "Kunjungan Selesai" },
  "visit.visit_in_progress": { en: "In Progress", id: "Sedang Berlangsung" },

  // Session / Progress
  "session.title": { en: "Progress", id: "Progres" },
  "session.dashboard_title": { en: "Sessions", id: "Sesi" },
  "session.dashboard_subtitle": { en: "Track your daily delivery progress", id: "Lacak progres pengiriman harian Anda" },
  "session.new": { en: "New Session", id: "Sesi Baru" },
  "session.new_created": { en: "New session created for today!", id: "Sesi baru dibuat untuk hari ini!" },
  "session.delete_confirm_title": { en: "Delete Session", id: "Hapus Sesi" },
  "session.delete_confirm_msg": { en: "Are you sure you want to delete this session and all its data?", id: "Apakah Anda yakin ingin menghapus sesi ini dan semua datanya?" },
  "session.deleted": { en: "Session deleted", id: "Sesi dihapus" },
  "session.total_packages": { en: "Total Packages", id: "Total Paket" },
  "session.delivered": { en: "Delivered", id: "Telah Diantar" },
  "session.progress": { en: "Progress", id: "Progres" },
  "session.no_sessions": { en: "No sessions yet. Start a new session to begin tracking.", id: "Belum ada sesi. Mulai sesi baru untuk mulai melacak." },
  "session.add_incoming": { en: "Add Incoming", id: "Tambah Incoming" },
  "session.incoming_title": { en: "New Incoming Arrival", id: "Kedatangan Incoming Baru" },
  "session.incoming_desc": { en: "Enter the number of packages and select customers.", id: "Masukkan jumlah paket dan pilih pelanggan." },
  "session.incoming_packages_label": { en: "Packages Count", id: "Jumlah Paket" },
  "session.incoming_packages_placeholder": { en: "e.g. 15", id: "cth. 15" },
  "session.select_customers": { en: "Select Customers", id: "Pilih Pelanggan" },
  "session.select_customers_desc": { en: "Select exactly [N] customer(s) to assign", id: "Pilih tepat [N] pelanggan untuk ditugaskan" },
  "session.customer_selected": { en: "[N] selected", id: "[N] dipilih" },
  "session.incoming_saved": { en: "Incoming recorded with [N] customers!", id: "Incoming dicatat dengan [N] pelanggan!" },
  "session.incoming_list": { en: "Incoming Arrivals", id: "Kedatangan Incoming" },
  "session.delivery_list": { en: "Delivery List", id: "Daftar Pengiriman" },
  "session.done": { en: "Done", id: "Selesai" },
  "session.return": { en: "Return", id: "Retur" },
  "session.reschedule": { en: "Reschedule", id: "Jadwal Ulang" },
  "session.delivery_updated": { en: "Status updated!", id: "Status diperbarui!" },
  "session.delivered_section": { en: "Delivered", id: "Telah Diantar" },
  "session.returned_section": { en: "Returned", id: "Diretur" },
  "session.rescheduled_section": { en: "Rescheduled", id: "Dijadwal Ulang" },
  "session.map_title": { en: "Route Map", id: "Peta Rute" },
  "session.packages": { en: "packages", id: "paket" },
  "session.pending": { en: "pending", id: "menunggu" },
  "session.map_empty": { en: "All deliveries completed! Map is empty.", id: "Semua pengiriman selesai! Peta kosong." },

  // Earnings
  "earnings.title": { en: "Earnings", id: "Pendapatan" },
  "earnings.total_earnings": { en: "Total Earnings", id: "Total Pendapatan" },
  "earnings.cutoff_period": { en: "Cutoff Period: [START] – [END]", id: "Periode Cutoff: [START] – [END]" },
  "earnings.per_package_rate": { en: "[RATE] per delivered package", id: "[RATE] per paket terkirim" },
  "earnings.per_day": { en: "Per Day", id: "Per Hari" },
  "earnings.delivered_count": { en: "[N] packages delivered", id: "[N] paket terkirim" },
  "earnings.amount": { en: "Earnings", id: "Pendapatan" },
  "earnings.no_sessions": { en: "No completed deliveries in this period.", id: "Tidak ada pengiriman selesai di periode ini." },
  "earnings.date": { en: "Date", id: "Tanggal" },
  "earnings.next_cutoff": { en: "Next cutoff: [END]", id: "Cutoff berikutnya: [END]" },

  // Image Input
  "session.quantity": { en: "Qty", id: "Jml" },
  "session.split_title": { en: "Mark as [STATUS]", id: "Tandai sebagai [STATUS]" },
  "session.split_desc": { en: "Currently: [N] packages pending", id: "Saat ini: [N] paket menunggu" },
  "session.split_how_many": { en: "How many packages?", id: "Berapa paket?" },
  "session.split_confirm": { en: "Confirm", id: "Konfirmasi" },
  "session.total": { en: "Total", id: "Total" },
  "session.no_pending": { en: "No pending deliveries", id: "Tidak ada pengiriman menunggu" },
  "session.target_early": { en: "Before 09:00", id: "Sebelum 09:00" },
  "session.target_on_track": { en: "On Track", id: "Tepat Sasaran" },
  "session.target_safe": { en: "Safe Zone", id: "Zona Aman" },
  "session.target_behind": { en: "Behind Target", id: "Di Bawah Target" },

  // Image Input
  "image.gallery": { en: "From Gallery", id: "Dari Galeri" },
  "image.camera": { en: "Take Photo", id: "Ambil Foto" },
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
