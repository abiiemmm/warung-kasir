# Warung Kasir

Aplikasi kasir (POS) berbasis web untuk warung/toko kecil. Mencatat transaksi penjualan, mengelola stok produk, melacak piutang pelanggan (termasuk cicilan), dan memantau performa lewat laporan — semua jalan di jaringan lokal via Docker, tanpa langganan SaaS.

## Fitur

| Fitur | Halaman | Keterangan |
|---|---|---|
| Dashboard | `/` | Ringkasan statistik, grafik pendapatan & transaksi, produk/kategori terlaris, stok menipis, piutang |
| Kasir / POS | `/pos` | Pilih produk (termasuk scan barcode), keranjang, **diskon**, **metode bayar (Tunai/QRIS/Transfer)**, kembalian, struk |
| Manajemen Produk | `/products` | CRUD produk, harga & stok, gambar, **barcode**, **restok cepat (+ Stok)** |
| Manajemen Kategori | `/categories` | CRUD kategori (ditolak bila masih dipakai produk) |
| Riwayat Transaksi | `/transactions` | Daftar transaksi dengan **pagination & filter tanggal** |
| Piutang | `/debts` | Kanban (drag-drop) pending ↔ paid, **pembayaran cicilan + riwayat** |
| Pelanggan | `/customers` | Rekap piutang per pelanggan |
| Laporan | `/reports` | Rekap pendapatan per rentang tanggal, per kategori & produk, per metode bayar, **ekspor PDF / Word / CSV** |
| Kalender Pengingat Stok | `/calendar` | Pengingat restock berbasis tanggal |
| Log Aktivitas | `/logs` | Audit trail dengan **pagination & filter** |
| Pengaturan | `/settings` | **Backup database (.db)**, **ekspor JSON**, **restore dari file backup**, dan **reset semua data (danger zone)** |

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Recharts |
| Backend | Express.js + TypeScript (`tsx`), Zod (validasi), Helmet, rate-limit |
| Database | SQLite (`better-sqlite3`, WAL) + migration runner |
| Test | Vitest + Supertest |
| Container | Docker + Docker Compose, CI via GitHub Actions |

## Arsitektur

```
Frontend (Next.js :3000) ──rewrite /api/*──> Backend (Express :3001) ──> SQLite
```

Alur data:

1. Halaman memanggil fungsi dari `src/lib/api.ts`.
2. `api.ts` melakukan `fetch()` ke path `/api/...` (relative). 
3. `next.config.ts` me-*rewrite* semua request `/api/*` ke backend (`INTERNAL_API_URL`, default `http://localhost:3001`) — berlaku di development **dan** production, jadi browser tidak pernah memanggil backend secara langsung.
4. Backend memvalidasi request (Zod), memproses, lalu membaca/menulis SQLite.
5. `StoreContext.tsx` meng-update state global.

## Struktur Folder

```
warung-kasir/
├── server/                    # Backend Express
│   ├── src/
│   │   ├── index.ts           # Bootstrap (seed + listen)
│   │   ├── app.ts             # createApp(): middleware, routes, error handler
│   │   ├── db.ts              # Koneksi SQLite + migration runner
│   │   ├── migrations.ts      # Definisi migrasi skema (001_init, 002_features)
│   │   ├── seed.ts            # Data awal (hanya jika DB kosong)
│   │   ├── validation.ts      # Skema Zod
│   │   ├── utils.ts           # HttpError, pagination, safe JSON parse
│   │   ├── types.ts           # Tipe data
│   │   ├── routes/            # categories, products, transactions, debts,
│   │   │                      # reminders, logs, backup/export, reports
│   │   └── __tests__/         # Vitest + Supertest
│   ├── eslint.config.mjs
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── src/                       # Frontend Next.js
│   ├── app/                   # App Router (/, pos, products, categories,
│   │   │                      # transactions, debts, customers, reports,
│   │   │                      # calendar, logs, settings)
│   ├── components/            # Sidebar, PwaRegister, chart components
│   ├── context/StoreContext.tsx
│   └── lib/                   # api.ts, types.ts, utils.ts
├── public/                    # Aset statis + manifest & service worker PWA
├── .github/workflows/ci.yml   # CI
├── Dockerfile / docker-compose.yml / next.config.ts
└── PRD.md
```

## Database Schema

