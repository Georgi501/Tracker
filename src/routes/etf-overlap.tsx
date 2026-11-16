import { Card } from "@/components/AppShell";
import { RelatedGuides } from "@/components/RelatedGuides";
import { Button } from "@/components/ui/button";
import {
  compareEtfProfiles,
  resolveEtfExposureProfile,
  SUPPORTED_ETF_EXPOSURE_PROFILES,
  type EtfComparisonRow,
} from "@/lib/etf-overlap";
import { isLang, type Lang } from "@/lib/i18n";
import { articleJsonLd, canonicalLink, faqJsonLd } from "@/lib/seo";
import { usePortfolio } from "@/lib/store";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Layers, Plus, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

const ETF_INDEX_LABELS: Record<string, string> = {
  VOO: "Vanguard S&P 500 (US)",
  SPY: "SPDR S&P 500 (US)",
  IVV: "iShares Core S&P 500 (US)",
  VTI: "Vanguard Total Stock Market (US)",
  VUAA: "Vanguard S&P 500 UCITS (Acc)",
  VUSA: "Vanguard S&P 500 UCITS (Dist)",
  CSPX: "iShares Core S&P 500 UCITS (Acc)",
  SXR8: "iShares Core S&P 500 UCITS (EUR)",
  QQQ: "Invesco Nasdaq-100 (US)",
  EQQQ: "Invesco Nasdaq-100 UCITS",
  VWCE: "Vanguard FTSE All-World UCITS (Acc)",
  VT: "Vanguard Total World Stock (US)",
  VWRP: "Vanguard FTSE All-World UCITS (GBP)",
  VWRL: "Vanguard FTSE All-World UCITS (Dist)",
  IWDA: "iShares Core MSCI World UCITS (Acc)",
  SWDA: "iShares Core MSCI World UCITS (GBP)",
  EUNL: "iShares Core MSCI World UCITS (EUR)",
  URTH: "iShares MSCI World (US)",
};

const PRESETS: { id: string; symbols: string[]; label: string }[] = [
  { id: "voo-qqq", symbols: ["VOO", "QQQ"], label: "VOO vs QQQ" },
  { id: "vwce-iwda", symbols: ["VWCE", "IWDA"], label: "VWCE vs IWDA" },
  { id: "vuaa-eqqq", symbols: ["VUAA", "EQQQ"], label: "VUAA vs EQQQ" },
  { id: "voo-vwce-qqq", symbols: ["VOO", "VWCE", "QQQ"], label: "VOO vs VWCE vs QQQ" },
];

const ETF_COLORS = ["bg-emerald-500", "bg-sky-400", "bg-amber-400"] as const;
const ETF_TEXT_COLORS = ["text-emerald-400", "text-sky-400", "text-amber-400"] as const;

type Copy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  presetsLabel: string;
  etfSlot: (n: number) => string;
  addThird: string;
  removeThird: string;
  sectorOverlap: string;
  regionOverlap: string;
  sectorBreakdown: string;
  regionBreakdown: string;
  sharedLabel: string;
  methodology: string;
  ctaTitle: string;
  ctaBody: string;
  ctaPrimary: string;
  ctaSecondary: string;
};

