import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePortfolio } from "@/lib/store";
import { marketDcf, searchMarket } from "@/lib/market.functions";
import { marketSearchSchema, searchCatalog } from "@/lib/market-search";
import { dcfValue, scenario, valuationGap, type DcfCase } from "@/lib/dcf";
import type { Lang } from "@/lib/i18n";

type Copy = {
  ticker: string;
  calc: string;
  bear: string;
  base: string;
  bull: string;
  intrinsic: string;
  price: string;
  under: string;
  over: string;
  growth: string;
  discount: string;
  terminal: string;
  na: string;
  loading: string;
  explain: (g: string, n: string) => string;
  disclaimer: string;
};
export const dcfCopy: Record<Lang, Copy> = {
  en: {
    ticker: "Ticker, e.g. ADBE",
    calc: "Calculate",
    bear: "Bear case",
    base: "Base case",
    bull: "Bull case",
    intrinsic: "Intrinsic value",
    price: "Price",
    under: "Undervalued by",
    over: "Overvalued by",
    growth: "FCF growth / yr",
    discount: "Discount rate (WACC)",
    terminal: "Terminal growth",
    na: "DCF is not applicable: positive free cash flow or share data is missing.",
    loading: "Loading real financials…",
    explain: (g, n) =>
      `Discounted cash flow model: ${n}'s free cash flow grows ${g} a year for 5 years, then at the terminal rate.`,
    disclaimer: "Estimate based on your assumptions, not investment advice.",
  },
  bg: {
    ticker: "Тикер, напр. ADBE",
    calc: "Изчисли",
    bear: "Песимистичен",
    base: "Базов",
    bull: "Оптимистичен",
    intrinsic: "Справедлива стойност",
    price: "Цена",
    under: "Подценена с",
    over: "Надценена с",
    growth: "Ръст на FCF / год.",
    discount: "Дисконтов процент (WACC)",
    terminal: "Терминален ръст",
    na: "DCF не е приложим: липсва положителен свободен паричен поток или данни за акциите.",
    loading: "Зареждане на реални финансови данни…",
    explain: (g, n) =>
      `Модел на дисконтираните парични потоци: свободният паричен поток на ${n} расте с ${g} годишно за 5 години, след това с терминалния темп.`,
    disclaimer: "Оценка по твоите допускания, не е инвестиционен съвет.",
  },
  de: {
    ticker: "Ticker, z. B. ADBE",
    calc: "Berechnen",
    bear: "Bär-Szenario",
    base: "Basis",
    bull: "Bullen-Szenario",
    intrinsic: "Innerer Wert",
    price: "Kurs",
    under: "Unterbewertet um",
    over: "Überbewertet um",
    growth: "FCF-Wachstum / J.",
    discount: "Diskontsatz (WACC)",
    terminal: "Ewiges Wachstum",
    na: "DCF nicht anwendbar: positiver Free Cashflow oder Aktienanzahl fehlt.",
    loading: "Lade echte Finanzdaten…",
    explain: (g, n) =>
      `DCF-Modell: Der Free Cashflow von ${n} wächst 5 Jahre lang um ${g} pro Jahr, danach mit der Endrate.`,
    disclaimer: "Schätzung nach deinen Annahmen, keine Anlageberatung.",
  },
  es: {
    ticker: "Ticker, p. ej. ADBE",
    calc: "Calcular",
    bear: "Pesimista",
    base: "Base",
    bull: "Optimista",
    intrinsic: "Valor intrínseco",
    price: "Precio",
    under: "Infravalorada un",
    over: "Sobrevalorada un",
    growth: "Crecimiento FCF / año",
    discount: "Tasa de descuento (WACC)",
    terminal: "Crecimiento terminal",
    na: "DCF no aplicable: falta flujo de caja libre positivo o datos de acciones.",
    loading: "Cargando datos financieros reales…",
    explain: (g, n) =>
      `Modelo DCF: el flujo de caja libre de ${n} crece un ${g} anual durante 5 años y luego a la tasa terminal.`,
    disclaimer: "Estimación según tus supuestos, no es asesoramiento.",
  },
  it: {
    ticker: "Ticker, es. ADBE",
    calc: "Calcola",
    bear: "Pessimista",
    base: "Base",
    bull: "Ottimista",
    intrinsic: "Valore intrinseco",
    price: "Prezzo",
    under: "Sottovalutata del",
    over: "Sopravvalutata del",
    growth: "Crescita FCF / anno",
    discount: "Tasso di sconto (WACC)",
    terminal: "Crescita terminale",
    na: "DCF non applicabile: mancano flusso di cassa libero positivo o dati sulle azioni.",
    loading: "Caricamento dati finanziari reali…",
    explain: (g, n) =>
      `Modello DCF: il free cash flow di ${n} cresce del ${g} annuo per 5 anni, poi al tasso terminale.`,
    disclaimer: "Stima basata sulle tue ipotesi, non è consulenza.",
  },
};

const pctFmt = (v: number) => `${(v * 100).toFixed(1)}%`;

