import { createFileRoute } from "@tanstack/react-router";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CalendarDays, RefreshCw } from "lucide-react";
import { Card } from "@/components/AppShell";
import { BarsSilhouette, ProGate } from "@/components/ProFeatures";
import { useWatchState } from "@/components/AssetExtras";
import { usePortfolio } from "@/lib/store";
import { languageLocale, type Lang } from "@/lib/i18n";
import { CRYPTO_SYMBOLS } from "@/lib/crypto-assets";
import { MARKET_ASSETS } from "@/lib/market-search";
import { marketEarningsCalendar } from "@/lib/market.functions";
import { getCorporateActions, type CorporateActions } from "@/lib/dividends.functions";
import { earningsSurprisePercent, type EarningsCalendarData } from "@/lib/earnings";
import { writeEarningsReminders } from "@/lib/watchlist";

export const Route = createFileRoute("/earnings")({
  head: () => ({ meta: [{ title: "Earnings calendar — Capispot" }] }),
  component: EarningsCalendar,
});

const CRYPTO_SYMBOL_SET = new Set<string>(CRYPTO_SYMBOLS);

const COPY: Record<
  Lang,
  {
    title: string;
    description: string;
    upcoming: string;
    reported: string;
    date: string;
    period: string;
    company: string;
    dateConfirmed: string;
    dateEstimated: string;
    epsEstimate: string;
    revenueEstimate: string;
    actualEps: string;
    estimateEps: string;
    surprise: string;
    noSymbols: string;
    noUpcoming: string;
    noReported: string;
    unavailable: (symbols: string) => string;
    refresh: string;
    loading: string;
    error: string;
    retry: string;
    source: string;
    limit: string;
    lockedDescription: string;
    reminderOn: string;
    reminderOff: string;
    reminderHelp: string;
  }
