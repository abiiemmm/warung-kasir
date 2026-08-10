# Warung Kasir — PRD & Dokumentasi

Aplikasi kasir untuk warung berbasis web dengan backend Express + SQLite, dijalankan dengan Docker.

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 16.3, React 19, TypeScript, Tailwind CSS 4, Recharts |
| Backend | Express.js, TypeScript, Zod, Helmet, express-rate-limit |
| Database | SQLite (file-based, WAL) dengan migration runner |
| Test | Vitest + Supertest |
| Container | Docker + docker-compose, CI GitHub Actions |

---

## Arsitektur

```
Frontend (Next.js :3000) ─rewrite /api/*─> Backend (Express :3001) ─> SQLite (warung.db)
```

### Alur Data

1. Frontend memanggil fungsi dari `src/lib/api.ts`
2. `api.ts` melakukan `fetch()` ke path relative `/api/*`
3. `next.config.ts` me-*rewrite* `/api/*` ke `INTERNAL_API_URL` (default `http://localhost:3001`) di semua env — browser tidak pernah memanggil backend langsung
4. Backend memvalidasi body (Zod), memproses, membaca/menulis SQLite
5. `StoreContext.tsx` mengupdate state React

---

## Struktur Folder

```
warung-kasir/
├── server/                    # Backend Express
│   ├── src/
│   │   ├── index.ts           # Bootstrap (seed + listen)
│   │   ├── app.ts             # createApp(): middleware, routes, error handler
│   │   ├── db.ts              # Koneksi SQLite + migration runner
│   │   ├── migrations.ts      # Skema (001_init, 002_features)
│   │   ├── seed.ts            # Data awal (jika DB kosong)
│   │   ├── validation.ts      # Skema Zod per resource
│   │   ├── utils.ts           # HttpError, pagination, safeJsonParse
│   │   ├── types.ts           # Tipe data
│   │   ├── routes/            # categories, products, transactions, debts,
│   │   │                      # reminders, logs, backup/export, reports
│   │   └── __tests__/         # api.test.ts (Vitest + Supertest)
│   ├── eslint.config.mjs
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── src/                       # Frontend Next.js
│   ├── app/                   # App Router
│   │   ├── page.tsx           # Dashboard
│   │   ├── pos/page.tsx       # Kasir / POS
│   │   ├── products/page.tsx  # Manajemen produk
│   │   ├── categories/page.tsx
│   │   ├── transactions/page.tsx  # Riwayat (paginated)
│   │   ├── debts/page.tsx     # Piutang (kanban + cicilan)
│   │   ├── customers/page.tsx # Pelanggan
│   │   ├── reports/page.tsx   # Laporan
│   │   ├── calendar/page.tsx
│   │   ├── logs/page.tsx      # Log (paginated)
│   │   ├── settings/page.tsx  # Backup & ekspor
│   │   └── layout.tsx
│   ├── components/            # Sidebar, PwaRegister, chart components
│   ├── context/StoreContext.tsx
│   └── lib/                   # api.ts, types.ts, utils.ts
├── public/                    # Aset statis, manifest & sw.js (PWA)
├── .github/workflows/ci.yml
├── Dockerfile / docker-compose.yml
├── next.config.ts
└── PRD.md
```

---

## Database Schema

Skema dikelola melalui **migrations** (`server/src/migrations.ts`) dan didaftarkan di tabel `migrations`. Migration `002_features` menambahkan kolom baru ke database lama secara otomatis (`ALTER TABLE`).

### categories
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT PK | `crypto.randomUUID()` |
| name | TEXT | Nama kategori |
| created_at | TEXT | ISO timestamp |

### products
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT PK | Auto-generated |
| name | TEXT | Nama produk |
| price | INTEGER | Harga (Rupiah) |
| stock | INTEGER | Stok |
| category_id | TEXT FK | Referensi categories.id |
| image | TEXT? | Base64 data URL |
| barcode | TEXT? | Barcode/EAN untuk scan di POS |
| created_at | TEXT | ISO timestamp |

### transactions
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT PK | Auto-generated |
| items | TEXT | JSON array of CartItem (disimpan snapshot) |
| total | INTEGER | Total setelah diskon |
| payment | INTEGER | Jumlah bayar |
| change | INTEGER | Kembalian |
| payment_method | TEXT | `cash` / `qris` / `transfer` |
| discount | INTEGER | Potongan harga (Rp), default 0 |
| created_at | TEXT | ISO timestamp |

