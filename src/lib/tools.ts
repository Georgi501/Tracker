import {
  normalizeTransactionsForSplits,
  type Asset,
  type CorporateAction,
  type Holding,
  type Transaction,
} from "./portfolio";
import type { PortfolioPoint } from "./history";
import type { Lang } from "./i18n";

export interface RealizedLot {
  assetId: string;
  date: string;
  acquiredDate?: string | undefined;
  quantity: number;
  proceeds: number;
  cost: number;
  fee?: number | undefined;
  gain: number;
}
export interface TaxDividendRow {
  assetId: string;
  date: string;
  gross: number;
  fee: number;
  net: number;
}
export interface TaxYear {
  year: number;
  yearEnd: number;
  realized: number;
  proceeds: number;
  cost: number;
  dividends: number;
  sales: RealizedLot[];
  dividendRows?: TaxDividendRow[] | undefined;
}

export interface FifoSalePreview {
  quantity: number;
  proceeds: number;
  cost: number;
  gain: number;
}

export interface AssetReturnSeries {
  symbol: string;
  weight: number;
  prices: { date: string; value: number }[];
}

export interface DividendIncomeSummary {
  currentMonth: number;
  previousMonth: number;
  yearToDate: number;
  previousYearToDate: number;
  excludedTransactions: number;
  monthly: { month: string; amount: number }[];
  byAsset: { assetId: string; symbol: string; amount: number }[];
}

