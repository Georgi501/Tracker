import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { changePosition } from "./position-deletion";
import type { User } from "@supabase/supabase-js";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { trackAnalyticsEvent } from "./analytics";
import { earliestTransactionDate, isValidIsoDate, type DailyPrice } from "./history";
import { convertImport } from "./history.functions";
import { dictionaries, isLang, languageLocale, translateLabel, type Lang } from "./i18n";
import { currentUsdPrice, formatUsdAmount, type LiveFx } from "./live-fx";
import { localDateString } from "./local-date";
import { getExchangeRate } from "./market.functions";
import { initialAssetRegion } from "./geographic-exposure";
import { canonicalIdentityKey, resolveAssetIdentity } from "./instrument-identity";
import {
  FX,
  brokerHoldings,
  computeHoldings,
  type Asset,
  type AssetType,
  type BrokerTransfer,
  type CorporateAction,
  type Currency,
  type Transaction,
} from "./portfolio";
import { readPortfolioSnapshot } from "./portfolio-snapshot";
import { fetchPortfolioQuoteBatches } from "./quote-batches";
import { increasesOversellAmount } from "./quality";
import { getQuotes } from "./quotes.functions";
import {
  Ctx,
  isPrerenderedPath,
  type Broker,
  type ManualAssetValuation,
  type State,
} from "./store";
const KEY = "folio-state-v2";

const PROVIDER_MESSAGES: Record<
  Lang,
  {
    transferWouldInvalidate: string;
    transferValidation: string;
    insufficientBrokerShares: string;
    insufficientBrokerSharesOnDate: string;
    invalidTransferOwner: string;
    invalidPrice: string;
    bondNotFound: string;
    invalidValuation: string;
    assetNotFound: string;
    transactionNotFound: string;
    oversellError: string;
    restoreOversellError: string;
  }
