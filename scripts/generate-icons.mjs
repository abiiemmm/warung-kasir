import { createRequire } from "module"
import { fileURLToPath } from "url"
import path from "path"
import fs from "fs"

const require = createRequire(import.meta.url)
const sharp = require("sharp")

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public")
const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "app")

function buildIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 1)
  header.writeUInt16LE(images.length, 4)

  const chunks = [header]
  let offset = 6 + images.length * 16
  for (const img of images) {
    const entry = Buffer.alloc(16)
    const dim = img.size >= 256 ? 0 : img.size
    entry.writeUInt8(dim, 0)
    entry.writeUInt8(dim, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(img.data.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += img.data.length
    chunks.push(entry)
  }
  for (const img of images) chunks.push(img.data)
  return Buffer.concat(chunks)
}

async function main() {
  const icon = path.join(publicDir, "icon.svg")
  const maskable = path.join(publicDir, "icon-maskable.svg")

  await sharp(icon).resize(512, 512).png().toFile(path.join(publicDir, "icon-512.png"))
  await sharp(icon).resize(192, 192).png().toFile(path.join(publicDir, "icon-192.png"))
  await sharp(icon).resize(180, 180).png().toFile(path.join(publicDir, "apple-touch-icon.png"))
  await sharp(maskable).resize(512, 512).png().toFile(path.join(publicDir, "icon-maskable-512.png"))

  const sizes = [16, 32, 48]
  const pngs = []
  for (const size of sizes) {
    pngs.push({ size, data: await sharp(icon).resize(size, size).png().toBuffer() })
  }
  fs.writeFileSync(path.join(appDir, "favicon.ico"), buildIco(pngs))

  console.log("Icons generated:")
  console.log("  - public/icon-512.png, icon-192.png, apple-touch-icon.png, icon-maskable-512.png")
  console.log("  - src/app/favicon.ico (16/32/48)")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
