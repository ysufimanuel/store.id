# Store.id

> **A modern business management platform combining E-Commerce, POS, Inventory, and Finance into a single system.**

**Store.id** adalah platform **ERP Mini / Business Management System** yang dirancang untuk membantu bisnis **entry-level hingga menengah** mengelola operasional toko dari satu tempat.

Platform ini menggabungkan konsep **E-Commerce, Point of Sale (POS), Inventory Management, Logistics, Finance & Accounting, dan Role-Based Access Control** dalam satu aplikasi web.

Tujuan utamanya adalah membuat sistem yang cukup sederhana untuk bisnis kecil, tetapi memiliki fondasi arsitektur yang dapat dikembangkan menuju kebutuhan bisnis yang lebih kompleks.

---

## ✨ Highlights

* 🛒 E-Commerce storefront
* 💳 POS / Cashier
* 📦 Inventory & Logistics Management
* 💰 Finance & Accounting
* 📊 Business Dashboard & Analytics
* 👥 Multi-user & Role-Based Access
* 🔐 Authentication & Row Level Security
* 🧾 Invoice & transaction management
* 🏷️ SKU & barcode management
* 📋 Stock movement & stock opname
* 🏢 Multi-company / multi-branch architecture
* 📱 PWA & offline-first architecture
* 🌙 Dark Mode
* 🔍 Audit Trail
* ⚡ Real-time data with Supabase

---

# 🎯 Project Vision

Store.id dibangun dengan konsep:

```text
                    STORE.ID
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   E-COMMERCE        POS          MANAGEMENT
        │              │              │
        └──────────────┼──────────────┘
                       │
              ┌────────┴────────┐
              │                 │
          INVENTORY          FINANCE
              │                 │
              └────────┬────────┘
                       │
                 BUSINESS DATA
```

Alih-alih menggunakan aplikasi berbeda untuk toko, stok, kasir, dan keuangan, Store.id mencoba menyatukan seluruh alur tersebut dalam satu ekosistem.

Contohnya:

```text
Customer membeli produk
        ↓
POS mencatat transaksi
        ↓
Stock otomatis berkurang
        ↓
Stock Movement tercatat
        ↓
Jurnal transaksi dibuat
        ↓
Finance diperbarui
        ↓
Dashboard menampilkan perubahan
```

Dengan demikian, data operasional tidak perlu dimasukkan berkali-kali ke sistem yang berbeda.

---

# 👥 User & Business Roles

Store.id menggunakan beberapa tingkat akses untuk memisahkan kebutuhan customer dan internal bisnis.

## Customer / User

Pengguna umum dapat menggunakan Store.id seperti platform E-Commerce pada umumnya.

### Access

* Melihat produk
* Melihat detail produk
* Membuat akun
* Membeli produk
* Melihat pesanan
* Chat dengan penjual
* Memberikan rating
* Memberikan review

Customer tidak memiliki akses terhadap data internal bisnis seperti:

* Modal
* Laba
* Keuangan
* Inventory internal
* Master data
* Data supplier

---

# 🏢 Business Account

Akun **Business** mendapatkan akses ke fitur manajemen bisnis berdasarkan role yang diberikan.

## Owner

Owner memiliki akses paling luas.

### Access

* Dashboard bisnis
* Penjualan
* Pembelian
* Inventory
* Supplier
* Customer
* Finance
* Laba Rugi
* Neraca
* Arus Kas
* Master Data
* User Management
* Audit Trail
* Approval

Owner dapat melihat kondisi bisnis secara keseluruhan tanpa harus berpindah ke berbagai sistem.

---

## Finance / Admin

Role Finance/Admin berfokus pada operasional dan pengelolaan data.

### Access

* Input transaksi
* Mengelola data keuangan
* Mengelola customer
* Mengelola supplier
* Mengelola inventory
* Melihat laporan keuangan sesuai permission
* Mengajukan pengeluaran
* Mengikuti approval workflow

### Restrictions

* Tidak dapat menghapus master data tertentu
* Pengajuan dana keluar membutuhkan approval
* Akses data mengikuti permission yang diberikan

