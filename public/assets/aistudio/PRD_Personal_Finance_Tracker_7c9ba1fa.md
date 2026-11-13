# Product Requirements Document (PRD)

## Personal Finance Management Website

---

## 1. Product Overview

Buat sebuah website bernama **Personal Finance Tracker**, yaitu platform manajemen keuangan pribadi yang digunakan untuk mencatat, memantau, dan mengevaluasi kondisi keuangan pengguna secara harian maupun bulanan.

Website ini dirancang untuk membantu pengguna mengelola pemasukan, pengeluaran, anggaran, serta mengetahui kondisi keuangan secara transparan melalui dashboard yang sederhana dan mudah dipahami.

Website harus memiliki desain minimalist, modern, intuitif, dan responsive sehingga dapat digunakan melalui desktop, laptop, tablet, maupun smartphone.

---

## 2. Product Objectives

Tujuan utama website:

- Mempermudah pencatatan pengeluaran harian.
- Mempermudah pencatatan pemasukan bulanan.
- Menampilkan kondisi keuangan secara real-time.
- Menghasilkan rekapitulasi pemasukan dan pengeluaran setiap bulan.
- Mengintegrasikan data keuangan dengan Google Sheets.
- Membantu pengguna mengevaluasi kebiasaan dan pola pengeluaran.

---

## 3. Core Features

### A. Dashboard Keuangan

Dashboard menjadi halaman utama yang menampilkan ringkasan kondisi keuangan pengguna.

Informasi yang harus ditampilkan:

- Total saldo saat ini.
- Total pemasukan bulan ini.
- Total pengeluaran bulan ini.
- Sisa uang atau cash flow bulan ini.
- Grafik perbandingan pemasukan dan pengeluaran.
- Riwayat transaksi terbaru.
- Ringkasan pengeluaran berdasarkan kategori.

Gunakan visualisasi grafik yang sederhana dan mudah dibaca.

### B. Daily Expense Tracking

Fitur untuk mencatat setiap pengeluaran harian.

**Data yang dapat dimasukkan:**

- Tanggal transaksi.
- Nama atau deskripsi pengeluaran.
- Nominal pengeluaran.
- Kategori pengeluaran.
- Metode pembayaran.
- Catatan tambahan (opsional).

**Kategori pengeluaran:**

- Makanan dan minuman.
- Transportasi.
- Kebutuhan sehari-hari.
- Pendidikan.
- Hiburan.
- Kesehatan.
- Tagihan.
- Orang tua.
- Tabungan dan investasi.
- Lainnya.

**Functional requirements:**

- Pengguna dapat menambahkan transaksi.
- Pengguna dapat mengedit transaksi.
- Pengguna dapat menghapus transaksi.
- Pengguna dapat mencari dan memfilter transaksi berdasarkan tanggal dan kategori.
- Data transaksi otomatis memperbarui saldo dan rekapitulasi keuangan.

### C. Monthly Income Tracking

Fitur untuk mencatat pemasukan setiap bulan.

**Data yang dapat dimasukkan:**

- Tanggal pemasukan.
- Sumber pemasukan.
- Nominal pemasukan.
- Kategori pemasukan.
- Catatan tambahan.

**Kategori pemasukan:**

- Gaji.
- Freelance.
- Bisnis.
- Bonus.
- Pendapatan lainnya.

**Functional requirements:**

- Pengguna dapat mencatat lebih dari satu pemasukan dalam satu bulan.
- Pengguna dapat mengedit dan menghapus data pemasukan.
- Sistem mengelompokkan pemasukan berdasarkan bulan.
- Total pemasukan otomatis diperbarui pada dashboard.

### D. Monthly Financial Report

Fitur untuk menghasilkan laporan keuangan berdasarkan periode bulanan.

**Informasi yang ditampilkan:**

- Total pemasukan.
- Total pengeluaran.
- Total tabungan.
- Total investasi.
- Sisa saldo.
- Persentase pengeluaran berdasarkan kategori.
- Perbandingan kondisi keuangan dengan bulan sebelumnya.

**Sediakan:**

- Grafik pemasukan dan pengeluaran.
- Diagram distribusi pengeluaran.
- Tabel riwayat transaksi bulanan.
- Filter berdasarkan bulan dan tahun.
- Fitur ekspor laporan keuangan.

### E. Google Sheets Integration

Website harus dapat terhubung dengan Google Sheets sebagai media penyimpanan dan backup data keuangan.

**Kebutuhan integrasi:**

- Menggunakan Google Sheets API.
- Pengguna dapat menghubungkan akun Google.
- Data pemasukan dan pengeluaran otomatis tersimpan ke Google Sheets.
- Perubahan data dari website dapat diperbarui ke Google Sheets.
- Sediakan struktur spreadsheet yang terorganisasi.

**Struktur Google Sheets yang disarankan:**

#### 1. Sheet: Income

| Kolom |
|-------|
| ID |
| Date |
| Source |
| Category |
| Amount |
| Notes |

#### 2. Sheet: Expenses

| Kolom |
|-------|
| ID |
| Date |
| Description |
| Category |
| Payment Method |
| Amount |
| Notes |

