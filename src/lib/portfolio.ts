export type AssetType = "stock" | "etf" | "crypto" | "bond" | "cash" | "realEstate";
export type TxKind = "buy" | "sell" | "dividend";
export type Currency = "USD" | "EUR";
export const QUOTE_STALE_AFTER_MS = 4 * 86400000;

export function isQuoteFresh(at: string | null | undefined, now = Date.now()): boolean {
  const timestamp = at ? Date.parse(at) : Number.NaN;
  const age = now - timestamp;
  return Number.isFinite(timestamp) && age >= -5 * 60_000 && age <= QUOTE_STALE_AFTER_MS;
}

export function isUsableQuote(
  price: number | null | undefined,
  at: string | null | undefined,
  now = Date.now(),
): price is number {
  return typeof price === "number" && Number.isFinite(price) && price > 0 && isQuoteFresh(at, now);
}

export function isQuoteStale(at: string | undefined, now = Date.now()): boolean {
  const timestamp = at ? Date.parse(at) : Number.NaN;
  return Number.isFinite(timestamp) && now - timestamp > QUOTE_STALE_AFTER_MS;
}

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: AssetType;
  sector: string;
  region: string;
  price: number; // USD; NaN means unavailable
  change24h: number; // percent
  dividendPerShare: number; // annual USD
  payMonths: number[]; // 0-11
  quoteCurrency?: string;
  quoteNativePrice?: number; // price in quoteCurrency, as quoted by the provider
  quoteAt?: string;
  quoteFxAt?: string;
  quoteFxSource?: string;
  bondCouponRate?: number;
  bondMaturityDate?: string;
  bondFaceValue?: number;
}

export function projectedBondCoupon(
  asset: Pick<Asset, "bondCouponRate" | "bondMaturityDate" | "bondFaceValue">,
  quantity: number,
  asOfDate = new Date(),
): number | undefined {
  if (asset.bondCouponRate === undefined || asset.bondFaceValue === undefined) return undefined;
  const today = `${asOfDate.getFullYear()}-${String(asOfDate.getMonth() + 1).padStart(2, "0")}-${String(
    asOfDate.getDate(),
  ).padStart(2, "0")}`;
  if (asset.bondMaturityDate && asset.bondMaturityDate < today) return undefined;
  return quantity * asset.bondFaceValue * (asset.bondCouponRate / 100);
}

export interface Transaction {
  id: string;
  assetId: string;
  brokerId?: string | null;
  kind: TxKind;
  quantity: number;
  price: number; // USD; NaN means unavailable per unit (for dividend: total amount in USD, quantity=1)
  fee?: number; // USD
  date: string; // ISO date
  sourceTransactionId?: string;
}

export interface BrokerTransfer {
  id: string;
  assetId: string;
  fromBrokerId: string;
  toBrokerId: string;
  quantity: number;
  date: string;
  createdAt?: string;
}

export interface BrokerHolding {
  brokerId: string;
  asset: Asset;
  quantity: number;
  costBasis: number;
  value: number;
}

export interface CorporateAction {
  assetId: string;
  date: string;
  numerator: number;
  denominator: number;
}