---

## Cashier

Role Kasir dirancang agar sederhana dan fokus pada transaksi penjualan.

### Access

* POS
* Membuat transaksi
* Mengelola keranjang
* Diskon
* Pembayaran
* Retur
* Mencetak struk

### Restrictions

Kasir tidak dapat melihat informasi sensitif seperti:

* Harga modal
* Laba
* Laporan keuangan
* Data bisnis sensitif

---

# 🛒 E-Commerce

Halaman utama Store.id berfungsi sebagai storefront yang dapat digunakan customer untuk melihat produk yang tersedia.

### Features

* Product catalog
* Product detail
* Search
* Shopping cart
* Customer account
* Order management
* Seller chat
* Rating & review

Arsitektur E-Commerce dirancang agar dapat terhubung langsung dengan inventory dan sistem transaksi bisnis.

---

# 💳 POS / Point of Sale

POS menjadi pusat transaksi offline maupun operasional toko.

### Planned / Implemented Features

* Fast product search
* Barcode scanning
* Shopping cart
* Quantity adjustment
* Item discount
* Global discount
* Cash payment
* Bank transfer
* Credit / receivable transaction
* Receipt generation
* Sales return
* Automatic inventory deduction

### Transaction Flow

```text
Product
   ↓
Cart
   ↓
Discount
   ↓
Payment
   ↓
Transaction
   ├──→ Sales Record
   ├──→ Stock Movement
   ├──→ Inventory Update
   └──→ Accounting Journal
```

---

# 📦 Inventory & Logistics Management

Store.id menyediakan sistem inventory yang dirancang untuk membantu bisnis melacak pergerakan barang.

### Inventory Features

* Real-time stock
* Stock in
* Stock out
* Stock movement history
* Stock opname
* Damaged / lost stock adjustment
* Minimum stock alert
* SKU management
* Barcode generation
* Product categorization

### Logistics Features

Sistem juga dirancang untuk membantu pencatatan lokasi penyimpanan barang.

Contohnya:

```text
Warehouse A
│
├── Rack A01
│   ├── Product A
│   └── Product B
│
├── Rack A02
│   ├── Product C
│   └── Product D
│
└── Rack A03
    └── Product E
```

Dengan struktur tersebut, barang dapat dilacak berdasarkan lokasi penyimpanan.

---

# 📊 Stock Movement

Setiap perubahan stok dapat dicatat sebagai sebuah movement.

Contoh:

```text
Product: Keyboard Mechanical
SKU: KB-001

Stock Before : 50
Movement     : Sale
Quantity     : -2
Stock After  : 48
```

Sumber movement dapat berasal dari:

* Purchase
* Sales
* Sales Return
* Purchase Return
* Stock Opname
* Damaged Goods
* Manual Adjustment

---

# 💰 Finance & Accounting

Finance merupakan salah satu komponen utama Store.id.

Sistem dirancang agar transaksi operasional dapat terhubung dengan pencatatan keuangan.

## Core Accounting

* Chart of Accounts (COA)
* Custom account structure
* General Ledger
* General Journal
* Adjusting Journal
* Closing Journal
* Accounting period
* Period closing
* Automated financial reports

### Financial Reports

* Profit & Loss
* Balance Sheet
* Cash Flow
* Changes in Equity

---

# 💸 Accounts Payable

Manajemen hutang kepada supplier.

### Features

* Supplier invoice
* Purchase invoice
* Payment schedule
* Due date
* Partial payment
* Full settlement
* Tax deduction
* Payable aging
* Approval workflow

Example:

```text
Staff
  ↓
Submit Payment Request
  ↓
Manager Approval
  ↓
Finance Approval
  ↓
Payment
  ↓
Accounting Journal
```

---

# 💵 Accounts Receivable

Manajemen piutang customer.

### Features

* Customer invoice
* Payment receipt
* Credit sales
* Installment / term payment
* Payment status
* Due date
* Receivable aging
* Collection tracking
* Bad debt management

Status pembayaran:

