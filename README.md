# Personal Finance Tracker

Platform manajemen keuangan pribadi untuk mencatat pemasukan bulanan, pengeluaran harian, memantau cash flow secara real-time, serta menyusun laporan keuangan bulanan dan ekspor CSV/PDF.

## Teknologi Utama

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Recharts, Lucide React
- **Database & Autentikasi**: Firebase Firestore & Firebase Authentication (dengan penyimpanan lokal browser saat belum masuk akun)
- **Server**: Node.js (v22+), Express

## Fitur Utama

- **Dashboard Keuangan**: Ringkasan saldo saat ini, pemasukan & pengeluaran bulan berjalan, sisa cash flow, indikator anggaran, grafik perbandingan 6 bulan, breakdown kategori, dan riwayat transaksi terbaru.
- **Daily Expense Tracking**: Pencatatan pengeluaran harian lengkap (tanggal, deskripsi, nominal, 10 kategori, metode pembayaran, catatan), edit/hapus, pencarian, serta filter kategori dan rentang tanggal.
- **Monthly Income Tracking**: Pencatatan pemasukan bulanan (gaji, freelance, bisnis, bonus, pendapatan lainnya) dengan pengelompokan otomatis per bulan.
- **Monthly Financial Report**: Rekap total pemasukan, pengeluaran, tabungan, investasi, sisa saldo kumulatif, perbandingan terhadap bulan sebelumnya, grafik distribusi, serta ekspor **CSV** dan **PDF/Cetak**.

## Prasyarat

- Node.js `>= 22.18`
- Proyek Firebase dengan Firestore & Authentication aktif (`firebase-applet-config.json`)

## Konfigurasi Lokal

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Jalankan server pengembangan (Express + Vite):**

   ```bash
   npm run dev
   ```

   Aplikasi akan berjalan di `http://localhost:3000`.

## Build & Deployment Produksi

```bash
npm run lint
npm run build
NODE_ENV=production npm start
```

## Publish ke GitHub

```bash
git remote add origin https://github.com/<username>/<nama-repo>.git
git push -u origin main
```

> **Catatan:** File `.env` otomatis diabaikan oleh `.gitignore` sehingga variabel sensitif tidak ikut terunggah ke GitHub.
