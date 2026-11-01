import { useMemo } from "react";
import { Card } from "@/components/AppShell";
import type { Lang } from "@/lib/i18n";
import { languageLocale } from "@/lib/i18n";
import { dividendIncomeSummary } from "@/lib/tools";
import { usePortfolio } from "@/lib/store";

const COPY: Record<
  Lang,
  {
    title: string;
    description: string;
    month: string;
    previousMonth: string;
    ytd: string;
    previousYtd: string;
    trend: string;
    byAsset: string;
    noIncome: string;
    noAssetIncome: string;
    dataNote: string;
    excluded: (count: number) => string;
    monthChange: string;
    ytdChange: string;
  }
> = {
  en: {
    title: "Dividend income",
    description: "Cash amounts recorded in your portfolio transactions, net of recorded fees.",
    month: "This month",
    previousMonth: "Previous month",
    ytd: "Year to date",
    previousYtd: "Same period last year",
    trend: "Monthly income · last 12 months",
    byAsset: "Income by asset · this year",
    noIncome: "No dividend transactions recorded for this period.",
    noAssetIncome: "No dividend income recorded this year.",
    dataNote: "This reflects entered transactions only; missing broker records are not estimated.",
    excluded: (count) => `${count} invalid or future dividend record(s) excluded.`,
    monthChange: "vs previous month",
    ytdChange: "vs same period last year",
  },
  bg: {
    title: "Доход от дивиденти",
    description: "Суми от записаните дивидентни трансакции, след приспадане на въведените такси.",
    month: "Този месец",
    previousMonth: "Предходен месец",
    ytd: "От началото на годината",
    previousYtd: "Същият период миналата година",
    trend: "Месечен доход · последните 12 месеца",
    byAsset: "Доход по актив · тази година",
    noIncome: "Няма записани дивидентни трансакции за този период.",
    noAssetIncome: "Няма записани дивиденти тази година.",
    dataNote: "Показани са само въведените трансакции; липсващи брокерски данни не се прогнозират.",
    excluded: (count) => `Изключени са ${count} невалидни или бъдещи дивидентни записа.`,
    monthChange: "спрямо предходния месец",
    ytdChange: "спрямо същия период миналата година",
  },
  de: {
    title: "Dividendeneinnahmen",
    description: "Erfasste Dividenden aus deinen Transaktionen, abzüglich erfasster Gebühren.",
    month: "Dieser Monat",
    previousMonth: "Vorheriger Monat",
    ytd: "Seit Jahresbeginn",
    previousYtd: "Gleicher Zeitraum im Vorjahr",
    trend: "Monatliche Einnahmen · letzte 12 Monate",
    byAsset: "Einnahmen je Wert · dieses Jahr",
    noIncome: "Für diesen Zeitraum sind keine Dividenden erfasst.",
    noAssetIncome: "Dieses Jahr sind keine Dividenden erfasst.",
    dataNote: "Nur erfasste Transaktionen; fehlende Brokerdaten werden nicht geschätzt.",
    excluded: (count) => `${count} ungültige oder zukünftige Dividendenbuchung(en) ausgeschlossen.`,
    monthChange: "gegenüber Vormonat",
    ytdChange: "gegenüber gleichem Vorjahreszeitraum",
  },
  es: {
    title: "Ingresos por dividendos",
    description:
      "Importes de dividendos registrados en tus operaciones, netos de las comisiones anotadas.",
    month: "Este mes",
    previousMonth: "Mes anterior",
    ytd: "Acumulado del año",
    previousYtd: "Mismo periodo del año pasado",
    trend: "Ingresos mensuales · últimos 12 meses",
    byAsset: "Ingresos por activo · este año",
    noIncome: "No hay dividendos registrados en este periodo.",
    noAssetIncome: "No hay ingresos por dividendos registrados este año.",
    dataNote: "Solo muestra operaciones registradas; no estima datos ausentes del bróker.",
    excluded: (count) => `Se excluyeron ${count} registros de dividendos no válidos o futuros.`,
    monthChange: "frente al mes anterior",
    ytdChange: "frente al mismo periodo del año pasado",
  },
  it: {
    title: "Reddito da dividendi",
    description:
      "Importi dei dividendi registrati nelle transazioni, al netto delle commissioni inserite.",
    month: "Questo mese",
    previousMonth: "Mese precedente",
    ytd: "Da inizio anno",
    previousYtd: "Stesso periodo dell'anno scorso",
    trend: "Reddito mensile · ultimi 12 mesi",
    byAsset: "Reddito per asset · quest'anno",
    noIncome: "Nessun dividendo registrato per questo periodo.",
    noAssetIncome: "Nessun reddito da dividendi registrato quest'anno.",
    dataNote: "Mostra solo le transazioni inserite; i dati mancanti del broker non sono stimati.",
    excluded: (count) => `Esclusi ${count} record di dividendi non validi o futuri.`,
    monthChange: "rispetto al mese precedente",
    ytdChange: "rispetto allo stesso periodo dell'anno scorso",
  },
};

