export type ReportCell = string | number | null;

export interface AnalyticsReportSection {
  title: string;
  columns: string[];
  rows: ReportCell[][];
}

export interface AnalyticsReport {
  title: string;
  generated: string;
  sections: AnalyticsReportSection[];
}

function csvCell(value: ReportCell): string {
  let text = value == null ? "" : String(value);
  if (typeof value !== "number" && /^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function htmlText(value: ReportCell): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function analyticsReportCsv(report: AnalyticsReport): string {
  const rows: ReportCell[][] = [[report.title], [report.generated], []];
  for (const section of report.sections) {
    rows.push([section.title], section.columns, ...section.rows, []);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function analyticsReportHtml(report: AnalyticsReport): string {
  const sections = report.sections
    .map(
      (section) => `<section>
        <h2>${htmlText(section.title)}</h2>
        <table><thead><tr>${section.columns.map((column) => `<th>${htmlText(column)}</th>`).join("")}</tr></thead>
        <tbody>${section.rows
          .map((row) => `<tr>${row.map((cell) => `<td>${htmlText(cell)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>
      </section>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${htmlText(report.title)}</title>
<style>
body{font:14px/1.5 Arial,sans-serif;color:#17202a;margin:32px auto;max-width:1000px;padding:0 24px}
h1{font-size:26px;margin-bottom:4px}h2{font-size:18px;margin:28px 0 8px}
p{color:#596273;margin:0 0 24px}table{border-collapse:collapse;width:100%;font-size:12px}
th,td{border:1px solid #d5dbe3;padding:7px 9px;text-align:left;overflow-wrap:anywhere}
th{background:#edf1f5}tr{break-inside:avoid}
@media print{body{margin:0 auto;padding:0 12mm}section{break-inside:avoid}h2{break-after:avoid}}
 </style></head><body>
<h1>${htmlText(report.title)}</h1><p>${htmlText(report.generated)}</p>${sections}
</body></html>`;
}