```text
BELUM LUNAS
     ↓
JATUH TEMPO
     ↓
SEBAGIAN DIBAYAR
     ↓
LUNAS
```

---

# 🏦 Cash & Treasury

Store.id dirancang untuk menyediakan monitoring arus kas bisnis.

### Features

* Cash balance
* Petty cash
* Bank transactions
* Bank reconciliation
* Transfer
* Payment tracking
* Cash flow forecasting

Integrasi bank dan payment provider dapat dikembangkan melalui API pihak ketiga.

---

# 📈 Budgeting & Costing

Untuk bisnis yang membutuhkan kontrol terhadap pengeluaran.

### Features

* Annual budget
* Project budget
* Department budget
* Actual vs Budget
* Variance report
* Cost center
* Profit center
* Cost allocation

---

# 🏷️ Fixed Assets

Manajemen aset tetap bisnis.

### Features

* Asset registry
* Asset acquisition
* Depreciation
* Straight-line depreciation
* Declining-balance depreciation
* Asset disposal
* Asset stock opname

---

# 🇮🇩 Tax Management

Store.id dirancang dengan mempertimbangkan kebutuhan bisnis di Indonesia.

Target pengembangan meliputi:

* PPN
* PPh 21
* PPh 23
* PPh 4(2)
* Tax calculation
* Tax reports
* Tax recap
* E-Faktur integration
* Withholding tax documentation

> Tax-related functionality masih membutuhkan validasi terhadap regulasi dan integrasi resmi sebelum digunakan sebagai sistem perpajakan production-grade.

---

# 📊 Dashboard & Analytics

Dashboard bisnis menyediakan ringkasan kondisi operasional.

### Metrics

* Today's revenue
* Weekly revenue
* Monthly revenue
* Gross profit
* Purchase value
* Current stock
* Low stock alert
* Outstanding receivables
* Outstanding payables

### Product Analytics

* Top-selling products
* Slow-moving products
* Gross profit per product
* Sales vs purchase
* Inventory value

---

# 🧾 Invoice & Document Management

Store.id dirancang untuk menghasilkan dokumen transaksi secara digital.

### Features

* Invoice generation
* PDF invoice
* Sales receipt
* Quotation
* Digital signature support
* Store branding
* Customer information

---

# 🏷️ Barcode & SKU

Untuk mempercepat proses operasional toko.

### Features

* Automatic SKU generation
* Barcode generation
* Barcode scanning
* Price label generation
* Product identification

Barcode dapat digunakan pada proses:

```text
Receive Product
      ↓
Scan Barcode
      ↓
Inventory Update
      ↓
POS
      ↓
Scan Barcode
      ↓
Sales Transaction
```

---

# 📱 Queue & QR Ordering

Store.id juga dirancang untuk mendukung sistem pemesanan berbasis QR.

Customer dapat:

```text
Scan QR
   ↓
Open Ordering Page
   ↓
Select Product
   ↓
Submit Order
   ↓
Receive Queue Number
   ↓
Wait
   ↓
Notification
   ↓
Order Ready
```

Konsep ini dapat digunakan untuk:

* Restaurant
* Cafe
* Food stall
* Retail store
* Pickup counter

---

# 🔐 Security & Access Control

Security menjadi bagian penting karena Store.id menangani data transaksi dan bisnis.

### Authentication

Menggunakan:

* Supabase Auth
* JWT-based authentication
* Session management
* Email verification

### Authorization

Role-based access control digunakan untuk membatasi kemampuan setiap pengguna.

```text
Owner
 ├── Finance
 ├── Admin
 └── Cashier
```

Database-level security menggunakan **Row Level Security (RLS)** untuk membantu memastikan pengguna hanya dapat mengakses data sesuai permission.

---

# 📝 Audit Trail

Aktivitas penting dapat dicatat untuk membantu monitoring dan accountability.

Contoh:

```text
14:00
Admin Yusuf updated Product "Keyboard Mechanical"

14:03
Cashier Budi created Invoice INV-000123

14:10
Owner approved Payment Request #REQ-0012
```

Audit trail membantu bisnis mengetahui:

