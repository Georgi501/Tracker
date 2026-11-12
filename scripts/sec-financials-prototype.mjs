#!/usr/bin/env node
// Local research only: no app route, DB write, provider switch, or deployment.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";
import { extractSecAnnualHistory } from "../src/lib/sec-financials.ts";
import { fetchAnnualFinancialHistory } from "../src/lib/financial-history.server.ts";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith("--"))
    throw new Error("Missing value for " + name);
  return args[index + 1];
};
const asOf = option("--as-of", new Date().toISOString().slice(0, 10));
const outDir = path.resolve(option("--out-dir", "artifacts/sec-financials.local"));
const cacheDir = path.resolve(option("--cache-dir", path.join(outDir, "raw")));
const refresh = args.includes("--refresh");
const compareYahoo = args.includes("--compare-yahoo");
const companies = [
  { symbol: "ORCL", cik: "0001341439", kind: "technology" },
  { symbol: "AAPL", cik: "0000320193", kind: "technology" },
  { symbol: "MSFT", cik: "0000789019", kind: "technology" },
  { symbol: "JPM", cik: "0000019617", kind: "bank" },
];
const metrics = [
  "revenue",
  "operatingIncome",
  "netIncome",
  "dilutedEps",
  "operatingCashFlow",
  "freeCashFlow",
];
const headers = {
  "User-Agent": "CapiSpot SEC research support@capispot.com",
  Accept: "application/json,text/html",
};
await mkdir(outDir, { recursive: true });
await mkdir(cacheDir, { recursive: true });
let lastRequest = 0;
async function cached(name, url, json = true) {
  const file = path.join(cacheDir, name);
  if (!refresh) {
    try {
      const text = await readFile(file, "utf8");
      return json ? JSON.parse(text) : text;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  // Sequential requests, at most 2/second; no retry loop on SEC rejection.
  await new Promise((resolve) =>
    setTimeout(resolve, Math.max(0, 500 - (Date.now() - lastRequest))),
  );
  lastRequest = Date.now();
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error("SEC HTTP " + response.status + " for " + url);
  const text = await response.text();
  const result = json ? JSON.parse(text) : text;
  await writeFile(file, text);
  return result;
}
function inlineValues(document, source, tag) {
  const periods = new Map();
  for (const context of document.getElementsByTagName("xbrli:context")) {
    if (
      context.getElementsByTagName("xbrldi:explicitmember").length ||
      context.getElementsByTagName("xbrldi:typedmember").length
    )
      continue;
    const start = context.getElementsByTagName("xbrli:startdate")[0]?.textContent.trim();
    const end = context.getElementsByTagName("xbrli:enddate")[0]?.textContent.trim();
    if (start === source.start && end === source.end) periods.set(context.id, true);
  }
  const values = [];
  for (const element of document.getElementsByTagName("ix:nonfraction")) {
    if (element.getAttribute("name") !== tag || !periods.has(element.getAttribute("contextref")))
      continue;
    const text = element.textContent
      .trim()
      .replaceAll(",", "")
      .replaceAll(" ", "")
      .replaceAll("\u00a0", "");
    if (!/^-?\d+(\.\d+)?$/.test(text)) continue;
    const value =
      Number(text) *
      10 ** Number(element.getAttribute("scale") ?? 0) *
      (element.getAttribute("sign") === "-" ? -1 : 1);
    if (Number.isFinite(value)) values.push(value);
  }
  return [...new Set(values)];
}
async function verifyLatest(company, latest) {
  const source = latest.sources.revenue ?? latest.sources.netIncome;
  if (!source) return { status: "unavailable", reason: "No reported revenue/net-income evidence." };
  const submissions = await cached(
    company.symbol + "-submissions.json",
    "https://data.sec.gov/submissions/CIK" + company.cik + ".json",
  );
  const recent = submissions.filings.recent;
  const index = recent.accessionNumber.indexOf(source.accession);
  if (index < 0)
    return {
      status: "unavailable",
      reason: "Accession is outside recent submissions.",
      accession: source.accession,
    };
  const documentUrl =
    "https://www.sec.gov/Archives/edgar/data/" +
    Number(company.cik) +
    "/" +
    source.accession.replaceAll("-", "") +
    "/" +
    recent.primaryDocument[index];
  const html = await cached(company.symbol + "-latest-10k.html", documentUrl, false);
  // Parse only relevant inline facts and their contexts, not the entire 10-K layout.
  // Unexpected markup produces "unverified"; it never counts as a matching value.
  const attr = (text, name) =>
    new RegExp("\\b" + name + "\\s*=\\s*[\"']([^\"']+)[\"']", "i").exec(text)?.[1];
  const wanted = new Set(Object.values(latest.sources).flatMap((item) => item.tags));
  const facts = [...html.matchAll(/<ix:nonfraction\b[^>]*>[\s\S]*?<\/ix:nonfraction\s*>/gi)]
    .map(([text]) => text)
    .filter((text) => wanted.has(attr(text, "name")));
  const contextIds = new Set(facts.map((text) => attr(text, "contextref")));
  const contexts = [...html.matchAll(/<xbrli:context\b[^>]*>[\s\S]*?<\/xbrli:context\s*>/gi)]
    .map(([text]) => text)
    .filter((text) => contextIds.has(attr(text, "id")));
  const dom = new JSDOM(contexts.join("\n") + facts.join("\n"));
  try {
    const checks = [];
    for (const metric of metrics) {
      const evidence = latest.sources[metric];
      if (!evidence || evidence.accession !== source.accession) {
        checks.push({
          metric,
          status: "unavailable",
          reason: "No matching evidence in this filing.",
        });
        continue;
      }
      const operands = evidence.tags.map((tag) => ({
        tag,
        values: inlineValues(dom.window.document, evidence, tag),
      }));
      const possible =
        evidence.derived && operands.length === 2
          ? operands[0].values.flatMap((left) => operands[1].values.map((right) => left - right))
          : (operands[0]?.values ?? []);
      checks.push({
        metric,
        status: possible.some((value) => Math.abs(value - latest[metric]) < 1e-7)
          ? "match"
          : "unverified",
        expected: latest[metric],
        operands,
      });
    }
    return {
      status: checks.every((check) => check.status === "match" || check.status === "unavailable")
        ? "checked"
        : "needs-review",
      documentUrl,
      accession: source.accession,
      checks,
    };
  } finally {
    dom.window.close();
  }
}

const reports = [];
for (const company of companies) {
  const url = "https://data.sec.gov/api/xbrl/companyfacts/CIK" + company.cik + ".json";
  const payload = await cached(company.symbol + ".json", url);
  if (String(payload.cik).padStart(10, "0") !== company.cik)
    throw new Error("Unexpected CIK in " + company.symbol);
  const history = extractSecAnnualHistory(payload, { asOf, years: 10 });
  const latest = history.rows.at(-1);
  const coverage = Object.fromEntries(
    metrics.map((metric) => [metric, history.rows.filter((row) => row[metric] != null).length]),
  );
  let verification;
  try {
    verification = latest
      ? await verifyLatest(company, latest)
      : { status: "unavailable", reason: "No annual rows." };
  } catch (error) {
    verification = { status: "unavailable", reason: error.message };
  }
  const report = {
    symbol: company.symbol,
    kind: company.kind,
    companyFactsUrl: url,
    ...history,
    coverage,
    latestFilingVerification: verification,
  };
  if (compareYahoo) {
    try {
      const start = new Date(asOf);
      start.setUTCFullYear(start.getUTCFullYear() - 11);
      const yahoo = await fetchAnnualFinancialHistory(
        company.symbol,
        start,
        new Date(asOf + "T23:59:59Z"),
      );
      const overlap = [];
      for (const row of history.rows) {
        const other = yahoo.rows.find((candidate) => candidate.date === row.date);
        if (!other) continue;
        for (const metric of metrics) {
          if (row[metric] == null || other[metric] == null) continue;
          overlap.push({
            date: row.date,
            metric,
            sec: row[metric],
            yahoo: other[metric],
            match: Math.abs(row[metric] - other[metric]) < 1e-7,
          });
        }
      }
      report.yahooComparison = {
        source: "Yahoo Finance public fundamentals time series",
        currency: yahoo.currency,
        annualRows: yahoo.rows.length,
        overlap,
        differences: overlap.filter((point) => !point.match),
      };
    } catch (error) {
      report.yahooComparison = { error: error.message };
    }
  }
  reports.push(report);
  await writeFile(
    path.join(outDir, company.symbol + "-annual.json"),
    JSON.stringify(report, null, 2),
  );
  const columns = ["date", "start", ...metrics];
  await writeFile(
    path.join(outDir, company.symbol + "-annual.csv"),
    [
      columns.join(","),
      ...history.rows.map((row) => columns.map((key) => row[key] ?? "").join(",")),
    ].join("\n") + "\n",
  );
  console.log(
    JSON.stringify({
      symbol: company.symbol,
      periods: history.rows.length,
      first: history.rows[0]?.date,
      last: latest?.date,
      coverage,
      verification,
      issues: history.issues,
      yahooDifferences: report.yahooComparison?.differences,
    }),
  );
}
const lines = [
  "# SEC Financials local prototype",
  "",
  "As of: " + asOf + ". Generated: " + new Date().toISOString() + ".",
  "",
  "Research output only. The app continues to use Yahoo. No production provider switch.",
  "",
  "| Company | Periods | Range | Revenue | Operating income | Net income | EPS | CFO | FCF |",
  "| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...reports.map(
    (report) =>
      "| " +
      report.symbol +
      " | " +
      report.rows.length +
      " | " +
      (report.rows[0]?.date ?? "") +
      " – " +
      (report.rows.at(-1)?.date ?? "") +
      " | " +
      metrics.map((metric) => report.coverage[metric] + "/10").join(" | ") +
      " |",
  ),
  "",
  "## Evidence and verification",
  "",
  ...reports.flatMap((report) => [
    "### " + report.symbol,
    "",
    "[Company Facts](" +
      report.companyFactsUrl +
      "). Detailed values and provenance: [" +
      report.symbol +
      "-annual.json](" +
      report.symbol +
      "-annual.json).",
    "Latest filing verification: " +
      report.latestFilingVerification.status +
      ". " +
      (report.latestFilingVerification.documentUrl
        ? "[Filed 10-K](" + report.latestFilingVerification.documentUrl + ")."
        : (report.latestFilingVerification.reason ?? "")),
    ...(report.latestFilingVerification.checks ?? []).map(
      (check) => "- " + check.metric + ": " + check.status,
    ),
    ...(report.yahooComparison?.differences ?? []).map(
      (point) =>
        "- Yahoo difference " +
        point.date +
        " " +
        point.metric +
        ": SEC " +
        point.sec +
        "; Yahoo " +
        point.yahoo +
        ".",
    ),
    ...report.issues.map((issue) => "- Review: " + issue),
    "",
  ]),
  "## Limits",
  "",
  "- USD, standard US-GAAP and annual 10-K/10-K/A facts only. No custom tags, IFRS, quarterly/TTM normalization, or production mapping.",
  "- Missing/ambiguous values remain unavailable. Financial companies need separate metric definitions; do not invent gross profit or FCF for banks.",
  "- FCF is explicitly calculated as reported operating cash flow minus cash payments for PP&E, only from the same filing and period.",
  "- Latest disclosed values may reflect restatements; FY labels on comparative facts are not used as the reporting year.",
  "- EPS is as disclosed in the selected filing, not consistently adjusted for all historical stock splits. Do not publish an EPS growth chart before reconciling splits.",
  "- Yahoo and SEC metrics are not guaranteed to have identical accounting definitions. Differences require review; do not stitch them into a single chart.",
  "- Source requests are cached locally; --refresh is required to replace cached source files.",
  "",
];
await writeFile(path.join(outDir, "report.md"), lines.join("\n"));
await writeFile(path.join(outDir, "summary.json"), JSON.stringify({ asOf, reports }, null, 2));
console.log("Report: " + path.join(outDir, "report.md"));
