# E-Absensi QR - SMP Pesantren Hidayatut Tholibin 🌙

Sistem Absensi berbasis QR Code modern dengan integrasi notifikasi WhatsApp otomatis untuk wali murid.

## ✨ Fitur Utama
- **Scan QR Code**: Cepat dan responsif menggunakan kamera perangkat.
- **Notifikasi WhatsApp**: Otomatis mengirim pesan kehadiran ke nomor orang tua siswa.
- **Admin Dashboard**:
  - Statistik kehadiran realtime (Grafik & Card).
  - Manajemen Data Siswa (Nama, NISN, Kelas).
  - **Generate QR Code & Print ID Card** otomatis.
  - **Import Data via Excel** (Bulk Import).
  - **Export Laporan via Excel**.
- **Keamanan**: Login admin khusus.

## 🛠️ Tech Stack
- **Frontend**: React.js (Vite), TailwindCSS, Framer Motion, Lucide React.
- **Backend**: Node.js, Express.js.
- **Database**: PostgreSQL (via Prisma ORM).
- **WA Automation**: Baileys (Non-Official API).

---

## 🚀 Panduan Instalasi Lokal

### 1. Persiapan Database
Pastikan Anda memiliki PostgreSQL berjalan. Buat database baru bernama `absensi`.

### 2. Konfigurasi Backend
1. Masuk ke folder `backend`:
   ```bash
   cd backend
   ```
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Copy file `.env` dan sesuaikan `DATABASE_URL`:
   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/absensi"
   ```
4. Push skema database:
   ```bash
   npx prisma db push
   ```
5. Jalankan server:
   ```bash
   node server.js
   ```
6. **Scan QR WhatsApp** yang muncul di terminal menggunakan akun WA pengirim (WA Sekolah).

### 3. Konfigurasi Frontend
1. Masuk ke folder `frontend`:
   ```bash
   cd ../frontend
   ```
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Jalankan development server:
   ```bash
   npm run dev
   ```

---

## 🔐 Akun Akses Admin
- **URL**: `http://localhost:5173/admin`
- **Username**: `admin`
- **Password**: `admintholibin`

---

## 📄 Format Import Excel
Untuk mengimport data siswa, gunakan file Excel dengan header kolom sebagai berikut:
| Nama | NISN | Kelas | No_WA |
|------|------|-------|-------|
| Ahmad | 12345 | VIII - B | 62812345678 |

---

## ☁️ Catatan Publikasi (Deployment)

### Frontend (Vercel/Netlify)
Frontend dapat di-deploy dengan mudah ke Vercel. Pastikan `fetch` URL di kode diarahkan ke URL Backend yang sudah live.

### Backend (Railway/Render/VPS)
**Sangat Disarankan**: Gunakan layanan yang mendukung proses **Long-Running** (seperti Railway, Render, atau VPS) untuk backend. 
> **PENTING**: Vercel (Serverless) tidak mendukung Baileys (WhatsApp Bot) dengan stabil karena koneksi WhatsApp membutuhkan proses yang berjalan terus-menerus (persistent connection) dan penyimpanan session di disk.

---
*Dibuat untuk SMP Pesantren Hidayatut Tholibin.*