> = {
  en: {
    transferWouldInvalidate:
      "This change would invalidate a recorded broker transfer. Review the transactions and dates.",
    transferValidation: "Check the asset, brokers, quantity, and transfer date.",
    insufficientBrokerShares: "The selected broker does not hold enough shares.",
    insufficientBrokerSharesOnDate: "The selected broker does not hold enough shares on that date.",
    invalidTransferOwner: "The selected asset or broker account could not be verified.",
    invalidPrice: "Enter a valid price.",
    bondNotFound: "Bond not found.",
    invalidValuation:
      "Enter a valid date, a positive USD value, and a note of at most 500 characters.",
    assetNotFound: "Asset not found.",
    transactionNotFound: "Transaction not found.",
    oversellError: "This change would result in selling more shares than are available.",
    restoreOversellError:
      "This transaction can no longer be restored because holdings have changed.",
  },
  bg: {
    transferWouldInvalidate:
      "Промяната би направила записан трансфер невъзможен. Провери сделките и датите.",
    transferValidation: "Провери актива, брокерите, количеството и датата на трансфера.",
    insufficientBrokerShares: "Няма достатъчно налични бройки при избрания брокер.",
    insufficientBrokerSharesOnDate:
      "Няма достатъчно налични бройки при избрания брокер към тази дата.",
    invalidTransferOwner: "Избраният актив или брокерска сметка не може да бъде потвърдена.",
    invalidPrice: "Въведи валидна цена.",
    bondNotFound: "Облигацията не е намерена.",
    invalidValuation: "Въведи валидна дата, положителна стойност в USD и бележка до 500 знака.",
    assetNotFound: "Активът не е намерен.",
    transactionNotFound: "Сделката не е намерена.",
    oversellError: "Промяната би довела до продажба на повече налични акции.",
    restoreOversellError:
      "Сделката не може да бъде възстановена, защото наличността вече е променена.",
  },
  de: {
    transferWouldInvalidate:
      "Diese Änderung würde einen erfassten Broker-Transfer ungültig machen. Prüfe die Transaktionen und Daten.",
    transferValidation: "Prüfe Anlage, Broker, Menge und Transferdatum.",
    insufficientBrokerShares: "Der ausgewählte Broker hält nicht genügend Anteile.",
    insufficientBrokerSharesOnDate:
      "Der ausgewählte Broker hält an diesem Datum nicht genügend Anteile.",
    invalidTransferOwner:
      "Die ausgewählte Anlage oder das Brokerkonto konnte nicht bestätigt werden.",
    invalidPrice: "Gib einen gültigen Preis ein.",
    bondNotFound: "Anleihe nicht gefunden.",
    invalidValuation:
      "Gib ein gültiges Datum, einen positiven USD-Wert und eine Notiz mit maximal 500 Zeichen ein.",
    assetNotFound: "Anlage nicht gefunden.",
    transactionNotFound: "Transaktion nicht gefunden.",
    oversellError: "Diese Änderung würde zum Verkauf von mehr Anteilen führen, als verfügbar sind.",
    restoreOversellError:
      "Diese Transaktion kann nicht mehr wiederhergestellt werden, da sich der Bestand geändert hat.",
  },
  es: {
    transferWouldInvalidate:
      "Este cambio invalidaría una transferencia de bróker registrada. Revisa las transacciones y fechas.",
    transferValidation:
      "Comprueba el activo, los brókers, la cantidad y la fecha de transferencia.",
    insufficientBrokerShares: "El bróker seleccionado no tiene suficientes participaciones.",
    insufficientBrokerSharesOnDate:
      "El bróker seleccionado no tiene suficientes participaciones en esa fecha.",
    invalidTransferOwner: "No se pudo verificar el activo o la cuenta de bróker seleccionada.",
    invalidPrice: "Introduce un precio válido.",
    bondNotFound: "Bono no encontrado.",
    invalidValuation:
      "Introduce una fecha válida, un valor positivo en USD y una nota de hasta 500 caracteres.",
    assetNotFound: "Activo no encontrado.",
    transactionNotFound: "Transacción no encontrada.",
    oversellError: "Este cambio provocaría vender más participaciones de las disponibles.",
    restoreOversellError:
      "Esta transacción ya no se puede restaurar porque las posiciones han cambiado.",
  },
  it: {
    transferWouldInvalidate:
      "Questa modifica renderebbe non valido un trasferimento broker registrato. Controlla le transazioni e le date.",
    transferValidation: "Controlla attivo, broker, quantità e data del trasferimento.",
    insufficientBrokerShares: "Il broker selezionato non detiene abbastanza quote.",
    insufficientBrokerSharesOnDate:
      "Il broker selezionato non detiene abbastanza quote in quella data.",
    invalidTransferOwner: "Impossibile verificare l'attivo o il conto broker selezionato.",
    invalidPrice: "Inserisci un prezzo valido.",
    bondNotFound: "Obbligazione non trovata.",
    invalidValuation:
      "Inserisci una data valida, un valore USD positivo e una nota di massimo 500 caratteri.",
    assetNotFound: "Attivo non trovato.",
    transactionNotFound: "Transazione non trovata.",
    oversellError: "Questa modifica comporterebbe la vendita di più quote di quelle disponibili.",
    restoreOversellError:
      "Questa transazione non può più essere ripristinata perché le posizioni sono cambiate.",
  },
};

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

type AssetLookupMaps = {
  bySymbol: Map<string, string>;
  byCanonical: Map<string, string>;
  keyById: Map<string, string>;
};

function buildAssetLookup(assets: readonly Asset[]): AssetLookupMaps {
  const bySymbol = new Map<string, string>();
  const byCanonical = new Map<string, string>();
  const keyById = new Map<string, string>();
  for (const asset of assets) {
    const upper = asset.symbol.toUpperCase();
    if (!bySymbol.has(upper)) bySymbol.set(upper, asset.id);
    const key = canonicalIdentityKey({
      symbol: asset.symbol,
      name: asset.name,
      type: asset.type,
      isin: asset.isin,
      currency: asset.quoteCurrency,
    });
    keyById.set(asset.id, key);
    if (!byCanonical.has(key)) byCanonical.set(key, asset.id);
  }
  return { bySymbol, byCanonical, keyById };
}

function registerAssetLookup(
  maps: AssetLookupMaps,
  id: string,
  incoming: {
    symbol: string;
    name?: string | null | undefined;
    type?: AssetType | undefined;
    isin?: string | null | undefined;
    currency?: string | null | undefined;
  },
) {
  const upper = incoming.symbol.trim().toUpperCase();
  const key = canonicalIdentityKey(incoming);
  if (!maps.bySymbol.has(upper)) maps.bySymbol.set(upper, id);
  if (!maps.byCanonical.has(key)) maps.byCanonical.set(key, id);
  maps.keyById.set(id, key);
}

