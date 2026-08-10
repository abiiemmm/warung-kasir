import type { Request } from "express"

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "HttpError"
  }
}

export function parsePagination(query: Request["query"]): { page: number; limit: number; offset: number } {
  const page = Math.max(1, Math.floor(Number(query.page) || 1))
  const limit = Math.min(200, Math.max(1, Math.floor(Number(query.limit) || 50)))
  return { page, limit, offset: (page - 1) * limit }
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
  pages: number
}

export function paginate<T>(rows: T[], total: number, page: number, limit: number): Paginated<T> {
  return { data: rows, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) }
}

export function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}