export function DividendIncomeDashboard() {
  const portfolio = usePortfolio();
  const copy = COPY[portfolio.lang];
  const summary = useMemo(
    () => dividendIncomeSummary(portfolio.transactions, portfolio.assets),
    [portfolio.transactions, portfolio.assets],
  );
  const locale = languageLocale(portfolio.lang);
  const monthLabel = (month: string) =>
    new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit", timeZone: "UTC" }).format(
      new Date(`${month}-01T12:00:00Z`),
    );
  const change = (current: number, previous: number) =>
    previous === 0
      ? "—"
      : `${current - previous > 0 ? "+" : ""}${(((current - previous) / Math.abs(previous)) * 100).toFixed(1)}%`;
  const maxMonthly = Math.max(0, ...summary.monthly.map((point) => point.amount));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
        <p className="mt-1 text-xs text-muted-foreground">{copy.dataNote}</p>
        {summary.excludedTransactions > 0 && (
          <p role="status" className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            {copy.excluded(summary.excludedTransactions)}
          </p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary
          label={copy.month}
          value={portfolio.money(summary.currentMonth)}
          comparison={`${change(summary.currentMonth, summary.previousMonth)} ${copy.monthChange}`}
        />
        <Summary label={copy.previousMonth} value={portfolio.money(summary.previousMonth)} />
        <Summary
          label={copy.ytd}
          value={portfolio.money(summary.yearToDate)}
          comparison={`${change(summary.yearToDate, summary.previousYearToDate)} ${copy.ytdChange}`}
        />
        <Summary label={copy.previousYtd} value={portfolio.money(summary.previousYearToDate)} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h4 className="mb-2 text-sm font-semibold">{copy.trend}</h4>
          {summary.monthly.every((point) => point.amount === 0) ? (
            <p className="text-sm text-muted-foreground">{copy.noIncome}</p>
          ) : (
            <ul className="space-y-2">
              {summary.monthly.map((point) => (
                <li
                  key={point.month}
                  className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 text-xs"
                >
                  <span className="text-muted-foreground">{monthLabel(point.month)}</span>
                  <span
                    className="h-2 overflow-hidden rounded-full bg-secondary"
                    role="img"
                    aria-label={`${monthLabel(point.month)}: ${portfolio.money(point.amount)}`}
                  >
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{
                        width: `${maxMonthly > 0 ? Math.max(0, (point.amount / maxMonthly) * 100) : 0}%`,
                      }}
                    />
                  </span>
                  <span className="min-w-20 text-right tabular-nums">
                    {portfolio.money(point.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h4 className="mb-2 text-sm font-semibold">{copy.byAsset}</h4>
          {!summary.byAsset.length ? (
            <p className="text-sm text-muted-foreground">{copy.noAssetIncome}</p>
          ) : (
            <ul className="divide-y divide-border">
              {summary.byAsset.map((item) => (
                <li
                  key={item.assetId}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <span className="truncate">{item.symbol}</span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {portfolio.money(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  comparison,
}: {
  label: string;
  value: string;
  comparison?: string;
}) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-bold tabular-nums">{value}</p>
      {comparison && <p className="mt-1 text-xs text-muted-foreground">{comparison}</p>}
    </div>
  );
}