const COPY: Record<Lang, Copy> = {
  en: {
    eyebrow: "Free Look-Through Tool",
    title: "ETF Overlap & Exposure Calculator",
    subtitle:
      "Compare 2 or 3 popular US & UCITS ETFs side by side to see shared sector and regional concentration before you buy.",
    presetsLabel: "Popular comparisons",
    etfSlot: (n) => `ETF ${n}`,
    addThird: "Add 3rd ETF",
    removeThird: "Remove 3rd ETF",
    sectorOverlap: "Sector overlap",
    regionOverlap: "Region overlap",
    sectorBreakdown: "Sector look-through comparison",
    regionBreakdown: "Region look-through comparison",
    sharedLabel: "Shared",
    methodology:
      "Calculated from verified index-level sector and regional exposure profiles in CapiSpot. Unknown tickers are never fabricated.",
    ctaTitle: "Analyze overlap across your full real portfolio",
    ctaBody:
      "Connect or import your brokers via CSV to see true look-through weights, dividend calendars, and tax lots across all your ETFs and stocks.",
    ctaPrimary: "Create free account",
    ctaSecondary: "Explore broker imports",
  },
  bg: {
    eyebrow: "Безплатен инструмент",
    title: "Калкулатор за ETF припокриване и експозиция",
    subtitle:
      "Сравни 2 или 3 популярни US и UCITS ETF-а един до друг, за да видиш общите сектори и региони преди покупка.",
    presetsLabel: "Популярни сравнения",
    etfSlot: (n) => `ETF ${n}`,
    addThird: "Добави 3-ти ETF",
    removeThird: "Премахни 3-ти ETF",
    sectorOverlap: "Секторно припокриване",
    regionOverlap: "Регионално припокриване",
    sectorBreakdown: "Секторно сравнение (look-through)",
    regionBreakdown: "Регионално сравнение (look-through)",
    sharedLabel: "Общо",
    methodology:
      "Изчислено от проверени индексни профили за секторна и регионална експозиция в CapiSpot. Неизвестни тикери не се измислят.",
    ctaTitle: "Анализирай припокриването в цялото си реално портфолио",
    ctaBody:
      "Импортирай брокерите си безплатно през CSV, за да видиш реалните тегла, дивидентния календар и данъчните партиди за всички ETF-и и акции.",
    ctaPrimary: "Създай безплатен профил",
    ctaSecondary: "Виж импорт от брокери",
  },
  de: {
    eyebrow: "Kostenloses Analyse-Tool",
    title: "ETF-Überschneidungs- & Look-Through-Rechner",
    subtitle:
      "Vergleiche 2 oder 3 beliebte US- und UCITS-ETFs direkt miteinander, um gemeinsame Sektor- und Regionenrisiken zu erkennen.",
    presetsLabel: "Beliebte Vergleiche",
    etfSlot: (n) => `ETF ${n}`,
    addThird: "3. ETF hinzufügen",
    removeThird: "3. ETF entfernen",
    sectorOverlap: "Sektor-Überschneidung",
    regionOverlap: "Regionen-Überschneidung",
    sectorBreakdown: "Sektor-Vergleich (Look-Through)",
    regionBreakdown: "Regionen-Vergleich (Look-Through)",
    sharedLabel: "Gemeinsam",
    methodology:
      "Berechnet aus verifizierten Index-Sektor- und Regionenprofilen in CapiSpot. Unbekannte Ticker werden niemals erfunden.",
    ctaTitle: "Überschneidungen im gesamten echten Portfolio analysieren",
    ctaBody:
      "Importiere deine Broker kostenlos per CSV und erhalte echte Look-Through-Gewichtungen, Dividendenkalender und Steuerlose.",
    ctaPrimary: "Kostenloses Konto erstellen",
    ctaSecondary: "Broker-Importe ansehen",
  },
  es: {
    eyebrow: "Herramienta gratuita",
    title: "Calculadora de Solapamiento y Exposición de ETF",
    subtitle:
      "Compara 2 o 3 ETFs populares de EE. UU. y UCITS lado a lado para detectar concentración compartida por sector y región.",
    presetsLabel: "Comparaciones populares",
    etfSlot: (n) => `ETF ${n}`,
    addThird: "Añadir 3.º ETF",
    removeThird: "Quitar 3.º ETF",
    sectorOverlap: "Solapamiento sectorial",
    regionOverlap: "Solapamiento regional",
    sectorBreakdown: "Comparación sectorial (look-through)",
    regionBreakdown: "Comparación regional (look-through)",
    sharedLabel: "Compartido",
    methodology:
      "Calculado con perfiles verificados de exposición sectorial y regional de índices en CapiSpot. Nunca inventamos tickers.",
    ctaTitle: "Analiza el solapamiento en toda tu cartera real",
    ctaBody:
      "Importa tus brókeres gratis por CSV para ver pesos reales, calendario de dividendos y lotes fiscales en todos tus ETFs y acciones.",
    ctaPrimary: "Crear cuenta gratis",
    ctaSecondary: "Ver importaciones de bróker",
  },
  it: {
    eyebrow: "Strumento gratuito",
    title: "Calcolatore di Sovrapposizione ed Esposizione ETF",
    subtitle:
      "Confronta 2 o 3 popolari ETF US e UCITS fianco a fianco per scoprire l'esposizione condivisa per settore e area geografica.",
    presetsLabel: "Confronti popolari",
    etfSlot: (n) => `ETF ${n}`,
    addThird: "Aggiungi 3° ETF",
    removeThird: "Rimuovi 3° ETF",
    sectorOverlap: "Sovrapposizione settoriale",
    regionOverlap: "Sovrapposizione geografica",
    sectorBreakdown: "Confronto settoriale (look-through)",
    regionBreakdown: "Confronto geografico (look-through)",
    sharedLabel: "Condiviso",
    methodology:
      "Calcolato da profili verificati di esposizione settoriale e geografica in CapiSpot. I ticker sconosciuti non vengono mai inventati.",
    ctaTitle: "Analizza la sovrapposizione su tutto il tuo portafoglio reale",
    ctaBody:
      "Importa gratuitamente i tuoi broker via CSV per vedere i pesi reali, il calendario dividendi e i lotti fiscali di tutti i tuoi ETF e azioni.",
    ctaPrimary: "Crea account gratuito",
    ctaSecondary: "Scopri le importazioni broker",
  },
};

