import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { usePortfolio } from "@/lib/store";
import { type AssetType, type Currency, type TxKind } from "@/lib/portfolio";
import { searchCatalog, MARKET_ASSETS } from "@/lib/market-search";

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
  const hit = searchCatalog(n)[0];
  return { name: hit?.name ?? n, symbol: hit?.symbol ?? n.toUpperCase().replace(/\s+/g, "").slice(0, 12) };
}

export function AddTransactionDialog({ open, onClose, preset }: { open: boolean; onClose: () => void; preset?: TxPreset | null }) {
  const p = usePortfolio();
  const [kind, setKind] = useState<TxKind>("buy");
  const [isNew, setIsNew] = useState(false);
  const [assetId, setAssetId] = useState(p.assets[0]?.id ?? "");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [type, setType] = useState<AssetType>("stock");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [cur, setCur] = useState<Currency>("USD");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  useEffect(() => {
    if (!open || !preset) return;
    const owned = p.assets.find((a) => a.symbol.toUpperCase() === preset.symbol.toUpperCase());
    setKind("buy");
    if (owned) { setIsNew(false); setAssetId(owned.id); }
    else { setIsNew(true); setName(preset.name); setSymbol(preset.symbol); setType(preset.type); }
    setCur(preset.currency ?? nativeCurrency(preset.symbol, owned?.quoteCurrency));
    setPrice(preset.price && preset.price > 0 ? String(Number(preset.price.toFixed(4))) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preset]);
  const selected = assetId || p.assets[0]?.id || "";
  // Follow the asset's native currency whenever the chosen asset/ticker changes.
  useEffect(() => {
    if (!open || preset?.currency) return;
    if (isNew) setCur(nativeCurrency(resolveAsset(name, symbol)?.symbol ?? ""));
    else { const a = p.assets.find((x) => x.id === selected); if (a) setCur(nativeCurrency(a.symbol, a.quoteCurrency)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isNew, selected, symbol, name]);
  if (!open) return null;

  const fx = cur === "USD" ? 1 : p.eurPerUsd;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = kind === "dividend" ? 1 : parseFloat(qty);
    if (!fx) return;
    const pr = parseFloat(price) / fx; // store in USD
    if (!(q > 0) || !(pr > 0)) return;
    let id = selected;
    let newAsset;
    if (!isNew && !id) return;
    if (isNew && kind === "buy") {
      const r = resolveAsset(name, symbol);
      if (!r) { toast.error(`${p.t("ticker")} / ${p.t("assetName")}`); return; }
      newAsset = { name: r.name, symbol: r.symbol, type, sector: "Other", region: cur === "EUR" ? "Europe" : "Global",
        price: pr, change24h: 0, dividendPerShare: 0, payMonths: [] };
    }
    try {
      await p.addTransaction({ assetId: id, kind, quantity: q, price: pr, date }, newAsset);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
      return;
    }
    toast.success(p.t("saved"));
    setQty(""); setPrice(""); setName(""); setSymbol(""); setIsNew(false);
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
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
          {(["buy", "sell", "dividend"] as TxKind[]).map((k) => (
            <button type="button" key={k} onClick={() => setKind(k)}
              className={`rounded-lg py-1.5 text-sm font-semibold ${kind === k ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              {p.t(k)}
            </button>
          ))}
        </div>
        {kind === "buy" && (
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={!isNew} onChange={() => setIsNew(false)} />{p.t("existing")}</label>
            <label className="flex items-center gap-2"><input type="radio" checked={isNew} onChange={() => setIsNew(true)} />{p.t("newAsset")}</label>
          </div>
        )}
        {isNew && kind === "buy" ? (
          <div className="grid grid-cols-2 gap-3">
            <input className={`${input} col-span-2`} placeholder={`${p.t("assetName")} / ${p.t("ticker")}`} value={name} onChange={(e) => setName(e.target.value)} />
            <input className={input} placeholder={p.t("ticker")} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
            <select className={input} value={type} onChange={(e) => setType(e.target.value as AssetType)}>
              {(["stock", "etf", "crypto", "cash", "realEstate"] as AssetType[]).map((t) => <option key={t} value={t}>{p.t(t)}</option>)}
            </select>
          </div>
        ) : (
          <label className="block text-sm">{p.t("asset")}
            <select className={`${input} mt-1`} value={selected} onChange={(e) => setAssetId(e.target.value)}>
              {p.assets.map((a) => <option key={a.id} value={a.id}>{a.symbol} — {a.name}</option>)}
            </select>
          </label>
        )}
        <div className="grid grid-cols-2 gap-3">
          {kind !== "dividend" && (
            <label className="block text-sm">{p.t("qty")}
              <input className={`${input} mt-1`} type="number" step="any" min="0" required value={qty} onChange={(e) => setQty(e.target.value)} />
            </label>
          )}
          <label className={`block text-sm ${kind === "dividend" ? "col-span-2" : ""}`}>
            {kind === "dividend" ? p.t("amount") : p.t("price")}
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