> = {
  en: {
    title: "Earnings calendar",
    description: "Upcoming company report dates and recent reported EPS versus analyst estimates.",
    upcoming: "Upcoming reports",
    reported: "Recent reported results",
    date: "Report date",
    period: "Fiscal quarter",
    company: "Company",
    dateConfirmed: "Confirmed",
    dateEstimated: "Estimated date",
    epsEstimate: "EPS estimate",
    revenueEstimate: "Revenue estimate",
    actualEps: "Reported EPS",
    estimateEps: "Estimated EPS",
    surprise: "Surprise",
    noSymbols: "Add stocks to your portfolio or Watchlist to see their report dates here.",
    noUpcoming: "No upcoming report dates are currently available from the provider.",
    noReported: "No recent reported EPS comparisons are available.",
    unavailable: (symbols) => `Market data could not be loaded for: ${symbols}.`,
    refresh: "Refresh",
    loading: "Loading report calendar…",
    error: "Could not load earnings calendar data.",
    retry: "Try again",
    source:
      "Source: Yahoo Finance. Dates and estimates may change or be unavailable. Reported EPS and estimates use the provider's reported currency.",
    limit: "Showing the first 100 eligible company symbols.",
    lockedDescription:
      "Upcoming report dates and earnings surprises for your portfolio and Watchlist.",
    reminderOn: "Reminder on",
    reminderOff: "Remind me",
    reminderHelp: "Reminders appear only while Capispot is open.",
  },
  bg: {
    title: "Календар на отчетите",
    description:
      "Предстоящи дати за отчети и скорошна отчетена печалба на акция спрямо прогнозата.",
    upcoming: "Предстоящи отчети",
    reported: "Последни отчетени резултати",
    date: "Дата на отчета",
    period: "Фискално тримесечие",
    company: "Компания",
    dateConfirmed: "Потвърдена",
    dateEstimated: "Очаквана дата",
    epsEstimate: "Прогноза за печалба на акция",
    revenueEstimate: "Прогноза за приходи",
    actualEps: "Отчетена печалба на акция",
    estimateEps: "Прогнозирана печалба на акция",
    surprise: "Изненада",
    noSymbols: "Добави акции в портфолиото или Watchlist-а, за да виждаш датите им за отчети.",
    noUpcoming: "Доставчикът в момента няма налични предстоящи дати за отчети.",
    noReported: "Няма налични скорошни сравнения на отчетена и прогнозирана печалба на акция.",
    unavailable: (symbols) => `Пазарните данни не се заредиха за: ${symbols}.`,
    refresh: "Обнови",
    loading: "Календарът на отчетите се зарежда…",
    error: "Календарът на отчетите не можа да се зареди.",
    retry: "Опитай отново",
    source:
      "Източник: Yahoo Finance. Датите и прогнозите може да се променят или да липсват. Отчетената и прогнозната печалба на акция са във валутата на доставчика.",
    limit: "Показани са първите 100 допустими тикера на компании.",
    lockedDescription:
      "Предстоящи дати на отчети и изненади в печалбите за портфолиото и Watchlist-а ти.",
    reminderOn: "Напомнянето е включено",
    reminderOff: "Напомни ми",
    reminderHelp: "Напомнянията се показват само докато Capispot е отворен.",
  },
  de: {
    title: "Berichtskalender",
    description:
      "Anstehende Berichtstermine und zuletzt gemeldetes EPS im Vergleich zur Schätzung.",
    upcoming: "Anstehende Berichte",
    reported: "Zuletzt gemeldete Ergebnisse",
    date: "Berichtstermin",
    period: "Geschäftsquartal",
    company: "Unternehmen",
    dateConfirmed: "Bestätigt",
    dateEstimated: "Geschätzter Termin",
    epsEstimate: "EPS-Schätzung",
    revenueEstimate: "Umsatzschätzung",
    actualEps: "Gemeldetes EPS",
    estimateEps: "Geschätztes EPS",
    surprise: "Überraschung",
    noSymbols: "Füge Aktien zu deinem Portfolio oder deiner Watchlist hinzu, um Termine zu sehen.",
    noUpcoming: "Der Anbieter hat derzeit keine anstehenden Berichtstermine verfügbar.",
    noReported: "Keine aktuellen Vergleiche von gemeldetem und geschätztem EPS verfügbar.",
    unavailable: (symbols) => `Marktdaten konnten nicht geladen werden für: ${symbols}.`,
    refresh: "Aktualisieren",
    loading: "Berichtskalender wird geladen…",
    error: "Berichtskalender konnte nicht geladen werden.",
    retry: "Erneut versuchen",
    source:
      "Quelle: Yahoo Finance. Termine und Schätzungen können sich ändern oder fehlen. EPS-Werte verwenden die Berichtswährung des Anbieters.",
    limit: "Die ersten 100 geeigneten Unternehmenssymbole werden angezeigt.",
    lockedDescription:
      "Anstehende Berichtstermine und Gewinnüberraschungen für Portfolio und Watchlist.",
    reminderOn: "Erinnerung aktiv",
    reminderOff: "Erinnern",
    reminderHelp: "Erinnerungen erscheinen nur, solange Capispot geöffnet ist.",
  },
  es: {
    title: "Calendario de resultados",
    description: "Próximas fechas de resultados y BPA reciente frente a las estimaciones.",
    upcoming: "Próximos informes",
    reported: "Resultados recientes",
    date: "Fecha del informe",
    period: "Trimestre fiscal",
    company: "Empresa",
    dateConfirmed: "Confirmada",
    dateEstimated: "Fecha estimada",
    epsEstimate: "BPA estimado",
    revenueEstimate: "Ingresos estimados",
    actualEps: "BPA publicado",
    estimateEps: "BPA estimado",
    surprise: "Sorpresa",
    noSymbols: "Añade acciones a tu cartera o watchlist para ver aquí sus fechas de resultados.",
    noUpcoming: "El proveedor no tiene fechas de resultados próximas disponibles.",
    noReported: "No hay comparaciones recientes de BPA publicado y estimado.",
    unavailable: (symbols) => `No se pudieron cargar los datos de mercado para: ${symbols}.`,
    refresh: "Actualizar",
    loading: "Cargando calendario de resultados…",
    error: "No se pudo cargar el calendario de resultados.",
    retry: "Intentar de nuevo",
    source:
      "Fuente: Yahoo Finance. Las fechas y estimaciones pueden cambiar o no estar disponibles. El BPA usa la moneda indicada por el proveedor.",
    limit: "Se muestran los primeros 100 símbolos de empresa válidos.",
    lockedDescription: "Próximas fechas de resultados y sorpresas para tu cartera y watchlist.",
    reminderOn: "Aviso activado",
    reminderOff: "Recordarme",
    reminderHelp: "Los avisos solo aparecen mientras Capispot está abierto.",
  },
  it: {
    title: "Calendario degli utili",
    description: "Prossime date dei report e EPS recenti confrontati con le stime degli analisti.",
    upcoming: "Prossimi report",
    reported: "Risultati recenti",
    date: "Data del report",
    period: "Trimestre fiscale",
    company: "Società",
    dateConfirmed: "Confermata",
    dateEstimated: "Data stimata",
    epsEstimate: "EPS stimato",
    revenueEstimate: "Ricavi stimati",
    actualEps: "EPS dichiarato",
    estimateEps: "EPS stimato",
    surprise: "Sorpresa",
    noSymbols: "Aggiungi azioni al portafoglio o alla watchlist per vedere qui le date dei report.",
    noUpcoming: "Il fornitore non ha date di report imminenti disponibili.",
    noReported: "Non sono disponibili confronti recenti tra EPS dichiarato e stimato.",
    unavailable: (symbols) => `Impossibile caricare i dati di mercato per: ${symbols}.`,
    refresh: "Aggiorna",
    loading: "Caricamento calendario utili…",
    error: "Impossibile caricare il calendario degli utili.",
    retry: "Riprova",
    source:
      "Fonte: Yahoo Finance. Date e stime possono cambiare o non essere disponibili. L'EPS usa la valuta indicata dal fornitore.",
    limit: "Sono mostrati i primi 100 simboli aziendali idonei.",
    lockedDescription:
      "Prossime date dei report e sorprese sugli utili per portafoglio e watchlist.",
    reminderOn: "Promemoria attivo",
    reminderOff: "Ricordami",
    reminderHelp: "I promemoria appaiono solo mentre Capispot è aperto.",
  },
};

