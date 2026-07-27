# Warung Kasir — PRD & Dokumentasi

Aplikasi kasir untuk warung berbasis web dengan backend Express + SQLite, dijalankan dengan Docker.

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 16.2.9, React 19, TypeScript, Tailwind CSS 4, Recharts |
| Backend | Express.js, TypeScript, better-sqlite3 |
| Database | SQLite (file-based) |
| Container | Docker + docker-compose |

---

## Arsitektur

```
Frontend (Next.js :3000) ──HTTP/JSON──> Backend (Express :3001)
                                              │
                                         ┌────▼────┐
                                         │ SQLite  │
                                         │warung.db│
                                         └─────────┘
```

### Alur Data

1. Frontend memanggil fungsi dari `src/lib/api.ts`
2. `api.ts` melakukan `fetch()` ke backend Express
3. Backend memproses request, membaca/menulis SQLite
4. Response JSON dikembalikan ke frontend
5. `StoreContext.tsx` mengupdate state React

---

## Struktur Folder

```
warung-kasir/
├── server/                    # Backend Express
│   ├── src/
│   │   ├── index.ts           # Entry point Express
│   │   ├── db.ts              # Koneksi SQLite + schema + seed
│   │   ├── types.ts           # Tipe data (sama dengan frontend)
│   │   └── routes/            # Route handlers
│   │       ├── categories.ts
│   │       ├── products.ts
│   │       ├── transactions.ts
│   │       ├── debts.ts
│   │       ├── reminders.ts
│   │       └── logs.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── src/                       # Frontend Next.js
│   ├── app/                   # App Router pages
│   │   ├── page.tsx           # Dashboard
│   │   ├── pos/page.tsx       # Kasir / POS
│   │   ├── products/page.tsx  # Manajemen produk
│   │   ├── categories/page.tsx
│   │   ├── transactions/page.tsx
│   │   ├── debts/page.tsx
│   │   ├── calendar/page.tsx
│   │   └── logs/page.tsx
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── RevenueChart.tsx
│   │   ├── TransactionsChart.tsx
│   │   ├── TopProductsChart.tsx
│   │   └── CategoryChart.tsx
│   ├── context/
│   │   └── StoreContext.tsx    # Global state + data fetching
│   └── lib/
│       ├── api.ts             # API client (fetch ke backend)
│       ├── types.ts           # Tipe data TypeScript
│       └── utils.ts           # Helper functions
├── Dockerfile                  # Frontend Docker
├── docker-compose.yml          # Orchestrasi backend + frontend
├── next.config.ts
├── package.json
└── PRD.md
```

---

## Database Schema

### categories
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT PK | Auto-generated |
| name | TEXT | Nama kategori |
| created_at | TEXT | ISO timestamp |

### products
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT PK | Auto-generated |
| name | TEXT | Nama produk |
| price | INTEGER | Harga (dalam Rupiah) |
| stock | INTEGER | Stok |
| category_id | TEXT FK | Referensi ke categories.id |
| image | TEXT? | Base64 data URL gambar |
| created_at | TEXT | ISO timestamp |

### transactions
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT PK | Auto-generated |
| items | TEXT | JSON array of CartItem |
| total | INTEGER | Total harga |
| payment | INTEGER | Jumlah bayar |
| change | INTEGER | Kembalian |
| created_at | TEXT | ISO timestamp |

### debts
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT PK | Auto-generated |
| customer_name | TEXT | Nama pelanggan |
| description | TEXT | Deskripsi hutang |
| amount | INTEGER | Jumlah |
| status | TEXT | "pending" atau "paid" |
| created_at | TEXT | ISO timestamp |

### reminders
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT PK | Auto-generated |
| date | TEXT | Tanggal pengingat (YYYY-MM-DD) |
| title | TEXT | Judul |
| product_id | TEXT? | Referensi ke products.id |
| notes | TEXT | Catatan |
| created_at | TEXT | ISO timestamp |

### logs
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT PK | Auto-generated |
| action | TEXT | "created", "updated", "deleted", "checkout", "paid" |
| entity | TEXT | "product", "category", "transaction", "debt", "reminder" |
| entity_id | TEXT | ID entitas terkait |
| entity_name | TEXT | Nama entitas (untuk display) |
| details | TEXT | Deskripsi detail log |
| timestamp | TEXT | ISO timestamp |

---

## API Endpoints

Base URL: `http://localhost:3001/api` (development) atau `http://backend:3001/api` (Docker)

### Categories
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/categories` | — | `Category[]` |
| POST | `/categories` | `{ name }` | `Category` |
| PUT | `/categories/:id` | `{ name }` | `Category` |
| DELETE | `/categories/:id` | — | `{ success: boolean }` |

### Products
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/products` | — | `Product[]` |
| POST | `/products` | `{ name, price, stock, categoryId, image? }` | `Product` |
| PUT | `/products/:id` | `{ name?, price?, stock?, categoryId?, image? }` | `Product` |
| DELETE | `/products/:id` | — | `{ success: boolean }` |
| PATCH | `/products/:id/stock` | `{ qty }` | `{ stock: number }` |

### Transactions
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/transactions` | — | `Transaction[]` |
| POST | `/transactions` | `{ items, total, payment, change }` | `Transaction` |

### Debts
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/debts` | — | `Debt[]` |
| POST | `/debts` | `{ customerName, description, amount, status? }` | `Debt` |
| PUT | `/debts/:id` | `{ customerName?, description?, amount? }` | `Debt` |
| PATCH | `/debts/:id/status` | `{ status }` | `Debt` |
| DELETE | `/debts/:id` | — | `{ success: boolean }` |

### Reminders
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/reminders` | — | `StockReminder[]` |
| POST | `/reminders` | `{ date, title, productId?, notes? }` | `StockReminder` |
| PUT | `/reminders/:id` | `{ date?, title?, productId?, notes? }` | `StockReminder` |
| DELETE | `/reminders/:id` | — | `{ success: boolean }` |

### Logs
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/logs` | — | `LogEntry[]` |
| POST | `/logs` | `{ action, entity, entityId?, entityName?, details? }` | `LogEntry` |

### Health
| Method | Endpoint | Response |
|---|---|---|
| GET | `/health` | `{ status: "ok" }` |

---

## Cara Menjalankan

### Development (tanpa Docker)

**1. Backend**

```bash
cd server
npm install
npm run dev
# Server berjalan di http://localhost:3001
```

**2. Frontend**

```bash
# Terminal terpisah
npm install
npm run dev
# Frontend berjalan di http://localhost:3000
```

> Pada mode development, `next.config.ts` me-*rewrite* request `/api/*` ke `http://localhost:3001/api/*`.

### Production (Docker)

```bash
docker compose up -d --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
```

---

## Fitur Aplikasi

| Fitur | Lokasi | Keterangan |
|---|---|---|
| Dashboard | `/` | Statistik, grafik revenue, transaksi, stok menipis, piutang |
| Kasir / POS | `/pos` | Pilih produk, keranjang, bayar, cetak struk |
| Produk | `/products` | CRUD produk + upload gambar |
| Kategori | `/categories` | CRUD kategori |
| Riwayat Transaksi | `/transactions` | Daftar transaksi |
| Piutang | `/debts` | Kanban board, drag-drop status |
| Kalender | `/calendar` | Pengingat stok (kalender) |
| Log Aktivitas | `/logs` | Riwayat semua perubahan sistem |

### Environment Variables

| Variable | Default | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `/api` | Base URL backend (untuk frontend) |
| `PORT` | `3001` | Port backend server |
| `DB_PATH` | `./warung.db` | Lokasi file SQLite |
