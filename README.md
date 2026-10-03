# ERP Mini — POS + Finance + Logistik + E-Commerce

Aplikasi bisnis all-in-one untuk UMKM (entry level sampai menengah): toko online, kasir (POS), manajemen stok/logistik, dan pembukuan keuangan otomatis.

## Fitur

### Etalase (Publik — tanpa login)
- Lihat semua barang yang dijual, cari produk
- Detail produk, rating & ulasan, chat penjual

### Akun 2 Tipe
- **User** — belanja, checkout, lacak pesanan, chat penjual, kasih rating
- **Bisnis** — semua fitur (POS, stok, pembelian, keuangan, pengaturan)

### Role Bisnis
| Role | Akses |
|---|---|
| **Owner** | Semua, termasuk Laba Rugi & hapus master data |
| **Admin/Finance** | Keuangan & input data, tidak bisa hapus master data |
| **Kasir** | Hanya jualan (POS), tidak bisa lihat HPP & laba |

### Toko / POS
- Kasir cepat: cari ketik / scan barcode (Enter), keranjang, diskon per item + global
- 3 metode bayar: Cash, Transfer, Piutang (Tempo) — tempo otomatis masuk daftar piutang & bisa dicicil
- Struk auto-print, stok auto-terpotong, jurnal auto-terbuat
- Pesanan online: alur Menunggu → Diproses (stok terpotong) → Siap → Selesai / Batal (stok kembali)

### Logistik / Stok
- Kartu stok: riwayat keluar-masuk per barang
- Stok opname dengan jurnal penyesuaian otomatis
- Penamaan rak (misal A-01-03) untuk pelacakan
- Alert stok menipis di dashboard & halaman stok
- Tidak bisa jual melebihi stok (validasi di database)

### Finance
- Chart of Accounts (COA) custom + bawaan
- Jurnal otomatis dari penjualan, pembelian, opname, pelunasan
- Jurnal umum / penyesuaian manual (harus balance)
- Buku besar per akun dengan saldo berjalan
- Laporan Laba Rugi otomatis
- Hutang supplier (pembelian tempo) + cicilan
- Audit trail: siapa melakukan apa, kapan

### Dashboard Bos
- Omset hari ini / minggu ini / bulan ini
- Grafik penjualan vs pembelian 14 hari
- Top 5 barang terlaris & barang mati
- Laba kotor, nilai aset stok, alert stok menipis

## Setup

### 1. Supabase
1. Buat project di [supabase.com](https://supabase.com) (gratis)
2. Buka **SQL Editor** → paste seluruh isi `supabase/schema.sql` → **Run**
3. Buka **Project Settings → API**, salin:
   - Project URL
   - Publishable key (`sb_publishable_...`)
   - Secret key (`sb_secret_...`) — hanya untuk server, jangan dibagikan
4. Aktifkan Realtime untuk tabel `messages` dan `sales` (Database → Replication) supaya chat & pesanan masuk real-time

### 2. Environment
Salin `.env.example` menjadi `.env.local` dan isi:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

### 3. Jalankan lokal
```bash
npm install
npm run dev
# buka http://localhost:3000
```

### 4. Deploy ke Vercel
1. Push repo ini ke GitHub/GitLab
2. Import di [vercel.com](https://vercel.com) → framework Next.js terdeteksi otomatis
3. Isi 3 environment variable di atas di **Project Settings → Environment Variables**
4. Deploy

### 5. Docker (opsional)
```bash
docker build -t erp-mini .
docker run -p 3000:3000 --env-file .env.local erp-mini
```

## Cara Pakai Cepat
1. Register akun **Bisnis** → toko + COA default otomatis dibuat, kamu jadi Owner
2. Buka **Pengaturan → Tambah Staff** untuk membuat akun Admin/Kasir
3. Tambah produk di menu **Produk** (SKU & stok awal)
4. Jualan di **Kasir/POS** — stok, jurnal, dan laporan ter-update otomatis
5. Produk aktif otomatis tampil di etalase publik untuk dibeli user
6. Restock lewat **Pembelian** — HPP rata-rata (moving average) dihitung otomatis
7. Lihat **Laba Rugi** & **Buku Besar** di menu Keuangan

## Struktur Kode
```
src/
├── app/
│   ├── page.tsx              # Etalase publik
│   ├── produk/[id]/          # Detail produk + rating
│   ├── keranjang/            # Cart & checkout
│   ├── pesanan-saya/         # Lacak pesanan (pembeli)
│   ├── chat/                 # Chat pembeli ↔ toko (realtime)
│   ├── login/ register/      # Auth (pilih User / Bisnis)
│   ├── (bisnis)/             # Area bisnis (sidebar + role guard)
│   │   ├── dashboard/        # Metrik, grafik, top produk
│   │   ├── pos/              # Kasir
│   │   ├── pesanan/          # Proses pesanan online
│   │   ├── produk/           # CRUD produk & kategori
│   │   ├── stok/             # Kartu stok, opname, rak
│   │   ├── pembelian/        # PO supplier, hutang, moving avg HPP
│   │   ├── penjualan/        # Riwayat & cicilan piutang
│   │   ├── keuangan/         # Laba rugi, jurnal, buku besar, COA
│   │   └── pengaturan/       # User/role, info toko, audit trail
│   └── api/staff/            # Pembuatan akun staff (service role)
supabase/
└── schema.sql                # Tabel, RLS, trigger, RPC transaksional, view
```

## Catatan Keamanan
- Semua tabel dilindungi **Row Level Security** — data tiap toko terisolasi
- Transaksi (sale/purchase/opname) dieksekusi sebagai **RPC security definer** yang atomik: stok, kartu stok, dan jurnal tidak bisa setengah jadi
- Kasir secara database tidak bisa membaca COA/jurnal (RLS), dan HPP disembunyikan di UI
- Secret key hanya dipakai di route handler server (`/api/staff`), tidak pernah sampai ke browser

## Roadmap (belum di versi ini)
- PWA offline-first (Dexie sync queue), barcode scanner kamera
- QR antrian + notifikasi push pesanan siap
- Pajak (PPN/PPh), e-Faktur, rekonsiliasi bank otomatis
- Budgeting, fixed asset & penyusutan, multi-cabang/multi-mata uang
- Export Excel/PDF, invoice PDF + email, reminder WA (Fonnte)