Skema dikelola lewat **migrations** (`server/src/migrations.ts`), bukan `CREATE TABLE` manual. Tabel:

- **categories** — `id`, `name`, `created_at`
- **products** — `id`, `name`, `price`, `stock`, `category_id`, `image`, `barcode`, `created_at`
- **transactions** — `id`, `items` (JSON), `total`, `payment`, `change`, `payment_method` (cash/qris/transfer), `discount`, `created_at`
- **debts** — `id`, `customer_name`, `description`, `amount`, `status`, `created_at`
- **debt_payments** — `id`, `debt_id`, `amount`, `note`, `created_at` (sisa piutang dihitung dari jumlah pembayaran)
- **reminders** — `id`, `date`, `title`, `product_id`, `notes`, `created_at`
- **logs** — `id`, `action`, `entity`, `entity_id`, `entity_name`, `details`, `timestamp`

## API Endpoints

Base URL: `http://localhost:3001/api`. Semua request divalidasi; error dikembalikan sebagai `{ error, details? }`.

| Resource | Method & Path |
|---|---|
| Categories | `GET/POST /categories`, `PUT/DELETE /categories/:id` |
| Products | `GET/POST /products`, `PUT/DELETE /products/:id`, `PATCH /products/:id/stock` |
| Transactions | `GET/POST /transactions` (GET mendukung `?page&limit&from&to&paymentMethod`) |
| Debts | `GET/POST /debts`, `GET/PUT/DELETE /debts/:id`, `GET /debts/:id/payments`, `POST /debts/:id/payments`, `PATCH /debts/:id/status` |
| Reminders | `GET/POST /reminders`, `PUT/DELETE /reminders/:id` |
| Logs | `GET/POST /logs` (GET mendukung `?page&limit&entity&action&q`) |
| Reports | `GET /reports/summary`, `GET /reports/by-product`, `GET /reports/by-category` (semua menerima `?from&to`) |
| Backup | `GET /backup` (unduh file `.db`), `GET /export` (unduh JSON), `POST /restore` (unggah file `.db`), `POST /reset` (hapus semua data, opsional `{ seed: true }`) |
| Health | `GET /health` |

Detail lengkap ada di [`PRD.md`](./PRD.md#api-endpoints).

## Cara Menjalankan

### Development (tanpa Docker)

```bash
# Terminal 1 — Backend
cd server
npm install
npm run dev            # http://localhost:3001

# Terminal 2 — Frontend (dari root project)
npm install
npm run dev            # http://localhost:3000
```

### Production (Docker)

```bash
docker compose up -d --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
```

Data SQLite tersimpan di volume `warung-data:/app/data` (hanya folder data, bukan seluruh `/app`).

### Environment Variables

| Variable | Default | Dipakai di | Keterangan |
|---|---|---|---|
| `INTERNAL_API_URL` | `http://localhost:3001` | Frontend (server-side) | Target rewrite `/api/*` |
| `CORS_ORIGINS` | `http://localhost:3000` | Backend | Daftar origin yang diizinkan (dipisah koma) |
| `PORT` | `3001` | Backend | Port server Express |
| `DB_PATH` | `./warung.db` | Backend | Lokasi file database SQLite |

## Scripts

**Frontend** (root)

| Command | Keterangan |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev / build standalone / start |
| `npm run lint` | ESLint (root) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run generate:icons` | Regenerasi favicon & ikon PWA dari `public/icon.svg` (membutuhkan `sharp`) |

**Backend** (`server/`)

| Command | Keterangan |
|---|---|
| `npm run dev` / `start` | `tsx watch` / `tsx` |
| `npm run lint` | ESLint (server) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest + Supertest |

## Keamanan

- Validasi input lengkap (Zod) — harga/stok/qty negatif atau non-integer ditolak.
- Checkout **atomik** (transaksi DB): total dihitung server dari harga & stok aktual; stok dipotong dan transaksi dicatat dalam satu transaksi SQLite.
- Header keamanan (Helmet), rate limit pada `/api`, CORS dibatasi.
- Backup & ekspor data tersedia di halaman Pengaturan.
- PWA: aplikasi bisa dibuka offline & menampilkan data terakhir ter-cache; mutasi tetap butuh koneksi online.

## Dokumentasi Lebih Lanjut

Lihat [`PRD.md`](./PRD.md) untuk skema database per kolom dan detail request/response tiap endpoint.
