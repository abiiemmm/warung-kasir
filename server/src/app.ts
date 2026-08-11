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
import { backupRouter, exportRouter, restoreRouter, resetRouter } from "./routes/backup"
import reportsRouter from "./routes/reports"
import { HttpError } from "./utils"

export function createApp() {
  const app = express()

  app.use(helmet())

  const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  app.use(cors({ origin: allowedOrigins }))

  app.use(express.json({ limit: "5mb" }))

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
  app.use("/api", limiter)

  app.use("/api/categories", categoriesRouter)
  app.use("/api/products", productsRouter)
  app.use("/api/transactions", transactionsRouter)
  app.use("/api/debts", debtsRouter)
  app.use("/api/reminders", remindersRouter)
  app.use("/api/logs", logsRouter)
  app.use("/api/backup", backupRouter)
  app.use("/api/export", exportRouter)
  app.use("/api/restore", restoreRouter)
  app.use("/api/reset", resetRouter)
  app.use("/api/reports", reportsRouter)

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" })
  })

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
