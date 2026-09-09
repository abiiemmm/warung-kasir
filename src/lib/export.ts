import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
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

export { exportPdf } from "./pdf-report"

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