export function normalizeTransactionsForSplits(
  transactions: Transaction[],
  actions: CorporateAction[],
): Transaction[] {
  const sortedActions = [...actions].sort((a, b) => a.date.localeCompare(b.date));
  for (const action of sortedActions) {
    const dateTimestamp = Date.parse(`${action.date}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(action.date) ||
      !Number.isFinite(dateTimestamp) ||
      new Date(dateTimestamp).toISOString().slice(0, 10) !== action.date ||
      !(action.numerator > 0) ||
      !(action.denominator > 0) ||
      !Number.isFinite(action.numerator / action.denominator)
    )
      throw new Error("Invalid stock split data");
  }
  return transactions.map((transaction) => {
    if (transaction.kind === "dividend") return transaction;
    const factor = sortedActions.reduce(
      (total, action) =>
        action.assetId === transaction.assetId && transaction.date < action.date
          ? total * (action.numerator / action.denominator)
          : total,
      1,
    );
    if (!Number.isFinite(factor) || factor <= 0) throw new Error("Invalid stock split factor");
    return factor === 1
      ? transaction
      : {
          ...transaction,
          quantity: transaction.quantity * factor,
          price: transaction.price / factor,
        };
  });
}

export interface Holding {
  asset: Asset;
  quantity: number;
  avgCost: number;
  costBasis: number;
  value: number;
  pnl: number;
  pnlPct: number;
  dayChange: number;
}

export const FX: Record<Currency, number> = { USD: 1, EUR: Number.NaN };

/** Trading currency of an asset (used for currency breakdown). */
export function assetCurrency(a: Asset): string {
  if (a.quoteCurrency) return a.quoteCurrency;
  if (a.type === "crypto") return "USD";
  if (a.type === "cash") return "EUR";
  return a.region === "Europe" ? "EUR" : "USD";
}

/** Per-period returns (%) of a value series, e.g. month by month. */
export function periodReturns(series: { t: number; v: number }[], buckets: number) {
  if (series.length < 2) return [];
  const step = Math.max(1, Math.floor((series.length - 1) / buckets));
  const out: { t: number; r: number }[] = [];
  for (let i = step; i < series.length; i += step) {
    out.push({ t: series[i]!.t, r: (series[i]!.v / series[i - step]!.v - 1) * 100 });
  }
  return out;
}

export function computeHoldings(
  assets: Asset[],
  txs: Transaction[],
  splits: CorporateAction[] = [],
): Holding[] {
  const sorted = normalizeTransactionsForSplits(txs, splits).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const map = new Map<string, { qty: number; cost: number }>();
  for (const t of sorted) {
    if (t.kind === "dividend") continue;
    const h = map.get(t.assetId) ?? { qty: 0, cost: 0 };
    if (t.kind === "buy") {
      h.qty += t.quantity;
      h.cost += t.quantity * t.price + (t.fee ?? 0);
    } else {
      const sellQty = Math.min(t.quantity, h.qty);
      const avg = h.qty > 0 ? h.cost / h.qty : 0;
      h.qty -= sellQty;
      h.cost -= avg * sellQty;
    }
    map.set(t.assetId, h);
  }
  const out: Holding[] = [];
  for (const a of assets) {
    const h = map.get(a.id);
    if (!h || h.qty <= 1e-9) continue;
    const value = h.qty * a.price;
    const pnl = value - h.cost;
    out.push({
      asset: a,
      quantity: h.qty,
      avgCost: h.cost / h.qty,
      costBasis: h.cost,
      value,
      pnl,
      pnlPct: h.cost > 0 ? (pnl / h.cost) * 100 : 0,
      dayChange: value - value / (1 + a.change24h / 100),
    });
  }
  return out.sort((a, b) => b.value - a.value);
}

export function brokerHoldings(
  assets: Asset[],
  transactions: Transaction[],
  transfers: BrokerTransfer[],
  splits: CorporateAction[] = [],
  asOfDate?: string,
): BrokerHolding[] {
  if (asOfDate) {
    const timestamp = Date.parse(`${asOfDate}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(asOfDate) ||
      !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString().slice(0, 10) !== asOfDate
    )
      throw new Error("Invalid broker holdings date");
  }

  const relevantSplits = asOfDate ? splits.filter((action) => action.date <= asOfDate) : splits;
  const relevantTransactions = asOfDate
    ? transactions.filter((transaction) => transaction.date <= asOfDate)
    : transactions;
  const relevantTransfers = asOfDate
    ? transfers.filter((transfer) => transfer.date <= asOfDate)
    : transfers;
  const sortedTransfers = [...relevantTransfers].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.createdAt ?? "").localeCompare(b.createdAt ?? "") ||
      a.id.localeCompare(b.id),
  );
  const events: (
    | { date: string; order: number; sequence: number; transaction: Transaction }
    | { date: string; order: number; sequence: number; transfer: BrokerTransfer }
  )[] = [
    ...normalizeTransactionsForSplits(relevantTransactions, relevantSplits).map(
      (transaction, sequence) => ({
        date: transaction.date,
        order: 0,
        sequence,
        transaction,
      }),
    ),
    ...sortedTransfers.map((transfer, sequence) => {
      const timestamp = Date.parse(`${transfer.date}T00:00:00Z`);
      if (
        !Number.isFinite(timestamp) ||
        new Date(timestamp).toISOString().slice(0, 10) !== transfer.date ||
        !Number.isFinite(transfer.quantity) ||
        transfer.quantity <= 0 ||
        transfer.fromBrokerId === transfer.toBrokerId
      )
        throw new Error("Invalid broker transfer");
      const factor = relevantSplits.reduce(
        (total, action) =>
          action.assetId === transfer.assetId && transfer.date < action.date
            ? total * (action.numerator / action.denominator)
            : total,
        1,
      );
      if (!Number.isFinite(factor) || factor <= 0) throw new Error("Invalid broker transfer split");
      return {
        date: transfer.date,
        order: 1,
        sequence,
        transfer: { ...transfer, quantity: transfer.quantity * factor },
      };
    }),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order || a.sequence - b.sequence);
  type Lot = { quantity: number; costPerUnit: number; acquiredAt: string; order: number };
  const accounts = new Map<string, Map<string, Lot[]>>();
  const accountLots = (brokerId: string, assetId: string) => {
    let account = accounts.get(brokerId);
    if (!account) {
      account = new Map();
      accounts.set(brokerId, account);
    }
    let lots = account.get(assetId);
    if (!lots) {
      lots = [];
      account.set(assetId, lots);
    }
    return lots;
  };
  const addLot = (lots: Lot[], lot: Lot) => {
    let index = 0;
    while (
      index < lots.length &&
      (lots[index]!.acquiredAt < lot.acquiredAt ||
        (lots[index]!.acquiredAt === lot.acquiredAt && lots[index]!.order <= lot.order))
    )
      index++;
    lots.splice(index, 0, lot);
  };
  const consumeLots = (lots: Lot[], quantity: number) => {
    const moved: Lot[] = [];
    let remaining = quantity;
    while (remaining > 1e-12 && lots.length) {
      const lot = lots[0]!;
      const used = Math.min(remaining, lot.quantity);
      if (used > 0) moved.push({ ...lot, quantity: used });
      lot.quantity -= used;
      remaining -= used;
      if (lot.quantity <= 1e-12) lots.shift();
    }
    return { moved, remaining };
  };

  for (const [sequence, event] of events.entries()) {
    if ("transaction" in event) {
      const transaction = event.transaction;
      const lots = accountLots(transaction.brokerId ?? "manual", transaction.assetId);
      if (transaction.kind === "dividend") continue;
      if (transaction.kind === "buy") {
        addLot(lots, {
          quantity: transaction.quantity,
          costPerUnit: transaction.price + (transaction.fee ?? 0) / transaction.quantity,
          acquiredAt: transaction.date,
          order: sequence,
        });
      } else {
        consumeLots(lots, transaction.quantity);
      }
      continue;
    }

    const { transfer } = event;
    const sourceLots = accountLots(transfer.fromBrokerId, transfer.assetId);
    const { moved, remaining } = consumeLots(sourceLots, transfer.quantity);
    if (remaining > 1e-9) throw new Error("Broker transfer exceeds available holdings");
    const destinationLots = accountLots(transfer.toBrokerId, transfer.assetId);
    for (const lot of moved) addLot(destinationLots, lot);
  }

  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  return [...accounts].flatMap(([brokerId, positions]) =>
    [...positions].flatMap(([assetId, lots]) => {
      const asset = assetsById.get(assetId);
      const quantity = lots.reduce((total, lot) => total + lot.quantity, 0);
      if (!asset || quantity <= 1e-9) return [];
      return [
        {
          brokerId,
          asset,
          quantity,
          costBasis: lots.reduce((total, lot) => total + lot.quantity * lot.costPerUnit, 0),
          value: quantity * asset.price,
        },
      ];
    }),
  );
}