export function dividendIncomeSummary(
  transactions: Transaction[],
  assets: Pick<Asset, "id" | "symbol">[],
  asOfDate = new Date().toISOString().slice(0, 10),
): DividendIncomeSummary {
  const [yearText = "", monthText = "", dayText = ""] = asOfDate.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const validAsOf =
    /^\d{4}-\d{2}-\d{2}$/.test(asOfDate) &&
    Number.isInteger(year) &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (!validAsOf) throw new Error("Invalid dividend summary date");

  const currentMonth = asOfDate.slice(0, 7);
  const previousMonthDate = new Date(Date.UTC(year, month - 2, 1));
  const previousMonth = previousMonthDate.toISOString().slice(0, 7);
  const previousYear = year - 1;
  const previousYearLastDay = new Date(Date.UTC(previousYear, month, 0)).getUTCDate();
  const previousYearCutoff = `${previousYearText(previousYear)}-${monthText}-${String(Math.min(day, previousYearLastDay)).padStart(2, "0")}`;
  const monthly = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 12 + index, 1));
    return { month: date.toISOString().slice(0, 7), amount: 0 };
  });
  const monthlyByKey = new Map(monthly.map((item) => [item.month, item]));
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const byAsset = new Map<string, number>();
  let currentMonthTotal = 0;
  let previousMonthTotal = 0;
  let yearToDate = 0;
  let previousYearToDate = 0;
  let excludedTransactions = 0;

  for (const transaction of transactions) {
    if (transaction.kind !== "dividend") continue;
    const amount = transaction.quantity * transaction.price - (transaction.fee ?? 0);
    const transactionDate = new Date(`${transaction.date}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date) ||
      !Number.isFinite(transactionDate.getTime()) ||
      transactionDate.toISOString().slice(0, 10) !== transaction.date ||
      !Number.isFinite(amount) ||
      transaction.date > asOfDate
    ) {
      excludedTransactions++;
      continue;
    }
    const transactionMonth = transaction.date.slice(0, 7);
    const monthPoint = monthlyByKey.get(transactionMonth);
    if (monthPoint) monthPoint.amount += amount;
    if (transactionMonth === currentMonth) currentMonthTotal += amount;
    if (transactionMonth === previousMonth) previousMonthTotal += amount;
    if (transaction.date >= `${yearText}-01-01` && transaction.date <= asOfDate) {
      yearToDate += amount;
      byAsset.set(transaction.assetId, (byAsset.get(transaction.assetId) ?? 0) + amount);
    }
    if (transaction.date >= `${previousYear}-01-01` && transaction.date <= previousYearCutoff)
      previousYearToDate += amount;
  }
  return {
    currentMonth: currentMonthTotal,
    previousMonth: previousMonthTotal,
    yearToDate,
    previousYearToDate,
    excludedTransactions,
    monthly,
    byAsset: [...byAsset]
      .map(([assetId, amount]) => ({
        assetId,
        symbol: assetsById.get(assetId)?.symbol ?? "?",
        amount,
      }))
      .sort((a, b) => b.amount - a.amount),
  };
}

function previousYearText(year: number): string {
  return String(year).padStart(4, "0");
}

export function assetRiskAnalysis(series: AssetReturnSeries[]) {
  const eligible = series.filter((item) => item.weight > 0 && item.prices.length >= 2);
  if (eligible.length < 2) return null;
  const commonDates = eligible.reduce(
    (dates, item) => new Set([...dates].filter((date) => item.prices.some((p) => p.date === date))),
    new Set(eligible[0]!.prices.map((point) => point.date)),
  );
  const dates = [...commonDates].sort();
  if (dates.length < 31) return null;
  const returns = eligible.map((item) => {
    const byDate = new Map(item.prices.map((point) => [point.date, point.value]));
    return dates.slice(1).map((date, index) => {
      const current = byDate.get(date);
      const previous = byDate.get(dates[index]!);
      return current && previous ? current / previous - 1 : Number.NaN;
    });
  });
  if (returns.some((values) => values.some((value) => !Number.isFinite(value)))) return null;
  const means = returns.map(
    (values) => values.reduce((sum, value) => sum + value, 0) / values.length,
  );
  const cov = returns.map((left, i) =>
    returns.map((right, j) => {
      const total = left.reduce(
        (sum, value, index) => sum + (value - means[i]!) * (right[index]! - means[j]!),
        0,
      );
      return total / (left.length - 1);
    }),
  );
  if (cov.some((row, index) => !(row[index]! > 0))) return null;
  const totalWeight = eligible.reduce((sum, item) => sum + item.weight, 0);
  const weights = eligible.map((item) => item.weight / totalWeight);
  const variance = weights.reduce(
    (sum, weight, i) =>
      sum + weights.reduce((inner, other, j) => inner + weight * other * cov[i]![j]!, 0),
    0,
  );
  if (!(variance > 0)) return null;
  const volatility = Math.sqrt(variance * 252);
  const correlations = eligible.map((item, i) => ({
    symbol: item.symbol,
    values: eligible.map((other, j) => ({
      symbol: other.symbol,
      value: cov[i]![j]! / Math.sqrt(cov[i]![i]! * cov[j]![j]!),
    })),
  }));
  const contributions = eligible.map((item, i) => ({
    symbol: item.symbol,
    share:
      (weights[i]! * weights.reduce((sum, other, j) => sum + other * cov[i]![j]!, 0)) / variance,
  }));
  return { observations: dates.length - 1, volatility, correlations, contributions };
}

/** Estimates FIFO proceeds and gain for a hypothetical sale; it never changes transactions. */
export function fifoSalePreview(
  txs: Transaction[],
  assetId: string,
  quantity: number,
  price: number,
  splits: CorporateAction[] = [],
): FifoSalePreview | null {
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0)
    return null;

  const lots: { quantity: number; costPerUnit: number }[] = [];
  for (const transaction of normalizeTransactionsForSplits(txs, splits)
    .filter((item) => item.assetId === assetId && item.kind !== "dividend")
    .sort((a, b) => a.date.localeCompare(b.date))) {
    if (
      !Number.isFinite(transaction.quantity) ||
      transaction.quantity <= 0 ||
      !Number.isFinite(transaction.price) ||
      transaction.price < 0 ||
      (transaction.fee !== undefined && (!Number.isFinite(transaction.fee) || transaction.fee < 0))
    )
      return null;
    if (transaction.kind === "buy") {
      lots.push({
        quantity: transaction.quantity,
        costPerUnit: transaction.price + (transaction.fee ?? 0) / transaction.quantity,
      });
      continue;
    }

    let remaining = transaction.quantity;
    while (remaining > 1e-12 && lots.length) {
      const lot = lots[0]!;
      const used = Math.min(remaining, lot.quantity);
      lot.quantity -= used;
      remaining -= used;
      if (lot.quantity <= 1e-12) lots.shift();
    }
  }

  const available = lots.reduce((sum, lot) => sum + lot.quantity, 0);
  if (quantity > available + 1e-9) return null;
  let remaining = quantity;
  let cost = 0;
  while (remaining > 1e-12 && lots.length) {
    const lot = lots[0]!;
    const used = Math.min(remaining, lot.quantity);
    cost += used * lot.costPerUnit;
    lot.quantity -= used;
    remaining -= used;
    if (lot.quantity <= 1e-12) lots.shift();
  }
  const proceeds = quantity * price;
  return { quantity, proceeds, cost, gain: proceeds - cost };
}

/** FIFO realized gains per sale, plus dividends, grouped by a configurable tax-year start month (USD). */
export function fifoTaxReport(
  txs: Transaction[],
  taxYearStartMonth = 1,
  splits: CorporateAction[] = [],
): TaxYear[] {
  if (!Number.isInteger(taxYearStartMonth) || taxYearStartMonth < 1 || taxYearStartMonth > 12)
    throw new Error("Tax year start month must be between 1 and 12");
  const sorted = normalizeTransactionsForSplits(txs, splits).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const lots = new Map<string, { qty: number; costPerUnit: number; date: string }[]>();
  const years = new Map<number, TaxYear>();
  const yearOf = (d: string) => {
    const calendarYear = Number(d.slice(0, 4));
    const month = Number(d.slice(5, 7));
    const y = month < taxYearStartMonth ? calendarYear - 1 : calendarYear;
    let r = years.get(y);
    if (!r) {
      r = {
        year: y,
        yearEnd: taxYearStartMonth === 1 ? y : y + 1,
        realized: 0,
        proceeds: 0,
        cost: 0,
        dividends: 0,
        sales: [],
        dividendRows: [],
      };
      years.set(y, r);
    }
    return r;
  };
  for (const t of sorted) {
    if (t.kind === "dividend") {
      const gross = t.quantity * t.price;
      const fee = t.fee ?? 0;
      const net = gross - fee;
      const y = yearOf(t.date);
      y.dividends += net;
      y.dividendRows?.push({ assetId: t.assetId, date: t.date, gross, fee, net });
      continue;
    }
    const queue = lots.get(t.assetId) ?? [];
    lots.set(t.assetId, queue);
    if (t.kind === "buy") {
      queue.push({
        qty: t.quantity,
        costPerUnit: t.price + (t.fee ?? 0) / t.quantity,
        date: t.date,
      });
      continue;
    }
    let left = t.quantity;
    let cost = 0;
    let matched = 0;
    const acquiredDates: string[] = [];
    while (left > 1e-12 && queue.length) {
      const lot = queue[0]!;
      const take = Math.min(lot.qty, left);
      cost += take * lot.costPerUnit;
      matched += take;
      if (!acquiredDates.includes(lot.date)) acquiredDates.push(lot.date);
      lot.qty -= take;
      left -= take;
      if (lot.qty <= 1e-12) queue.shift();
    }
    if (matched <= 0) continue;
    const saleFee = (t.fee ?? 0) * (matched / t.quantity);
    const proceeds = matched * t.price - saleFee;
    const acquiredDate =
      acquiredDates.length <= 1
        ? (acquiredDates[0] ?? t.date)
        : `${acquiredDates[0]} – ${acquiredDates[acquiredDates.length - 1]}`;
    const y = yearOf(t.date);
    y.sales.push({
      assetId: t.assetId,
      date: t.date,
      acquiredDate,
      quantity: matched,
      proceeds,
      cost,
      fee: saleFee,
      gain: proceeds - cost,
    });
    y.realized += proceeds - cost;
    y.proceeds += proceeds;
    y.cost += cost;
  }
  return [...years.values()].sort((a, b) => b.year - a.year);
}

/** Buy-only rebalancing: split new cash so classes move toward targets (%) without selling. */
export function rebalance(
  current: Record<string, number>,
  targets: Record<string, number>,
  cash: number,
): Record<string, number> {
  const keys = Object.keys(targets).filter((k) => targets[k]! > 0);
  const out: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
  const sumT = keys.reduce((s, k) => s + targets[k]!, 0);
  if (!(cash > 0) || sumT <= 0) return out;
  const total = keys.reduce((s, k) => s + (current[k] ?? 0), 0) + cash;
  const gaps = keys.map((k) => ({
    k,
    gap: Math.max(0, (targets[k]! / sumT) * total - (current[k] ?? 0)),
  }));
  const sumGap = gaps.reduce((s, g) => s + g.gap, 0);
  for (const g of gaps)
    out[g.k] = sumGap > 0 ? (g.gap / sumGap) * cash : (targets[g.k]! / sumT) * cash;
  return out;
}

export interface RiskMetrics {
  volatility: number;
  maxDrawdown: number;
  sharpe: number;
  sortino: number;
}
/** Annualized volatility, max drawdown (flow-adjusted index) and Sharpe from daily points; null if too short. */
export function riskMetrics(points: PortfolioPoint[], riskFreePct = 0): RiskMetrics | null {
  const rets: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (a.v <= 0) continue;
    if (b.v - b.flow < 0) return null;
    rets.push((b.v - b.flow) / a.v - 1);
  }
  if (rets.length < 10) return null;
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const sd = Math.sqrt(rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1));
  let idx = 1;
  let peak = 1;
  let mdd = 0;
  for (const r of rets) {
    idx *= 1 + r;
    peak = Math.max(peak, idx);
    mdd = Math.min(mdd, idx / peak - 1);
  }
  const vol = sd * Math.sqrt(365);
  const annual = mean * 365;
  const down =
    Math.sqrt(rets.reduce((s, r) => s + Math.min(0, r) ** 2, 0) / rets.length) * Math.sqrt(365);
  return {
    volatility: vol * 100,
    maxDrawdown: mdd * 100,
    sharpe: vol > 0 ? (annual - riskFreePct / 100) / vol : 0,
    sortino: down > 0 ? (annual - riskFreePct / 100) / down : 0,
  };
}

export function exportCsv(assets: Asset[], txs: Transaction[]): string {
  const by = new Map(assets.map((a) => [a.id, a]));
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const rows = [...txs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => {
      const a = by.get(t.assetId);
      return [
        t.date,
        t.kind,
        a?.symbol ?? "",
        a?.name ?? "",
        a?.type ?? "",
        t.quantity,
        t.price,
        t.fee ?? 0,
      ]
        .map((v) => esc(String(v)))
        .join(",");
    });
  return [
    "date,type,symbol,name,asset_type,quantity,price,fee,currency",
    ...rows.map((row) => `${row},USD`),
  ].join("\n");
}

export function classValues(holdings: Holding[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const h of holdings)
    if (Number.isFinite(h.value)) out[h.asset.type] = (out[h.asset.type] ?? 0) + h.value;
  return out;
}

/** Spreadsheet-ready tax report: yearly summary rows followed by each FIFO sale (USD). */
export function taxReportCsv(years: TaxYear[], assets: Asset[]): string {
  const by = new Map(assets.map((a) => [a.id, a.symbol]));
  const r = (n: number) => n.toFixed(2);
  const lines = ["section,year,date,symbol,quantity,proceeds_usd,cost_usd,gain_usd,dividends_usd"];
  for (const y of years)
    lines.push(
      [
        "summary",
        y.yearEnd === y.year ? y.year : `${y.year}/${String(y.yearEnd).slice(-2)}`,
        "",
        "",
        "",
        r(y.proceeds),
        r(y.cost),
        r(y.realized),
        r(y.dividends),
      ].join(","),
    );
  for (const y of years)
    for (const s of y.sales)
      lines.push(
        [
          "sale",
          y.yearEnd === y.year ? y.year : `${y.year}/${String(y.yearEnd).slice(-2)}`,
          s.date,
          by.get(s.assetId) ?? "",
          s.quantity,
          r(s.proceeds),
          r(s.cost),
          r(s.gain),
          "",
        ].join(","),
      );
  return lines.join("\n");
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const TAX_REPORT_HTML_COPY: Record<
  Lang,
  {
    title: string;
    generated: string;
    summaryTitle: string;
    salesTitle: string;
    dividendsTitle: string;
    year: string;
    asset: string;
    acquired: string;
    sold: string;
    quantity: string;
    cost: string;
    fee: string;
    proceeds: string;
    gain: string;
    dividends: string;
    date: string;
    gross: string;
    net: string;
    emptySales: string;
    emptyDividends: string;
    disclaimer: string;
  }
> = {
  en: {
    title: "CapiSpot — Annual Tax Report (FIFO, USD)",
    generated: "Generated on",
    summaryTitle: "Annual Summary",
    salesTitle: "Realized Disposals (FIFO)",
    dividendsTitle: "Confirmed Dividends Received",
    year: "Tax year",
    asset: "Asset",
    acquired: "Acquired",
    sold: "Disposal date",
    quantity: "Quantity",
    cost: "Cost basis (USD)",
    fee: "Sale fee (USD)",
    proceeds: "Net proceeds (USD)",
    gain: "Realized P/L (USD)",
    dividends: "Net dividends (USD)",
    date: "Date",
    gross: "Gross (USD)",
    net: "Net (USD)",
    emptySales: "No realized sales recorded in this period.",
    emptyDividends: "No confirmed dividends recorded in this period.",
    disclaimer:
      "Informational FIFO report derived from your recorded portfolio transactions in USD. Verify against official broker statements and consult a qualified tax advisor before filing.",
  },
  bg: {
    title: "CapiSpot — Годишна данъчна справка (FIFO, USD)",
    generated: "Генерирана на",
    summaryTitle: "Годишно обобщение",
    salesTitle: "Реализирани продажби (FIFO)",
    dividendsTitle: "Получени потвърдени дивиденти",
    year: "Данъчна година",
    asset: "Актив",
    acquired: "Придобиване",
    sold: "Дата на продажба",
    quantity: "Количество",
    cost: "Себестойност (USD)",
    fee: "Такса продажба (USD)",
    proceeds: "Нетни постъпления (USD)",
    gain: "Реализирана П/З (USD)",
    dividends: "Нетни дивиденти (USD)",
    date: "Дата",
    gross: "Бруто (USD)",
    net: "Нето (USD)",
    emptySales: "Няма записани продажби за този период.",
    emptyDividends: "Няма записани дивиденти за този период.",
    disclaimer:
      "Информационна FIFO справка по записаните в портфолиото сделки в USD. Провери спрямо официалните брокерски извлечения и се консултирай с данъчен специалист.",
  },
  de: {
    title: "CapiSpot — Jährlicher Steuerbericht (FIFO, USD)",
    generated: "Erstellt am",
    summaryTitle: "Jahresübersicht",
    salesTitle: "Realisierte Verkäufe (FIFO)",
    dividendsTitle: "Erhaltene bestätigte Dividenden",
    year: "Steuerjahr",
    asset: "Wertpapier",
    acquired: "Erwerb",
    sold: "Verkaufsdatum",
    quantity: "Stückzahl",
    cost: "Einstandswert (USD)",
    fee: "Verkaufsgebühr (USD)",
    proceeds: "Nettoerlös (USD)",
    gain: "Realisierter G/V (USD)",
    dividends: "Nettodividenden (USD)",
    date: "Datum",
    gross: "Brutto (USD)",
    net: "Netto (USD)",
    emptySales: "Keine realisierten Verkäufe in diesem Zeitraum.",
    emptyDividends: "Keine bestätigten Dividenden in diesem Zeitraum.",
    disclaimer:
      "Informativer FIFO-Bericht basierend auf den erfassten Transaktionen in USD. Bitte mit offiziellen Broker-Abrechnungen abgleichen; keine Steuerberatung.",
  },
  es: {
    title: "CapiSpot — Informe Fiscal Anual (FIFO, USD)",
    generated: "Generado el",
    summaryTitle: "Resumen anual",
    salesTitle: "Ventas realizadas (FIFO)",
    dividendsTitle: "Dividendos confirmados recibidos",
    year: "Año fiscal",
    asset: "Activo",
    acquired: "Adquisición",
    sold: "Fecha de venta",
    quantity: "Cantidad",
    cost: "Coste (USD)",
    fee: "Comisión venta (USD)",
    proceeds: "Ingresos netos (USD)",
    gain: "G/P realizada (USD)",
    dividends: "Dividendos netos (USD)",
    date: "Fecha",
    gross: "Bruto (USD)",
    net: "Neto (USD)",
    emptySales: "No hay ventas realizadas en este período.",
    emptyDividends: "No hay dividendos registrados en este período.",
    disclaimer:
      "Informe informativo FIFO basado en las transacciones registradas en USD. Compruébalo con los extractos oficiales de tu bróker; no constituye asesoramiento fiscal.",
  },
  it: {
    title: "CapiSpot — Report Fiscale Annuale (FIFO, USD)",
    generated: "Generato il",
    summaryTitle: "Riepilogo annuale",
    salesTitle: "Vendite realizzate (FIFO)",
    dividendsTitle: "Dividendi confermati ricevuti",
    year: "Anno fiscale",
    asset: "Asset",
    acquired: "Acquisto",
    sold: "Data di vendita",
    quantity: "Quantità",
    cost: "Costo (USD)",
    fee: "Commissione vendita (USD)",
    proceeds: "Ricavi netti (USD)",
    gain: "P/L realizzato (USD)",
    dividends: "Dividendi netti (USD)",
    date: "Data",
    gross: "Lordo (USD)",
    net: "Netto (USD)",
    emptySales: "Nessuna vendita realizzata in questo periodo.",
    emptyDividends: "Nessun dividendo registrato in questo periodo.",
    disclaimer:
      "Report informativo FIFO basato sulle operazioni registrate in USD. Verifica con gli estratti conto ufficiali del broker; non costituisce consulenza fiscale.",
  },
};

/** Print/PDF-ready HTML annual tax report summarizing FIFO sales and confirmed dividends. */
export function taxReportHtml(
  years: TaxYear[],
  assets: Pick<Asset, "id" | "symbol" | "name">[],
  lang: Lang = "en",
  selectedYear?: number,
  generatedAt = new Date().toISOString().slice(0, 10),
): string {
  const c = TAX_REPORT_HTML_COPY[lang];
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const filteredYears =
    selectedYear !== undefined ? years.filter((item) => item.year === selectedYear) : years;
  const yearLabel = (y: TaxYear) =>
    y.yearEnd === y.year ? String(y.year) : `${y.year}/${String(y.yearEnd).slice(-2)}`;
  const money = (v: number, sign = false) => `${sign && v > 0 ? "+" : ""}${v.toFixed(2)}`;

  const summaryRows = filteredYears
    .map(
      (y) => `<tr>
        <td><strong>${escapeHtml(yearLabel(y))}</strong></td>
        <td class="num">${escapeHtml(money(y.proceeds))}</td>
        <td class="num">${escapeHtml(money(y.cost))}</td>
        <td class="num ${y.realized >= 0 ? "pos" : "neg"}">${escapeHtml(money(y.realized, true))}</td>
        <td class="num">${escapeHtml(money(y.dividends))}</td>
      </tr>`,
    )
    .join("");

  const salesSections = filteredYears
    .map((y) => {
      if (!y.sales.length) {
        return `<p class="muted">${escapeHtml(yearLabel(y))}: ${escapeHtml(c.emptySales)}</p>`;
      }
      const rows = y.sales
        .map((sale) => {
          const asset = byId.get(sale.assetId);
          const label = asset ? `${asset.symbol} — ${asset.name}` : sale.assetId;
          return `<tr>
            <td>${escapeHtml(yearLabel(y))}</td>
            <td><strong>${escapeHtml(label)}</strong></td>
            <td>${escapeHtml(sale.acquiredDate ?? "—")}</td>
            <td>${escapeHtml(sale.date)}</td>
            <td class="num">${escapeHtml(Number(sale.quantity.toFixed(6)))}</td>
            <td class="num">${escapeHtml(money(sale.cost))}</td>
            <td class="num">${escapeHtml(money(sale.fee ?? 0))}</td>
            <td class="num">${escapeHtml(money(sale.proceeds))}</td>
            <td class="num ${sale.gain >= 0 ? "pos" : "neg"}"><strong>${escapeHtml(money(sale.gain, true))}</strong></td>
          </tr>`;
        })
        .join("");
      return `<table>
        <thead><tr>
          <th>${escapeHtml(c.year)}</th>
          <th>${escapeHtml(c.asset)}</th>
          <th>${escapeHtml(c.acquired)}</th>
          <th>${escapeHtml(c.sold)}</th>
          <th class="num">${escapeHtml(c.quantity)}</th>
          <th class="num">${escapeHtml(c.cost)}</th>
          <th class="num">${escapeHtml(c.fee)}</th>
          <th class="num">${escapeHtml(c.proceeds)}</th>
          <th class="num">${escapeHtml(c.gain)}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    })
    .join("");

  const dividendSections = filteredYears
    .map((y) => {
      const divs = y.dividendRows ?? [];
      if (!divs.length) {
        return `<p class="muted">${escapeHtml(yearLabel(y))}: ${escapeHtml(c.emptyDividends)}</p>`;
      }
      const rows = divs
        .map((div) => {
          const asset = byId.get(div.assetId);
          const label = asset ? `${asset.symbol} — ${asset.name}` : div.assetId;
          return `<tr>
            <td>${escapeHtml(div.date)}</td>
            <td><strong>${escapeHtml(label)}</strong></td>
            <td class="num">${escapeHtml(money(div.gross))}</td>
            <td class="num">${escapeHtml(money(div.fee))}</td>
            <td class="num"><strong>${escapeHtml(money(div.net))}</strong></td>
          </tr>`;
        })
        .join("");
      return `<table>
        <thead><tr>
          <th>${escapeHtml(c.date)}</th>
          <th>${escapeHtml(c.asset)}</th>
          <th class="num">${escapeHtml(c.gross)}</th>
          <th class="num">${escapeHtml(c.fee)}</th>
          <th class="num">${escapeHtml(c.net)}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    })
    .join("");

  return `<!doctype html>
<html lang="${escapeHtml(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${escapeHtml(c.title)}</title>
<style>
body{font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#0f172a;margin:28px auto;max-width:1040px;padding:0 24px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:24px 0 8px;border-bottom:1px solid #cbd5e1;padding-bottom:4px}
p.meta{color:#475569;margin:0 0 20px;font-size:12px}p.muted{color:#64748b;font-size:12px;margin:8px 0}
table{border-collapse:collapse;width:100%;font-size:12px;margin-bottom:16px;font-variant-numeric:tabular-nums}
th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;overflow-wrap:anywhere}
th{background:#f1f5f9;font-weight:600}th.num,td.num{text-align:right}
.pos{color:#047857}.neg{color:#b91c1c}
footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;color:#64748b;font-size:11px}
@media print{body{margin:0 auto;padding:0 10mm}table,tr{break-inside:avoid}h2{break-after:avoid}}
</style></head><body>
<h1>${escapeHtml(c.title)}</h1>
<p class="meta">${escapeHtml(c.generated)}: ${escapeHtml(generatedAt)}</p>
<section>
  <h2>${escapeHtml(c.summaryTitle)}</h2>
  <table>
    <thead><tr>
      <th>${escapeHtml(c.year)}</th>
      <th class="num">${escapeHtml(c.proceeds)}</th>
      <th class="num">${escapeHtml(c.cost)}</th>
      <th class="num">${escapeHtml(c.gain)}</th>
      <th class="num">${escapeHtml(c.dividends)}</th>
    </tr></thead>
    <tbody>${summaryRows}</tbody>
  </table>
</section>
<section>
  <h2>${escapeHtml(c.salesTitle)}</h2>
  ${salesSections}
</section>
<section>
  <h2>${escapeHtml(c.dividendsTitle)}</h2>
  ${dividendSections}
</section>
<footer>${escapeHtml(c.disclaimer)}</footer>
</body></html>`;
}