const FAQ_ITEMS: Record<Lang, readonly (readonly [string, string])[]> = {
  en: [
    [
      "How is ETF overlap calculated?",
      "CapiSpot compares verified index-level sector and regional weights across 2 or 3 selected ETFs and sums the minimum shared weight in each category.",
    ],
    [
      "Which US and UCITS ETFs are supported?",
      "You can compare S&P 500, Nasdaq-100, FTSE All-World, and MSCI World ETFs including VOO, SPY, QQQ, VWCE, IWDA, VUAA, CSPX, VTI, and EQQQ.",
    ],
    [
      "Can I check overlap across my real portfolio?",
      "Yes. Create a free account and import your broker CSV to see look-through sector, regional, and top-holding overlap across all your positions.",
    ],
  ],
  bg: [
    [
      "Как се изчислява ETF припокриването?",
      "CapiSpot сравнява проверените индексни тегла по сектори и региони между 2 или 3 избрани ETF-а и сумира минималното общо тегло във всяка категория.",
    ],
    [
      "Кои US и UCITS ETF-и се поддържат?",
      "Можеш да сравняваш S&P 500, Nasdaq-100, FTSE All-World и MSCI World ETF-и, включително VOO, SPY, QQQ, VWCE, IWDA, VUAA, CSPX, VTI и EQQQ.",
    ],
    [
      "Мога ли да проверя припокриването в реалното си портфолио?",
      "Да. Създай безплатен профил и импортирай CSV от твоя брокер, за да видиш реалната експозиция по сектори, региони и водещи компании.",
    ],
  ],
  de: [
    [
      "Wie wird die ETF-Überschneidung berechnet?",
      "CapiSpot vergleicht verifizierte Index-Sektor- und Regionen-Gewichtungen von 2 oder 3 gewählten ETFs und summiert das kleinste gemeinsame Gewicht je Kategorie.",
    ],
    [
      "Welche US- und UCITS-ETFs werden unterstützt?",
      "Vergleiche S&P 500, Nasdaq-100, FTSE All-World und MSCI World ETFs wie VOO, SPY, QQQ, VWCE, IWDA, VUAA, CSPX, VTI und EQQQ.",
    ],
    [
      "Kann ich die Überschneidung in meinem echten Portfolio prüfen?",
      "Ja. Erstelle ein kostenloses Konto und importiere deine Broker-CSV, um die echte Sektor-, Regionen- und Positionsüberschneidung zu sehen.",
    ],
  ],
  es: [
    [
      "¿Cómo se calcula el solapamiento entre ETFs?",
      "CapiSpot compara los pesos sectoriales y regionales verificados de 2 o 3 ETFs seleccionados y suma el peso mínimo compartido en cada categoría.",
    ],
    [
      "¿Qué ETFs de EE. UU. y UCITS son compatibles?",
      "Puedes comparar ETFs del S&P 500, Nasdaq-100, FTSE All-World y MSCI World como VOO, SPY, QQQ, VWCE, IWDA, VUAA, CSPX, VTI y EQQQ.",
    ],
    [
      "¿Puedo analizar el solapamiento de toda mi cartera real?",
      "Sí. Crea una cuenta gratuita e importa el CSV de tu bróker para ver la exposición real por sector, región y principales posiciones.",
    ],
  ],
  it: [
    [
      "Come viene calcolata la sovrapposizione ETF?",
      "CapiSpot confronta i pesi settoriali e geografici verificati di 2 o 3 ETF selezionati e somma il peso minimo condiviso in ogni categoria.",
    ],
    [
      "Quali ETF US e UCITS sono supportati?",
      "Puoi confrontare ETF S&P 500, Nasdaq-100, FTSE All-World e MSCI World tra cui VOO, SPY, QQQ, VWCE, IWDA, VUAA, CSPX, VTI ed EQQQ.",
    ],
    [
      "Posso verificare la sovrapposizione sul mio portafoglio reale?",
      "Sì. Crea un account gratuito e importa il CSV del tuo broker per vedere l'esposizione reale per settore, area geografica e partecipazioni.",
    ],
  ],
};