export function accountValues(
  assets: Asset[],
  transactions: Transaction[],
  brokers: { id: string; name: string }[],
  splits: CorporateAction[] = [],
  transfers: BrokerTransfer[] = [],
): { id: string; name: string | null; value: number | null; missingQuotes: number }[] {
  const names = new Map(brokers.map((broker) => [broker.id, broker.name]));
  const accountIds = new Set([
    ...transactions.map((transaction) => transaction.brokerId ?? "manual"),
    ...transfers.flatMap((transfer) => [transfer.fromBrokerId, transfer.toBrokerId]),
  ]);
  const holdings = brokerHoldings(assets, transactions, transfers, splits);
  return [...accountIds]
    .map((id) => {
      const accountHoldings = holdings.filter((holding) => holding.brokerId === id);
      const missingQuotes = accountHoldings.filter(
        (holding) => !Number.isFinite(holding.value),
      ).length;
      return {
        id,
        name: names.get(id) ?? null,
        value:
          missingQuotes > 0
            ? null
            : accountHoldings.reduce((sum, holding) => sum + holding.value, 0),
        missingQuotes,
      };
    })
    .sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
}

export function totalDividends(txs: Transaction[]) {
  return txs
    .filter((t) => t.kind === "dividend")
    .reduce((s, t) => s + t.quantity * t.price - (t.fee ?? 0), 0);
}