### debts
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT PK | Auto-generated |
| customer_name | TEXT | Nama pelanggan |
| description | TEXT | Deskripsi |
| amount | INTEGER | Jumlah total piutang |
| status | TEXT | `pending` / `paid` (dihitung dinamis dari sisa) |
| created_at | TEXT | ISO timestamp |

### debt_payments
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT PK | Auto-generated |
| debt_id | TEXT FK | Referensi debts.id (ON DELETE CASCADE) |
| amount | INTEGER | Nominal pembayaran (bisa parsial) |
| note | TEXT | Catatan (opsional) |
| created_at | TEXT | ISO timestamp |

Sisa piutang = `amount - SUM(debt_payments.amount)`. Status otomatis `paid` saat sisa ≤ 0.

### reminders
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT PK | Auto-generated |
| date | TEXT | YYYY-MM-DD |
| title | TEXT | Judul |
| product_id | TEXT? | Referensi products.id |
| notes | TEXT | Catatan |
| created_at | TEXT | ISO timestamp |

### logs
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT PK | Auto-generated |
| action | TEXT | `created`/`updated`/`deleted`/`checkout`/`paid` |
| entity | TEXT | `product`/`category`/`transaction`/`debt`/`reminder` |
| entity_id | TEXT | ID entitas |
| entity_name | TEXT | Nama entitas |
| details | TEXT | Deskripsi |
| timestamp | TEXT | ISO timestamp |

---

## API Endpoints

Base URL: `http://localhost:3001/api`. Semua body divalidasi dengan Zod. Error: `{ error: string, details?: [...] }`. HTTP status: 400 (validasi), 404 (tidak ditemukan), 500 (internal).

### Categories
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/categories` | — | `Category[]` |
| POST | `/categories` | `{ name }` | `Category` |
| PUT | `/categories/:id` | `{ name }` | `Category` |
| DELETE | `/categories/:id` | — | `{ success }` (400 bila masih dipakai produk) |

### Products
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/products` | — (support `?search&categoryId`) | `Product[]` |
| POST | `/products` | `{ name, price, stock, categoryId, image?, barcode? }` | `Product` |
| PUT | `/products/:id` | partial fields | `Product` |
| DELETE | `/products/:id` | — | `{ success }` |
| PATCH | `/products/:id/stock` | `{ qty }` (delta, qty ≠ 0) | `{ stock }` |

### Transactions
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/transactions` | — (`?page&limit&from&to&paymentMethod`; tanpa param page → array penuh) | `Transaction[]` atau `Paginated` |
| POST | `/transactions` | `{ items: [{productId, qty}], payment, paymentMethod?, discount? }` | `Transaction` |

POST bersifat **atomik**: server menghitung total dari harga & stok DB dalam satu transaksi SQLite; menolak produk tidak ada, stok kurang, atau pembayaran kurang. Items pada respons adalah snapshot (nama/harga/gambar saat transaksi).

### Debts
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/debts` | — | `Debt[]` (termasuk `remaining`) |
| GET | `/debts/:id` | — | `Debt` |
| POST | `/debts` | `{ customerName, description?, amount, status? }` | `Debt` |
| PUT | `/debts/:id` | partial fields | `Debt` |
| DELETE | `/debts/:id` | — | `{ success }` |
| PATCH | `/debts/:id/status` | `{ status }` | `Debt` |
| GET | `/debts/:id/payments` | — | `DebtPayment[]` |
| POST | `/debts/:id/payments` | `{ amount, note? }` | `Debt` |

### Reminders
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/reminders` | — | `StockReminder[]` |
| POST | `/reminders` | `{ date, title, productId?, notes? }` | `StockReminder` |
| PUT | `/reminders/:id` | partial fields | `StockReminder` |
| DELETE | `/reminders/:id` | — | `{ success }` |

### Logs
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/logs` | — (`?page&limit&entity&action&q`; tanpa param page → array penuh) | `LogEntry[]` atau `Paginated` |
| POST | `/logs` | `{ action, entity, entityId?, entityName?, details? }` | `LogEntry` |