#### 3. Sheet: Monthly Summary

| Kolom |
|-------|
| Month |
| Year |
| Total Income |
| Total Expense |
| Total Savings |
| Total Investment |
| Remaining Balance |

> Pastikan integrasi menggunakan autentikasi dan mekanisme keamanan yang sesuai. **Jangan menyimpan API key atau credential sensitif di sisi frontend.**

---

## 4. User Interface & Design Requirements

Gunakan konsep desain **Minimalist Financial Dashboard**.

**Design direction:**

- Clean dan modern.
- Minimalist layout.
- Banyak menggunakan whitespace.
- Navigasi sederhana.
- Tipografi yang jelas.
- Komponen dengan sudut sedikit rounded.
- Hindari terlalu banyak warna dan elemen dekoratif.

**Color palette:**

| Peran | Warna |
|-------|-------|
| Background | Off-white atau light gray |
| Primary | Dark navy atau charcoal |
| Accent | Soft green |
| Income indicator | Green |
| Expense indicator | Soft red |
| Neutral information | Gray |

**Typography:**

Gunakan font modern seperti Inter, Geist, atau Plus Jakarta Sans.

---

## 5. Responsive Design

Website harus menerapkan responsive design dan menyesuaikan layout secara otomatis dengan ukuran layar perangkat.

**Ketentuan:**

- **Desktop:** Dashboard menggunakan multi-column layout dan sidebar navigation.
- **Tablet:** Layout menyesuaikan lebar layar dengan navigasi yang lebih compact.
- **Mobile:** Gunakan single-column layout dan navigasi yang nyaman digunakan melalui sentuhan.
- Tabel transaksi harus dapat ditampilkan dalam format mobile-friendly.
- Grafik harus menyesuaikan ukuran layar.
- Form input harus mudah digunakan melalui smartphone.

Pastikan tidak ada horizontal overflow, elemen terpotong, atau komponen yang sulit diakses pada perangkat tertentu.

---

## 6. Navigation Structure

Buat struktur navigasi berikut:

1. Dashboard
2. Transactions
   - Expenses
   - Income
3. Monthly Reports
4. Google Sheets Integration
5. Settings

---

## 7. Technical Requirements

Gunakan arsitektur website modern dengan ketentuan:

| Komponen | Teknologi |
|----------|-----------|
| Frontend | React / Next.js |
| Styling | Tailwind CSS |
| Backend | API atau server-side functions |
| Database | PostgreSQL atau database yang sesuai |
| Integration | Google Sheets API |
| Charts | Recharts atau library visualisasi sejenis |
| Authentication | Google OAuth atau sistem autentikasi yang aman |

Pastikan sistem memiliki struktur kode modular, mudah dikembangkan, dan mudah dipelihara.

---

## 8. Data Management & Business Logic

Terapkan aturan perhitungan berikut:

- **Total Income** = Jumlah seluruh pemasukan dalam periode yang dipilih.
- **Total Expense** = Jumlah seluruh pengeluaran dalam periode yang dipilih.
- **Net Cash Flow** = Total Income − Total Expense.
- **Remaining Balance** = Saldo awal + Total Income − Total Expense.

Gunakan ID unik untuk setiap transaksi agar proses edit, hapus, dan sinkronisasi tidak menyebabkan duplikasi data.

Semua perhitungan harus menggunakan data transaksi aktual, bukan data dummy.

---

## 9. Security & Reliability

- Sediakan autentikasi pengguna.
- Pastikan setiap pengguna hanya dapat mengakses data keuangannya sendiri.
- Lindungi credential Google API.
- Terapkan validasi pada seluruh input nominal dan tanggal.
- Hindari duplikasi transaksi ketika sinkronisasi berlangsung.
- Berikan indikator status sinkronisasi Google Sheets.
- Sediakan penanganan error jika koneksi Google Sheets terputus.

---

## 10. Expected Deliverables

Hasil pengembangan harus mencakup:

1. Website Personal Finance Tracker yang berfungsi.
2. Dashboard keuangan interaktif.
3. Form pencatatan pemasukan dan pengeluaran.
4. Sistem rekapitulasi bulanan.
5. Integrasi Google Sheets.
6. Responsive interface untuk seluruh perangkat.
7. Sistem autentikasi dan pengelolaan data.
8. Dokumentasi konfigurasi dan deployment.

---

## 11. Development Priorities

Prioritaskan pengembangan secara bertahap:

### Phase 1 — Core Financial System

- Dashboard.
- Pencatatan pemasukan.
- Pencatatan pengeluaran.
- Perhitungan saldo otomatis.

### Phase 2 — Financial Analytics

- Rekapitulasi bulanan.
- Grafik keuangan.
- Filter dan pencarian transaksi.

### Phase 3 — Google Sheets Integration

- Google authentication.
- Sinkronisasi data.
- Backup dan pengelolaan spreadsheet.

### Phase 4 — Optimization

- Responsive design.
- Performance optimization.
- Security testing.
- Deployment.

---

> Pastikan setiap fitur dapat digunakan secara fungsional, bukan hanya berupa tampilan visual atau prototype.