const TITLE = "Free ETF Overlap & Look-Through Calculator — CapiSpot";
const DESCRIPTION =
  "Compare 2 or 3 US and UCITS ETFs (VOO, QQQ, VWCE, IWDA, VUAA, CSPX, EQQQ) to inspect shared sector and regional exposure instantly.";

export const Route = createFileRoute("/etf-overlap")({
  validateSearch: (search) =>
    z
      .object({
        etf: z.string().max(16).optional().catch(undefined),
        etfs: z.string().max(48).optional().catch(undefined),
      })
      .parse(search),
  head: ({ matches }) => {
    const rootSearch = matches[0]?.search as { lang?: Lang } | undefined;
    const lang: Lang = rootSearch?.lang && isLang(rootSearch.lang) ? rootSearch.lang : "en";
    const routeSearch = matches.at(-1)?.search as { etf?: string; etfs?: string } | undefined;
    const hasCustomPair = Boolean(routeSearch?.etfs || routeSearch?.etf);
    const pair = resolveInitialEtfPair(routeSearch?.etf, routeSearch?.etfs);
    const title = hasCustomPair
      ? `${pair.join(" vs ")} ETF Overlap & Exposure Calculator — CapiSpot`
      : TITLE;
    const description = hasCustomPair
      ? `Compare ${pair.join(", ")} side by side to inspect shared sector and regional exposure instantly with CapiSpot.`
      : DESCRIPTION;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        {
          property: "og:image",
          content:
            "https://capispot.com/api/og?type=asset&symbol=ETF%20OVERLAP&name=Sector%20%26%20Region%20Look-Through&sector=Free%20Calculator",
        },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [canonicalLink("/etf-overlap")],
      scripts: [articleJsonLd(title, description, "/etf-overlap"), faqJsonLd(FAQ_ITEMS[lang])],
    };
  },
  component: EtfOverlapRoute,
});

function EtfOverlapRoute() {
  const { etf, etfs } = Route.useSearch();
  return <EtfOverlapPage initialEtf={etf} initialEtfs={etfs} />;
}

export function resolveInitialEtfPair(initialEtf?: string, initialEtfs?: string): string[] {
  if (initialEtfs) {
    const resolved: string[] = [];
    const seen = new Set<string>();
    for (const part of initialEtfs.split(",")) {
      const profile = resolveEtfExposureProfile(part);
      if (!profile || seen.has(profile.symbol)) continue;
      seen.add(profile.symbol);
      resolved.push(profile.symbol);
      if (resolved.length === 3) break;
    }
    if (resolved.length >= 2) return resolved;
  }

  const profile = initialEtf ? resolveEtfExposureProfile(initialEtf) : null;
  if (!profile) return ["VOO", "QQQ"];
  const partner = profile.symbol === "VOO" ? "QQQ" : profile.symbol === "VWCE" ? "IWDA" : "VOO";
  return [profile.symbol, partner];
}