### Reports
| Method | Endpoint | Query | Response |
|---|---|---|---|
| GET | `/reports/summary` | `?from&to` (YYYY-MM-DD) | `{ count, totalRevenue, totalDiscount, itemCount, avgPerTx, byMethod, daily }` |
| GET | `/reports/by-product` | `?from&to` | `{ data: [{ productId, name, qty, revenue }] }` |
| GET | `/reports/by-category` | `?from&to` | `{ data: [{ categoryId, name, qty, revenue }] }` |

### Backup & Export
| Method | Endpoint | Response |
|---|---|---|
| GET | `/backup` | Unduh snapshot database `.db` (via SQLite online backup) |
| GET | `/export` | Unduh semua tabel sebagai JSON |
| POST | `/restore` | Unggah file `.db` (raw body) untuk mengganti database. Validasi `integrity_check`, lalu close→replace→reopen + jalankan migrasi. |
| POST | `/reset` | `{ seed?: boolean }` — hapus permanen semua data (produk, kategori, transaksi, piutang, pembayaran, pengingat, log). Bila `seed: true`, isi ulang data contoh. |

### Health
| Method | Endpoint | Response |
|---|---|---|
| GET | `/health` | `{ status: "ok" }` |

---

## Keamanan & Integritas

- **Validasi Zod** di semua route (tipe, range, enum, menolak NaN/negatif/non-integer).
- **Checkout atomik** via `db.transaction()` — stok & transaksi konsisten; rollback otomatis jika gagal.
- **Helmet** (security headers), **rate-limit** 300 req/15 menit per IP pada `/api`, **CORS** dibatasi `CORS_ORIGINS`.
- **Error handler** terpusat: 404, ZodError (400), HttpError, 500 (tanpa bocor detail).
- **`JSON.parse` aman** untuk kolom items (fallback `[]`).
- Backup manual tersedia; PWA menyediakan shell offline (mutasi butuh online).

---

## Cara Menjalankan

### Development (tanpa Docker)

```bash
cd server && npm install && npm run dev   # :3001
npm install && npm run dev                # :3000 (root)
```

### Production (Docker)

```bash
docker compose up -d --build
```

`next.config.ts` selalu me-rewrite `/api/*` ke backend (env `INTERNAL_API_URL`), jadi tidak ada `NEXT_PUBLIC_API_URL` yang di-bake ke browser. DB tersimpan di volume `warung-data:/app/data`.

### Environment Variables

| Variable | Default | Keterangan |
|---|---|---|
| `INTERNAL_API_URL` | `http://localhost:3001` | Target rewrite API (server-side) |
| `CORS_ORIGINS` | `http://localhost:3000` | Origin yang diizinkan, dipisah koma |
| `PORT` | `3001` | Port backend |
| `DB_PATH` | `./warung.db` | Lokasi file SQLite |

---

## Fitur Aplikasi

| Fitur | Lokasi | Keterangan |
|---|---|---|
| Dashboard | `/` | Statistik, grafik, stok menipis, piutang, pengingat hari ini |
| Kasir / POS | `/pos` | Produk + scan barcode, keranjang, diskon, metode bayar, struk |
| Produk | `/products` | CRUD + gambar + barcode + restok cepat |
| Kategori | `/categories` | CRUD |
| Riwayat Transaksi | `/transactions` | Pagination + filter tanggal + detail + cetak |
| Piutang | `/debts` | Kanban, cicilan (pembayaran parsial), riwayat bayar |
| Pelanggan | `/customers` | Rekap per pelanggan |
| Laporan | `/reports` | Rekap tanggal, per kategori/produk/metode, ekspor CSV |
| Kalender | `/calendar` | Pengingat stok |
| Log Aktivitas | `/logs` | Pagination + filter |
| Pengaturan | `/settings` | Backup .db, ekspor JSON, restore, reset semua data (danger zone) |

---

## Testing & CI

- `server`: `npm test` (Vitest + Supertest) — 32 kasus: validasi, checkout atomik + rollback, pagination, cicilan piutang, reports, backup/export/restore, reset, 404.
- `server`: `npm run lint`, `npm run typecheck`.
- Root: `npm run lint`, `npm run typecheck`, `npm run build`.
- `.github/workflows/ci.yml` menjalankan semua hal di atas pada push/PR.
