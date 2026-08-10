import { createApp } from "./app"
import { seed } from "./seed"

const PORT = parseInt(process.env.PORT || "3001", 10)

seed()

const app = createApp()

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
