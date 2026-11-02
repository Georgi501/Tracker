import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  FX,
  computeHoldings,
  type Asset,
  type AssetType,
  type CorporateAction,
  type Currency,
  type Transaction,
} from "./portfolio";
import { dictionaries, isLang, languageLocale, translateLabel, type Lang, type TKey } from "./i18n";
import { useServerFn } from "@tanstack/react-start";
import { getExchangeRate } from "./market.functions";
import { getQuotes } from "./quotes.functions";
import { convertImport } from "./history.functions";
import type { ImportedTx } from "./csv-import";
import { trackAnalyticsEvent } from "./analytics";
import { increasesOversellAmount } from "./quality";
import { isValidIsoDate } from "./history";

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

interface State {
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
  corporateActions: CorporateAction[];
  manualValuations: ManualAssetValuation[];
  dataError: boolean;
  pricesLive: boolean;
  priceNote: string | null;
  eurPerUsd: number | null;
  addTransaction: (t: Omit<Transaction, "id">, newAsset?: Omit<Asset, "id">) => Promise<void>;
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
// Keep one context instance across hot reloads so provider and consumers never diverge.
const g = globalThis as { __folioCtx?: React.Context<State | null> };
const Ctx = (g.__folioCtx ??= createContext<State | null>(null));
const KEY = "folio-state-v2";

type AssetRow = {
  id: string;
  symbol: string;
  name: string;
  type: string;
  sector: string;
  region: string;
  manual_price: number | null;
  dividend_per_share: number;
  pay_months: number[];
  bond_coupon_rate: number | null;
  bond_maturity_date: string | null;
  bond_face_value: number | null;
};

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [lang, setLangS] = useState<Lang>("en");
  const [currency, setCurrencyS] = useState<Currency>("EUR");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef(user);
  userRef.current = user;
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [portfolioReady, setPortfolioReady] = useState(false);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const assetsRef = useRef(assets);
  assetsRef.current = assets;
  const [transactions, setTx] = useState<Transaction[]>([]);
  const transactionsRef = useRef(transactions);
  transactionsRef.current = transactions;
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [corporateActions, setCorporateActions] = useState<CorporateAction[]>([]);
  const [manualValuations, setManualValuations] = useState<ManualAssetValuation[]>([]);
  const [dataError, setDataError] = useState(false);
  const [pricesLive, setPricesLive] = useState(false);
  const [priceNote, setPriceNote] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const authEventVersion = useRef(0);

  const [eurPerUsd, setEurPerUsd] = useState<number | null>(null);
  const quoteFn = useServerFn(getQuotes);
  const fxFn = useServerFn(getExchangeRate);
  const convertFn = useServerFn(convertImport);
  const holdings = useMemo(
    () => computeHoldings(assets, transactions, corporateActions),
    [assets, transactions, corporateActions],
  );

  useEffect(() => {
    const refresh = () => {
      void fxFn()
        .then((r) => setEurPerUsd(r.eurPerUsd))
        .catch(() => setEurPerUsd(null));
    };
    refresh();
    const timer = setInterval(refresh, 300000);
    return () => clearInterval(timer);
  }, [fxFn]);

