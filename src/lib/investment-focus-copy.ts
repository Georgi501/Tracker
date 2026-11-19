import type { Lang } from "./i18n";

export interface FocusCopy {
  tab: string;
  title: string;
  notice: string;
  toggle: string;
  method: string;
  foreign: (symbols: string) => string;
  unclassified: (symbols: string) => string;
  mandateLabel: string;
  unclassifiedLabel: string;
  cta: string;
  verified: string;
  catalogOnly: string;
}

export const FOCUS_COPY: Record<Lang, FocusCopy> = {
  en: {
    tab: "Focus",
    title: "Investment focus",
    notice:
      "Share of portfolio value grouped by each holding's stated primary mandate — not underlying country exposure. A US-focus fund is not implied to be exactly 100% US.",
    toggle: "How focus is determined",
    method:
      "One primary focus per fund, taken from the fund's name, ISIN and stated benchmark scope. Single companies use their reported headquarters country. Currency, exchange and legal domicile are never used, and no third-party holdings or country-weight tables are involved.",
    foreign: (s) =>
      `Nasdaq-100 funds follow a listing-based index and may hold some non-US companies: ${s}.`,
    unclassified: (s) => `Not in the verified catalog, left unclassified: ${s}.`,
    mandateLabel: "Identified by fund scope",
    unclassifiedLabel: "Unclassified",
    cta: "See what your funds track",
    verified: "Checked against public product pages",
    catalogOnly: "Catalog identity, re-check pending",
  },
  bg: {
    tab: "Фокус",
    title: "Инвестиционен фокус",
    notice:
      "Дял от стойността на портфейла по заявения основен мандат на всяка позиция — не е реална експозиция по държави. Фонд с фокус САЩ не означава точно 100% САЩ.",
    toggle: "Как се определя фокусът",
    method:
      "Един основен фокус на фонд според името, ISIN и заявения обхват на бенчмарка. Отделните компании използват държавата на централата си. Валута, борса и правно седалище не се използват, не участват и външни таблици с портфейли или тегла по държави.",
    foreign: (s) =>
      `Фондовете върху Nasdaq-100 следват индекс по борсова листинг и може да съдържат някои неамерикански компании: ${s}.`,
    unclassified: (s) => `Извън проверения каталог, оставени некласифицирани: ${s}.`,
    mandateLabel: "Определени по обхват на фонда",
    unclassifiedLabel: "Некласифицирани",
    cta: "Вижте какво следват фондовете ви",
    verified: "Проверено спрямо публични страници на продукта",
    catalogOnly: "Идентичност от каталога, предстои проверка",
  },
  de: {
    tab: "Fokus",
    title: "Anlagefokus",
    notice:
      "Anteil am Portfoliowert nach dem angegebenen Hauptmandat jeder Position — keine tatsächliche Länderexposition. Ein USA-Fonds ist nicht automatisch zu 100 % USA.",
    toggle: "Wie der Fokus bestimmt wird",
    method:
      "Ein primärer Fokus je Fonds aus Name, ISIN und angegebenem Benchmark-Umfang. Einzelunternehmen nutzen ihren gemeldeten Hauptsitz. Währung, Börse und Domizil werden nie verwendet; es fließen keine Drittanbieter-Bestände oder Länderquoten ein.",
    foreign: (s) =>
      `Nasdaq-100-Fonds folgen einem Listing-Index und können einzelne Nicht-US-Unternehmen enthalten: ${s}.`,
    unclassified: (s) => `Nicht im geprüften Katalog, unklassifiziert: ${s}.`,
    mandateLabel: "Über Fondsumfang identifiziert",
    unclassifiedLabel: "Nicht klassifiziert",
    cta: "Sehen, was Ihre Fonds abbilden",
    verified: "Mit öffentlichen Produktseiten abgeglichen",
    catalogOnly: "Katalog-Identität, Prüfung ausstehend",
  },
  es: {
    tab: "Enfoque",
    title: "Enfoque de inversión",
    notice:
      "Porcentaje del valor de la cartera según el mandato principal declarado de cada posición — no es exposición real por país. Un fondo de enfoque EE. UU. no implica exactamente 100 % EE. UU.",
    toggle: "Cómo se determina el enfoque",
    method:
      "Un enfoque principal por fondo, tomado del nombre, ISIN y alcance declarado del índice. Las empresas individuales usan la sede declarada. Nunca se usan divisa, bolsa ni domicilio legal, ni tablas de terceros de carteras o pesos por país.",
    foreign: (s) =>
      `Los fondos Nasdaq-100 siguen un índice por cotización y pueden incluir empresas no estadounidenses: ${s}.`,
    unclassified: (s) => `Fuera del catálogo verificado, sin clasificar: ${s}.`,
    mandateLabel: "Identificado por alcance del fondo",
    unclassifiedLabel: "Sin clasificar",
    cta: "Ver qué siguen tus fondos",
    verified: "Contrastado con páginas públicas del producto",
    catalogOnly: "Identidad de catálogo, revisión pendiente",
  },
  it: {
    tab: "Focus",
    title: "Focus di investimento",
    notice:
      "Quota del valore del portafoglio per mandato principale dichiarato di ogni posizione — non è esposizione reale per paese. Un fondo con focus USA non implica esattamente il 100% USA.",
    toggle: "Come si determina il focus",
    method:
      "Un focus primario per fondo, ricavato da nome, ISIN e ambito dichiarato del benchmark. Le singole società usano la sede dichiarata. Valuta, borsa e domicilio legale non sono mai usati, né tabelle di terzi su portafogli o pesi per paese.",
    foreign: (s) =>
      `I fondi Nasdaq-100 seguono un indice per quotazione e possono includere società non USA: ${s}.`,
    unclassified: (s) => `Fuori dal catalogo verificato, non classificati: ${s}.`,
    mandateLabel: "Identificato dall'ambito del fondo",
    unclassifiedLabel: "Non classificato",
    cta: "Scopri cosa seguono i tuoi fondi",
    verified: "Verificato su pagine pubbliche del prodotto",
    catalogOnly: "Identità da catalogo, verifica in corso",
  },
};
