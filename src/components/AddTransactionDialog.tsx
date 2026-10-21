import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { usePortfolio } from "@/lib/store";
import { type AssetType, type Currency } from "@/lib/portfolio";
import { searchCatalog, MARKET_ASSETS, type MarketAsset } from "@/lib/market-search";
import { searchMarket, marketQuote } from "@/lib/market.functions";
import { CompanyLogo } from "@/components/CompanyLogo";

const input = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

export interface TxPreset { symbol: string; name: string; type: AssetType; price?: number | undefined; currency?: Currency }

/** Native trading currency guess: European listings trade in EUR, everything else (US stocks, crypto) in USD. */
export function nativeCurrency(symbol: string, quoteCurrency?: string): Currency {
  if (quoteCurrency === "EUR" || quoteCurrency === "USD") return quoteCurrency;
  return /\.(DE|F|PA|AS|MI|MC|BR|LS|VI|HE|IR)$/i.test(symbol.trim()) ? "EUR" : "USD";
}

/** Fill a missing name or ticker from the catalog; either one alone is enough. */
export function resolveAsset(name: string, symbol: string) {
  const n = name.trim(), s = symbol.trim().toUpperCase();
  if (!n && !s) return null;
  if (s && n) return { name: n, symbol: s };
  if (s) return { symbol: s, name: MARKET_ASSETS.find((a) => a.symbol === s)?.name ?? s };
  const hit = searchCatalog(n)[0];  // also resolves an ISIN to its UCITS ticker
  return { name: hit?.name ?? n, symbol: hit?.symbol ?? n.toUpperCase().replace(/\s+/g, "").slice(0, 12) };
}

type Pick = { symbol: string; name: string; type: AssetType };