  // preferences (local)
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (s) {
        if (isLang(s.lang)) setLangS(s.lang);
        if (s.currency in FX) setCurrencyS(s.currency);
        if (s.theme) setTheme(s.theme);
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify({ lang, currency, theme }));
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.lang = lang;
  }, [loaded, lang, currency, theme]);

  // auth
  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED" ||
        event === "INITIAL_SESSION"
      ) {
        authEventVersion.current++;
        const nextUser = session?.user ?? null;
        const previousUserId = userRef.current?.id;
        userRef.current = nextUser;
        if (nextUser?.id !== previousUserId) {
          setAssets([]);
          setTx([]);
          setBrokers([]);
          setCorporateActions([]);
          setManualValuations([]);
          setIsPro(false);
          setIsAdmin(false);
          setDataError(false);
          setPricesLive(false);
          setDisplayName("");
          setPortfolioReady(!nextUser);
          setDataUpdatedAt(null);
        }
        setUser(nextUser);
        setAuthError(false);
        setAuthReady(true);
        setAccessReady(!nextUser);
        if (!nextUser) {
          setAssets([]);
          setTx([]);
          setBrokers([]);
          setCorporateActions([]);
          setManualValuations([]);
          setIsPro(false);
          setIsAdmin(false);
          setDataError(false);
          setPricesLive(false);
          setPortfolioReady(true);
          setDataUpdatedAt(null);
        }
      }
    });
    const initialVersion = authEventVersion.current;
    void supabase.auth
      .getSession()
      .then(({ data: sessionData, error }) => {
        if (!active || initialVersion !== authEventVersion.current) return;
        if (error) {
          console.error("Unable to initialize authentication", error);
          setAuthError(true);
          setDataError(true);
          setAuthReady(true);
          return;
        }
        const nextUser = sessionData.session?.user ?? null;
        const previousUserId = userRef.current?.id;
        userRef.current = nextUser;
        if (nextUser?.id !== previousUserId) {
          setAssets([]);
          setTx([]);
          setBrokers([]);
          setCorporateActions([]);
          setManualValuations([]);
          setIsPro(false);
          setIsAdmin(false);
          setDataError(false);
          setPricesLive(false);
          setDisplayName("");
          setPortfolioReady(!nextUser);
          setDataUpdatedAt(null);
        }
        setUser(nextUser);
        setAuthReady(true);
        setAccessReady(!nextUser);
        if (!nextUser) setPortfolioReady(true);
      })
      .catch((error: unknown) => {
        if (!active || initialVersion !== authEventVersion.current) return;
        console.error("Unable to initialize authentication", error);
        setAuthError(true);
        setDataError(true);
        setAuthReady(true);
      });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const reload = useCallback(async () => {
    if (!user) {
      if (userRef.current) return;
      setAssets([]);
      setTx([]);
      setBrokers([]);
      setCorporateActions([]);
      setManualValuations([]);
      setIsPro(false);
      setIsAdmin(false);
      setDataError(false);
      setPricesLive(false);
      setAccessReady(true);
      setPortfolioReady(true);
      setDataUpdatedAt(null);
      return;
    }
    if (userRef.current?.id !== user.id) return;
    const result = await Promise.all([
      supabase.from("assets").select("*"),
      supabase.from("transactions").select("*"),
      supabase.from("brokers").select("id,name,format").order("created_at"),
      supabase.from("corporate_actions").select("asset_id,event_date,numerator,denominator"),
      supabase.from("asset_valuations").select("*").order("valuation_date"),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.rpc("is_pro", { _user_id: user.id }),
      supabase.rpc("is_site_admin"),
    ]).catch((error: unknown) => {
      if (userRef.current?.id !== user.id) return null;
      console.error("Unable to reload portfolio data", error);
      setAccessReady(false);
      setDataError(true);
      return null;
    });
    if (!result) return;
    const [a, t, b, ca, mv, p, pro, admin] = result;
    if (userRef.current?.id !== user.id) return;
    if (pro.error) {
      console.error("Unable to verify portfolio access", pro.error);
      setAccessReady(false);
      setDataError(true);
      return;
    }
    setIsPro(!!pro.data);
    setAccessReady(true);
    if (a.error || t.error || b.error || ca.error || mv.error || p.error || admin.error) {
      console.error(
        "Unable to reload portfolio data",
        a.error ?? t.error ?? b.error ?? ca.error ?? mv.error ?? p.error ?? admin.error,
      );
      setDataError(true);
      return;
    }
    setDataError(false);
    setPortfolioReady(true);
    setDataUpdatedAt(Date.now());
    setIsAdmin(!!admin.data);
    setBrokers(b.data ?? []);
    const actions: CorporateAction[] = (ca.data ?? []).map((action) => ({
      assetId: action.asset_id,
      date: action.event_date,
      numerator: Number(action.numerator),
      denominator: Number(action.denominator),
    }));
    setCorporateActions(actions);
    const valuationRows = mv.data ?? [];
    setManualValuations(
      valuationRows.map((valuation) => ({
        id: valuation.id,
        assetId: valuation.asset_id,
        date: valuation.valuation_date,
        priceUsd: Number(valuation.price_usd),
        note: valuation.note,
      })),
    );
    if (p.data) {
      setDisplayName(p.data.display_name ?? "");
      if (isLang(p.data.lang)) setLangS(p.data.lang);
      if (p.data.currency in FX) setCurrencyS(p.data.currency as Currency);
    }
    const txs: Transaction[] = (t.data ?? []).map((r) => ({
      id: r.id,
      assetId: r.asset_id,
      brokerId: r.broker_id,
      kind: r.kind as Transaction["kind"],
      quantity: Number(r.quantity),
      price: Number(r.price),
      fee: Number(r.fee ?? 0),
      date: r.date,
      ...(r.source_transaction_id ? { sourceTransactionId: r.source_transaction_id } : {}),
    }));
    const rows = (a.data ?? []) as AssetRow[];
    const latestValuationByAsset = new Map<string, (typeof valuationRows)[number]>();
    for (const valuation of valuationRows) {
      const current = latestValuationByAsset.get(valuation.asset_id);
      if (!current || valuation.valuation_date > current.valuation_date)
        latestValuationByAsset.set(valuation.asset_id, valuation);
    }
    const currentById = new Map(assetsRef.current.map((asset) => [asset.id, asset]));
    const base: Asset[] = rows.map((r) => {
      const current = currentById.get(r.id);
      const manualValuation = latestValuationByAsset.get(r.id);
      return {
        id: r.id,
        symbol: r.symbol,
        name: r.name,
        type: r.type as AssetType,
        sector: r.sector,
        region: r.region,
        price:
          r.type === "cash"
            ? 1
            : r.type === "bond" || r.type === "realEstate"
              ? Number(manualValuation?.price_usd ?? r.manual_price ?? Number.NaN)
              : (current?.price ?? Number.NaN),
        change24h:
          r.type === "cash" || r.type === "bond" || r.type === "realEstate"
            ? 0
            : (current?.change24h ?? Number.NaN),
        dividendPerShare: Number(r.dividend_per_share),
        payMonths: r.pay_months ?? [],
        ...(r.bond_coupon_rate !== null ? { bondCouponRate: Number(r.bond_coupon_rate) } : {}),
        ...(r.bond_maturity_date ? { bondMaturityDate: r.bond_maturity_date } : {}),
        ...(r.bond_face_value !== null ? { bondFaceValue: Number(r.bond_face_value) } : {}),
        ...(current?.quoteCurrency !== undefined ? { quoteCurrency: current.quoteCurrency } : {}),
        ...(current?.quoteNativePrice !== undefined
          ? { quoteNativePrice: current.quoteNativePrice }
          : {}),
        ...(current?.quoteAt !== undefined ? { quoteAt: current.quoteAt } : {}),
      };
    });
    setTx(txs);
    setAssets(base);
    if (!base.length) return;
    try {
      const quoteAssets = base.filter((asset) => ["stock", "etf", "crypto"].includes(asset.type));
      if (!quoteAssets.length) return;
      const res = await quoteFn({
        data: { items: quoteAssets.map((x) => ({ symbol: x.symbol, type: x.type })) },
      });
      if (userRef.current?.id !== user.id) return;
      setAssets(
        base.map((x) => {
          const q = res.quotes[x.symbol];
          return q
            ? {
                ...x,
                price: q.price,
                change24h: q.change ?? Number.NaN,
                quoteCurrency: q.currency,
                quoteNativePrice: q.nativePrice,
                quoteAt: q.at,
              }
            : x;
        }),
      );
      setEurPerUsd(res.eurPerUsd);
      setPricesLive(Object.keys(res.quotes).length > 0);
      setPriceNote(res.missing.length ? "unavailable" : null);
    } catch (e) {
      if (userRef.current?.id !== user.id) return;
      console.error(e);
      setPriceNote("error");
    }
  }, [user, quoteFn]);

  useEffect(() => {
    void reload();
    const timer = setInterval(() => {
      void reload();
    }, 60000);
    return () => clearInterval(timer);
  }, [reload]);

  const savePref = (patch: { lang?: string; currency?: string }) => {
    if (user) void supabase.from("profiles").update(patch).eq("id", user.id);
  };

  const ensureAsset = async (a: Omit<Asset, "id">): Promise<string> => {
    const existing = assets.find((x) => x.symbol.toUpperCase() === a.symbol.toUpperCase());
    if (existing) return existing.id;
    const { data, error } = await supabase
      .from("assets")
      .insert({
        symbol: a.symbol.toUpperCase(),
        name: a.name,
        type: a.type,
        sector: a.sector,
        region: a.region,
        manual_price: a.type === "crypto" || a.type === "cash" ? null : a.price,
        bond_coupon_rate: a.bondCouponRate ?? null,
        bond_maturity_date: a.bondMaturityDate ?? null,
        bond_face_value: a.bondFaceValue ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  };

  const value = useMemo<State>(() => {
    const locale = languageLocale(lang);
    const moneyBase: State["money"] = (usd, o) => {
      const rate = currency === "USD" ? 1 : eurPerUsd;
      if (!Number.isFinite(usd) || !rate) return "—";
      const v = usd * rate;
      const s = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        notation: o?.compact ? "compact" : "standard",
        maximumFractionDigits: o?.compact ? 1 : 2,
      }).format(v);
      return o?.sign && v > 0 ? `+${s}` : s;
    };
    return {
      lang,
      currency,
      theme,
      user,
      authReady,
      authError,
      accessReady,
      portfolioReady,
      dataUpdatedAt,
      isPro,
      isAdmin,
      displayName,
      assets,
      transactions,
      brokers,
      corporateActions,
      manualValuations,
      dataError,
      pricesLive,
      priceNote,
      eurPerUsd,
      setLang: (l) => {
        setLangS(l);
        savePref({ lang: l });
      },
      setCurrency: (c) => {
        setCurrencyS(c);
        savePref({ currency: c });
      },
      toggleTheme: () => setTheme((x) => (x === "dark" ? "light" : "dark")),
      reload,
      addTransaction: async (t, a) => {
        if (!user) throw new Error(dictionaries[lang].signIn);
        const assetId = a ? await ensureAsset(a) : t.assetId;
        const { error } = await supabase.from("transactions").insert({
          asset_id: assetId,
          kind: t.kind,
          quantity: t.quantity,
          price: t.price,
          fee: t.fee ?? 0,
          date: t.date,
        });
        if (error) throw error;
        if (t.kind === "buy" && transactions.length === 0)
          trackAnalyticsEvent("first_holding_added");
        await reload();
      },
      updateBondPrice: async (assetId, priceUsd) => {
        if (!user) throw new Error(dictionaries[lang].signIn);
        if (!Number.isFinite(priceUsd) || priceUsd <= 0)
          throw new Error(lang === "bg" ? "Въведи валидна цена." : "Enter a valid price.");
        const asset = assetsRef.current.find((item) => item.id === assetId);
        if (!asset || asset.type !== "bond")
          throw new Error(lang === "bg" ? "Облигацията не е намерена." : "Bond not found.");
        const { error } = await supabase.from("asset_valuations").upsert(
          {
            user_id: user.id,
            asset_id: assetId,
            valuation_date: new Date().toISOString().slice(0, 10),
            price_usd: priceUsd,
            note: "",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,asset_id,valuation_date" },
        );
        if (error) throw error;
        await reload();
      },
      saveManualValuation: async (assetId, date, priceUsd, note) => {
        if (!user) throw new Error(dictionaries[lang].signIn);
        if (
          !isValidIsoDate(date) ||
          date > new Date().toISOString().slice(0, 10) ||
          !Number.isFinite(priceUsd) ||
          priceUsd <= 0 ||
          note.length > 500
        )
          throw new Error(
            lang === "bg"
              ? "Въведи валидна дата, положителна стойност в USD и бележка до 500 знака."
              : "Enter a valid date, a positive USD value, and a note of at most 500 characters.",
          );
        const asset = assetsRef.current.find((item) => item.id === assetId);
        if (!asset || (asset.type !== "bond" && asset.type !== "realEstate"))
          throw new Error(lang === "bg" ? "Активът не е намерен." : "Asset not found.");
        const { error } = await supabase.from("asset_valuations").upsert(
          {
            user_id: user.id,
            asset_id: assetId,
            valuation_date: date,
            price_usd: priceUsd,
            note: note.trim(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,asset_id,valuation_date" },
        );
        if (error) throw error;
        await reload();
      },
      updateTransaction: async (transaction) => {
        if (!user) throw new Error(dictionaries[lang].signIn);
        const currentTransactions = transactionsRef.current;
        const nextTransactions = currentTransactions.map((item) =>
          item.id === transaction.id ? transaction : item,
        );
        if (nextTransactions.every((item) => item.id !== transaction.id))
          throw new Error(lang === "bg" ? "Сделката не е намерена." : "Transaction not found.");
        if (increasesOversellAmount(currentTransactions, nextTransactions, corporateActions))
          throw new Error(
            lang === "bg"
              ? "Промяната би довела до продажба на повече налични акции."
              : "This change would result in selling more shares than are available.",
          );
        const { data, error } = await supabase
          .from("transactions")
          .update({
            kind: transaction.kind,
            quantity: transaction.quantity,
            price: transaction.price,
            fee: transaction.fee ?? 0,
            date: transaction.date,
          })
          .eq("id", transaction.id)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data)
          throw new Error(lang === "bg" ? "Сделката не е намерена." : "Transaction not found.");
        await reload();
      },
      restoreTransaction: async (transaction) => {
        if (!user) throw new Error(dictionaries[lang].signIn);
        if (
          increasesOversellAmount(
            transactionsRef.current,
            [...transactionsRef.current, transaction],
            corporateActions,
          )
        )
          throw new Error(
            lang === "bg"
              ? "Сделката не може да бъде възстановена, защото наличността вече е променена."
              : "This transaction can no longer be restored because holdings have changed.",
          );
        const { error } = await supabase.from("transactions").insert({
          asset_id: transaction.assetId,
          ...(transaction.brokerId ? { broker_id: transaction.brokerId } : {}),
          kind: transaction.kind,
          quantity: transaction.quantity,
          price: transaction.price,
          fee: transaction.fee ?? 0,
          date: transaction.date,
        });
        if (error) throw error;
        await reload();
      },
      deleteTransactions: async (ids) => {
        if (!user) throw new Error(dictionaries[lang].signIn);
        if (!ids.length) return 0;
        const { data, error } = await supabase
          .from("transactions")
          .delete()
          .in("id", ids)
          .select("id");
        if (error) throw error;
        await reload();
        return data?.length ?? 0;
      },
      normalizeImportRows: async (rows) => {
        if (!user) throw new Error(dictionaries[lang].signIn);
        return convertFn({
          data: {
            rows: rows.map((row) => ({
              ...row,
              currency: (row.currency ?? "USD") as "USD" | "EUR" | "BGN" | "GBX" | "GBP",
            })),
          },
        });
      },
      importTransactions: async (brokerId, rows) => {
        if (!user) throw new Error("auth");
        const normalized = await convertFn({
          data: {
            rows: rows.map((r) => ({
              ...r,
              currency: (r.currency ?? "USD") as "USD" | "EUR" | "BGN" | "GBX" | "GBP",
            })),
          },
        });
        const converted = normalized.map((row, index) => ({
          ...row,
          ...(rows[index]?.sourceTransactionId
            ? { sourceTransactionId: rows[index]!.sourceTransactionId }
            : {}),
        }));
        const ids = new Map(assets.map((x) => [x.symbol.toUpperCase(), x.id]));
        const createdAssetIds: string[] = [];
        for (const r of converted) {
          if (ids.has(r.symbol)) continue;
          const { data, error } = await supabase
            .from("assets")
            .insert({
              symbol: r.symbol,
              name: r.name,
              type: r.assetType,
              region: r.assetType === "crypto" ? "Global" : "North America",
              sector: r.assetType === "crypto" ? "Crypto" : "Other",
              ...(r.assetType === "bond"
                ? {
                    manual_price: r.bondManualPrice ?? r.price,
                    bond_coupon_rate: r.bondCouponRate ?? null,
                    bond_maturity_date: r.bondMaturityDate ?? null,
                    bond_face_value: r.bondFaceValue ?? null,
                  }
                : {}),
            })
            .select("id")
            .single();
          if (error) throw error;
          ids.set(r.symbol, data.id);
          createdAssetIds.push(data.id);
        }
        const { data, error } = await supabase
          .from("transactions")
          .insert(
            converted.map((r) => {
              const assetId = ids.get(r.symbol);
              if (!assetId) throw new Error("Asset unavailable");
              return {
                asset_id: assetId,
                ...(brokerId ? { broker_id: brokerId } : {}),
                kind: r.kind,
                quantity: r.quantity,
                price: r.price,
                fee: r.fee ?? 0,
                date: r.date,
                ...(r.sourceTransactionId ? { source_transaction_id: r.sourceTransactionId } : {}),
              };
            }),
          )
          .select("id");
        if (error) throw error;
        if (!data || data.length !== converted.length)
          throw new Error("Not all imported transactions could be confirmed.");
        if (
          transactions.length === 0 &&
          converted.some((transaction) => transaction.kind === "buy")
        )
          trackAnalyticsEvent("first_holding_added");
        await reload();
        return {
          count: data?.length ?? 0,
          transactionIds: (data ?? []).map((row) => row.id),
          createdAssetIds,
        };
      },
      undoImport: async (transactionIds, createdAssetIds) => {
        if (!user) throw new Error(dictionaries[lang].signIn);
        const { data: removed, error: removeError } = await supabase
          .from("transactions")
          .delete()
          .in("id", transactionIds)
          .select("id");
        if (removeError) throw removeError;
        if (createdAssetIds.length) {
          const { data: referenced, error: referenceError } = await supabase
            .from("transactions")
            .select("asset_id")
            .in("asset_id", createdAssetIds);
          if (referenceError) throw referenceError;
          const used = new Set((referenced ?? []).map((row) => row.asset_id));
          const unusedIds = createdAssetIds.filter((id) => !used.has(id));
          if (unusedIds.length) {
            const { error: assetError } = await supabase
              .from("assets")
              .delete()
              .in("id", unusedIds);
            if (assetError) throw assetError;
          }
        }
        await reload();
        return removed?.length ?? 0;
      },
      t: (k) => dictionaries[lang][k],
      label: (s) => translateLabel(s, lang),
      money: moneyBase,
      moneyFor: (usd, asset, o) => {
        const cur = asset?.quoteCurrency;
        const native = asset?.quoteNativePrice;
        const usdPrice = asset?.price;
        if (
          !asset ||
          !cur ||
          !Number.isFinite(usd) ||
          !native ||
          !usdPrice ||
          !Number.isFinite(native) ||
          !Number.isFinite(usdPrice)
        ) {
          return moneyBase(usd, o);
        }
        const pence = cur === "GBX" || cur === "GBp";
        // The asset's own quote implies its USD→native rate, so no fixed rates are used.
        const v = usd * (native / usdPrice) * (pence ? 0.01 : 1);
        try {
          const s = new Intl.NumberFormat(locale, {
            style: "currency",
            currency: pence ? "GBP" : cur,
            notation: o?.compact ? "compact" : "standard",
            maximumFractionDigits: o?.compact ? 1 : 2,
          }).format(v);
          return o?.sign && v > 0 ? `+${s}` : s;
        } catch {
          return moneyBase(usd, o);
        }
      },
      holdings,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lang,
    currency,
    theme,
    user,
    authReady,
    authError,
    accessReady,
    portfolioReady,
    dataUpdatedAt,
    isPro,
    isAdmin,
    displayName,
    assets,
    transactions,
    holdings,
    brokers,
    corporateActions,
    manualValuations,
    dataError,
    pricesLive,
    priceNote,
    reload,
    eurPerUsd,
    convertFn,
  ]);

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

export const pct = (n: number, sign = true) =>
  Number.isFinite(n) ? `${sign && n > 0 ? "+" : ""}${n.toFixed(2)}%` : "—";
