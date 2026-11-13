# Personal Finance Tracker

Platform manajemen keuangan pribadi untuk mencatat pemasukan bulanan, pengeluaran harian, memantau cash flow secara real-time, menyusun laporan keuangan bulanan, serta melakukan sinkronisasi dan backup ke Google Sheets.

## Teknologi Utama

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Recharts, Lucide React
- **Backend**: Node.js (v22+), Express, Firebase Admin SDK
- **Database**: PostgreSQL dengan Drizzle ORM
- **Autentikasi & Integrasi**: Firebase Authentication (Google Sign-In) & Google Sheets API v4

## Fitur Utama

- **Dashboard Keuangan**: Ringkasan saldo saat ini, pemasukan & pengeluaran bulan berjalan, sisa cash flow, indikator anggaran, grafik perbandingan 6 bulan, breakdown kategori, dan riwayat transaksi terbaru.
- **Daily Expense Tracking**: Pencatatan pengeluaran harian lengkap (tanggal, deskripsi, nominal, 10 kategori, metode pembayaran, catatan), edit/hapus, pencarian, serta filter kategori dan rentang tanggal.
- **Monthly Income Tracking**: Pencatatan pemasukan bulanan (gaji, freelance, bisnis, bonus, pendapatan lainnya) dengan pengelompokan otomatis per bulan.
- **Monthly Financial Report**: Rekap total pemasukan, pengeluaran, tabungan, investasi, sisa saldo kumulatif, perbandingan terhadap bulan sebelumnya, grafik distribusi, serta ekspor **CSV** dan **PDF/Cetak**.
- **Google Sheets Integration**: Buat spreadsheet baru otomatis atau hubungkan spreadsheet yang sudah ada dengan struktur 3 tab (`Income`, `Expenses`, `Monthly Summary`) menggunakan ID unik untuk mencegah duplikasi.

## Prasyarat

- Node.js `>= 22.18`
- PostgreSQL database (lokal atau Cloud SQL)
- Project Firebase dengan Google Sign-In aktif & Google Sheets API diaktifkan di Google Cloud Console

## Konfigurasi Lokal

1. **Salin file environment variables:**

   ```bash
   cp .env.example .env
   ```

   Isi variabel `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`, `SQL_ADMIN_USER`, dan `SQL_ADMIN_PASSWORD` sesuai database PostgreSQL Anda.

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Terapkan skema database ke PostgreSQL:**

   ```bash
   npm run db:push
   ```

4. **Jalankan server pengembangan (Express + Vite):**

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

Jika repositori lokal belum terhubung ke GitHub, jalankan perintah berikut dari root folder proyek:

```bash
git branch -M main
git remote add origin https://github.com/<username>/<nama-repo>.git
git push -u origin main
```

> **Catatan Keamanan:** File `.env` otomatis diabaikan oleh `.gitignore` sehingga kredensial database Anda tidak ikut terunggah ke GitHub.
