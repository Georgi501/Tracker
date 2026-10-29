import { expect, it } from "vitest";
import {
  analyticsReportCsv,
  analyticsReportHtml,
  type AnalyticsReport,
} from "@/lib/analytics-report";

const report: AnalyticsReport = {
  title: "Portfolio report",
  generated: "Generated today",
  sections: [
    {
      title: "Holdings",
      columns: ["Asset", "Value"],
      rows: [
        ['=HYPERLINK("https://example.com")', 42],
        ['A, "quoted" asset', null],
      ],
    },
  ],
};

it("escapes CSV fields and prevents formula injection in text values", () => {
  const csv = analyticsReportCsv(report);

  expect(csv).toContain('\'=HYPERLINK(""https://example.com"")');
  expect(csv).toContain('"A, ""quoted"" asset",');
  expect(csv).toContain("42");
});

it("escapes all report content before placing it in HTML", () => {
  const hostileReport: AnalyticsReport = {
    ...report,
    title: "<img src=x onerror=alert(1)>",
    sections: [
      {
        title: "<script>alert(1)</script>",
        columns: ["<b>Asset</b>"],
        rows: [["A & B"]],
      },
    ],
  };
  const html = analyticsReportHtml(hostileReport);

  expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  expect(html).toContain("A &amp; B");
  expect(html).not.toContain("<script>");
});
