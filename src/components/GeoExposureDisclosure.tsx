import type { GeoDataQuality, PortfolioGeographicSummary } from "@/lib/geographic-exposure";
import { languageLocale, type Lang } from "@/lib/i18n";
import { ChevronDown, Info } from "lucide-react";
import { useId, useState } from "react";

interface GeoCopy {
  toggle: string;
  methodology: string;
  benchmarkNote: string;
  licenseRestrictedNote: (symbols: string) => string;
  unavailableNote: (symbols: string) => string;
  minorCutoffNote: string;
  staleNote: string;
  staleTag: string;
  unpricedNote: (count: number) => string;
  verifiedLabel: string;
  estimatedLabel: string;
  unknownLabel: string;
  licenseWithheldLabel: string;
  staleLabel: string;
  asOfLabel: (date: string) => string;
  qualityLabels: Record<GeoDataQuality, string>;
}

const GEO_COPY: Record<Lang, GeoCopy> = {
  en: {
    toggle: "Methodology & data sources",
    methodology:
      "Distinguishes reported corporate HQ location (for equities), authorized fund breakdowns, non-geographic holdings (cash/crypto), unavailable breakdowns, and holdings excluded due to missing valuation. Currency, listing exchange, and legal domicile never determine geographic risk.",
    benchmarkNote: "Includes benchmark composition estimates.",
    licenseRestrictedNote: (symbols) =>
      `Third-party breakdown not licensed for commercial display (held as Unknown rather than inferred from currency or domicile): ${symbols}.`,
    unavailableNote: (symbols) => `Geographic breakdown unavailable for: ${symbols}.`,
    minorCutoffNote:
      "Unallocated weight reflects smaller markets grouped below the issuer's reporting threshold and left Unknown without rescaling.",
    staleNote: "One or more source tables are older than the recommended refresh window.",
    staleTag: "Outdated",
    unpricedNote: (count) =>
      `${count} position${count === 1 ? " has" : "s have"} no current market valuation and ${count === 1 ? "is" : "are"} excluded from regional weights.`,
    verifiedLabel: "Breakdown available",
    estimatedLabel: "Benchmark estimate",
    unknownLabel: "Unknown",
    licenseWithheldLabel: "Not licensed for display",
    staleLabel: "Outdated",
    asOfLabel: (date) => `As of ${date}`,
    qualityLabels: {
      "issuer-reported": "Authorized breakdown",
      "verified-single-region": "Authorized mandate",
      "benchmark-approximation": "Benchmark estimate",
      "provider-company-country": "Reported HQ location",
      "non-geographic": "Non-geographic asset",
      "license-restricted": "Not licensed for display",
      unavailable: "Breakdown unavailable",
    },
  },
  bg: {
    toggle: "Методология и източници",
    methodology:
      "Разграничава обявена централа (HQ) при акции, оторизирани фондови разбивки, негеографски активи (кеш/крипто), липсващи данни и позиции без пазарна оценка. Валутата, борсата и правното седалище не определят географията.",
    benchmarkNote: "Включва приблизителна оценка по състава на бенчмарка.",
    licenseRestrictedNote: (symbols) =>
      `Разбивката от трети страни не е лицензирана за комерсиално показване (остава като „Неизвестни“, без валутни предположения): ${symbols}.`,
    unavailableNote: (symbols) => `Липсва географска разбивка за: ${symbols}.`,
    minorCutoffNote:
      "Неразпределеният дял отразява по-малки пазари под прага на отчетност на емитента и остава „Неизвестен“ без прескалиране.",
    staleNote: "Един или повече източници са по-стари от препоръчителния срок за обновяване.",
    staleTag: "Остарял",
    unpricedNote: (count) =>
      `${count} ${count === 1 ? "позиция няма" : "позиции нямат"} текуща пазарна оценка и е изключена от теглата.`,
    verifiedLabel: "Налична разбивка",
    estimatedLabel: "По бенчмарк",
    unknownLabel: "Неизвестни",
    licenseWithheldLabel: "Без лиценз за показване",
    staleLabel: "Остарели",
    asOfLabel: (date) => `Към ${date}`,
    qualityLabels: {
      "issuer-reported": "Оторизирана разбивка",
      "verified-single-region": "Оторизиран мандат",
      "benchmark-approximation": "По бенчмарк",
      "provider-company-country": "Обявена централа (HQ)",
      "non-geographic": "Негеографски актив",
      "license-restricted": "Без лиценз за показване",
      unavailable: "Липсва разбивка",
    },
  },
  de: {
    toggle: "Methodik & Datenquellen",
    methodology:
      "Unterscheidet gemeldeten Unternehmenshauptsitz (HQ), autorisierte Fondsdaten, nicht-geografische Anlagen (Cash/Krypto), fehlende Daten und Positionen ohne Marktbewertung. Handelswährung, Börse und Domizil bestimmen keine Regionen.",
    benchmarkNote: "Enthält Benchmark-Schätzungen.",
    licenseRestrictedNote: (symbols) =>
      `Drittanbieter-Aufteilung für kommerzielle Anzeige nicht lizenziert (als „Unbekannt“ geführt, nicht nach Währung geschätzt): ${symbols}.`,
    unavailableNote: (symbols) => `Geografische Aufteilung nicht verfügbar für: ${symbols}.`,
    minorCutoffNote:
      "Nicht zugewiesene Anteile stammen aus kleineren Märkten unterhalb der Meldeschwelle und bleiben ohne Neuskalierung unbekannt.",
    staleNote:
      "Mindestens eine zugrunde liegende Datenquelle liegt außerhalb des Aktualisierungsfensters.",
    staleTag: "Veraltet",
    unpricedNote: (count) =>
      `${count} Position${count === 1 ? "" : "en"} ohne aktuelle Marktbewertung ${count === 1 ? "ist" : "sind"} ausgenommen.`,
    verifiedLabel: "Aufteilung verfügbar",
    estimatedLabel: "Benchmark-Schätzung",
    unknownLabel: "Unbekannt",
    licenseWithheldLabel: "Nicht lizenziert",
    staleLabel: "Veraltet",
    asOfLabel: (date) => `Stand ${date}`,
    qualityLabels: {
      "issuer-reported": "Autorisierte Daten",
      "verified-single-region": "Autorisiertes Mandat",
      "benchmark-approximation": "Benchmark-Schätzung",
      "provider-company-country": "Gemeldeter Hauptsitz (HQ)",
      "non-geographic": "Nicht-geografische Anlage",
      "license-restricted": "Nicht für Anzeige lizenziert",
      unavailable: "Aufteilung nicht verfügbar",
    },
  },
  es: {
    toggle: "Metodología y fuentes",
    methodology:
      "Distingue entre sede corporativa declarada (HQ), datos autorizados de fondos, activos no geográficos (efectivo/cripto), datos no disponibles y posiciones sin valoración. Divisa, bolsa y domicilio legal no determinan la exposición.",
    benchmarkNote: "Incluye estimaciones por índice de referencia.",
    licenseRestrictedNote: (symbols) =>
      `El desglose de terceros no cuenta con licencia de visualización comercial (conservado como Desconocido sin inferir por divisa): ${symbols}.`,
    unavailableNote: (symbols) => `Desglose geográfico no disponible para: ${symbols}.`,
    minorCutoffNote:
      "El peso no asignado refleja mercados menores agrupados bajo el umbral del emisor, conservado como desconocido sin reescalar.",
    staleNote: "Una o más fuentes superan la ventana recomendada de actualización.",
    staleTag: "Desactualizada",
    unpricedNote: (count) =>
      `${count} ${count === 1 ? "posición sin valoración actual queda excluida" : "posiciones sin valoración actual quedan excluidas"} de los pesos.`,
    verifiedLabel: "Desglose disponible",
    estimatedLabel: "Estimación de índice",
    unknownLabel: "Desconocido",
    licenseWithheldLabel: "Sin licencia comercial",
    staleLabel: "Desactualizado",
    asOfLabel: (date) => `A ${date}`,
    qualityLabels: {
      "issuer-reported": "Datos autorizados",
      "verified-single-region": "Mandato autorizado",
      "benchmark-approximation": "Estimación de índice",
      "provider-company-country": "Sede declarada (HQ)",
      "non-geographic": "Activo no geográfico",
      "license-restricted": "Sin licencia de visualización",
      unavailable: "Desglose no disponible",
    },
  },
  it: {
    toggle: "Metodologia e fonti",
    methodology:
      "Distingue tra sede aziendale dichiarata (HQ), dati autorizzati dei fondi, asset non geografici (liquidità/cripto), dati mancanti e posizioni prive di valutazione. Valuta, borsa e domicilio non determinano il rischio.",
    benchmarkNote: "Include stime da benchmark.",
    licenseRestrictedNote: (symbols) =>
      `La ripartizione di terze parti non è in licenza per la visualizzazione commerciale (mantenuta come Sconosciuto senza stime da valuta): ${symbols}.`,
    unavailableNote: (symbols) => `Ripartizione geografica non disponibile per: ${symbols}.`,
    minorCutoffNote:
      "Il peso non allocato riflette mercati minori sotto la soglia dell'emittente, mantenuto come sconosciuto senza riscalatura.",
    staleNote: "Una o più fonti risultano oltre la finestra di aggiornamento consigliata.",
    staleTag: "Non aggiornata",
    unpricedNote: (count) =>
      `${count} ${count === 1 ? "posizione priva di valutazione attuale è esclusa" : "posizioni prive di valutazione attuale sono escluse"} dai pesi.`,
    verifiedLabel: "Ripartizione disponibile",
    estimatedLabel: "Stima benchmark",
    unknownLabel: "Sconosciuto",
    licenseWithheldLabel: "Senza licenza commerciale",
    staleLabel: "Non aggiornato",
    asOfLabel: (date) => `Al ${date}`,
    qualityLabels: {
      "issuer-reported": "Dati autorizzati",
      "verified-single-region": "Mandato autorizzato",
      "benchmark-approximation": "Stima benchmark",
      "provider-company-country": "Sede dichiarata (HQ)",
      "non-geographic": "Asset non geografico",
      "license-restricted": "Non in licenza commerciale",
      unavailable: "Ripartizione non disponibile",
    },
  },
};

