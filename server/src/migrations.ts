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
]