const ACTIONS_COPY: Record<
  Lang,
  {
    title: string;
    description: string;
    dividend: string;
    split: string;
    noEvents: string;
    loading: string;
    unavailable: string;
    limit: string;
  }
> = {
  en: {
    title: "Confirmed corporate actions",
    description:
      "Yahoo Finance event data from the last two years. Dividend changes compare consecutive per-share payouts; they are not annualized.",
    dividend: "Dividend payout change",
    split: "Stock split",
    noEvents: "No confirmed dividend changes or stock splits were found.",
    loading: "Loading confirmed events…",
    unavailable: "Event data is currently unavailable for this symbol.",
    limit: "Confirmed corporate actions are shown for the first 40 symbols.",
  },
  bg: {
    title: "Потвърдени корпоративни събития",
    description:
      "Събития от Yahoo Finance за последните две години. Промените в дивидента сравняват две последователни плащания на акция и не са годишно преизчислени.",
    dividend: "Промяна в изплатения дивидент",
    split: "Разделяне на акции",
    noEvents: "Няма открити потвърдени промени в дивиденти или разделяния на акции.",
    loading: "Зареждане на потвърдените събития…",
    unavailable: "Данните за събитията в момента не са налични за този тикер.",
    limit: "Потвърдените корпоративни събития са показани за първите 40 тикера.",
  },
  de: {
    title: "Bestätigte Unternehmensereignisse",
    description:
      "Yahoo-Finance-Ereignisse der letzten zwei Jahre. Dividendenänderungen vergleichen aufeinanderfolgende Zahlungen je Aktie und sind nicht annualisiert.",
    dividend: "Änderung der Dividendenzahlung",
    split: "Aktiensplit",
    noEvents: "Keine bestätigten Dividendenänderungen oder Aktiensplits gefunden.",
    loading: "Bestätigte Ereignisse werden geladen…",
    unavailable: "Ereignisdaten sind für dieses Symbol derzeit nicht verfügbar.",
    limit: "Bestätigte Unternehmensereignisse werden für die ersten 40 Symbole angezeigt.",
  },
  es: {
    title: "Acciones corporativas confirmadas",
    description:
      "Eventos de Yahoo Finance de los últimos dos años. Los cambios de dividendos comparan pagos consecutivos por acción; no están anualizados.",
    dividend: "Cambio del pago de dividendos",
    split: "Desdoblamiento de acciones",
    noEvents: "No se encontraron cambios de dividendos ni desdoblamientos confirmados.",
    loading: "Cargando eventos confirmados…",
    unavailable: "Los datos de eventos no están disponibles para este símbolo.",
    limit: "Se muestran las acciones corporativas confirmadas de los primeros 40 símbolos.",
  },
  it: {
    title: "Operazioni societarie confermate",
    description:
      "Eventi Yahoo Finance degli ultimi due anni. Le variazioni dei dividendi confrontano pagamenti consecutivi per azione e non sono annualizzate.",
    dividend: "Variazione del pagamento del dividendo",
    split: "Frazionamento azionario",
    noEvents: "Non sono state trovate variazioni dei dividendi o frazionamenti confermati.",
    loading: "Caricamento degli eventi confermati…",
    unavailable: "I dati degli eventi non sono attualmente disponibili per questo simbolo.",
    limit: "Sono mostrate le operazioni societarie confermate dei primi 40 simboli.",
  },
};

