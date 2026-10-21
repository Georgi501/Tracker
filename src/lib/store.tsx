import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  FX, computeHoldings,
  type Asset, type AssetType, type Currency, type Transaction,
} from "./portfolio";
import { dictionaries, isLang, languageLocale, translateLabel, type Lang, type TKey } from "./i18n";
import { useServerFn } from "@tanstack/react-start";
import { getExchangeRate } from "./market.functions";
import { getQuotes } from "./quotes.functions";
import { convertImport } from "./history.functions";
import type { ImportedTx } from "./csv-import";
import { trackAnalyticsEvent } from "./analytics";

export interface Broker { id: string; name: string; format: string }

interface State {
  lang: Lang; setLang: (l: Lang) => void;
  currency: Currency; setCurrency: (c: Currency) => void;
  theme: "light" | "dark"; toggleTheme: () => void;
  user: User | null; isPro: boolean;
  displayName: string;
  assets: Asset[]; transactions: Transaction[]; brokers: Broker[];
  pricesLive: boolean; priceNote: string | null;
  eurPerUsd: number | null;
  addTransaction: (t: Omit<Transaction, "id">, newAsset?: Omit<Asset, "id">) => Promise<void>;
  importTransactions: (brokerId: string, rows: ImportedTx[]) => Promise<number>;
  reload: () => Promise<void>;
  t: (k: TKey) => string;
  label: (s: string) => string;
  money: (usd: number, opts?: { sign?: boolean; compact?: boolean }) => string;
  holdings: ReturnType<typeof computeHoldings>;
}
// Keep one context instance across hot reloads so provider and consumers never diverge.
const g = globalThis as { __folioCtx?: React.Context<State | null> };
const Ctx = (g.__folioCtx ??= createContext<State | null>(null));
const KEY = "folio-state-v2";