* Siapa yang melakukan perubahan
* Apa yang diubah
* Kapan perubahan dilakukan
* Data apa yang terdampak

---

# 📡 Real-Time Architecture

Store.id memanfaatkan real-time capabilities untuk kebutuhan seperti:

* Stock updates
* Order status
* Dashboard metrics
* Notifications
* Multi-user operations

Contoh:

```text
Cashier sells Product A
        ↓
Database updated
        ↓
Inventory updated
        ↓
Realtime event
        ↓
Dashboard
        ↓
Stock alert
```

---

# 📱 PWA & Offline-First

Store.id dirancang agar dapat dikembangkan sebagai Progressive Web App.

### Target capabilities

* Installable web application
* Mobile-friendly POS
* Offline transaction queue
* Automatic synchronization
* Barcode scanning through camera
* Web Push notifications
* Haptic feedback

Offline architecture:

```text
             INTERNET
                │
        ┌───────┴───────┐
        │               │
     ONLINE          OFFLINE
        │               │
   Supabase          IndexedDB
        │               │
        └───────┬───────┘
                │
          Sync Queue
                │
             Supabase
```

---

# 🏗️ Architecture

```text
ERP-MINI-POS-FINANCE/
│
├── Frontend
│   ├── Next.js 14
│   ├── App Router
│   ├── Tailwind CSS
│   ├── shadcn/ui
│   ├── Lucide React
│   ├── Sonner
│   └── Framer Motion
│
├── State & Data
│   ├── Zustand
│   ├── TanStack Query
│   └── Dexie.js / IndexedDB
│
├── PWA
│   ├── next-pwa
│   ├── Offline Queue
│   ├── Camera API
│   ├── Web Push
│   └── Haptic Feedback
│
└── Backend
    ├── Supabase
    ├── PostgreSQL
    ├── Supabase Auth
    ├── Row Level Security
    ├── Realtime
    ├── Storage
    └── Edge Functions
```

---

# 🗄️ Database Architecture

Core entities include:

```text
profiles
products
categories
customers
suppliers

sales
sales_items
purchases
purchase_items

stock_movements
warehouses
warehouse_racks

accounts
journal_entries
journal_entry_items

receivables
payables

payments
expenses
fixed_assets

audit_logs
```

Example relationship:

```text
                 PRODUCTS
                    │
        ┌───────────┼───────────┐
        │           │           │
      SALES      PURCHASES   STOCK MOVEMENTS
        │           │           │
        └───────────┼───────────┘
                    │
               ACCOUNTING
                    │
        ┌───────────┼───────────┐
        │           │           │
     JOURNAL      LEDGER    FINANCIAL REPORT
```

---

# 🛠️ Tech Stack

## Frontend

* **Next.js 14**
* **React**
* **TypeScript**
* **Tailwind CSS**
* **shadcn/ui**
* **Lucide React**
* **Sonner**
* **Framer Motion**

## State & Data

* **Zustand**
* **TanStack Query**
* **Dexie.js**
* **IndexedDB**

## Backend

* **Supabase**
* **PostgreSQL**
* **Supabase Auth**
* **Supabase Realtime**
* **Supabase Storage**
* **Supabase Edge Functions**

## Security

* JWT Authentication
* Row Level Security
* Role-Based Access Control
* Audit Trail

## Deployment

* **Vercel**

---

# 📁 Application Routes

Planned application structure:

```text
/
├── Storefront
│
├── /login
│   └── Authentication
│
├── /register
│   ├── User Registration
│   └── Business Registration
│
├── /dashboard
│   ├── Revenue
│   ├── Profit
│   ├── Stock Alert
│   └── Analytics
│
├── /pos
│   ├── Product Catalog
│   ├── Barcode Scanner
│   ├── Cart
│   └── Payment
│
├── /inventory
│   ├── Products
│   ├── Stock Movement
│   ├── Stock Opname
│   └── Warehouse
│
├── /pembelian
│   ├── Purchase
│   ├── Supplier
│   └── Restock
│
├── /keuangan
│   ├── Journal
│   ├── General Ledger
│   ├── Profit & Loss
│   ├── Balance Sheet
│   └── Cash Flow
│
├── /master-data
│   ├── Products
│   ├── Customers
│   ├── Suppliers
│   └── Chart of Accounts
│
└── /settings
    ├── Users
    ├── Roles
    ├── Permissions
    └── Application Settings
```

