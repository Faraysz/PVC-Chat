# Chat Tim — statis + realtime, deploy di GitHub Pages

Frontend murni statis (HTML/CSS/JS biasa, tanpa build step) yang tersambung ke
**Firebase Firestore** untuk penyimpanan & sinkronisasi pesan realtime. GitHub Pages
cuma bisa hosting file statis, jadi bagian "server"-nya dipegang Firebase (gratis untuk
skala tim kecil).

## 1. Buat project Firebase

1. Buka https://console.firebase.google.com → **Add project** → beri nama bebas (mis. `chat-tim`) → selesaikan wizard.
2. Di sidebar kiri, klik **Build → Firestore Database** → **Create database** → pilih mode **production** → pilih lokasi server terdekat (mis. `asia-southeast2`).
3. Klik ikon ⚙️ (Project settings) → tab **General** → scroll ke **Your apps** → klik ikon **</>** (Web) → daftarkan app (nama bebas, **jangan** centang Firebase Hosting) → Firebase akan menampilkan objek `firebaseConfig`.
4. Salin nilai-nilainya ke file `firebase-config.js` di project ini (ganti semua `GANTI_...`).

## 2. Atur Security Rules

Di Firestore, buka tab **Rules**, ganti isinya jadi:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{message} {
      allow read: if true;
      allow create: if request.resource.data.text is string
                    && request.resource.data.text.size() > 0
                    && request.resource.data.text.size() < 2000
                    && request.resource.data.user is string;
      allow update, delete: if false;
    }
  }
}
```

**Catatan keamanan:** rule ini membuat ruang chat terbuka untuk siapa pun yang tahu
link + config-nya (cukup untuk tim kecil yang link-nya tidak disebar publik). Kalau
butuh proteksi lebih (login akun, batasi ke domain email tertentu, dll), itu bisa
ditambah pakai Firebase Authentication — bilang saja kalau mau dibantu.

## 3. Deploy ke GitHub Pages

1. Buat repo baru di GitHub, upload 4 file di folder ini: `index.html`, `firebase-config.js`, `app.js`, `README.md` (config yang sudah kamu isi, bukan yang placeholder).
2. Di repo → **Settings → Pages** → **Source**: pilih branch `main`, folder `/ (root)` → **Save**.
3. Tunggu ~1 menit, GitHub akan kasih link seperti `https://<username>.github.io/<repo>/`.
4. Bagikan link itu ke tim — semua yang buka akan berada di ruang chat yang sama.

## Cara pakai

Setiap orang buka link → isi nama → langsung bisa kirim & terima pesan real-time.
Riwayat pesan tersimpan permanen di Firestore (bukan cuma di browser), jadi member baru
yang buka link tetap lihat histori sampai 200 pesan terakhir.

## Kalau mau kembangkan lebih lanjut

- **Banyak ruangan/channel**: tambah field `room` di setiap pesan dan filter query berdasarkan itu.
- **Riwayat lebih dari 200 pesan**: naikkan angka di `.limitToLast(200)` pada `app.js`.
- **Login lebih aman**: pakai Firebase Authentication (Google/email) supaya rules bisa cek `request.auth`.
- **Notifikasi**: tambah Firebase Cloud Messaging kalau butuh push notification.
