import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/AppShell";
import type { Lang } from "@/lib/i18n";
import { qualityIssues, type IssueKind } from "@/lib/quality";
import { usePortfolio } from "@/lib/store";

type Copy = {
  title: string;
  clean: string;
  description: string;
  view: string;
  review: string;
  reviewAsset: string;
  more: (count: number) => string;
  issues: Record<IssueKind, string>;
};

const COPY: Record<Lang, Copy> = {
  en: {
    title: "Portfolio data check",
    clean: "No obvious data issues found.",
    description: "These items may need a quick review; nothing is changed automatically.",
    view: "Review holdings",
    review: "Review matching transactions",
    reviewAsset: "View asset",
    more: (count) => `And ${count} more.`,
    issues: {
      duplicate: "Possible duplicate transaction",
      oversell: "Sales exceed recorded purchases",
      missingPrice: "Transaction is missing a price",
      future: "Transaction date is in the future",
      noQuote: "Current market quote unavailable",
      staleQuote: "Market quote may be out of date",
      targetReviewDue: "Price alert target may need review",
      orphan: "Transaction is linked to a missing asset",
      priceOutlier:
        "Transaction unit price is far from this asset's median; check splits and import details",
    },
  },
  bg: {
    title: "Проверка на данните в портфейла",
    clean: "Не открихме очевидни проблеми с данните.",
    description: "Тези записи може да изискват преглед; нищо не се променя автоматично.",
    view: "Прегледай позициите",
    review: "Прегледай съвпадащите сделки",
    reviewAsset: "Виж актива",
    more: (count) => `И още ${count}.`,
    issues: {
      duplicate: "Възможно дублирана сделка",
      oversell: "Продажбите надвишават записаните покупки",
      missingPrice: "В сделката липсва цена",
      future: "Датата на сделката е в бъдещето",
      noQuote: "Няма текуща пазарна котировка",
      staleQuote: "Пазарната котировка може да е остаряла",
      targetReviewDue: "Целевата цена може да се нуждае от преглед",
      orphan: "Сделката е свързана с липсващ актив",
      priceOutlier: "Единичната цена е далеч от медианата; провери сплитове и импортирани данни",
    },
  },
  de: {
    title: "Portfolio-Datenprüfung",
    clean: "Keine offensichtlichen Datenprobleme gefunden.",
    description:
      "Diese Einträge sollten eventuell geprüft werden; es wird nichts automatisch geändert.",
    view: "Positionen prüfen",
    review: "Passende Transaktionen prüfen",
    reviewAsset: "Wert ansehen",
    more: (count) => `Und ${count} weitere.`,
    issues: {
      duplicate: "Möglicherweise doppelte Transaktion",
      oversell: "Verkäufe übersteigen erfasste Käufe",
      missingPrice: "Transaktionspreis fehlt",
      future: "Transaktionsdatum liegt in der Zukunft",
      noQuote: "Aktueller Marktkurs nicht verfügbar",
      staleQuote: "Marktkurs möglicherweise veraltet",
      targetReviewDue: "Kursziel sollte eventuell überprüft werden",
      orphan: "Transaktion ist einem fehlenden Wert zugeordnet",
      priceOutlier: "Transaktionspreis weicht stark vom Median ab; Splits und Import prüfen",
    },
  },
  es: {
    title: "Revisión de datos de la cartera",
    clean: "No se encontraron problemas evidentes.",
    description: "Conviene revisar estos elementos; no se modifica nada automáticamente.",
    view: "Revisar posiciones",
    review: "Revisar operaciones coincidentes",
    reviewAsset: "Ver activo",
    more: (count) => `Y ${count} más.`,
    issues: {
      duplicate: "Posible operación duplicada",
      oversell: "Las ventas superan las compras registradas",
      missingPrice: "Falta el precio de la operación",
      future: "La fecha de la operación está en el futuro",
      noQuote: "Cotización de mercado no disponible",
      staleQuote: "La cotización puede estar desactualizada",
      targetReviewDue: "El precio objetivo quizá necesite revisión",
      orphan: "La operación está vinculada a un activo inexistente",
      priceOutlier: "El precio unitario se aleja mucho de la mediana; revisa splits e importación",
    },
  },
  it: {
    title: "Controllo dei dati del portafoglio",
    clean: "Nessun problema evidente nei dati.",
    description:
      "Questi elementi potrebbero richiedere una verifica; non viene modificato nulla automaticamente.",
    view: "Controlla le posizioni",
    review: "Controlla le transazioni corrispondenti",
    reviewAsset: "Visualizza asset",
    more: (count) => `E altri ${count}.`,
    issues: {
      duplicate: "Possibile transazione duplicata",
      oversell: "Le vendite superano gli acquisti registrati",
      missingPrice: "Prezzo della transazione mancante",
      future: "La data della transazione è futura",
      noQuote: "Quotazione di mercato non disponibile",
      staleQuote: "La quotazione potrebbe non essere aggiornata",
      targetReviewDue: "Il prezzo obiettivo potrebbe richiedere una verifica",
      orphan: "La transazione è collegata a un asset mancante",
      priceOutlier:
        "Il prezzo unitario si discosta molto dalla mediana; verifica split e importazione",
    },
  },
};

