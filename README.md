<div align="center">

# 💬 PVC-Chat

**Aplikasi chat tim real-time yang ringan, tanpa login, dan siap deploy di GitHub Pages**

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/id/docs/Web/HTML)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/id/docs/Web/JavaScript)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Firestore](https://img.shields.io/badge/Firestore-039BE5?style=for-the-badge&logo=googlecloud&logoColor=white)](https://firebase.google.com/products/firestore)
[![License MIT](https://img.shields.io/badge/License-MIT-4CAF50?style=for-the-badge)](LICENSE)

</div>

---

## 🎯 Apa itu PVC-Chat?

PVC-Chat adalah aplikasi obrolan tim *real-time* yang sangat ringan. Aplikasi ini menggunakan **frontend statis murni** (HTML, CSS, JavaScript tanpa *build step*) yang terhubung langsung ke **Firebase Firestore** sebagai backend untuk penyimpanan dan sinkronisasi pesan. 

Karena GitHub Pages hanya bisa meng-*hosting* file statis, bagian "server" dipegang sepenuhnya oleh Firebase (gratis untuk skala tim kecil). Cukup bagikan link, masukkan nama, dan langsung mengobrol!

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|---------|-------------|
| ⚡ **Real-time Messaging** | Pesan muncul secara instan di semua perangkat yang terhubung tanpa perlu *refresh* |
| 📎 **Upload File Universal** | Kirim gambar, dokumen, audio, video, atau file apa pun (hingga ~600KB) — disimpan inline (base64) di Firestore, tanpa Firebase Storage |
| ✏️ **Edit & Hapus Pesan** | Pengirim bisa mengubah atau menghapus pesannya sendiri; pesan hasil edit ditandai otomatis |
| 📜 **Riwayat Persisten** | Pesan tersimpan permanen di Firestore. Member baru bisa melihat hingga 200 pesan terakhir |
| 🔑 **Tanpa Login Ribet** | Cukup masukkan nama panggilan untuk langsung bergabung ke ruang obrolan |
| 🚀 **Zero Backend Maintenance** | Tidak perlu menyewa VPS atau mengatur server Node.js/PHP |
| 🌐 **Deploy Instan** | Siap di-*hosting* secara gratis di GitHub Pages dalam hitungan menit |

---

## 🛠️ Cara Kerja

1. Akses: Pengguna membuka link GitHub Pages.
2. Autentikasi Simpel: Pengguna memasukkan nama panggilan. Tidak ada password atau registrasi email.
3. Koneksi Firestore: app.js menginisialisasi Firebase menggunakan konfigurasi di firebase-config.js dan membuka listener real-time ke koleksi messages.
4. Pengiriman Pesan: Saat pengguna mengirim pesan, data { user, text, timestamp } di-push ke Firestore.
5. Sinkronisasi: Firestore memicu update ke semua klien yang terhubung, dan pesan baru langsung muncul di layar tanpa reload halaman.

> ⚠️ **Catatan keamanan:** PVC-Chat tidak memakai sistem login, jadi aturan "hanya pengirim yang bisa edit/hapus" hanya ditegakkan di sisi klien (tombol hanya muncul pada pesan sendiri). Untuk proteksi lebih ketat, tambahkan Firebase Auth.
>
> 💡 **Butuh file besar?** Upgrade project ke paket **Blaze**, aktifkan **Firebase Storage**, lalu ubah `uploadFile()` di `app.js` untuk mengunggah ke Storage dan simpan `downloadURL`-nya alih-alih base64.

## 📂 Struktur Proyek

PVC-Chat/
├── index.html          # Antarmuka (UI) utama aplikasi
├── style.css           # Styling tampilan (responsif & modern)
├── app.js              # Logika frontend & koneksi Firestore real-time
├── firebase-config.js  # Konfigurasi kredensial Firebase (JANGAN di-commit jika repo publik!)
└── README.md           # Dokumentasi ini

## 🤝 Kontribusi 
Kontribusi sangat terbuka! Jika Anda ingin menambahkan fitur seperti typing indicator, 
dark mode, atau room chat yang terpisah, silakan buka issue atau kirimkan pull request.