function EarningsCalendar() {
  const p = usePortfolio();
  const c = COPY[p.lang];
  const { list, earningsReminders } = useWatchState();
  const quoteFn = useServerFn(marketEarningsCalendar);
  const corporateActionsFn = useServerFn(getCorporateActions);
  const knownAssets = new Map(MARKET_ASSETS.map((asset) => [asset.symbol, asset]));
  const holdings = p.holdings
    .filter((holding) => holding.asset.type === "stock")
    .map((holding) => holding.asset.symbol.toUpperCase());
  const watchlistStocks = list
    .map((symbol) => symbol.toUpperCase())
    .filter((symbol) => {
      if (CRYPTO_SYMBOL_SET.has(symbol)) return false;
      const known = knownAssets.get(symbol);
      return !known || known.type === "stock";
    });
  const symbols = [...new Set([...holdings, ...watchlistStocks])];
  const capped = symbols.slice(0, 100);
  const query = useQuery({
    queryKey: ["earnings-calendar", capped],
    queryFn: () => quoteFn({ data: { symbols: capped } }),
    enabled: p.isPro && capped.length > 0,
    staleTime: 30 * 60_000,
  });
  const corporateActionsQuery = useQuery({
    queryKey: ["confirmed-corporate-actions", capped],
    queryFn: () => corporateActionsFn({ data: { symbols: capped.slice(0, 40) } }),
    enabled: p.isPro && capped.length > 0,
    staleTime: 6 * 60 * 60_000,
  });
  const names = new Map(
    p.holdings.map((holding) => [holding.asset.symbol.toUpperCase(), holding.asset.name]),
  );
  for (const asset of MARKET_ASSETS) {
    if (!names.has(asset.symbol)) names.set(asset.symbol, asset.name);
  }
  const locale = languageLocale(p.lang);
  const date = (value: string) => {
    const day = value.slice(0, 10);
    return new Date(`${day}T12:00:00`).toLocaleDateString(locale, { dateStyle: "medium" });
  };
  const number = (value: number | null, compact = false) =>
    value === null
      ? "—"
      : new Intl.NumberFormat(locale, {
          notation: compact ? "compact" : "standard",
          maximumFractionDigits: 2,
          minimumFractionDigits: compact ? 0 : 2,
        }).format(value);
  const percent = (value: number | null) =>
    value === null
      ? "—"
      : new Intl.NumberFormat(locale, { style: "percent", signDisplay: "always" }).format(value);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold">{c.title}</h1>
        <p className="text-sm text-muted-foreground">{c.description}</p>
      </header>
      {p.isPro ? (
        <>
          <EarningsContent
            symbols={capped}
            names={names}
            locale={locale}
            copy={c}
            query={query}
            date={date}
            number={number}
            percent={percent}
            hasMore={symbols.length > capped.length}
            reminders={earningsReminders}
            onToggleReminder={(symbol) => {
              const next = earningsReminders.includes(symbol)
                ? earningsReminders.filter((item) => item !== symbol)
                : [...earningsReminders, symbol].slice(0, 100);
              writeEarningsReminders(next);
              if (
                !earningsReminders.includes(symbol) &&
                typeof Notification !== "undefined" &&
                Notification.permission === "default"
              )
                void Notification.requestPermission();
            }}
          />
          {capped.length > 0 && (
            <CorporateActionsSection
              data={corporateActionsQuery.data}
              isLoading={corporateActionsQuery.isPending}
              isError={corporateActionsQuery.isError}
              locale={locale}
              lang={p.lang}
              names={names}
              date={date}
              hasMoreSymbols={symbols.length > 40}
            />
          )}
        </>
      ) : (
        <ProGate title={c.title} desc={c.lockedDescription} preview={<BarsSilhouette />}>
          <div />
        </ProGate>
      )}
    </div>
  );
}

