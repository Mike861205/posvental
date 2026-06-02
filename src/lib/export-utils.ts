// Client-side export utilities — only call from "use client" components

export type ExportColumn = { header: string; key: string };

export async function exportToExcel(rows: Record<string, unknown>[], columns: ExportColumn[], filename: string) {
  const XLSX = await import("xlsx");
  const data = [
    columns.map((c) => c.header),
    ...rows.map((r) => columns.map((c) => r[c.key] ?? "")),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportToPDF(
  rows: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
  title: string,
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-MX", { dateStyle: "long" })}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => String(r[c.key] ?? ""))),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  doc.save(`${filename}.pdf`);
}
