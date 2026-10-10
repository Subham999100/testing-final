import { Workbook } from "exceljs";
import PDFDocument = require("pdfkit");
import { join } from "path";
import { existsSync } from "fs";
type ReportData = {
  columns: string[];
  rows: Record<string, unknown>[];
  from: string;
  to: string;
  scope: string;
  timeZone: string;
  summary?: unknown;
};
export async function reportXlsx(report: ReportData) {
  const wb = new Workbook();
  wb.creator = "Clyptus Hiring";
  const sheet = wb.addWorksheet("Report", {
    views: [{ state: "frozen", ySplit: 4 }],
  });
  sheet.addRow(["Clyptus Hiring - recruitment report"]);
  sheet.addRow([
    `${report.from} to ${report.to} | ${report.scope} | ${report.timeZone}`,
  ]);
  sheet.addRow([]);
  sheet.addRow(report.columns);
  for (const row of report.rows)
    sheet.addRow(
      report.columns.map((c) =>
        typeof row[c] === "number" ? row[c] : String(row[c] ?? ""),
      ),
    );
  sheet.columns.forEach((c, i) => {
    c.width = Math.min(42, Math.max(18, report.columns[i].length + 3));
  });
  sheet.getRow(1).font = { bold: true, size: 18, color: { argb: "FFB84C00" } };
  sheet.getRow(4).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(4).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF9C4300" },
  };
  sheet.eachRow((row, i) => {
    if (i >= 4) {
      row.alignment = { vertical: "top", wrapText: true };
      row.height = 45;
    }
  });
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: report.columns.length },
  };
  if (report.summary) {
    const sh = wb.addWorksheet("Inventory summary");
    sh.columns = [
      { header: "Period", width: 22 },
      { header: "Resume unlocks", width: 22 },
      { header: "Tokens debited", width: 22 },
      { header: "Tokens refunded", width: 22 },
      { header: "Net tokens", width: 22 },
    ];
    for (const [k, v] of Object.entries(report.summary as Record<string, any>))
      sh.addRow([k, v.resumeUnlocks, v.debited, v.refunded, v.net]);
    sh.getRow(1).font = { bold: true };
  }
  // External text stays string cells, never formulas.
  return Buffer.from(await wb.xlsx.writeBuffer());
}
export async function reportPdf(report: ReportData) {
  const doc = new PDFDocument({
      size: "A4",
      margin: 42,
      bufferPages: true,
      info: { Title: "Clyptus recruitment report" },
    }),
    chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  // Use an optionally provided Unicode-capable deployment font; PDFKit has a built-in fallback.
  const optionalFont = join(process.cwd(), "assets/fonts/DejaVuSans.ttf");
  doc
    .font(existsSync(optionalFont) ? optionalFont : "Helvetica")
    .fontSize(20)
    .fillColor("#a44600")
    .text("Clyptus Hiring");
  doc.fontSize(13).fillColor("#222222").text("Recruitment report").moveDown();
  doc
    .fontSize(10)
    .text(
      `${report.from} to ${report.to}\n${report.scope} | ${report.timeZone}\n${report.rows.length} records`,
    );
  if (report.summary) {
    doc.moveDown();
    for (const [k, v] of Object.entries(report.summary as Record<string, any>))
      doc.text(
        `${k}: ${v.resumeUnlocks} resume unlocks, ${v.debited} tokens debited, ${v.refunded} refunded, ${v.net} net`,
      );
  }
  // Labelled records preserve wide reports without clipped columns.
  for (let i = 0; i < report.rows.length; i++) {
    if (doc.y > doc.page.height - 140) doc.addPage();
    doc
      .moveDown()
      .fontSize(11)
      .fillColor("#a44600")
      .text(`Record ${i + 1}`)
      .fillColor("#222222")
      .fontSize(9);
    for (const col of report.columns)
      doc.text(`${col}: ${String(report.rows[i][col] ?? "—")}`, { lineGap: 3 });
  }
  if (!report.rows.length)
    doc.moveDown().text("No activity recorded for these dates.");
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .fillColor("#666666")
      .text(`${i + 1} / ${pages.count}`, 42, doc.page.height - 30, {
        lineBreak: false,
      });
  }
  doc.end();
  return done;
}