---

# 🚀 Project Status

Store.id is an **active development project**.

The project is being developed incrementally, starting from the core business workflow and expanding toward a more complete ERP architecture.

### Development priorities

* [x] Authentication
* [x] User / Business account concept
* [x] Email verification handling
* [x] E-Commerce foundation
* [x] Role-based application architecture
* [ ] Complete POS workflow
* [ ] Inventory movement
* [ ] Purchase & supplier management
* [ ] Accounting engine
* [ ] Financial reports
* [ ] Approval workflow
* [ ] Audit trail
* [ ] Barcode system
* [ ] QR ordering
* [ ] Offline POS
* [ ] PWA
* [ ] Advanced taxation
* [ ] Multi-company
* [ ] Multi-branch
* [ ] External payment / banking integrations

> Feature availability may change during development. Some modules represent the planned product architecture rather than production-ready functionality.

---

# 🧠 Engineering Goals

Store.id is not only intended as a CRUD application.

The project is also used to explore practical software engineering concepts such as:

* Modular application architecture
* Role-Based Access Control
* Database normalization
* PostgreSQL relational modeling
* Row Level Security
* Transaction integrity
* Inventory consistency
* Accounting data relationships
* Real-time application architecture
* Offline-first applications
* API integration
* Auditability
* Scalable frontend architecture

A major design principle is to keep **business-critical logic close to the data layer**, rather than relying entirely on client-side calculations.

For example:

```text
Client
  ↓
Application Layer
  ↓
Supabase
  ↓
PostgreSQL
  ↓
RLS / Constraints / Triggers
```

This helps reduce the risk of clients manipulating sensitive business data directly.

---

# 🔒 Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_secret_key
```

**Never commit `.env.local` or secret keys to Git.**

The `SUPABASE_SERVICE_ROLE_KEY` must only be used in trusted server-side environments and must never be exposed to the browser.

---

# ⚙️ Getting Started

### 1. Clone repository

```bash
git clone https://github.com/ysufimanuel/store.id.git
cd store.id
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create:

```text
.env.local
```

and add the required Supabase credentials.

### 4. Run development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### 5. Build for production

```bash
npm run build
```

### 6. Start production server

```bash
npm start
```

---

# 🌐 Deployment

The application is designed for deployment using **Vercel**, with Supabase providing the backend infrastructure.

```text
GitHub
   │
   ↓
Vercel
   │
   ↓
Next.js Application
   │
   ↓
Supabase
   │
   ├── PostgreSQL
   ├── Auth
   ├── Storage
   ├── Realtime
   └── Edge Functions
```

---

# 🔮 Future Development

The long-term vision for Store.id is to evolve from an ERP Mini/POS application into a modular business operating system.

Potential future modules include:

* HR & Payroll
* CRM
* Advanced Procurement
* Warehouse Management
* Multi-company accounting
* Multi-currency
* Advanced tax integration
* Payment gateway integration
* Bank API integration
* WhatsApp notification integration
* Advanced analytics
* AI-assisted business insights
* Mobile application
* Advanced offline synchronization

---

# 📌 Project Purpose

Store.id is built as a portfolio project to demonstrate the design and development of a **real-world business application**, rather than a simple demonstration website.

The project focuses on solving practical problems around:

> **Sales → Inventory → Logistics → Finance → Reporting**

while maintaining a clear separation between customer-facing functionality and internal business operations.

---

## 👨‍💻 Developer

**Yusuf Imanuel Untung**

Computer Science / Software Development enthusiast focused on:

* Frontend Development
* Full-Stack Web Development
* Business Application Development
* Database Design
* UI/UX
* Software Architecture

---

## 📄 License

This project is currently intended for **portfolio and educational purposes**.

Commercial usage and redistribution may be subject to change as the project evolves.