export function GeoExposureDisclosure({
  summary,
  lang,
  unpricedCount = 0,
}: {
  summary: PortfolioGeographicSummary;
  lang: Lang;
  unpricedCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  if (summary.totalValue <= 0) return null;

  const copy = GEO_COPY[lang];
  const pct = (value: number) =>
    new Intl.NumberFormat(languageLocale(lang), {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(value / summary.totalValue);

  const hasLicenseWithheld = summary.licenseWithheldAssets.length > 0;
  const hasUnresolvedAssets = summary.unresolvedAssets.length > 0;
  const hasMinorCutoffOnly =
    summary.unknownValue > 0 && !hasUnresolvedAssets && !hasLicenseWithheld;

  return (
    <div className="mt-3 border-t border-border/70 pt-2.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          <Info size={13} aria-hidden="true" />
          <span>{copy.toggle}</span>
          <ChevronDown
            size={13}
            aria-hidden="true"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {summary.verifiedValue > 0 && (
            <span>
              {copy.verifiedLabel}: {pct(summary.verifiedValue)}
            </span>
          )}
          {summary.estimatedValue > 0 && (
            <span>
              {copy.estimatedLabel}: {pct(summary.estimatedValue)}
            </span>
          )}
          {summary.unknownValue > 0 && (
            <span>
              {copy.unknownLabel}: {pct(summary.unknownValue)}
            </span>
          )}
          {hasLicenseWithheld && !summary.staleValue && (
            <span className="font-medium text-amber-600 dark:text-amber-400">
              {copy.licenseWithheldLabel}
            </span>
          )}
          {summary.staleValue > 0 && (
            <span className="font-medium text-amber-600 dark:text-amber-400">
              {copy.staleLabel}: {pct(summary.staleValue)}
            </span>
          )}
          {summary.latestAsOfDate && <span>{copy.asOfLabel(summary.latestAsOfDate)}</span>}
        </div>
      </div>
      {open && (
        <div
          id={detailsId}
          className="mt-2 space-y-2 rounded-xl border border-border/70 bg-secondary/35 p-3 text-[11px] leading-relaxed text-muted-foreground"
        >
          <p className="text-foreground/90">{copy.methodology}</p>
          {summary.estimatedValue > 0 && <p>{copy.benchmarkNote}</p>}
          {hasLicenseWithheld && (
            <p className="text-amber-700 dark:text-amber-400">
              {copy.licenseRestrictedNote(summary.licenseWithheldAssets.join(", "))}
            </p>
          )}
          {hasUnresolvedAssets && (
            <p>{copy.unavailableNote(summary.unresolvedAssets.join(", "))}</p>
          )}
          {hasMinorCutoffOnly && <p>{copy.minorCutoffNote}</p>}
          {summary.staleValue > 0 && (
            <p className="text-amber-700 dark:text-amber-400">{copy.staleNote}</p>
          )}
          {unpricedCount > 0 && <p>{copy.unpricedNote(unpricedCount)}</p>}
          <ul className="space-y-1 border-t border-border/60 pt-2">
            {summary.sources.map((item) => (
              <li key={item.symbol} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-semibold text-foreground">{item.symbol}</span>
                <span>
                  {copy.qualityLabels[item.profile.dataQuality]} · {item.profile.source}
                  {item.profile.asOfDate && item.profile.dataQuality !== "license-restricted"
                    ? ` (${item.profile.asOfDate})`
                    : ""}
                  {item.profile.stale && item.profile.dataQuality !== "license-restricted"
                    ? ` · ${copy.staleTag}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
