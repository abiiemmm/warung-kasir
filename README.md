# Warung Kasir

Aplikasi kasir (POS) berbasis web untuk warung/toko kecil. Dipakai untuk mencatat transaksi penjualan, mengelola stok produk, melacak piutang pelanggan, dan memantau performa penjualan lewat dashboard — semuanya jalan di jaringan lokal via Docker, tanpa perlu langganan SaaS.

## Fitur

| Fitur | Halaman | Keterangan |
|---|---|---|
| Dashboard | `/` | Ringkasan statistik, grafik pendapatan, grafik transaksi, produk terlaris, kategori terlaris, peringatan stok menipis, ringkasan piutang |
| Kasir / POS | `/pos` | Pilih produk, kelola keranjang belanja, hitung kembalian, checkout, cetak/tampilkan struk |
| Manajemen Produk | `/products` | CRUD produk, atur harga & stok, upload gambar produk |
| Manajemen Kategori | `/categories` | CRUD kategori produk |
| Riwayat Transaksi | `/transactions` | Daftar seluruh transaksi yang pernah terjadi |
| Piutang | `/debts` | Kanban board (drag-and-drop) untuk melacak status hutang pelanggan: pending ↔ paid |
| Kalender Pengingat Stok | `/calendar` | Pengingat berbasis tanggal untuk restock produk tertentu |
| Log Aktivitas | `/logs` | Audit trail semua perubahan (create/update/delete/checkout/paid) di seluruh sistem |

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Recharts |
| Backend | Express.js + TypeScript, dijalankan dengan `tsx` |
| Database | SQLite (file-based) via `better-sqlite3` |
| Container | Docker + Docker Compose (frontend & backend jadi 2 service terpisah) |

## Arsitektur

Frontend dan backend adalah dua aplikasi terpisah yang berkomunikasi lewat HTTP/JSON.

```
Frontend (Next.js :3000) ──HTTP/JSON──> Backend (Express :3001) ──> SQLite (warung.db)
```

Alur data:

1. Komponen halaman memanggil fungsi dari `src/lib/api.ts`.
2. `api.ts` melakukan `fetch()` ke backend Express (`/api/...`).
3. Di development, `next.config.ts` me-*rewrite* semua request `/api/*` ke `http://localhost:3001/api/*` (di production/Docker, base URL diatur lewat env var `NEXT_PUBLIC_API_URL`).
4. Backend memproses request lalu membaca/menulis ke SQLite (`server/warung.db`).
5. Response JSON dikembalikan ke frontend, lalu `StoreContext.tsx` (React Context) meng-update state global sehingga semua halaman yang butuh data tersebut ikut ter-update.

## Struktur Folder

```
warung-kasir/
├── server/                    # Backend Express
│   ├── src/
│   │   ├── index.ts           # Entry point Express + setup CORS/middleware
│   │   ├── db.ts              # Koneksi SQLite + schema + seed data awal
│   │   ├── types.ts           # Tipe data (mirror dari frontend)
│   │   └── routes/            # Route handler per resource
│   │       ├── categories.ts
│   │       ├── products.ts
│   │       ├── transactions.ts
│   │       ├── debts.ts
│   │       ├── reminders.ts
│   │       └── logs.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── src/                        # Frontend Next.js
│   ├── app/                    # App Router — satu folder = satu route
│   │   ├── page.tsx            # Dashboard ("/")
│   │   ├── pos/page.tsx        # Kasir / POS
│   │   ├── products/page.tsx   # Manajemen produk
│   │   ├── categories/page.tsx # Manajemen kategori
│   │   ├── transactions/page.tsx
│   │   ├── debts/page.tsx      # Piutang (kanban)
│   │   ├── calendar/page.tsx   # Pengingat stok
│   │   ├── logs/page.tsx       # Log aktivitas
│   │   ├── layout.tsx          # Root layout (Sidebar, font, dst)
│   │   └── globals.css
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── RevenueChart.tsx
│   │   ├── TransactionsChart.tsx
│   │   ├── TopProductsChart.tsx
│   │   └── CategoryChart.tsx
│   ├── context/
│   │   └── StoreContext.tsx    # Global state + data fetching (React Context)
│   └── lib/
│       ├── api.ts              # API client (semua pemanggilan fetch ke backend)
│       ├── types.ts            # Tipe data TypeScript (Category, Product, Transaction, dll)
│       └── utils.ts            # Helper functions
├── public/                     # Aset statis
├── Dockerfile                  # Build image frontend
├── docker-compose.yml          # Orkestrasi service backend + frontend
├── next.config.ts              # Config Next.js (standalone output + API rewrite)
└── PRD.md                      # Dokumentasi produk & skema database lebih detail
```