export function AddTransactionDialog({ open, onClose, preset }: { open: boolean; onClose: () => void; preset?: TxPreset | null }) {
  const p = usePortfolio();
  const bg = p.lang === "bg";
  const [kind, setKind] = useState<"buy" | "sell">("buy");
  const [sellId, setSellId] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Pick | null>(null);
  const [results, setResults] = useState<MarketAsset[]>([]);
  const [showList, setShowList] = useState(false);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [cur, setCur] = useState<Currency>("USD");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const reqId = useRef(0);
  const searchFn = useServerFn(searchMarket);
  const quoteFn = useServerFn(marketQuote);
  const owned = p.holdings.filter((h) => h.quantity > 1e-9);

  const choose = async (a: Pick) => {
    setPicked(a); setQuery(`${a.name} (${a.symbol})`); setShowList(false);
    const mine = p.assets.find((x) => x.symbol.toUpperCase() === a.symbol.toUpperCase());
    setCur(nativeCurrency(a.symbol, mine?.quoteCurrency));
    if (a.type !== "stock" && a.type !== "etf" && a.type !== "crypto") return;
    const id = ++reqId.current;
    try {
      const r = await quoteFn({ data: { symbol: a.symbol, type: a.type } });
      if (id !== reqId.current || !r.quote) return;
      if (r.quote.currency === "EUR" || r.quote.currency === "USD") {
        setCur(r.quote.currency); setPrice(String(Number(r.quote.price.toFixed(4))));
      }
    } catch { /* price stays manual */ }
  };

  useEffect(() => {
    if (!open) return;
    setKind("buy"); setQty(""); setPrice(""); setPicked(null); setQuery(""); setResults([]);
    setSellId(owned[0]?.asset.id ?? "");
    if (preset?.symbol.trim()) void choose({ symbol: preset.symbol, name: preset.name, type: preset.type }).then(() => {
      if (preset.price && preset.price > 0) setPrice(String(Number(preset.price.toFixed(4))));
      if (preset.currency) setCur(preset.currency);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preset]);

  // Immediate catalog matches, then debounced provider results (stale responses ignored).
  useEffect(() => {
    const q = query.trim();
    if (picked || q.length < 2) { setResults([]); return; }
    setResults(searchCatalog(q).slice(0, 8));
    let live = true;
    const t = setTimeout(async () => {
      try { const r = await searchFn({ data: { query: q } }); if (live) setResults(r.assets.slice(0, 8)); } catch { /* keep catalog */ }
    }, 300);
    return () => { live = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, picked]);

  useEffect(() => {
    if (kind !== "sell") return;
    const a = p.assets.find((x) => x.id === sellId);
    if (a) { setCur(nativeCurrency(a.symbol, a.quoteCurrency)); if (a.price > 0) { const f = nativeCurrency(a.symbol, a.quoteCurrency) === "EUR" ? (p.eurPerUsd ?? 0) : 1; if (f) setPrice(String(Number((a.price * f).toFixed(4)))); } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, sellId]);

  if (!open) return null;

  const fx = cur === "USD" ? 1 : p.eurPerUsd;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseFloat(qty);
    if (!fx) return;
    const pr = parseFloat(price) / fx; // store in USD
    if (!(q > 0) || !(pr > 0)) return;
    if (date > new Date().toISOString().slice(0, 10)) { toast.error(bg ? "Датата не може да е в бъдещето" : "Date cannot be in the future"); return; }
    let id = "";
    let newAsset;
    if (kind === "sell") {
      id = sellId;
      const held = p.holdings.find((h) => h.asset.id === id)?.quantity ?? 0;
      if (!id) return;
      if (q > held + 1e-9) { toast.error(bg ? `Не можеш да продадеш повече от наличното (${held})` : `You can't sell more than you hold (${held})`); return; }
    } else {
      const r = picked ?? (() => { const x = resolveAsset(query, ""); if (!x) return null; const hit = MARKET_ASSETS.find((a) => a.symbol === x.symbol); return { ...x, type: (hit?.type ?? "stock") as AssetType }; })();
      if (!r) { toast.error(bg ? "Избери актив" : "Choose an asset"); return; }
      const mine = p.assets.find((x) => x.symbol.toUpperCase() === r.symbol.toUpperCase());
      if (mine) id = mine.id;
      else newAsset = { name: r.name, symbol: r.symbol, type: r.type, sector: "Other", region: cur === "EUR" ? "Europe" : "Global",
        price: pr, change24h: 0, dividendPerShare: 0, payMonths: [] };
    }
    try {
      await p.addTransaction({ assetId: id, kind, quantity: q, price: pr, date }, newAsset);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
      return;
    }
    toast.success(p.t("saved"));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-popover p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{p.t("addTx")}</h2>
          <button type="button" onClick={onClose} aria-label={p.t("close")} className="text-muted-foreground"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
          {(["buy", "sell"] as const).map((k) => (
            <button type="button" key={k} onClick={() => setKind(k)} disabled={k === "sell" && owned.length === 0}
              className={`rounded-lg py-1.5 text-sm font-semibold disabled:opacity-40 ${kind === k ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              {p.t(k)}
            </button>
          ))}
        </div>
        {kind === "buy" ? (
          <div className="relative">
            <input className={input} autoFocus placeholder={`${p.t("assetName")} / ${p.t("ticker")}`} value={query}
              onChange={(e) => { setQuery(e.target.value); setPicked(null); setShowList(true); }}
              onFocus={() => setShowList(true)} onBlur={() => setTimeout(() => setShowList(false), 150)} />
            {showList && results.length > 0 && (
              <ul role="listbox" className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-xl">
                {results.map((a) => (
                  <li key={a.symbol}>
                    <button type="button" role="option" aria-selected={false} onMouseDown={(e) => e.preventDefault()} onClick={() => void choose(a)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-secondary">
                      <CompanyLogo symbol={a.symbol} type={a.type} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{a.name}</span>
                        <span className="block text-xs text-muted-foreground">{a.symbol} · {p.t(a.type)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <label className="block text-sm">{p.t("asset")}
            <select className={`${input} mt-1`} value={sellId} onChange={(e) => setSellId(e.target.value)}>
              {owned.map((h) => <option key={h.asset.id} value={h.asset.id}>{h.asset.symbol} — {h.asset.name} ({Number(h.quantity.toFixed(6))})</option>)}
            </select>
          </label>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">{p.t("qty")}
            <input className={`${input} mt-1`} type="number" step="any" min="0" required value={qty} onChange={(e) => setQty(e.target.value)} />
          </label>
          <label className="block text-sm">{p.t("price")}
            <div className="mt-1 flex gap-1">
              <input className={`${input} min-w-0`} type="number" step="any" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} />
              <select aria-label="Currency" className="rounded-xl border border-input bg-background px-2 text-sm" value={cur} onChange={(e) => setCur(e.target.value as Currency)}>
                <option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
            </div>
          </label>
          <label className="col-span-2 block text-sm">{p.t("date")}
            <input className={`${input} mt-1`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-muted-foreground">{p.t("cancel")}</button>
          <button type="submit" disabled={!fx || !p.user} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">{p.t("save")}</button>
        </div>
      </form>
    </div>
  );
}
