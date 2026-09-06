import express from "express"
import type { NextFunction, Request, Response } from "express"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import { ZodError } from "zod"
import categoriesRouter from "./routes/categories"
import productsRouter from "./routes/products"
import transactionsRouter from "./routes/transactions"
import debtsRouter from "./routes/debts"
import remindersRouter from "./routes/reminders"
import logsRouter from "./routes/logs"
import shiftsRouter from "./routes/shifts"
import { backupRouter, exportRouter, restoreRouter, resetRouter } from "./routes/backup"
import reportsRouter from "./routes/reports"
import { authRouter, usersRouter } from "./routes/auth"
import { ensureDefaultOwner, requireAuth, requireOwner } from "./auth"
import { getAllowedOrigins, originGuard, requireJsonOnPost } from "./middleware"
import { HttpError } from "./utils"

export function createApp() {
  const app = express()

  // Di belakang reverse proxy, X-Forwarded-For baru dipercaya bila TRUST_PROXY diisi.
  app.set("trust proxy", Number(process.env.TRUST_PROXY || 0))

  app.use(helmet())
  app.use(cors({ origin: getAllowedOrigins(), credentials: true }))
  app.use(originGuard)

  // 1 MB sudah lebih dari cukup: gambar produk dibatasi ~300 KB oleh skema Zod.
  app.use(express.json({ limit: "1mb" }))

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    // Longgar, karena seluruh kasir tampak berasal dari satu IP saat lewat proxy frontend.
    limit: 2000,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
  app.use("/api", limiter)

  // Operasi yang menyentuh seluruh database dibatasi jauh lebih ketat.
  const destructiveLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Terlalu sering. Coba lagi nanti." },
  })

  ensureDefaultOwner()

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" })
  })

  // Login & logout terbuka; /me dan /change-pin dijaga di dalam router-nya sendiri.
  app.use("/api/auth", requireJsonOnPost, authRouter)

  // Restore memakai body biner, jadi tidak lewat penjaga JSON.
  app.use("/api/restore", requireAuth, requireOwner, destructiveLimiter, restoreRouter)

  const api = express.Router()
  api.use(requireAuth, requireJsonOnPost)

  api.use("/users", usersRouter)
  api.use("/categories", categoriesRouter)
  api.use("/products", productsRouter)
  api.use("/transactions", transactionsRouter)
  api.use("/debts", debtsRouter)
  api.use("/reminders", remindersRouter)
  api.use("/logs", logsRouter)
  api.use("/shifts", shiftsRouter)
  api.use("/reports", reportsRouter)

  // Seluruh isi database ikut terunduh di sini — hanya untuk pemilik.
  api.use("/backup", requireOwner, destructiveLimiter, backupRouter)
  api.use("/export", requireOwner, destructiveLimiter, exportRouter)
  api.use("/reset", requireOwner, destructiveLimiter, resetRouter)

  app.use("/api", api)

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" })
  })

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: "Data tidak valid",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      })
    }
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message })
    }
    console.error(err)
    res.status(500).json({ error: "Terjadi kesalahan internal server" })
  })

  return app
}
