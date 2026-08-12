import type { Database } from "better-sqlite3"

export interface Migration {
  id: string
  up: (db: Database) => void
}

export const migrations: Migration[] = [
  {
    id: "001_init",
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          price INTEGER NOT NULL,
          stock INTEGER NOT NULL,
          category_id TEXT NOT NULL REFERENCES categories(id),
          image TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          items TEXT NOT NULL,
          total INTEGER NOT NULL,
          payment INTEGER NOT NULL,
          change INTEGER NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS debts (
          id TEXT PRIMARY KEY,
          customer_name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          amount INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS reminders (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          title TEXT NOT NULL,
          product_id TEXT,
          notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS logs (
          id TEXT PRIMARY KEY,
          action TEXT NOT NULL,
          entity TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          entity_name TEXT NOT NULL,
          details TEXT NOT NULL,
          timestamp TEXT NOT NULL
        );
      `)
    },
  },
  {
    id: "002_features",
    up(db) {
      db.exec(`
        ALTER TABLE products ADD COLUMN barcode TEXT;
        ALTER TABLE transactions ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash';
        ALTER TABLE transactions ADD COLUMN discount INTEGER NOT NULL DEFAULT 0;

        CREATE TABLE IF NOT EXISTS debt_payments (
          id TEXT PRIMARY KEY,
          debt_id TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
          amount INTEGER NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
        CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      `)
    },
  },
  {
    id: "003_auth",
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          pin_hash TEXT NOT NULL,
          pin_salt TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'cashier',
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
          token_hash TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
      `)

      // Log mencatat siapa pelakunya; kolom lama diisi string kosong.
      db.exec(`
        ALTER TABLE logs ADD COLUMN user_id TEXT NOT NULL DEFAULT '';
        ALTER TABLE logs ADD COLUMN user_name TEXT NOT NULL DEFAULT '';
      `)
    },
  },
  {
    id: "004_shifts_cost_void",
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS shifts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          user_name TEXT NOT NULL,
          opening_cash INTEGER NOT NULL,
          closing_cash INTEGER,
          expected_cash INTEGER,
          difference INTEGER,
          note TEXT NOT NULL DEFAULT '',
          opened_at TEXT NOT NULL,
          closed_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_shifts_user_open ON shifts(user_id, closed_at);

        CREATE TABLE IF NOT EXISTS stock_adjustments (
          id TEXT PRIMARY KEY,
          product_id TEXT NOT NULL,
          product_name TEXT NOT NULL,
          type TEXT NOT NULL,
          qty_before INTEGER NOT NULL,
          qty_after INTEGER NOT NULL,
          delta INTEGER NOT NULL,
          reason TEXT NOT NULL DEFAULT '',
          user_id TEXT NOT NULL DEFAULT '',
          user_name TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_stock_adj_product ON stock_adjustments(product_id);
        CREATE INDEX IF NOT EXISTS idx_stock_adj_created ON stock_adjustments(created_at);
      `)

      db.exec(`
        ALTER TABLE products ADD COLUMN cost_price INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE products ADD COLUMN min_stock INTEGER NOT NULL DEFAULT 0;

        ALTER TABLE transactions ADD COLUMN user_id TEXT NOT NULL DEFAULT '';
        ALTER TABLE transactions ADD COLUMN user_name TEXT NOT NULL DEFAULT '';
        ALTER TABLE transactions ADD COLUMN shift_id TEXT;
        ALTER TABLE transactions ADD COLUMN cost_total INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE transactions ADD COLUMN voided_at TEXT;
        ALTER TABLE transactions ADD COLUMN void_reason TEXT NOT NULL DEFAULT '';
        ALTER TABLE transactions ADD COLUMN idempotency_key TEXT;
      `)

      // Partial unique index: banyak baris lama boleh NULL, tapi key yang dipakai wajib unik.
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_tx_idempotency
          ON transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_tx_shift ON transactions(shift_id);
      `)
    },
  },
]
