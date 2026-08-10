import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
  HeadingLevel,
  TextRun,
  BorderStyle,
  AlignmentType,
} from "docx"
import { formatRupiah, toCsv, downloadBlob } from "./utils"
import type { ReportSummary, ProductReportRow, CategoryReportRow } from "./types"

export interface ReportData {
  from: string
  to: string
  summary: ReportSummary
  byProduct: ProductReportRow[]
  byCategory: CategoryReportRow[]
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
}

const INK: [number, number, number] = [12, 12, 13]
const EMERALD: [number, number, number] = [5, 150, 105]
const LIGHT_EMERALD: [number, number, number] = [52, 211, 153]
const LIGHT_BG: [number, number, number] = [245, 245, 244]
const ZEBRA: [number, number, number] = [247, 250, 249]
const MUTED: [number, number, number] = [140, 140, 138]

// ---------------- CSV ----------------

export function exportCsv(data: ReportData): void {
  const rows: Record<string, string | number>[] = []
  const periode = `${data.from} s/d ${data.to}`

  for (const [method, revenue] of Object.entries(data.summary.byMethod)) {
    rows.push({ periode, kategori: "Metode Pembayaran", nama: METHOD_LABELS[method] || method, jumlah: "", pendapatan: revenue })
  }
  for (const c of data.byCategory) {
    rows.push({ periode, kategori: "Kategori", nama: c.name, jumlah: c.qty, pendapatan: c.revenue })
  }
  for (const p of data.byProduct) {
    rows.push({ periode, kategori: "Produk", nama: p.name, jumlah: p.qty, pendapatan: p.revenue })
  }

  downloadBlob(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" }), `laporan-${data.from}-${data.to}.csv`)
}

// ---------------- PDF ----------------

export function exportPdf(data: ReportData): void {
  const { from, to, summary, byProduct, byCategory } = data
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const mx = 14
  const printedAt = new Date().toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })

  let lastFooterPage = -1

  // ---- Header band ----
  doc.setFillColor(...INK)
  doc.rect(0, 0, pageW, 33, "F")
  doc.setFillColor(...EMERALD)
  doc.rect(0, 33, pageW, 1.8, "F")

  // mini logo: register + check + coin
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(14, 8, 15, 9.5, 2, 2, "F")
  doc.setFillColor(...INK)
  doc.roundedRect(15.1, 8.8, 12.8, 3, 0.8, 0.8, "F")
  doc.setDrawColor(...LIGHT_EMERALD)
  doc.setLineWidth(0.5)
  doc.line(17.4, 10.3, 18.9, 11.7)
  doc.line(18.9, 11.7, 22.2, 8.8)
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)
  doc.setFillColor(...LIGHT_EMERALD)
  doc.circle(30.5, 13.4, 3, "F")

  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text("WARUNG KASIR", 36, 13.5)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9.5)
  doc.setTextColor(200, 215, 208)
  doc.text("LAPORAN PENJUALAN", 36, 19)
  doc.setFontSize(9)
  doc.setTextColor(220, 220, 218)
  doc.text(`Periode ${from} s/d ${to}`, pageW - mx, 16, { align: "right" })

  // ---- Summary cards ----
  const cards = [
    { label: "Pendapatan", value: formatRupiah(summary.totalRevenue) },
    { label: "Transaksi", value: String(summary.count) },
    { label: "Item Terjual", value: String(summary.itemCount) },
    { label: "Rata-rata / Tx", value: formatRupiah(summary.avgPerTx) },
  ]
  const gap = 3
  const cardW = (pageW - 2 * mx - gap * (cards.length - 1)) / cards.length
  const cardY = 41
  const cardH = 18
  cards.forEach((card, i) => {
    const x = mx + i * (cardW + gap)
    const highlight = i === 0
    if (highlight) {
      doc.setFillColor(...EMERALD)
    } else {
      doc.setFillColor(...LIGHT_BG)
    }
    doc.roundedRect(x, cardY, cardW, cardH, 2.5, 2.5, "F")
    doc.setFontSize(7.5)
    if (highlight) {
      doc.setTextColor(225, 250, 240)
    } else {
      doc.setTextColor(...MUTED)
    }
    doc.setFont("helvetica", "normal")
    doc.text(card.label.toUpperCase(), x + 4, cardY + 6)
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    if (highlight) {
      doc.setTextColor(255, 255, 255)
    } else {
      doc.setTextColor(...INK)
    }
    doc.text(card.value, x + 4, cardY + 13.5)
    doc.setFont("helvetica", "normal")
  })

  let y = cardY + cardH + 9

  if (summary.totalDiscount > 0) {
    doc.setFillColor(254, 243, 199)
    doc.setDrawColor(252, 211, 77)
    doc.setLineWidth(0.3)
    doc.roundedRect(mx, y - 4.5, 78, 8, 2, 2, "FD")
    doc.setTextColor(180, 83, 9)
    doc.setFontSize(8.5)
    doc.text(`Total diskon: -${formatRupiah(summary.totalDiscount)}`, mx + 4, y)
    doc.setFont("helvetica", "normal")
    y += 9.5
  }

  function sectionTitle(title: string) {
    doc.setFillColor(...EMERALD)
    doc.roundedRect(mx, y - 4.2, 2.6, 2.6, 0.5, 0.5, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11.5)
    doc.setTextColor(...INK)
    doc.text(title, mx + 5, y)
    doc.setFont("helvetica", "normal")
    y += 3.6
  }

  function footer(data: { doc: jsPDF; pageNumber: number }) {
    const d = data.doc
    const pg = d.internal.pageSize.getHeight()
    if (data.pageNumber === lastFooterPage) return
    lastFooterPage = data.pageNumber
    d.setDrawColor(228, 228, 227)
    d.setLineWidth(0.3)
    d.line(mx, pg - 10, pageW - mx, pg - 10)
    d.setFontSize(7.5)
    d.setTextColor(...MUTED)
    d.text(`Dicetak pada ${printedAt} — Warung Kasir`, mx, pg - 6)
    d.text(`Halaman ${data.pageNumber}`, pageW - mx, pg - 6, { align: "right" })
  }

  const tableOpts = {
    margin: { left: mx, right: mx, bottom: 14 },
    headStyles: { fillColor: INK, textColor: 255, fontSize: 8.5, fontStyle: "bold" as const, cellPadding: 2.2 },
    bodyStyles: { fontSize: 8.5, cellPadding: 2.2 },
    alternateRowStyles: { fillColor: ZEBRA },
    didDrawPage: footer,
  }

  const methodRows = Object.entries(summary.byMethod).map(([m, revenue]) => [METHOD_LABELS[m] || m, formatRupiah(revenue)])
  if (methodRows.length > 0) {
    sectionTitle("Metode Pembayaran")
    autoTable(doc, {
      ...tableOpts,
      startY: y,
      head: [["Metode Bayar", "Pendapatan"]],
      body: methodRows,
      columnStyles: { 1: { halign: "right" } },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  if (byCategory.length > 0) {
    sectionTitle("Penjualan per Kategori")
    autoTable(doc, {
      ...tableOpts,
      startY: y,
      head: [["Kategori", "Qty", "Pendapatan"]],
      body: byCategory.map((c) => [c.name, String(c.qty), formatRupiah(c.revenue)]),
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  if (byProduct.length > 0) {
    sectionTitle("Produk Terlaris")
    autoTable(doc, {
      ...tableOpts,
      startY: y,
      head: [["Produk", "Qty", "Pendapatan"]],
      body: byProduct.map((p) => [p.name, String(p.qty), formatRupiah(p.revenue)]),
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  if (y < pageH - 26) {
    doc.setDrawColor(...EMERALD)
    doc.setLineWidth(0.6)
    doc.line(mx, y + 4, pageW - mx, y + 4)
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text("Laporan dihasilkan secara otomatis oleh aplikasi Warung Kasir.", pageW / 2, y + 9, { align: "center" })
  }

  doc.save(`laporan-${from}-${to}.pdf`)
}

// ---------------- DOCX ----------------

function docxTable(head: string[], rows: string[][], opts: { zebra?: boolean } = {}): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: head.map(
      (h) =>
        new TableCell({
          shading: { type: "clear", fill: "0c0c0d" },
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20 })] })],
        })
    ),
  })
  const bodyRows = rows.map(
    (r, ri) =>
      new TableRow({
        children: r.map(
          (c) =>
            new TableCell({
              shading: opts.zebra && ri % 2 === 1 ? { type: "clear", fill: "f7faf9" } : undefined,
              margins: { top: 100, bottom: 100, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: c, size: 20 })] })],
            })
        ),
      })
  )
  return new Table({
    rows: [headerRow, ...bodyRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

function heading(title: string): Paragraph {
  return new Paragraph({
    shading: { type: "clear", fill: "059669" },
    spacing: { before: 240, after: 140 },
    children: [
      new TextRun({ text: "  " + title, bold: true, color: "FFFFFF", size: 24 }),
    ],
  })
}

export async function exportDocx(data: ReportData): Promise<void> {
  const { from, to, summary, byProduct, byCategory } = data
  const printedAt = new Date().toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      border: {
        bottom: { color: "059669", style: BorderStyle.SINGLE, size: 18, space: 4 },
      },
      spacing: { after: 120 },
      children: [
        new TextRun({ text: "WARUNG KASIR", bold: true, size: 44, color: "0C0C0D" }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: "Laporan Penjualan", bold: true, size: 32, color: "059669" }),
      ],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({ text: `Periode: ${from} s/d ${to}`, size: 22, color: "78716C" }),
      ],
    }),
  ]

  // Summary table
  children.push(heading("Ringkasan"))
  children.push(
    docxTable(
      ["Uraian", "Nilai"],
      [
        ["Total Pendapatan", formatRupiah(summary.totalRevenue)],
        ["Jumlah Transaksi", String(summary.count)],
        ["Item Terjual", String(summary.itemCount)],
        ["Rata-rata / Transaksi", formatRupiah(summary.avgPerTx)],
        ["Total Diskon", summary.totalDiscount > 0 ? `-${formatRupiah(summary.totalDiscount)}` : "-"],
      ],
      { zebra: true }
    )
  )
  children.push(new Paragraph({ text: "" }))

  const methodRows = Object.entries(summary.byMethod).map(([m, revenue]) => [METHOD_LABELS[m] || m, formatRupiah(revenue)])
  if (methodRows.length > 0) {
    children.push(heading("Per Metode Pembayaran"))
    children.push(docxTable(["Metode", "Pendapatan"], methodRows, { zebra: true }))
    children.push(new Paragraph({ text: "" }))
  }

  if (byCategory.length > 0) {
    children.push(heading("Penjualan per Kategori"))
    children.push(
      docxTable(
        ["Kategori", "Qty", "Pendapatan"],
        byCategory.map((c) => [c.name, String(c.qty), formatRupiah(c.revenue)]),
        { zebra: true }
      )
    )
    children.push(new Paragraph({ text: "" }))
  }

  if (byProduct.length > 0) {
    children.push(heading("Produk Terlaris"))
    children.push(
      docxTable(
        ["Produk", "Qty", "Pendapatan"],
        byProduct.map((p) => [p.name, String(p.qty), formatRupiah(p.revenue)]),
        { zebra: true }
      )
    )
    children.push(new Paragraph({ text: "" }))
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 320 },
      children: [
        new TextRun({ text: "— Laporan dihasilkan secara otomatis oleh aplikasi Warung Kasir —", size: 18, color: "A8A29E" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `Dicetak pada ${printedAt}`, size: 18, color: "A8A29E" }),
      ],
    })
  )

  const doc = new Document({
    sections: [{ children }],
  })
  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, `laporan-${from}-${to}.docx`)
}