export function DcfCalculator() {
  const p = usePortfolio();
  const c = dcfCopy[p.lang];
  const firstStock = p.holdings.find((h) => h.asset.type === "stock")?.asset.symbol ?? "";
  const [input, setInput] = useState(firstStock);
  const [symbol, setSymbol] = useState(firstStock);
  const [mode, setMode] = useState<DcfCase>("base");
  const [custom, setCustom] = useState<{
    growth: number;
    discount: number;
    terminal: number;
  } | null>(null);
  const fn = useServerFn(marketDcf);
  const searchFn = useServerFn(searchMarket);
  const q = useQuery({
    queryKey: ["dcf", symbol],
    queryFn: () => fn({ data: { symbol } }),
    enabled: !!symbol,
    staleTime: 3600_000,
  });
  const d = q.data;
  const baseG = d?.revenueGrowth ?? d?.earningsGrowth ?? 0.05;
  const a = custom ?? scenario(mode, baseG);
  const sameCcy = !d?.finCurrency || d.finCurrency === d.currency;
  const iv =
    d && sameCcy
      ? dcfValue({
          fcf: d.fcf ?? NaN,
          cash: d.cash ?? 0,
          debt: d.debt ?? 0,
          shares: d.shares ?? NaN,
          ...a,
        })
      : null;
  const money = (v: number) =>
    new Intl.NumberFormat(p.lang, {
      style: "currency",
      currency: d?.currency ?? "USD",
      maximumFractionDigits: 2,
    }).format(v);
  const gap = iv && d?.price ? valuationGap(iv, d.price) : null;
  const max = iv && d?.price ? Math.max(iv, d.price) : 1;

  return (
    <div className="grid gap-4">
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const raw = input.trim();
          if (!raw) return;
          const pick = (list: { symbol: string; type: string }[]) =>
            list.find((a) => a.type === "stock" || a.type === "etf")?.symbol;
          let s = pick(
            searchCatalog(raw).filter(
              (a) =>
                a.symbol.toUpperCase() === raw.toUpperCase() ||
                a.name.toLowerCase().startsWith(raw.toLowerCase()),
            ),
          );
          if (!s) {
            try {
              const r = await searchFn({ data: marketSearchSchema.parse({ query: raw }) });
              s = pick(r.assets);
            } catch {
              /* fall back to ticker */
            }
          }
          if (!s && /^[A-Za-z0-9.^=_-]{1,20}$/.test(raw)) s = raw.toUpperCase();
          if (s) {
            setSymbol(s);
            setCustom(null);
          }
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={c.ticker}
          className="h-11"
        />
        <Button type="submit" className="h-11">
          {c.calc}
        </Button>
      </form>
      {!symbol ? null : q.isLoading ? (
        <p className="text-sm text-muted-foreground">{c.loading}</p>
      ) : !d || iv == null || !d.price ? (
        <p className="text-sm text-muted-foreground">{c.na}</p>
      ) : (
        <>
          <div>
            <div className="text-sm text-muted-foreground">
              {d.name} · {c.intrinsic}
            </div>
            <div className="font-display text-4xl font-bold">{money(iv)}</div>
            {gap != null && (
              <div
                className={`mt-1 text-sm font-semibold ${gap >= 0 ? "text-success" : "text-destructive"}`}
              >
                {gap >= 0 ? c.under : c.over} {pctFmt(Math.abs(gap))}
              </div>
            )}
          </div>
          <div className="grid gap-2 text-sm">
            <div
              className="flex h-9 items-center justify-between rounded-md bg-primary px-3 text-primary-foreground"
              style={{ width: `${Math.max(30, (iv / max) * 100)}%` }}
            >
              <span>{c.intrinsic}</span>
              <span>{money(iv)}</span>
            </div>
            <div
              className="flex h-9 items-center justify-between rounded-md bg-muted px-3"
              style={{ width: `${Math.max(30, (d.price / max) * 100)}%` }}
            >
              <span>{c.price}</span>
              <span>{money(d.price)}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {(["bear", "base", "bull"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setCustom(null);
                }}
                className={`rounded-md py-2 text-xs font-semibold sm:text-sm ${!custom && mode === m ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                {c[m]}
              </button>
            ))}
          </div>
          {(
            [
              ["growth", -0.05, 0.3],
              ["discount", 0.05, 0.15],
              ["terminal", 0, 0.04],
            ] as const
          ).map(([k, min, mx]) => (
            <label key={k} className="grid gap-1 text-sm">
              <span className="flex justify-between">
                <span>{c[k]}</span>
                <span className="font-semibold">{pctFmt(a[k])}</span>
              </span>
              <input
                type="range"
                min={min}
                max={mx}
                step={0.005}
                value={a[k]}
                className="h-6 accent-primary"
                onChange={(e) => setCustom({ ...a, [k]: Number(e.target.value) })}
              />
            </label>
          ))}
          <p className="text-sm text-muted-foreground">{c.explain(pctFmt(a.growth), d.name)}</p>
          <p className="text-xs text-muted-foreground">{c.disclaimer}</p>
        </>
      )}
    </div>
  );
}