export function EtfOverlapPage({
  initialEtf,
  initialEtfs,
}: {
  initialEtf?: string | undefined;
  initialEtfs?: string | undefined;
} = {}) {
  const p = usePortfolio();
  const c = COPY[p.lang];
  const supportedSymbols = useMemo(() => Object.keys(SUPPORTED_ETF_EXPOSURE_PROFILES), []);
  const [selected, setSelected] = useState<string[]>(() =>
    resolveInitialEtfPair(initialEtf, initialEtfs),
  );

  useEffect(() => {
    if (initialEtf || initialEtfs) {
      setSelected(resolveInitialEtfPair(initialEtf, initialEtfs));
    }
  }, [initialEtf, initialEtfs]);

  const comparison = useMemo(() => compareEtfProfiles(selected), [selected]);

  const updateSlot = (index: number, nextSymbol: string) => {
    setSelected((prev) => {
      const next = [...prev];
      const existingIndex = next.indexOf(nextSymbol);
      if (existingIndex !== -1 && existingIndex !== index) {
        next[existingIndex] = prev[index]!;
      }
      next[index] = nextSymbol;
      return next;
    });
  };

  const addThirdSlot = () => {
    if (selected.length >= 3) return;
    const candidate = supportedSymbols.find((s) => !selected.includes(s)) ?? "VWCE";
    setSelected((prev) => [...prev, candidate]);
  };

  const removeThirdSlot = () => {
    if (selected.length <= 2) return;
    setSelected((prev) => prev.slice(0, 2));
  };

  return (
    <div className="page-enter mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Layers className="size-3.5" aria-hidden="true" />
          {c.eyebrow}
        </span>
        <h1 className="font-display text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          {c.title}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {c.subtitle}
        </p>
      </header>

      <Card className="space-y-5 border-border/80 bg-card/80 p-4 sm:p-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {c.presetsLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const active =
                preset.symbols.length === selected.length &&
                preset.symbols.every((s, idx) => selected[idx] === s);
              return (
                <Link
                  key={preset.id}
                  to="/etf-overlap"
                  search={{ etfs: preset.symbols.join(",") }}
                  onClick={() => setSelected([...preset.symbols])}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary/50 text-foreground hover:border-primary/50"
                  }`}
                >
                  {preset.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {selected.map((symbol, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`etf-slot-${index}`}
                  className={`text-xs font-semibold ${ETF_TEXT_COLORS[index] ?? "text-foreground"}`}
                >
                  {c.etfSlot(index + 1)}
                </label>
                {index === 2 && (
                  <button
                    type="button"
                    onClick={removeThirdSlot}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" aria-hidden="true" />
                    {c.removeThird}
                  </button>
                )}
              </div>
              <select
                id={`etf-slot-${index}`}
                value={symbol}
                onChange={(e) => updateSlot(index, e.target.value)}
                className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
              >
                {supportedSymbols.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym} — {ETF_INDEX_LABELS[sym] ?? sym}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {selected.length < 3 && (
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={addThirdSlot}
                className="min-h-11 w-full rounded-xl border-dashed"
              >
                <Plus className="mr-1.5 size-4" aria-hidden="true" />
                {c.addThird}
              </Button>
            </div>
          )}
        </div>

        {comparison && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-secondary/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">{c.sectorOverlap}</p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums text-foreground">
                {(comparison.sectorOverlap * 100).toFixed(1)}%
              </p>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min(100, comparison.sectorOverlap * 100)}%` }}
                />
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-secondary/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">{c.regionOverlap}</p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums text-foreground">
                {(comparison.regionOverlap * 100).toFixed(1)}%
              </p>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-sky-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, comparison.regionOverlap * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {comparison && (
        <div className="grid gap-5 lg:grid-cols-2">
          <ComparisonBreakdownCard
            title={c.sectorBreakdown}
            sharedLabel={c.sharedLabel}
            symbols={comparison.symbols}
            rows={comparison.sectors}
          />
          <ComparisonBreakdownCard
            title={c.regionBreakdown}
            sharedLabel={c.sharedLabel}
            symbols={comparison.symbols}
            rows={comparison.regions}
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground">{c.methodology}</p>

      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <h2 className="font-display flex items-center gap-2 text-lg font-bold sm:text-xl">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              {c.ctaTitle}
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">{c.ctaBody}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95"
            >
              {c.ctaPrimary}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              to="/brokers"
              className="inline-flex min-h-11 items-center rounded-full border border-border bg-background/60 px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary/50"
            >
              {c.ctaSecondary}
            </Link>
          </div>
        </div>
      </Card>

      <RelatedGuides current="/etf-overlap" />
    </div>
  );
}

function ComparisonBreakdownCard({
  title,
  sharedLabel,
  symbols,
  rows,
}: {
  title: string;
  sharedLabel: string;
  symbols: string[];
  rows: EtfComparisonRow[];
}) {
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display font-semibold">{title}</h2>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {symbols.map((sym, idx) => (
            <span key={sym} className="inline-flex items-center gap-1.5 font-semibold">
              <span className={`size-2 rounded-full ${ETF_COLORS[idx] ?? "bg-primary"}`} />
              {sym}
            </span>
          ))}
        </div>
      </div>

      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.name} className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">{row.name}</span>
              <span className="font-semibold tabular-nums text-primary">
                {sharedLabel}: {(row.overlap * 100).toFixed(1)}%
              </span>
            </div>
            <div className="space-y-1">
              {symbols.map((sym, idx) => {
                const weight = row.weights[sym] ?? 0;
                return (
                  <div key={sym} className="flex items-center gap-2">
                    <span className="w-11 shrink-0 font-mono text-[11px] text-muted-foreground">
                      {sym}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${ETF_COLORS[idx] ?? "bg-primary"}`}
                        style={{ width: `${Math.min(100, weight * 100)}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right tabular-nums text-muted-foreground">
                      {(weight * 100).toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