export function PortfolioDataCheck() {
  const p = usePortfolio();
  const c = COPY[p.lang];
  const issues = qualityIssues(
    p.assets,
    p.transactions,
    undefined,
    {},
    Date.now(),
    p.corporateActions,
  );

  if (!p.user || !p.transactions.length) return null;

  return (
    <Card className="space-y-3 lg:col-span-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display font-semibold">{c.title}</h2>
          {issues.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
          )}
        </div>
        <Link
          to="/holdings"
          className="text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {c.view} →
        </Link>
      </div>
      {issues.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 size={16} aria-hidden />
          {c.clean}
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {issues.slice(0, 4).map((issue, index) => (
            <li
              key={`${issue.kind}-${issue.symbol}-${issue.date ?? ""}-${index}`}
              className="flex min-w-0 items-start gap-2 rounded-xl bg-secondary/70 px-3 py-2 text-sm"
            >
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block">
                  <span className="font-semibold">{issue.symbol}</span>
                  <span className="ml-1 text-muted-foreground">{c.issues[issue.kind]}</span>
                  {issue.count && issue.count > 1 && (
                    <span className="ml-1 text-muted-foreground">×{issue.count}</span>
                  )}
                  {issue.date && (
                    <span className="ml-1 whitespace-nowrap text-xs text-muted-foreground">
                      · {issue.date}
                    </span>
                  )}
                </span>
                {issue.kind === "noQuote" || issue.kind === "staleQuote" ? (
                  <Link
                    to="/asset/$symbol"
                    params={{ symbol: issue.symbol }}
                    className="mt-1 inline-block text-xs font-semibold text-primary hover:underline"
                  >
                    {c.reviewAsset} →
                  </Link>
                ) : issue.kind === "targetReviewDue" ? (
                  <Link
                    to="/watchlist"
                    search={{ symbol: issue.symbol }}
                    className="mt-1 inline-block text-xs font-semibold text-primary hover:underline"
                  >
                    {c.review} →
                  </Link>
                ) : (
                  <Link
                    to="/timeline"
                    search={{
                      q: issue.symbol === "?" ? undefined : issue.symbol,
                      kind: issue.kind === "oversell" ? "sell" : undefined,
                      date: issue.date,
                    }}
                    className="mt-1 inline-block text-xs font-semibold text-primary hover:underline"
                  >
                    {c.review} →
                  </Link>
                )}
              </span>
            </li>
          ))}
          {issues.length > 4 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">{c.more(issues.length - 4)}</li>
          )}
        </ul>
      )}
    </Card>
  );
}