/** Money-weighted return (annualised IRR) via bisection. Flows: negative = invested. */
export function irr(flows: { date: Date; amount: number }[]): number | null {
  if (
    flows.length < 2 ||
    flows.some((flow) => !Number.isFinite(flow.date.getTime()) || !Number.isFinite(flow.amount)) ||
    !flows.some((flow) => flow.amount < 0) ||
    !flows.some((flow) => flow.amount > 0)
  )
    return null;
  const sorted = [...flows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const t0 = sorted[0]!.date.getTime();
  const npv = (r: number) =>
    sorted.reduce(
      (s, f) => s + f.amount / Math.pow(1 + r, (f.date.getTime() - t0) / 31557600000),
      0,
    );
  let lo = -0.99,
    hi = 10;
  let loValue = npv(lo);
  const hiValue = npv(hi);
  if (!Number.isFinite(loValue) || !Number.isFinite(hiValue)) return null;
  if (loValue === 0) return lo * 100;
  if (hiValue === 0) return hi * 100;
  if (Math.sign(loValue) === Math.sign(hiValue)) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const midValue = npv(mid);
    if (!Number.isFinite(midValue)) return null;
    if (midValue === 0) return mid * 100;
    if (Math.sign(loValue) !== Math.sign(midValue)) hi = mid;
    else {
      lo = mid;
      loValue = midValue;
    }
  }
  return ((lo + hi) / 2) * 100;
}

export function portfolioIrr(
  txs: Transaction[],
  currentValue: number,
  now = new Date(),
): number | null {
  if (!Number.isFinite(currentValue) || !Number.isFinite(now.getTime())) return null;
  const flows = [...txs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => ({
      date: new Date(t.date),
      amount:
        t.kind === "buy"
          ? -(t.quantity * t.price + (t.fee ?? 0))
          : t.kind === "sell"
            ? t.quantity * t.price - (t.fee ?? 0)
            : t.quantity * t.price - (t.fee ?? 0),
    }));
  flows.push({ date: now, amount: currentValue });
  return irr(flows);
}

export type Period = "1D" | "1W" | "1M" | "1Y" | "ALL";

/** Time-weighted return over a series (chain-linked period returns). */
export function ttwror(series: { v: number }[]) {
  let g = 1;
  for (let i = 1; i < series.length; i++) g *= series[i]!.v / series[i - 1]!.v;
  return (g - 1) * 100;
}

export interface DividendEvent {
  assetId: string;
  symbol: string;
  name: string;
  date: Date;
  amount: number;
  paid: boolean;
}

export function groupBy(holdings: Holding[], key: (h: Holding) => string) {
  const m = new Map<string, number>();
  for (const h of holdings) m.set(key(h), (m.get(key(h)) ?? 0) + h.value);
  return [...m.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}