## Database Schema

Ringkasan tabel (skema lengkap ada di `server/src/db.ts`, dokumentasi kolom lengkap ada di [`PRD.md`](./PRD.md)):

- **categories** — kategori produk (`id`, `name`, `created_at`)
- **products** — data produk: nama, harga, stok, kategori, gambar (base64) (`id`, `name`, `price`, `stock`, `category_id`, `image`, `created_at`)
- **transactions** — riwayat penjualan: item (JSON), total, bayar, kembalian (`id`, `items`, `total`, `payment`, `change`, `created_at`)
- **debts** — piutang pelanggan: nama, deskripsi, jumlah, status pending/paid (`id`, `customer_name`, `description`, `amount`, `status`, `created_at`)
- **reminders** — pengingat restock berbasis tanggal (`id`, `date`, `title`, `product_id`, `notes`, `created_at`)
- **logs** — audit trail semua aksi CRUD & checkout (`id`, `action`, `entity`, `entity_id`, `entity_name`, `details`, `timestamp`)

## API Endpoints

Base URL: `http://localhost:3001/api` (development) / `http://backend:3001/api` (Docker internal).

| Resource | Method & Path |
|---|---|
| Categories | `GET/POST /categories`, `PUT/DELETE /categories/:id` |
| Products | `GET/POST /products`, `PUT/DELETE /products/:id`, `PATCH /products/:id/stock` |
| Transactions | `GET/POST /transactions` |
| Debts | `GET/POST /debts`, `PUT /debts/:id`, `PATCH /debts/:id/status`, `DELETE /debts/:id` |
| Reminders | `GET/POST /reminders`, `PUT/DELETE /reminders/:id` |
| Logs | `GET/POST /logs` |
| Health | `GET /health` |

Detail body request/response tiap endpoint ada di [`PRD.md`](./PRD.md#api-endpoints).

## Cara Menjalankan

### Development (tanpa Docker)

Backend dan frontend dijalankan sebagai dua proses terpisah.

```bash
# Terminal 1 — Backend
cd server
npm install
npm run dev
# → berjalan di http://localhost:3001

# Terminal 2 — Frontend (dari root project)
npm install
npm run dev
# → berjalan di http://localhost:3000
```

Buka [http://localhost:3000](http://localhost:3000) di browser. Request `/api/*` dari frontend otomatis di-*rewrite* ke backend `localhost:3001` saat development.

### Production (Docker)

```bash
docker compose up -d --build
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:3001](http://localhost:3001)

Data SQLite disimpan di Docker volume `warung-data` sehingga persist antar restart container.

### Environment Variables

| Variable | Default | Dipakai di | Keterangan |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `/api` | Frontend | Base URL backend yang dipanggil dari browser |
| `PORT` | `3001` | Backend | Port server Express |
| `DB_PATH` | `./warung.db` | Backend | Lokasi file database SQLite |

## Scripts

**Frontend** (`package.json` root)

| Command | Keterangan |
|---|---|
| `npm run dev` | Jalankan Next.js dev server |
| `npm run build` | Build production (`output: standalone`) |
| `npm run start` | Jalankan hasil build |
| `npm run lint` | Jalankan ESLint |

**Backend** (`server/package.json`)

| Command | Keterangan |
|---|---|
| `npm run dev` | Jalankan Express dengan `tsx watch` (auto-reload) |
| `npm run start` | Jalankan Express dengan `tsx` (tanpa watch) |

## Dokumentasi Lebih Lanjut

Lihat [`PRD.md`](./PRD.md) untuk skema database lengkap per kolom dan detail request/response tiap API endpoint.
