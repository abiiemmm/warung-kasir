import express from "express"
import cors from "cors"
import categoriesRouter from "./routes/categories"
import productsRouter from "./routes/products"
import transactionsRouter from "./routes/transactions"
import debtsRouter from "./routes/debts"
import remindersRouter from "./routes/reminders"
import logsRouter from "./routes/logs"

const app = express()
const PORT = parseInt(process.env.PORT || "3001", 10)

app.use(cors())
app.use(express.json({ limit: "5mb" }))

app.use("/api/categories", categoriesRouter)
app.use("/api/products", productsRouter)
app.use("/api/transactions", transactionsRouter)
app.use("/api/debts", debtsRouter)
app.use("/api/reminders", remindersRouter)
app.use("/api/logs", logsRouter)

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
