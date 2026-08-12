import type { NextFunction, Request, Response } from "express"
import { HttpError } from "./utils"

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

export function getAllowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Lapis kedua anti-CSRF setelah cookie SameSite=Strict.
 * Browser selalu mengirim header Origin pada request non-GET, jadi request
 * dari situs lain bisa ditolak sebelum menyentuh route. Klien non-browser
 * (curl/Postman) tidak mengirim Origin dan tetap diizinkan.
 */
export function originGuard(req: Request, _res: Response, next: NextFunction): void {
  const origin = req.headers.origin
  if (origin && MUTATING_METHODS.has(req.method) && !getAllowedOrigins().includes(origin)) {
    throw new HttpError(403, "Origin tidak diizinkan")
  }
  next()
}

/**
 * Mewajibkan Content-Type spesifik pada request yang mengubah data.
 * Efeknya: request lintas situs tidak lagi termasuk "simple request",
 * sehingga browser wajib melakukan preflight dan CORS akan memblokirnya.
 */
export function requireContentType(expected: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers["content-type"] || ""
    const actual = header.split(";")[0].trim().toLowerCase()
    if (actual !== expected) {
      throw new HttpError(415, `Content-Type harus ${expected}`)
    }
    next()
  }
}

/**
 * Wajibkan JSON pada POST saja.
 *
 * POST adalah satu-satunya method pengubah data yang bisa dikirim lintas situs
 * tanpa preflight (sebagai "simple request"), dan itu hanya mungkin bila
 * Content-Type-nya text/plain, form-urlencoded, atau multipart. Dengan mewajibkan
 * application/json, celah itu tertutup. PUT/PATCH/DELETE sudah selalu memicu
 * preflight, dan DELETE dari frontend memang tidak mengirim Content-Type.
 */
export function requireJsonOnPost(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== "POST") return next()
  return requireContentType("application/json")(req, res, next)
}
