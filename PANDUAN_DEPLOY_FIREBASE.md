# Panduan Deployment NEO-STACK ke Firebase Hosting dengan GitHub Actions

Karena project ini menggunakan **Socket.io (Backend Node.js)** untuk multiplayer, ada hal penting yang harus dipahami:
**Firebase Hosting hanya menyimpan file Frontend (HTML/CSS/JS).** Server Backend Anda (`server/index.js`) **TIDAK BISA** berjalan di Firebase Hosting standar.

Untuk solusi profesional agar multiplayer tetap jalan, saya menyarankan **Migrasi ke Firebase Realtime Database** (Serverless) nanti. Tapi untuk sekarang, berikut adalah langkah **Deploy Frontend** ke Firebase Hosting dengan Auto-Deploy dari GitHub.

---

## Tahap 1: Setup Awal (Di Komputer Anda)

1.  **Install Firebase CLI** (jika belum ada):
    Buka terminal dan jalankan:
    ```bash
    npm install -g firebase-tools
    ```

2.  **Login ke Firebase**:
    ```bash
    firebase login
    ```
    (Ikuti instruksi di browser untuk login dengan akun Google Anda).

3.  **Inisialisasi Project**:
    Di dalam folder project `c:\game project\tetris-premium`, jalankan:
    ```bash
    firebase init hosting
    ```
    
    Jawab pertanyaan berikut:
    *   **Project**: Pilih "Create a new project" (atau pakai yang sudah ada jika Anda sudah buat di firebase logs).
    *   **Public directory**: Ketik `dist` (karena Vite membuild ke folder dist).
    *   **Configure as a single-page app?**: `Yes`
    *   **Set up automatic builds and deploys with GitHub?**: `Yes` (Ini kuncinya!)

4.  **Login GitHub**:
    Firebase akan meminta izin untuk mengakses GitHub Anda. Izinkan.

5.  **Pilih Repo**:
    Masukkan `evanmaxsalmina/neo-stack`.

6.  **Setup Workflow**:
    *   **Set up the workflow to run a build script before every deploy?**: `Yes`
    *   **What script should be run before every deploy?**: `npm ci && npm run build`
    *   **Set up automatic deployment to your site's live channel when a PR is merged?**: `Yes`
    *   **What is the name of the main branch?**: `main` (atau `master` tergantung repo Anda).

---

## Tahap 2: Push Kode ke GitHub

Saya (AI) sudah melakukan inisialisasi Git lokal. Anda tinggal menjalankan perintah berikut untuk menghubungkan dan mengupload kode:

1.  **Hubungkan ke Remote Repository**:
    ```bash
    git remote add origin https://github.com/evanmaxsalmina/neo-stack.git
    ```
    *(Jika error "remote origin already exists", abaikan saja).*

2.  **Simpan & Upload Kode**:
    ```bash
    git add .
    git commit -m "Initial commit NEO-STACK"
    git branch -M main
    git push -u origin main
    ```

---

## Tahap 3: Apa yang Terjadi Selanjutnya?

Setelah Anda melakukan `git push`, GitHub Actions akan otomatis:
1.  Mendeteksi kode baru.
2.  Menjalankan perintah build (`npm run build`).
3.  Mengirim hasil folder `dist` ke Firebase Hosting.
4.  Website Anda akan live di `https://[PROJECT-ID].web.app`.

---

## PENTING: Masalah Backend (Socket.io)

Seperti disebutkan, **Multiplayer tidak akan jalan** di Firebase Hosting karena server Socket.io backend tidak ikut ter-deploy.

**Solusi:**
1.  **Ubah Codingan ke Firebase Database (Recommended)**: Hapus backend Node.js mapun socket.io, dan gunakan Firebase Realtime Database langsung di frontend. Ini solusi paling "Firebase-native" dan gratis.
2.  **Deploy Backend Terpisah**: Deploy folder `server/` ke layanan lain seperti **Glitch.com**, **Render**, atau **Railway**, lalu update URL di `main.js` frontend untuk mengarah ke sana.

Jika Anda ingin saya mengubah arsitektur game menjadi **Full Firebase (Serverless)** agar multiplayer aman tanpa server terpisah, beri tahu saya!