type AssetRow = { id: string; symbol: string; name: string; type: string; sector: string; region: string;
  manual_price: number | null; dividend_per_share: number; pay_months: number[] };

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [lang, setLangS] = useState<Lang>("en");
  const [currency, setCurrencyS] = useState<Currency>("EUR");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [user, setUser] = useState<User | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTx] = useState<Transaction[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [pricesLive, setPricesLive] = useState(false);
  const [priceNote, setPriceNote] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [eurPerUsd, setEurPerUsd] = useState<number | null>(null);
  const quoteFn = useServerFn(getQuotes);
  const fxFn = useServerFn(getExchangeRate);
  const convertFn = useServerFn(convertImport);

  useEffect(() => {
    const refresh = () => { void fxFn().then((r) => setEurPerUsd(r.eurPerUsd)).catch(() => setEurPerUsd(null)); };
    refresh(); const timer = setInterval(refresh, 60000); return () => clearInterval(timer);
  }, [fxFn]);

  // preferences (local)
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (s) { isLang(s.lang) && setLangS(s.lang); s.currency in FX && setCurrencyS(s.currency); s.theme && setTheme(s.theme); }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify({ lang, currency, theme }));
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.lang = lang;
  }, [loaded, lang, currency, theme]);

  // auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED" || event === "INITIAL_SESSION")
        setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => {
    if (!user) {
      setAssets([]); setTx([]); setBrokers([]); setIsPro(false); setPricesLive(false);
      return;
    }
    const [a, t, b, p, pro] = await Promise.all([
      supabase.from("assets").select("*"),
      supabase.from("transactions").select("*"),
      supabase.from("brokers").select("id,name,format").order("created_at"),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.rpc("is_pro", { _user_id: user.id }),
    ]);
    setIsPro(!!pro.data);
    setBrokers(b.data ?? []);
    if (p.data) {
      setDisplayName(p.data.display_name ?? "");
      if (isLang(p.data.lang)) setLangS(p.data.lang);
      if (p.data.currency in FX) setCurrencyS(p.data.currency as Currency);
    }
    const txs: Transaction[] = (t.data ?? []).map((r) => ({
      id: r.id, assetId: r.asset_id, kind: r.kind as Transaction["kind"],
      quantity: Number(r.quantity), price: Number(r.price), date: r.date,
    }));
    const rows = (a.data ?? []) as AssetRow[];
    const base: Asset[] = rows.map((r) => ({
      id: r.id, symbol: r.symbol, name: r.name, type: r.type as AssetType, sector: r.sector, region: r.region,
      price: r.type === "cash" ? 1 : Number.NaN, change24h: r.type === "cash" ? 0 : Number.NaN,
      dividendPerShare: Number(r.dividend_per_share), payMonths: r.pay_months ?? [],
    }));
    setTx(txs); setAssets(base);
    if (!base.length) return;
    try {
      const res = await quoteFn({ data: { items: base.map((x) => ({ symbol: x.symbol, type: x.type })) } });
      setAssets(base.map((x) => { const q = res.quotes[x.symbol]; return q ? { ...x, price: q.price, change24h: q.change ?? Number.NaN, quoteCurrency: q.currency, quoteAt: q.at } : x; }));
      setEurPerUsd(res.eurPerUsd);
      setPricesLive(Object.keys(res.quotes).length > 0);
      setPriceNote(res.missing.length ? "unavailable" : null);
    } catch (e) { console.error(e); setPriceNote("error"); }
  }, [user, quoteFn]);

  useEffect(() => { void reload(); const timer = setInterval(() => { void reload(); }, 60000); return () => clearInterval(timer); }, [reload]);

  const savePref = (patch: { lang?: string; currency?: string }) => {
    if (user) void supabase.from("profiles").update(patch).eq("id", user.id);
  };

  const ensureAsset = async (a: Omit<Asset, "id">): Promise<string> => {
    const existing = assets.find((x) => x.symbol.toUpperCase() === a.symbol.toUpperCase());
    if (existing) return existing.id;
    const { data, error } = await supabase.from("assets").insert({
      symbol: a.symbol.toUpperCase(), name: a.name, type: a.type, sector: a.sector, region: a.region,
      manual_price: a.type === "crypto" || a.type === "cash" ? null : a.price,
    }).select("id").single();
    if (error) throw error;
    return data.id;
  };

  const value = useMemo<State>(() => {
    const locale = languageLocale(lang);
    return {
      lang, currency, theme, user, isPro, displayName, assets, transactions, brokers, pricesLive, priceNote,
      eurPerUsd,
      setLang: (l) => { setLangS(l); savePref({ lang: l }); },
      setCurrency: (c) => { setCurrencyS(c); savePref({ currency: c }); },
      toggleTheme: () => setTheme((x) => (x === "dark" ? "light" : "dark")),
      reload,
      addTransaction: async (t, a) => {
        if (!user) throw new Error(dictionaries[lang].signIn);
        const assetId = a ? await ensureAsset(a) : t.assetId;
        const { error } = await supabase.from("transactions").insert({
          asset_id: assetId, kind: t.kind, quantity: t.quantity, price: t.price, date: t.date,
        });
        if (error) throw error;
        if (t.kind === "buy" && transactions.length === 0) trackAnalyticsEvent("first_holding_added");
        await reload();
      },
      importTransactions: async (brokerId, rows) => {
        if (!user) throw new Error("auth");
        const converted = await convertFn({ data: { rows: rows.map((r) => ({ ...r, currency: (r.currency ?? "USD") as "USD" | "EUR" | "BGN" | "GBX" | "GBP" })) } });
        const ids = new Map(assets.map((x) => [x.symbol.toUpperCase(), x.id]));
        for (const r of converted) {
          if (ids.has(r.symbol)) continue;
          const { data, error } = await supabase.from("assets").insert({
            symbol: r.symbol, name: r.name, type: r.assetType,
            region: r.assetType === "crypto" ? "Global" : "North America",
            sector: r.assetType === "crypto" ? "Crypto" : "Other",
          }).select("id").single();
          if (error) throw error;
          ids.set(r.symbol, data.id);
        }
        const { error } = await supabase.from("transactions").insert(converted.map((r) => {
          const assetId = ids.get(r.symbol);
          if (!assetId) throw new Error("Asset unavailable");
          return { asset_id: assetId, broker_id: brokerId, kind: r.kind, quantity: r.quantity, price: r.price, date: r.date };
        }));
        if (error) throw error;
        if (transactions.length === 0 && converted.some((transaction) => transaction.kind === "buy"))
          trackAnalyticsEvent("first_holding_added");
        await reload();
        return rows.length;
      },
      t: (k) => dictionaries[lang][k],
      label: (s) => translateLabel(s, lang),
      money: (usd, o) => {
        const rate = currency === "USD" ? 1 : eurPerUsd;
        if (!Number.isFinite(usd) || !rate) return "—";
        const v = usd * rate;
        const s = new Intl.NumberFormat(locale, {
          style: "currency", currency, notation: o?.compact ? "compact" : "standard",
          maximumFractionDigits: o?.compact ? 1 : 2,
        }).format(v);
        return o?.sign && v > 0 ? `+${s}` : s;
      },
      holdings: computeHoldings(assets, transactions),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, currency, theme, user, isPro, displayName, assets, transactions, brokers, pricesLive, priceNote, reload, eurPerUsd, convertFn]);

  return (
    <Ctx.Provider value={value}>
      {loaded ? children : <div className="min-h-screen bg-background" />}
    </Ctx.Provider>
  );
}

export function usePortfolio() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePortfolio outside provider");
  return c;
}

export const pct = (n: number, sign = true) => Number.isFinite(n) ? `${sign && n > 0 ? "+" : ""}${n.toFixed(2)}%` : "—";
