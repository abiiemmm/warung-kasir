import { createApp } from "./app"
import { seed } from "./seed"
import { ensureDefaultOwner } from "./auth"

const PORT = parseInt(process.env.PORT || "3001", 10)

seed()

const owner = ensureDefaultOwner()

const app = createApp()

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  if (owner.created) {
    console.log("")
    console.log("  Akun pemilik dibuat — nama: \"Pemilik\", PIN: " + owner.pin)
    if (!process.env.OWNER_PIN) {
      console.log("  PIN ini bawaan. Segera ganti lewat menu Pengaturan setelah login.")
    }
    console.log("")
  }
})
