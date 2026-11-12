import type { User } from "@supabase/supabase-js";
import { createContext, useContext } from "react";
import type { ImportedTx } from "./csv-import";
import type { Lang, TKey } from "./i18n";
import type { LiveFx } from "./live-fx";
import type {
  Asset,
  BrokerTransfer,
  CorporateAction,
  Currency,
  Transaction,
  computeHoldings,
} from "./portfolio";
export interface Broker {
  id: string;
  name: string;
  format: string;
}

export interface ManualAssetValuation {
  id: string;
  assetId: string;
  date: string;
  priceUsd: number;
  note: string;
}

export interface State {
  lang: Lang;
  setLang: (l: Lang) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  user: User | null;
  authReady: boolean;
  authError: boolean;
  accessReady: boolean;
  portfolioReady: boolean;
  dataUpdatedAt: number | null;
  isPro: boolean;
  isAdmin: boolean;
  displayName: string;
  assets: Asset[];
  transactions: Transaction[];
  brokers: Broker[];
  brokerTransfers: BrokerTransfer[];
  corporateActions: CorporateAction[];
  manualValuations: ManualAssetValuation[];
  dataError: boolean;
  pricesLive: boolean;
  priceNote: string | null;
  eurPerUsd: number | null;
  liveFx: LiveFx | null;
  addTransaction: (t: Omit<Transaction, "id">, newAsset?: Omit<Asset, "id">) => Promise<void>;
  createBrokerTransfer: (transfer: Omit<BrokerTransfer, "id" | "createdAt">) => Promise<void>;
  updateBondPrice: (assetId: string, priceUsd: number) => Promise<void>;
  saveManualValuation: (
    assetId: string,
    date: string,
    priceUsd: number,
    note: string,
  ) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  restoreTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransactions: (ids: string[]) => Promise<number>;
  importTransactions: (
    brokerId: string | null,
    rows: ImportedTx[],
  ) => Promise<{ count: number; transactionIds: string[]; createdAssetIds: string[] }>;
  normalizeImportRows: (rows: ImportedTx[]) => Promise<ImportedTx[]>;
  undoImport: (transactionIds: string[], createdAssetIds: string[]) => Promise<number>;
  reload: () => Promise<void>;
  t: (k: TKey) => string;
  label: (s: string) => string;
  money: (usd: number, opts?: { sign?: boolean; compact?: boolean }) => string;
  /** Formats a USD amount in the asset's own quote currency; falls back to the base currency. */
  moneyFor: (
    usd: number,
    asset: Asset | undefined,
    opts?: { sign?: boolean; compact?: boolean },
  ) => string;
  holdings: ReturnType<typeof computeHoldings>;
}

export const g = globalThis as { __folioCtx?: React.Context<State | null> };

export const Ctx = (g.__folioCtx ??= createContext<State | null>(null));

export const PRERENDERED_PATHS: ReadonlySet<string> = new Set([
  "/",
  "/demo",
  "/import-demo",
  "/markets",
  "/compare",
  "/features",
  "/fifo-guide",
  "/trading212-import",
  "/capital-gains-tax",
  "/ibkr-import",
  "/dividend-tracker",
  "/average-cost",
  "/etf-vs-stocks",
  "/portfolio-in-eur",
  "/csv-import",
  "/revolut-import",
  "/pricing",
  "/terms",
  "/privacy",
  "/refund",
  "/disclaimer",
]);

export const isPrerenderedPath = (pathname: string) =>
  PRERENDERED_PATHS.has(pathname.replace(/\/+$/, "") || "/");

export function usePortfolio() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePortfolio outside provider");
  return c;
}

export const pct = (n: number, sign = true) =>
  Number.isFinite(n) ? `${sign && n > 0 ? "+" : ""}${n.toFixed(2)}%` : "—";