function findMatchingAssetId(
  maps: AssetLookupMaps,
  incoming: {
    symbol: string;
    name?: string | null | undefined;
    type?: AssetType | undefined;
    isin?: string | null | undefined;
    currency?: string | null | undefined;
  },
): string | undefined {
  const incomingKey = canonicalIdentityKey(incoming);
  const canonicalMatch = maps.byCanonical.get(incomingKey);
  if (canonicalMatch) return canonicalMatch;

  const upper = incoming.symbol.trim().toUpperCase();
  const symbolMatch = maps.bySymbol.get(upper);
  if (!symbolMatch) return undefined;

  const existingKey = maps.keyById.get(symbolMatch);
  if (
    existingKey &&
    existingKey.startsWith("isin:") &&
    incomingKey.startsWith("isin:") &&
    existingKey !== incomingKey
  ) {
    return undefined;
  }
  return symbolMatch;
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const rawSearchLang = useRouterState({
    select: (state) => (state.location.search as Record<string, unknown> | undefined)?.["lang"],
  });
  const urlLang: Lang | null = isLang(rawSearchLang) ? rawSearchLang : null;
  const urlLangRef = useRef(urlLang);
  urlLangRef.current = urlLang;
  const prerendered = isPrerenderedPath(pathname);
  const [lang, setLangS] = useState<Lang>(urlLang ?? "en");
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
  const [brokerTransfers, setBrokerTransfers] = useState<BrokerTransfer[]>([]);
  const [corporateActions, setCorporateActions] = useState<CorporateAction[]>([]);
  const [manualValuations, setManualValuations] = useState<ManualAssetValuation[]>([]);
  const [dataError, setDataError] = useState(false);
  const [pricesLive, setPricesLive] = useState(false);
  const [priceNote, setPriceNote] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const authEventVersion = useRef(0);
  const reloadVersion = useRef(0);
  const queryClient = useQueryClient();

  const [liveFx, setLiveFx] = useState<LiveFx | null>(null);
  const [eurUsdPrices, setEurUsdPrices] = useState<DailyPrice[]>([]);
  const eurPerUsd = liveFx?.eurPerUsd ?? null;
  const quoteFn = useServerFn(getQuotes);
  const fxFn = useServerFn(getExchangeRate);
  const convertFn = useServerFn(convertImport);
  const holdings = useMemo(
    () =>
      computeHoldings(
        assets.map((asset) => ({ ...asset, price: currentUsdPrice(asset, liveFx) })),
        transactions,
        corporateActions,
      ),
    [assets, transactions, corporateActions, liveFx],
  );
  const validateBrokerTransfers = (nextTransactions: Transaction[]) => {
    if (!brokerTransfers.length) return;
    try {
      brokerHoldings(assetsRef.current, nextTransactions, brokerTransfers, corporateActions);
    } catch (error) {
      if (error instanceof Error && error.message === "Broker transfer exceeds available holdings")
        throw new Error(PROVIDER_MESSAGES[lang].transferWouldInvalidate);
      throw error;
    }
  };

  useEffect(() => {
    const refresh = () => {
      void fxFn()
        .then((r) =>
          setLiveFx((previous) => {
            if (!r.fx) return previous ? { ...previous, providerUnavailable: true } : null;
            if (previous && Date.parse(previous.at) > Date.parse(r.fx.at)) return previous;
            return r.fx;
          }),
        )
        .catch((error: unknown) => {
          console.error("Unable to refresh EUR/USD rate", error);
          setLiveFx((previous) => (previous ? { ...previous, providerUnavailable: true } : null));
        });
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
        if (!urlLangRef.current && isLang(s.lang)) setLangS(s.lang);
        if (s.currency in FX) setCurrencyS(s.currency);
        if (s.theme === "light" || s.theme === "dark") setTheme(s.theme);
        else if (window.matchMedia?.("(prefers-color-scheme: light)").matches) setTheme("light");
      } else if (window.matchMedia?.("(prefers-color-scheme: light)").matches) {
        setTheme("light");
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (urlLang) setLangS(urlLang);
  }, [urlLang]);
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
          setBrokerTransfers([]);
          setCorporateActions([]);
          setManualValuations([]);
          setIsPro(false);
          setIsAdmin(false);
          setDataError(false);
          setPricesLive(false);
          setEurUsdPrices([]);
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
          setBrokerTransfers([]);
          setCorporateActions([]);
          setManualValuations([]);
          setIsPro(false);
          setIsAdmin(false);
          setDataError(false);
          setPricesLive(false);
          setEurUsdPrices([]);
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
          setBrokerTransfers([]);
          setCorporateActions([]);
          setManualValuations([]);
          setIsPro(false);
          setIsAdmin(false);
          setDataError(false);
          setPricesLive(false);
          setEurUsdPrices([]);
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
    const requestVersion = ++reloadVersion.current;
    if (!user) {
      if (userRef.current) return;
      setAssets([]);
      setTx([]);
      setBrokers([]);
      setBrokerTransfers([]);
      setCorporateActions([]);
      setManualValuations([]);
      setIsPro(false);
      setIsAdmin(false);
      setDataError(false);
      setPricesLive(false);
      setEurUsdPrices([]);
      setAccessReady(true);
      setPortfolioReady(true);
      setDataUpdatedAt(null);
      return;
    }
    const isCurrentRequest = () =>
      userRef.current?.id === user.id && requestVersion === reloadVersion.current;
    if (!isCurrentRequest()) return;
    // Access decisions must commit independently of financial data availability.
    const accessRequest = (async () => {
      try {
        const [pro, admin] = await Promise.all([
          supabase.rpc("is_pro", { _user_id: user.id }),
          supabase.rpc("is_site_admin"),
        ]);
        if (!isCurrentRequest()) return false;
        if (
          pro.error ||
          admin.error ||
          typeof pro.data !== "boolean" ||
          typeof admin.data !== "boolean"
        )
          throw new Error("Unable to verify portfolio access");
        setIsPro(pro.data);
        setIsAdmin(admin.data);
        setAccessReady(true);
        return true;
      } catch (error: unknown) {
        if (!isCurrentRequest()) return false;
        console.error("Unable to verify portfolio access", error);
        setIsPro(false);
        setIsAdmin(false);
        setAccessReady(false);
        setDataError(true);
        return false;
      }
    })();
    const financialRequest = Promise.all([
      readPortfolioSnapshot(supabase),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ]).catch((error: unknown) => {
      if (!isCurrentRequest()) return null;
      console.error("Unable to reload portfolio data", error);
      setDataError(true);
      return null;
    });
    const [result, accessVerified] = await Promise.all([financialRequest, accessRequest]);
    if (!isCurrentRequest()) return;
    if (!result) return;
    const [snapshot, p] = result;
    const a = { data: snapshot.assets };
    const t = { data: snapshot.transactions };
    const b = { data: snapshot.brokers };
    const bt = { data: snapshot.broker_transfers };
    const ca = { data: snapshot.corporate_actions };
    const mv = { data: snapshot.asset_valuations };
    if (p.error) {
      console.error("Unable to reload portfolio data", p.error);
      setDataError(true);
      return;
    }
    setDataError(!accessVerified);
    setPortfolioReady(true);
    setDataUpdatedAt(Date.now());
    setBrokers(b.data ?? []);
    setBrokerTransfers(
      (bt.data ?? []).map((transfer) => ({
        id: transfer.id,
        assetId: transfer.asset_id,
        fromBrokerId: transfer.from_broker_id,
        toBrokerId: transfer.to_broker_id,
        quantity: Number(transfer.quantity),
        date: transfer.transfer_date,
        createdAt: transfer.created_at,
      })),
    );
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
      if (!urlLangRef.current && isLang(p.data.lang)) setLangS(p.data.lang);
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
      ...(r.source_executed_at ? { sourceExecutedAt: r.source_executed_at } : {}),
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
      const identity = resolveAssetIdentity({
        symbol: r.symbol,
        name: r.name,
        type: r.type as AssetType,
        isin: current?.isin,
        quoteSymbol: current?.quoteSymbol,
      });
      const effectiveIsin = identity.isin ?? current?.isin;
      return {
        id: r.id,
        symbol: r.symbol,
        name: r.name,
        type: identity.effectiveType,
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
        ...(current?.quoteRefreshFailed ? { quoteRefreshFailed: true } : {}),
        ...(current?.quoteFxAt !== undefined ? { quoteFxAt: current.quoteFxAt } : {}),
        ...(current?.quoteFxSource !== undefined ? { quoteFxSource: current.quoteFxSource } : {}),
        ...(current?.country !== undefined ? { country: current.country } : {}),
        ...(effectiveIsin !== undefined ? { isin: effectiveIsin } : {}),
        ...(identity.quoteSymbol ? { quoteSymbol: identity.quoteSymbol } : {}),
        ...(current?.quoteDiagnostic !== undefined
          ? { quoteDiagnostic: current.quoteDiagnostic }
          : {}),
      };
    });
    setTx(txs);
    setAssets(base);
    if (!base.length) return;
    try {
      const quoteAssets = base.filter((asset) => ["stock", "etf", "crypto"].includes(asset.type));
      if (!quoteAssets.length) return;
      const todayIso = new Date().toISOString().slice(0, 10);
      let eurUsdRange: { start: string; end: string } | undefined;
      if (txs.length > 0) {
        const earliest = earliestTransactionDate(txs, todayIso);
        const startMs = Date.parse(`${earliest}T00:00:00Z`) - 7 * 86_400_000;
        const startIso = Number.isFinite(startMs)
          ? new Date(startMs).toISOString().slice(0, 10)
          : earliest;
        const endIso = txs.reduce((max, tx) => (tx.date > max ? tx.date : max), todayIso);
        if (isValidIsoDate(startIso) && isValidIsoDate(endIso) && startIso <= endIso) {
          eurUsdRange = { start: startIso, end: endIso };
        }
      }
      const res = await fetchPortfolioQuoteBatches(
        quoteAssets.map((x) => ({
          symbol: x.symbol,
          type: x.type,
          name: x.name,
          ...(x.isin ? { isin: x.isin } : {}),
          ...(x.quoteSymbol ? { quoteSymbol: x.quoteSymbol } : {}),
        })),
        quoteFn,
        eurUsdRange,
      );
      if (userRef.current?.id !== user.id || requestVersion !== reloadVersion.current) return;
      const quotes = res?.quotes ?? {};
      const diagnostics = res?.diagnostics ?? {};
      const missing = res?.missing ?? [];
      if (res?.eurUsdPrices?.length) {
        setEurUsdPrices(res.eurUsdPrices);
      }
      setAssets((prev) => {
        const prevCountry = new Map(prev.map((item) => [item.id, item.country]));
        return base.map((x) => {
          const existingCountry = prevCountry.get(x.id);
          const withCountry =
            existingCountry && !x.country ? { ...x, country: existingCountry } : x;
          const q = quotes[x.symbol];
          const diag = diagnostics[x.symbol];
          if (!q) {
            if (!["stock", "etf", "crypto"].includes(x.type)) return withCountry;
            const failed: Asset = { ...withCountry, quoteRefreshFailed: true };
            if (diag) failed.quoteDiagnostic = diag;
            else delete failed.quoteDiagnostic;
            return failed;
          }
          const updated: Asset = {
            ...withCountry,
            price: q.price,
            change24h: q.change ?? Number.NaN,
            quoteCurrency: q.currency,
            quoteNativePrice: q.nativePrice,
            quoteAt: q.at,
            quoteRefreshFailed: false,
            ...(q.resolvedSymbol ? { quoteSymbol: q.resolvedSymbol } : {}),
          };
          delete updated.quoteDiagnostic;
          delete updated.quoteFxAt;
          delete updated.quoteFxSource;
          if (q.fxAt) updated.quoteFxAt = q.fxAt;
          if (q.fxSource) updated.quoteFxSource = q.fxSource;
          return updated;
        });
      });
      setPricesLive(Object.keys(quotes).length > 0);
      setPriceNote(res?.failed ? "error" : missing.length ? "unavailable" : null);
    } catch (e) {
      if (userRef.current?.id !== user.id || requestVersion !== reloadVersion.current) return;
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
    const lookup = buildAssetLookup(assetsRef.current);
    const existingId = findMatchingAssetId(lookup, {
      symbol: a.symbol,
      name: a.name,
      type: a.type,
      isin: a.isin,
      currency: a.quoteCurrency,
    });
    if (existingId) return existingId;
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

  const mutatePosition = useCallback(
    async (assetId: string, operationId: string, action: "delete" | "restore") => {
      if (!user || userRef.current?.id !== user.id) throw new Error("Sign in required");
      ++reloadVersion.current;
      try {
        const receipt = await changePosition(supabase, assetId, operationId, action);
        if (userRef.current?.id === user.id && receipt.state === "deleted") {
          setAssets((items) => items.filter((item) => item.id !== assetId));
          setTx((items) => items.filter((item) => item.assetId !== assetId));
          setCorporateActions((items) => items.filter((item) => item.assetId !== assetId));
          setManualValuations((items) => items.filter((item) => item.assetId !== assetId));
        }
        return receipt;
      } finally {
        // Reconcile even after a lost response: the server may already have committed.
        ++reloadVersion.current;
        if (userRef.current?.id === user.id) {
          setDataError(true);
          await reload();
          void queryClient.invalidateQueries({ queryKey: ["portfolio-history", user.id] });
        }
      }
    },
    [user, reload, queryClient],
  );
  const value = useMemo<State>(() => {
    const locale = languageLocale(lang);
    const moneyBase: State["money"] = (usd, o) =>
      formatUsdAmount(usd, currency, lang, eurPerUsd, o);
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
      brokerTransfers,
      corporateActions,
      manualValuations,
      dataError,
      pricesLive,
      priceNote,
      eurPerUsd,
      liveFx,
      eurUsdPrices,
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
      deletePosition: (assetId, operationId) => mutatePosition(assetId, operationId, "delete"),
      restorePosition: (assetId, operationId) => mutatePosition(assetId, operationId, "restore"),
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
      createBrokerTransfer: async (transfer) => {
        if (!user) throw new Error(dictionaries[lang].signIn);
        const msg = PROVIDER_MESSAGES[lang];
        const today = localDateString();
        if (
          !isValidIsoDate(transfer.date) ||
          transfer.date > today ||
          !Number.isFinite(transfer.quantity) ||
          transfer.quantity <= 0 ||
          transfer.fromBrokerId === transfer.toBrokerId ||
          !assetsRef.current.some((asset) => asset.id === transfer.assetId) ||
          !brokers.some((broker) => broker.id === transfer.fromBrokerId) ||
          !brokers.some((broker) => broker.id === transfer.toBrokerId)
        )
          throw new Error(msg.transferValidation);
        const source = brokerHoldings(
          assetsRef.current,
          transactionsRef.current,
          brokerTransfers,
          corporateActions,
          transfer.date,
        ).find(
          (holding) =>
            holding.brokerId === transfer.fromBrokerId && holding.asset.id === transfer.assetId,
        );
        if (!source || transfer.quantity > source.quantity + 1e-9)
          throw new Error(msg.insufficientBrokerShares);
        const { data, error } = await supabase.rpc("create_broker_transfer", {
          p_asset_id: transfer.assetId,
          p_from_broker_id: transfer.fromBrokerId,
          p_to_broker_id: transfer.toBrokerId,
          p_quantity: transfer.quantity,
          p_transfer_date: transfer.date,
        });
        if (error) {
          const knownMessages: Record<string, string> = {
            BROKER_TRANSFER_INSUFFICIENT_SHARES: msg.insufficientBrokerSharesOnDate,
            BROKER_TRANSFER_INVALID_OWNER: msg.invalidTransferOwner,
          };
          throw new Error(knownMessages[error.message] ?? error.message);
        }
        if (!data) throw new Error("The broker transfer could not be confirmed.");
        await reload();
      },
      updateBondPrice: async (assetId, priceUsd) => {
        if (!user) throw new Error(dictionaries[lang].signIn);
        const msg = PROVIDER_MESSAGES[lang];
        if (!Number.isFinite(priceUsd) || priceUsd <= 0) throw new Error(msg.invalidPrice);
        const asset = assetsRef.current.find((item) => item.id === assetId);
        if (!asset || asset.type !== "bond") throw new Error(msg.bondNotFound);
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
        const msg = PROVIDER_MESSAGES[lang];
        if (
          !isValidIsoDate(date) ||
          date > new Date().toISOString().slice(0, 10) ||
          !Number.isFinite(priceUsd) ||
          priceUsd <= 0 ||
          note.length > 500
        )
          throw new Error(msg.invalidValuation);
        const asset = assetsRef.current.find((item) => item.id === assetId);
        if (!asset || (asset.type !== "bond" && asset.type !== "realEstate"))
          throw new Error(msg.assetNotFound);
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
        const msg = PROVIDER_MESSAGES[lang];
        const currentTransactions = transactionsRef.current;
        const nextTransactions = currentTransactions.map((item) =>
          item.id === transaction.id ? transaction : item,
        );
        if (nextTransactions.every((item) => item.id !== transaction.id))
          throw new Error(msg.transactionNotFound);
        if (increasesOversellAmount(currentTransactions, nextTransactions, corporateActions))
          throw new Error(msg.oversellError);
        validateBrokerTransfers(nextTransactions);
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
        if (!data) throw new Error(msg.transactionNotFound);
        await reload();
      },
      restoreTransaction: async (transaction) => {
        if (!user) throw new Error(dictionaries[lang].signIn);
        const msg = PROVIDER_MESSAGES[lang];
        if (
          increasesOversellAmount(
            transactionsRef.current,
            [...transactionsRef.current, transaction],
            corporateActions,
          )
        )
          throw new Error(msg.restoreOversellError);
        validateBrokerTransfers([...transactionsRef.current, transaction]);
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
        const deletedIds = new Set(ids);
        validateBrokerTransfers(transactionsRef.current.filter((item) => !deletedIds.has(item.id)));
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
        if (!rows.length) return [];
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
          originalCurrency: rows[index]?.currency,
          ...(rows[index]?.isin ? { isin: rows[index]!.isin } : {}),
          ...(rows[index]?.sourceExecutedAt
            ? { sourceExecutedAt: rows[index]!.sourceExecutedAt }
            : {}),
          ...(rows[index]?.sourceTransactionId
            ? { sourceTransactionId: rows[index]!.sourceTransactionId }
            : {}),
        }));
        const lookup = buildAssetLookup(assetsRef.current);
        const matchInput = (r: (typeof converted)[number]) => ({
          symbol: r.symbol,
          name: r.name,
          type: r.assetType,
          isin: r.isin,
          currency: r.originalCurrency,
        });
        const pendingTransactions = converted.map((row, index) => ({
          id: `pending-import-${index}`,
          assetId:
            findMatchingAssetId(lookup, matchInput(row)) ??
            `pending-asset:${canonicalIdentityKey(matchInput(row))}`,
          brokerId,
          kind: row.kind,
          quantity: row.quantity,
          price: row.price,
          fee: row.fee ?? 0,
          date: row.date,
        }));
        validateBrokerTransfers([...transactionsRef.current, ...pendingTransactions]);
        const createdAssetIds: string[] = [];
        for (const r of converted) {
          const input = matchInput(r);
          if (findMatchingAssetId(lookup, input)) continue;
          const { data, error } = await supabase
            .from("assets")
            .insert({
              symbol: r.symbol,
              name: r.name,
              type: r.assetType,
              region: initialAssetRegion({
                symbol: r.symbol,
                name: r.name,
                type: r.assetType,
                isin: r.isin,
              }),
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
          registerAssetLookup(lookup, data.id, input);
          createdAssetIds.push(data.id);
        }
        const { data, error } = await supabase
          .from("transactions")
          .insert(
            converted.map((r) => {
              const assetId = findMatchingAssetId(lookup, matchInput(r));
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
                ...(r.sourceExecutedAt ? { source_executed_at: r.sourceExecutedAt } : {}),
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
        const removedIds = new Set(transactionIds);
        validateBrokerTransfers(
          transactionsRef.current.filter((transaction) => !removedIds.has(transaction.id)),
        );
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
    brokerTransfers,
    corporateActions,
    manualValuations,
    dataError,
    pricesLive,
    priceNote,
    reload,
    eurPerUsd,
    liveFx,
    eurUsdPrices,
    convertFn,
    mutatePosition,
  ]);

  return (
    <Ctx.Provider value={value}>
      {loaded || prerendered ? children : <div className="min-h-screen bg-background" />}
    </Ctx.Provider>
  );
}