function EarningsContent({
  symbols,
  names,
  locale,
  copy,
  query,
  date,
  number,
  percent,
  hasMore,
  reminders,
  onToggleReminder,
}: {
  symbols: string[];
  names: Map<string, string>;
  locale: string;
  copy: (typeof COPY)[Lang];
  query: UseQueryResult<EarningsCalendarData, Error>;
  date: (value: string) => string;
  number: (value: number | null, compact?: boolean) => string;
  percent: (value: number | null) => string;
  hasMore: boolean;
  reminders: string[];
  onToggleReminder: (symbol: string) => void;
}) {
  if (!symbols.length) return <Card>{copy.noSymbols}</Card>;
  if (query.isPending)
    return (
      <div role="status">
        <Card className="text-sm text-muted-foreground">{copy.loading}</Card>
      </div>
    );
  if (query.isError)
    return (
      <Card className="space-y-3">
        <p role="alert" className="text-sm text-destructive">
          {copy.error}
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-semibold"
        >
          <RefreshCw size={14} aria-hidden />
          {copy.retry}
        </button>
      </Card>
    );

  const data = query.data;
  return (
    <>
      <section aria-labelledby="upcoming-earnings-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="upcoming-earnings-heading" className="font-display text-lg font-semibold">
            {copy.upcoming}
          </h2>
          <button
            type="button"
            onClick={() => void query.refetch()}
            aria-label={copy.refresh}
            title={copy.refresh}
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <RefreshCw size={16} aria-hidden />
          </button>
        </div>
        {data?.upcoming.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {data.upcoming.map((report) => (
              <Card key={report.symbol} className="space-y-3">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 text-primary" size={18} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{names.get(report.symbol) ?? report.symbol}</p>
                    <p className="text-sm text-muted-foreground">{report.symbol}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
                    {report.dateEstimated ? copy.dateEstimated : copy.dateConfirmed}
                  </span>
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">{copy.date}: </span>
                  <span className="font-semibold tabular-nums">{date(report.date)}</span>
                </p>
                <button
                  type="button"
                  aria-pressed={reminders.includes(report.symbol)}
                  onClick={() => onToggleReminder(report.symbol)}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
                >
                  <Bell size={14} aria-hidden />
                  {reminders.includes(report.symbol) ? copy.reminderOn : copy.reminderOff}
                </button>
                <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                  <p>
                    <span className="block text-xs text-muted-foreground">{copy.epsEstimate}</span>
                    <span className="font-semibold tabular-nums">{number(report.epsEstimate)}</span>
                  </p>
                  <p>
                    <span className="block text-xs text-muted-foreground">
                      {copy.revenueEstimate}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {number(report.revenueEstimate, true)}
                    </span>
                  </p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-sm text-muted-foreground">{copy.noUpcoming}</Card>
        )}
      </section>

      <section aria-labelledby="reported-earnings-heading" className="space-y-3">
        <h2 id="reported-earnings-heading" className="font-display text-lg font-semibold">
          {copy.reported}
        </h2>
        {data?.reported.length ? (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
                  <tr>
                    {[
                      copy.company,
                      copy.period,
                      copy.actualEps,
                      copy.estimateEps,
                      copy.surprise,
                    ].map((label) => (
                      <th key={label} className="px-4 py-3 font-semibold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.reported.map((result) => {
                    const surprise =
                      result.surprisePercent ??
                      earningsSurprisePercent(result.actualEps, result.estimatedEps);
                    return (
                      <tr key={`${result.symbol}-${result.period}`}>
                        <th className="px-4 py-3 font-semibold">
                          {names.get(result.symbol) ?? result.symbol}
                          <span className="block text-xs font-normal text-muted-foreground">
                            {result.symbol}
                          </span>
                        </th>
                        <td className="px-4 py-3 tabular-nums">{date(result.period)}</td>
                        <td className="px-4 py-3 tabular-nums">{number(result.actualEps)}</td>
                        <td className="px-4 py-3 tabular-nums">{number(result.estimatedEps)}</td>
                        <td
                          className={`px-4 py-3 font-semibold tabular-nums ${
                            surprise === null
                              ? "text-muted-foreground"
                              : surprise >= 0
                                ? "text-success"
                                : "text-destructive"
                          }`}
                        >
                          {percent(surprise)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card className="text-sm text-muted-foreground">{copy.noReported}</Card>
        )}
      </section>

      {data?.unavailableSymbols.length ? (
        <p role="status" className="text-xs text-muted-foreground">
          {copy.unavailable(data.unavailableSymbols.join(", "))}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">{copy.reminderHelp}</p>
      {hasMore && <p className="text-xs text-muted-foreground">{copy.limit}</p>}
      <p className="text-xs text-muted-foreground">{copy.source}</p>
    </>
  );
}

function CorporateActionsSection({
  data,
  isLoading,
  isError,
  locale,
  lang,
  names,
  date,
  hasMoreSymbols,
}: {
  data: CorporateActions[] | undefined;
  isLoading: boolean;
  isError: boolean;
  locale: string;
  lang: Lang;
  names: Map<string, string>;
  date: (value: string) => string;
  hasMoreSymbols: boolean;
}) {
  const copy = ACTIONS_COPY[lang];
  const percent = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "percent",
      signDisplay: "always",
      maximumFractionDigits: 1,
    }).format(value / 100);
  const available = (data ?? []).filter((item) => !item.unavailable);
  const hasEvents = available.some((item) => item.dividends.length || item.splits.length);
  return (
    <section aria-labelledby="corporate-actions-heading" className="space-y-3">
      <header>
        <h2 id="corporate-actions-heading" className="font-display text-lg font-semibold">
          {copy.title}
        </h2>
        <p className="text-xs text-muted-foreground">{copy.description}</p>
      </header>
      {isLoading ? (
        <Card className="text-sm text-muted-foreground">{copy.loading}</Card>
      ) : isError ? (
        <div role="alert">
          <Card className="text-sm text-destructive">{copy.unavailable}</Card>
        </div>
      ) : (
        <>
          {hasMoreSymbols && <p className="text-xs text-muted-foreground">{copy.limit}</p>}
          {(data ?? []).filter((item) => item.unavailable).length > 0 && (
            <p role="status" className="text-xs text-muted-foreground">
              {(data ?? [])
                .filter((item) => item.unavailable)
                .map((item) => item.symbol)
                .join(", ")}
              : {copy.unavailable}
            </p>
          )}
          {hasEvents ? (
            <div className="grid gap-3 md:grid-cols-2">
              {(data ?? []).flatMap((item) => [
                ...item.dividends.map((event) => (
                  <Card
                    key={`${item.symbol}-dividend-${event.date}`}
                    className="flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="font-semibold">{names.get(item.symbol) ?? item.symbol}</p>
                      <p className="text-sm text-muted-foreground">{copy.dividend}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{date(event.date)}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold tabular-nums">{percent(event.changePercent)}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.previousAmount} → {event.amount}
                        {item.currency ? ` ${item.currency}` : ""} / share
                      </p>
                    </div>
                  </Card>
                )),
                ...item.splits.map((event) => (
                  <Card
                    key={`${item.symbol}-split-${event.date}`}
                    className="flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="font-semibold">{names.get(item.symbol) ?? item.symbol}</p>
                      <p className="text-sm text-muted-foreground">{copy.split}</p>
                    </div>
                    <p className="text-right text-sm">
                      <span className="font-semibold tabular-nums">
                        {event.numerator}:{event.denominator}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {date(event.date)}
                      </span>
                    </p>
                  </Card>
                )),
              ])}
            </div>
          ) : available.length > 0 ? (
            <Card className="text-sm text-muted-foreground">{copy.noEvents}</Card>
          ) : null}
        </>
      )}
    </section>
  );
}
