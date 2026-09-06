import { jsPDF } from "jspdf"
import autoTable, { type UserOptions } from "jspdf-autotable"
import type { ReportData } from "./export"

type RGB = [number, number, number]
const C = {
  ink: [37, 59, 49] as RGB,
  green: [38, 76, 59] as RGB,
  muted: [110, 119, 101] as RGB,
  line: [217, 222, 207] as RGB,
  paper: [246, 245, 238] as RGB,
  sage: [234, 239, 225] as RGB,
  cream: [244, 237, 218] as RGB,
  white: [255, 255, 255] as RGB,
}
const METHODS: Record<string, string> = { cash: "Tunai", qris: "QRIS", transfer: "Transfer" }
const money = (value: number) => `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value)}`
const number = (value: number) => new Intl.NumberFormat("id-ID").format(value)
const dateLabel = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })

/** Builds the same document used by browser downloads, without triggering a download. */
export function createReportPdf(data: ReportData, printedAt = new Date()): jsPDF {
  const { summary: s, from, to } = data
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true })
  const margin = 18
  const width = 174
  const right = 192
  const bottom = 274
  const period = `${dateLabel(from)} - ${dateLabel(to)}`
  const printed = printedAt.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  doc.setProperties({ title: `Laporan penjualan ${from} - ${to}`, author: "Warung Kasir", subject: "Ringkasan dan rincian penjualan warung", creator: "Warung Kasir" })

  function text(value: string, x: number, y: number, size = 10, color: RGB = C.ink, font: "normal" | "bold" = "normal", align: "left" | "right" = "left") {
    doc.setFont("helvetica", font)
    doc.setFontSize(size)
    doc.setTextColor(...color)
    doc.text(value, x, y, { align })
  }

  function fitted(value: string, x: number, y: number, maxWidth: number, size: number, color = C.ink) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(size)
    const fittedSize = Math.min(size, size * maxWidth / Math.max(doc.getTextWidth(value), 1))
    text(value, x, y, fittedSize, color, "bold")
  }

  function rule(y: number, x = margin, end = right) {
    doc.setDrawColor(...C.line)
    doc.setLineWidth(0.25)
    doc.line(x, y, end, y)
  }

  function pageHeader() {
    text("warung kasir.", margin, 16, 13, C.green, "bold")
    text("BUKU PENJUALAN", right, 15.5, 7.5, C.muted, "normal", "right")
    rule(21)
  }

  function title(value: string, y: number, size = 29) {
    doc.setFont("times", "normal")
    doc.setTextColor(...C.ink)
    doc.setFontSize(size)
    doc.text(value, margin, y)
  }

  function section(index: string, value: string, y: number) {
    text(index, margin, y, 9, C.muted)
    text(value, margin + 10, y, 12, C.ink, "bold")
  }

  pageHeader()
  text("RINGKASAN PERIODE", margin, 33, 8, C.muted)
  title("Catatan hasil berjualan.", 47)
  text(period, margin, 56, 10, C.muted)

  doc.setFillColor(...C.green)
  doc.roundedRect(margin, 65, width, 36, 1.5, 1.5, "F")
  text("PENJUALAN BERSIH", margin + 7, 74, 8, C.sage)
  fitted(money(s.totalRevenue), margin + 7, 88, 110, 28, C.white)
  text("Sesudah diskon", margin + 7, 96, 8, C.sage)
  text("TRANSAKSI SELESAI", right - 7, 76, 7, C.sage, "normal", "right")
  text(number(s.count), right - 7, 89, 22, C.white, "bold", "right")

  const metrics = [
    ["LABA KOTOR", money(s.grossProfit), "Penjualan bersih dikurangi modal"],
    ["BARANG TERJUAL", number(s.itemCount), "Jumlah satuan yang terjual"],
    ["RATA-RATA TRANSAKSI", money(s.avgPerTx), "Dari transaksi yang selesai"],
  ]
  metrics.forEach(([label, value, caption], i) => {
    const x = margin + i * 60
    text(label, x, 112, 7, C.muted)
    fitted(value, x, 123, 53, 17)
    text(caption, x, 131, 7, C.muted)
  })
  rule(138)

  section("01", "Hitungan warung", 149)
  const finance = [
    ["Penjualan sebelum diskon", money(s.totalRevenue + s.totalDiscount)],
    ["Diskon penjualan", `- ${money(s.totalDiscount)}`],
    ["Modal barang terjual", money(s.totalCost)],
  ]
  finance.forEach(([label, value], i) => {
    const y = 160 + i * 9
    text(label, margin, y, 9, C.muted)
    text(value, right, y, 10, C.ink, "bold", "right")
    rule(y + 3)
  })
  text("Laba kotor belum memperhitungkan biaya operasional warung.", margin, 190, 7.5, C.muted)

  section("02", "Pembayaran diterima", 204)
  const methods = Object.entries(s.byMethod)
  const tableBase: UserOptions = {
    theme: "plain",
    margin: { left: margin, right: margin, top: 31, bottom: 24 },
    styles: { font: "helvetica", fontSize: 9, textColor: C.ink, cellPadding: 3.2, overflow: "linebreak", lineColor: C.line, lineWidth: { bottom: 0.15 } },
    headStyles: { fillColor: C.green, textColor: C.white, fontSize: 8, fontStyle: "bold", cellPadding: 3.5 },
    alternateRowStyles: { fillColor: C.paper },
    rowPageBreak: "avoid",
    showHead: "everyPage",
  }

  autoTable(doc, {
    ...tableBase, startY: 210,
    head: [["METODE", "PENJUALAN BERSIH", "PORSI"]],
    body: methods.length ? methods.map(([method, revenue]) => [METHODS[method] || method, money(revenue), `${s.totalRevenue > 0 ? (revenue / s.totalRevenue * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 }) : "0"}%`]) : [["Belum ada pembayaran pada periode ini.", "-", "-"]],
    columnStyles: { 0: { cellWidth: 76 }, 1: { cellWidth: 66, halign: "right" }, 2: { cellWidth: 32, halign: "right" } },
  })

  let y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4
  if (y + 17 > bottom) { doc.addPage(); y = 34 }
  doc.setFillColor(...C.cream)
  doc.rect(margin, y, width, 17, "F")
  text(s.count ? "CATATAN LAPORAN" : "BELUM ADA PENJUALAN", margin + 4, y + 6, 7, C.ink, "bold")
  text(s.count ? `${number(s.voidedCount)} transaksi dibatalkan (${money(s.voidedTotal)}), tidak masuk dalam ringkasan.` : "Tidak ada transaksi selesai dalam periode yang dipilih.", margin + 4, y + 12, 8, C.muted)

  if (data.byCategory.length || data.byProduct.length) {
    doc.addPage()
    title("Rincian penjualan", 38, 25)
    text(period, margin, 47, 9, C.muted)
    text("Nilai kategori dan produk di bawah adalah penjualan sebelum diskon transaksi.", margin, 55, 8, C.muted)
    y = 69

    function detailTable(index: string, label: string, head: string[], body: string[][]) {
      // Keep the heading, table header, and at least one wrapped row together.
      if (y + 40 > bottom) { doc.addPage(); y = 36 }
      section(index, label, y)
      autoTable(doc, {
        ...tableBase, startY: y + 5, head: [head], body,
        columnStyles: { 0: { cellWidth: 12, textColor: C.muted }, 1: { cellWidth: 82 }, 2: { cellWidth: 24, halign: "right" }, 3: { cellWidth: 56, halign: "right" } },
        didParseCell: cell => {
          if (cell.section === "head" && cell.column.index >= 2) cell.cell.styles.halign = "right"
        },
      })
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14
    }

    if (data.byCategory.length) detailTable("03", "Penjualan per kategori", ["NO.", "KATEGORI", "JUMLAH", "PENJUALAN"], data.byCategory.map((c, i) => [String(i + 1).padStart(2, "0"), c.name, number(c.qty), money(c.revenue)]))
    if (data.byProduct.length) detailTable("04", "Produk dengan penjualan tertinggi", ["NO.", "NAMA PRODUK", "JUMLAH", "PENJUALAN"], [...data.byProduct].sort((a, b) => b.revenue - a.revenue).map((p, i) => [String(i + 1).padStart(2, "0"), p.name, number(p.qty), money(p.revenue)]))
    if (y + 10 > bottom) { doc.addPage(); y = 36 }
    text("Rincian produk mengikuti data laporan aplikasi (maksimal 50 produk).", margin, y, 7.5, C.muted)
  }

  // Draw once per physical page, after all tables have paginated.
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    if (page > 1) pageHeader()
    rule(281)
    text(`Dicetak ${printed} | Warung Kasir`, margin, 287, 7, C.muted)
    text(`${page} / ${pages}`, right, 287, 8, C.green, "bold", "right")
  }
  return doc
}

export function exportPdf(data: ReportData): void {
  createReportPdf(data).save(`laporan-${data.from}-${data.to}.pdf`)
}
