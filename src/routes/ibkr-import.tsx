import { Card } from "@/components/AppShell";
import { RelatedGuides } from "@/components/RelatedGuides";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/lib/i18n";
import { articleJsonLd, canonicalLink, faqJsonLd } from "@/lib/seo";
import { usePortfolio } from "@/lib/store";
import { createFileRoute, Link } from "@tanstack/react-router";

type Guide = {
  title: string;
  intro: string;
  sampleCta: string;
  importCta: string;
  sampleNote: string;
  exportTitle: string;
  exportSteps: string[];
  exportNote: string;
  source: string;
  newTab: string;
  reviewTitle: string;
  reviewIntro: string;
  reviewItems: [string, string][];
  plansTitle: string;
  freeTitle: string;
  free: string;
  proTitle: string;
  pro: string;
  pricing: string;
  faqTitle: string;
  questions: [string, string][];
  resultTitle: string;
  result: string;
  demo: string;
  note: string;
};

const GUIDE: Record<Lang, Guide> = {
  en: {
    title: "Import your Interactive Brokers (IBKR) CSV into CapiSpot",
    intro:
      "Bring your Interactive Brokers trades and dividends into CapiSpot alongside your other brokers. Try the IBKR sample first, then import your own Activity Statement CSV or connect read-only with Flex Web Service.",
    sampleCta: "Try an IBKR CSV — no account needed",
    importCta: "I already have a CSV",
    sampleNote:
      "The sample stays in your browser. No broker connection or account is needed to try it.",
    exportTitle: "1. Export your IBKR Activity Statement as CSV",
    exportSteps: [
      "Sign in to Interactive Brokers Portal and open Performance & Reports > Statements.",
      "Choose Activity Statement (or a custom statement containing Trades and Dividends), select your date range and pick CSV as the format.",
      "Download the CSV file without renaming its section headers (Trades, Header, Data and Dividends, Header, Data).",
      "Include your history from the first purchase so average cost and FIFO calculations have the complete lot history.",
    ],
    exportNote:
      "Use the CSV Activity Statement export rather than a PDF or HTML statement. Pro users can also connect a read-only IBKR Flex Query.",
    source: "Interactive Brokers’ official Activity Statement guide",
    newTab: "opens in a new tab",
    reviewTitle: "2. Review the rows before adding them",
    reviewIntro:
      "In CapiSpot, open Brokers, drop your IBKR CSV into the auto-detect zone or choose Interactive Brokers. Check the preview before confirming the import.",
    reviewItems: [
      [
        "Trades, commissions and dividends",
        "Verify dates, tickers, quantities, trade prices and IBKR commissions. Original trade currencies are preserved and converted using dated FX rates.",
      ],
      [
        "Possible duplicates",
        "Rows already recorded in the selected IBKR account are flagged and skipped by default.",
      ],
      [
        "Rows that need attention",
        "Non-order summary rows and incomplete entries are isolated for review instead of silently becoming trades.",
      ],
    ],
    plansTitle: "CSV import is Free. Direct IBKR Flex sync is Pro.",
    freeTitle: "Free · Activity Statement CSV import",
    free: "Upload your IBKR CSV, inspect parsed trades, dividends and duplicates in the preview, and save to your portfolio for free.",
    proTitle: "Pro · Read-only IBKR Flex sync & FIFO reports",
    pro: "Connect a read-only IBKR Flex Web Service Token and Flex Query ID to fetch trades and dividend cash transactions automatically, plus unlock annual FIFO realized gains reports.",
    pricing: "Compare Free and Pro",
    faqTitle: "Before your first IBKR import",
    questions: [
      [
        "What is the difference between IBKR CSV import and IBKR Flex sync?",
        "CSV import is free: you download an Activity Statement CSV from IBKR and upload it in CapiSpot. IBKR Flex sync is a Pro option that uses a read-only Flex Web Service Token and Query ID to fetch your latest trades and dividends without manual file downloads.",
      ],
      [
        "Why does the IBKR sample show a duplicate and a row to review?",
        "They are included intentionally so you can see how CapiSpot flags duplicate fills and filters out incomplete rows before anything is saved.",
      ],
      [
        "Can I combine IBKR with Trading 212 or Revolut?",
        "Yes. Each broker has its own account container in CapiSpot while holdings, dividends and analytics are unified across your entire portfolio.",
      ],
    ],
    resultTitle: "3. Open your unified portfolio after import",
    result:
      "After confirming the preview, your IBKR positions, dividend history and cost basis appear immediately across Holdings, Analytics and Dividends.",
    demo: "See an example portfolio",
    note: "General information, not tax or investment advice. CapiSpot is not affiliated with Interactive Brokers.",
  },
  bg: {
    title: "Импортирай своя Interactive Brokers (IBKR) CSV в CapiSpot",
    intro:
      "Добави сделките и дивидентите си от Interactive Brokers в CapiSpot заедно с останалите си брокери. Първо пробвай примерния IBKR файл, а после качи своя Activity Statement CSV или свържи Flex Web Service.",
    sampleCta: "Пробвай IBKR CSV — без акаунт",
    importCta: "Вече имам CSV файл",
    sampleNote:
      "Примерът остава в браузъра ти. За пробата не са нужни регистрация или връзка с брокера.",
    exportTitle: "1. Експортирай Activity Statement от IBKR като CSV",
    exportSteps: [
      "Влез в портала на Interactive Brokers и отвори Performance & Reports > Statements.",
      "Избери Activity Statement (или отчет, включващ Trades и Dividends), посочи периода и избери формат CSV.",
      "Изтегли CSV файла, без да променяш секциите (Trades, Header, Data и Dividends, Header, Data).",
      "Включи историята от първата си покупка, за да са точни средната цена и FIFO изчисленията.",
    ],
    exportNote:
      "Използвай CSV експорт на Activity Statement, а не PDF или HTML отчет. Pro потребителите могат да свържат и read-only IBKR Flex Query.",
    source: "Официални инструкции на Interactive Brokers за Activity Statements",
    newTab: "отваря се в нов раздел",
    reviewTitle: "2. Прегледай редовете преди запис",
    reviewIntro:
      "В CapiSpot отвори „Брокери“, пусни IBKR CSV файла в зоната за автоматично разпознаване или избери Interactive Brokers. Провери прегледа преди потвърждение.",
    reviewItems: [
      [
        "Сделки, комисиони и дивиденти",
        "Провери датите, тикерите, количествата, цените и комисионите от IBKR. Оригиналните валути се запазват и преизчисляват по курса за съответната дата.",
      ],
      [
        "Възможни дубликати",
        "Вече записаните редове в избраната IBKR сметка се маркират и пропускат по подразбиране.",
      ],
      [
        "Редове за проверка",
        "Обобщаващи редове и непълни записи се отделят за преглед, вместо тихо да се превръщат в сделки.",
      ],
    ],
    plansTitle: "CSV импортът е Free. Директната IBKR Flex връзка е Pro.",
    freeTitle: "Free · Импорт на Activity Statement CSV",
    free: "Качи своя IBKR CSV, прегледай разпознатите сделки, дивиденти и дубликати и ги запази в портфолиото си безплатно.",
    proTitle: "Pro · Read-only IBKR Flex синхронизация и FIFO справки",
    pro: "Свържи IBKR чрез Flex Web Service Token и Flex Query ID само за четене на сделки и дивиденти и отключи годишните FIFO данъчни справки за реализирани печалби.",
    pricing: "Сравни Free и Pro",
    faqTitle: "Преди първия IBKR импорт",
    questions: [
      [
        "Каква е разликата между IBKR CSV импорт и IBKR Flex синхронизация?",
        "CSV импортът е безплатен: изтегляш Activity Statement CSV от IBKR и го качваш в CapiSpot. IBKR Flex синхронизацията е Pro опция с read-only Token и Query ID за автоматично извличане на сделки и дивиденти.",
      ],
      [
        "Защо примерният IBKR файл показва дубликат и ред за проверка?",
        "Включени са умишлено, за да видиш как прегледът открива дублирани поръчки и отделя непълните редове преди запис.",
      ],
      [
        "Мога ли да комбинирам IBKR с Trading 212 или Revolut?",
        "Да. Всеки брокер има отделна сметка в CapiSpot, а позициите, дивидентите и анализите се обединяват в едно общо портфолио.",
      ],
    ],
    resultTitle: "3. Отвори обединеното си портфолио след импорта",
    result:
      "След като потвърдиш прегледа, позициите, дивидентите и покупната цена от IBKR се появяват веднага в „Позиции“, „Анализи“ и „Дивиденти“.",
    demo: "Виж примерно портфолио",
    note: "Обща информация, не е данъчен или инвестиционен съвет. CapiSpot не е свързан с Interactive Brokers.",
  },
  de: {
    title: "Interactive Brokers (IBKR) CSV in CapiSpot importieren",
    intro:
      "Importiere deine Interactive-Brokers-Trades und Dividenden zusammen mit deinen anderen Brokern in CapiSpot. Teste zuerst die IBKR-Beispieldatei oder importiere deinen eigenen Activity-Statement-CSV.",
    sampleCta: "IBKR-CSV testen — ohne Konto",
    importCta: "Ich habe bereits eine CSV-Datei",
    sampleNote:
      "Das Beispiel bleibt in deinem Browser. Zum Testen sind kein Konto und keine Broker-Verbindung nötig.",
    exportTitle: "1. IBKR Activity Statement als CSV exportieren",
    exportSteps: [
      "Melde dich im Interactive Brokers Portal an und öffne Performance & Reports > Statements.",
      "Wähle Activity Statement, lege den Zeitraum fest und wähle CSV als Format.",
      "Lade die CSV-Datei herunter, ohne die Abschnittsüberschriften (Trades, Header, Data und Dividends, Header, Data) zu ändern.",
      "Schließe die Historie ab dem ersten Kauf ein, damit Einstandskurse und FIFO-Berechnungen vollständig sind.",
    ],
    exportNote:
      "Verwende den CSV-Activity-Statement-Export statt PDF oder HTML. Pro-Nutzer können auch eine Read-only-IBKR-Flex-Query verbinden.",
    source: "Offizielle Anleitung von Interactive Brokers zu Activity Statements",
    newTab: "öffnet in neuem Tab",
    reviewTitle: "2. Zeilen vor dem Speichern prüfen",
    reviewIntro:
      "Öffne in CapiSpot den Bereich Broker, ziehe deine IBKR-CSV in das Auto-Detect-Feld oder wähle Interactive Brokers aus und prüfe die Vorschau.",
    reviewItems: [
      [
        "Trades, Gebühren und Dividenden",
        "Prüfe Datum, Ticker, Stückzahl, Kurse und IBKR-Kommissionen. Originalwährungen bleiben erhalten.",
      ],
      [
        "Mögliche Duplikate",
        "Bereits erfasste Zeilen werden markiert und standardmäßig übersprungen.",
      ],
      [
        "Zu prüfende Zeilen",
        "Summenzeilen und unvollständige Einträge werden zur Prüfung isoliert.",
      ],
    ],
    plansTitle: "CSV-Import ist Free. Direkter IBKR-Flex-Sync ist Pro.",
    freeTitle: "Free · Activity-Statement-CSV-Import",
    free: "Lade deine IBKR-CSV hoch, prüfe Trades, Dividenden und Duplikate in der Vorschau und speichere sie kostenlos.",
    proTitle: "Pro · Read-only IBKR-Flex-Sync & FIFO-Berichte",
    pro: "Verbinde ein Read-only IBKR Flex Web Service Token und eine Flex Query ID für automatischen Abruf von Trades und Dividenden sowie jährliche FIFO-Steuerberichte.",
    pricing: "Free und Pro vergleichen",
    faqTitle: "Vor deinem ersten IBKR-Import",
    questions: [
      [
        "Was ist der Unterschied zwischen IBKR-CSV-Import und IBKR-Flex-Sync?",
        "Der CSV-Import ist kostenlos über das Activity Statement. IBKR-Flex-Sync ist eine Pro-Funktion mit Read-only-Token und Query-ID für den direkten Abruf.",
      ],
      [
        "Warum zeigt das IBKR-Beispiel ein Duplikat und eine zu prüfende Zeile?",
        "Sie sind absichtlich enthalten, damit du siehst, wie die Vorschau doppelte Ausführungen und unvollständige Zeilen erkennt.",
      ],
      [
        "Kann ich IBKR mit Trading 212 oder Revolut kombinieren?",
        "Ja. Jeder Broker wird separat geführt, während Positionen, Dividenden und Analysen im Gesamtportfolio zusammengeführt werden.",
      ],
    ],
    resultTitle: "3. Portfolio nach dem Import öffnen",
    result:
      "Nach Bestätigung der Vorschau erscheinen deine IBKR-Positionen und Dividenden sofort im Portfolio.",
    demo: "Beispielportfolio ansehen",
    note: "Allgemeine Informationen, keine Steuer- oder Anlageberatung. CapiSpot ist nicht mit Interactive Brokers verbunden.",
  },
  es: {
    title: "Importa tu CSV de Interactive Brokers (IBKR) en CapiSpot",
    intro:
      "Reúne tus operaciones y dividendos de Interactive Brokers en CapiSpot junto con tus demás brókers. Prueba primero el ejemplo de IBKR y luego importa tu Activity Statement CSV.",
    sampleCta: "Probar CSV de IBKR — sin cuenta",
    importCta: "Ya tengo un archivo CSV",
    sampleNote:
      "El ejemplo permanece en tu navegador. No necesitas cuenta ni conexión con el bróker para probarlo.",
    exportTitle: "1. Exporta tu Activity Statement de IBKR en CSV",
    exportSteps: [
      "Inicia sesión en el portal de Interactive Brokers y abre Performance & Reports > Statements.",
      "Elige Activity Statement, selecciona el período completo y escoge el formato CSV.",
      "Descarga el archivo CSV conservando los encabezados originales (Trades, Header, Data y Dividends, Header, Data).",
      "Incluye el historial desde tu primera compra para mantener exactos el coste medio y el cálculo FIFO.",
    ],
    exportNote:
      "Usa el Activity Statement en formato CSV en lugar de PDF o HTML. Los usuarios Pro también pueden conectar una Flex Query de solo lectura.",
    source: "Guía oficial de Activity Statements de Interactive Brokers",
    newTab: "se abre en una pestaña nueva",
    reviewTitle: "2. Revisa las filas antes de guardarlas",
    reviewIntro:
      "En CapiSpot, abre Brokers, arrastra tu CSV de IBKR a la zona de detección automática o selecciona Interactive Brokers y revisa la vista previa.",
    reviewItems: [
      [
        "Operaciones, comisiones y dividendos",
        "Comprueba fechas, tickers, cantidades, precios y comisiones de IBKR. Las divisas originales se conservan.",
      ],
      ["Posibles duplicados", "Las filas ya registradas se marcan y se omiten por defecto."],
      [
        "Filas por revisar",
        "Las filas de resumen o incompletas se separan para revisión en lugar de importarse como operaciones.",
      ],
    ],
    plansTitle: "La importación CSV es Free. La sincronización IBKR Flex es Pro.",
    freeTitle: "Free · Importación CSV de Activity Statement",
    free: "Sube tu CSV de IBKR, revisa operaciones, dividendos y duplicados en la vista previa y guárdalos gratis.",
    proTitle: "Pro · Sincronización IBKR Flex de solo lectura e informes FIFO",
    pro: "Conecta un Token de IBKR Flex Web Service y un Flex Query ID de solo lectura para importar operaciones y dividendos automáticamente, además de informes anuales FIFO.",
    pricing: "Comparar Free y Pro",
    faqTitle: "Antes de tu primera importación de IBKR",
    questions: [
      [
        "¿Cuál es la diferencia entre importar CSV de IBKR y la sincronización Flex?",
        "La importación CSV es gratuita descargando tu Activity Statement. La sincronización IBKR Flex es una opción Pro de solo lectura mediante Token y Query ID.",
      ],
      [
        "¿Por qué el ejemplo de IBKR muestra un duplicado y una fila por revisar?",
        "Se incluyen deliberadamente para mostrar cómo la vista previa detecta duplicados y aisla filas incompletas antes de guardar.",
      ],
      [
        "¿Puedo combinar IBKR con Trading 212 o Revolut?",
        "Sí. Cada bróker tiene su propia cuenta en CapiSpot mientras tu cartera, dividendos y análisis se unifican.",
      ],
    ],
    resultTitle: "3. Abre tu cartera después de importar",
    result:
      "Al confirmar la vista previa, tus posiciones y dividendos de IBKR aparecerán al instante en tu cartera.",
    demo: "Ver una cartera de ejemplo",
    note: "Información general, no asesoramiento fiscal ni de inversión. CapiSpot no está afiliado a Interactive Brokers.",
  },
  it: {
    title: "Importa il tuo CSV di Interactive Brokers (IBKR) in CapiSpot",
    intro:
      "Unisci operazioni e dividendi di Interactive Brokers in CapiSpot insieme agli altri tuoi broker. Prova prima il file di esempio IBKR e poi importa il tuo Activity Statement CSV.",
    sampleCta: "Prova un CSV IBKR — senza account",
    importCta: "Ho già un file CSV",
    sampleNote:
      "L'esempio resta nel tuo browser. Non servono account o collegamenti al broker per provarlo.",
    exportTitle: "1. Esporta il tuo Activity Statement IBKR in CSV",
    exportSteps: [
      "Accedi al portale Interactive Brokers e apri Performance & Reports > Statements.",
      "Scegli Activity Statement, seleziona l'intervallo di date e imposta CSV come formato.",
      "Scarica il file CSV mantenendo intatte le intestazioni (Trades, Header, Data e Dividends, Header, Data).",
      "Includi lo storico dal primo acquisto per calcolare correttamente prezzo medio e FIFO.",
    ],
    exportNote:
      "Usa l'esportazione CSV dell'Activity Statement anziché PDF o HTML. Gli utenti Pro possono anche collegare una Flex Query di sola lettura.",
    source: "Guida ufficiale agli Activity Statements di Interactive Brokers",
    newTab: "si apre in una nuova scheda",
    reviewTitle: "2. Controlla le righe prima di salvarle",
    reviewIntro:
      "In CapiSpot apri Broker, trascina il tuo CSV IBKR nell'area di rilevamento automatico o scegli Interactive Brokers e verifica l'anteprima.",
    reviewItems: [
      [
        "Operazioni, commissioni e dividendi",
        "Verifica date, ticker, quantità, prezzi e commissioni IBKR. Le valute originali vengono mantenute.",
      ],
      [
        "Possibili duplicati",
        "Le righe già registrate vengono segnalate e saltate per impostazione predefinita.",
      ],
      [
        "Righe da controllare",
        "Le righe di riepilogo o incomplete vengono isolate per la verifica.",
      ],
    ],
    plansTitle: "L'importazione CSV è Free. La sincronizzazione IBKR Flex è Pro.",
    freeTitle: "Free · Importazione CSV Activity Statement",
    free: "Carica il tuo CSV IBKR, controlla operazioni, dividendi e duplicati nell'anteprima e salva gratuitamente.",
    proTitle: "Pro · Sincronizzazione IBKR Flex di sola lettura e report FIFO",
    pro: "Collega un Token IBKR Flex Web Service e un Flex Query ID di sola lettura per scaricare operazioni e dividendi automaticamente, più i report annuali FIFO.",
    pricing: "Confronta Free e Pro",
    faqTitle: "Prima della tua prima importazione IBKR",
    questions: [
      [
        "Qual è la differenza tra importazione CSV IBKR e sincronizzazione Flex?",
        "L'importazione CSV è gratuita tramite Activity Statement. La sincronizzazione IBKR Flex è un'opzione Pro di sola lettura tramite Token e Query ID.",
      ],
      [
        "Perché l'esempio IBKR mostra un duplicato e una riga da controllare?",
        "Sono inclusi appositamente per mostrare come l'anteprima gestisce duplicati e righe incomplete prima del salvataggio.",
      ],
      [
        "Posso combinare IBKR con Trading 212 o Revolut?",
        "Sì. Ogni broker ha il proprio conto in CapiSpot mentre posizioni, dividendi e analisi sono unificati.",
      ],
    ],
    resultTitle: "3. Apri il tuo portafoglio dopo l'importazione",
    result:
      "Dopo la conferma dell'anteprima, le posizioni e i dividendi IBKR sono subito visibili nel portafoglio.",
    demo: "Vedi un portafoglio di esempio",
    note: "Informazioni generali, non consulenza fiscale o di investimento. CapiSpot non è affiliato con Interactive Brokers.",
  },
};

const TITLE = "Interactive Brokers (IBKR) CSV Import & Flex Sync | CapiSpot";
const DESCRIPTION =
  "Import your Interactive Brokers (IBKR) Activity Statement CSV for free or connect read-only with Pro Flex sync. Preview trades, commissions, dividends and duplicates.";

export const Route = createFileRoute("/ibkr-import")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [canonicalLink("/ibkr-import")],
    scripts: [articleJsonLd(TITLE, DESCRIPTION, "/ibkr-import"), faqJsonLd(GUIDE.en.questions)],
  }),
  component: IbkrImport,
});

function IbkrImport() {
  const { lang } = usePortfolio();
  const g = GUIDE[lang];
  const sampleButton = (
    <Button
      asChild
      className="h-auto min-h-11 whitespace-normal rounded-full px-5 py-3 text-center leading-snug"
    >
      <Link to="/import-demo" search={{ broker: "ibkr" }}>
        {g.sampleCta}
      </Link>
    </Button>
  );

  return (
    <article className="page-enter mx-auto max-w-3xl space-y-6">
      <header className="space-y-4">
        <h1 className="font-display text-balance text-3xl font-bold">{g.title}</h1>
        <p className="text-base leading-relaxed text-muted-foreground">{g.intro}</p>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {sampleButton}
          <Button asChild variant="outline" className="h-auto min-h-11 rounded-full px-5 py-3">
            <Link to="/brokers" search={{ broker: "ibkr" }}>
              {g.importCta}
            </Link>
          </Button>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{g.sampleNote}</p>
      </header>

      <Card>
        <section aria-labelledby="ibkr-export-heading">
          <h2 id="ibkr-export-heading" className="font-display text-xl font-semibold">
            {g.exportTitle}
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed">
            {g.exportSteps.map((step) => (
              <li key={step} className="pl-1">
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{g.exportNote}</p>
          <a
            href="https://www.ibkrguides.com/clientportal/performanceandstatements/activitystatements.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span>
              {g.source}
              <span className="sr-only"> ({g.newTab})</span>
            </span>
          </a>
        </section>
      </Card>

      <Card>
        <section aria-labelledby="ibkr-review-heading">
          <h2 id="ibkr-review-heading" className="font-display text-xl font-semibold">
            {g.reviewTitle}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{g.reviewIntro}</p>
          <dl className="mt-4 space-y-4">
            {g.reviewItems.map(([title, body]) => (
              <div key={title}>
                <dt className="font-semibold">{title}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</dd>
              </div>
            ))}
          </dl>
        </section>
      </Card>

      <section aria-labelledby="ibkr-plans-heading" className="space-y-4">
        <h2 id="ibkr-plans-heading" className="font-display text-xl font-semibold">
          {g.plansTitle}
        </h2>
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <Card>
            <h3 className="font-semibold">{g.freeTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{g.free}</p>
          </Card>
          <Card>
            <h3 className="font-semibold">{g.proTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{g.pro}</p>
          </Card>
        </div>
        <Button asChild variant="outline" className="h-auto min-h-11 rounded-full px-4 py-3">
          <Link to="/pricing">{g.pricing}</Link>
        </Button>
      </section>

      <section aria-labelledby="ibkr-faq-heading" className="space-y-4">
        <h2 id="ibkr-faq-heading" className="font-display text-xl font-semibold">
          {g.faqTitle}
        </h2>
        {g.questions.map(([question, answer]) => (
          <div key={question}>
            <h3 className="font-semibold">{question}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{answer}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="ibkr-result-heading" className="space-y-4">
        <h2 id="ibkr-result-heading" className="font-display text-xl font-semibold">
          {g.resultTitle}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{g.result}</p>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {sampleButton}
          <Button asChild variant="outline" className="h-auto min-h-11 rounded-full px-5 py-3">
            <Link to="/demo">{g.demo}</Link>
          </Button>
        </div>
      </section>
      <p className="text-xs leading-relaxed text-muted-foreground">{g.note}</p>
      <RelatedGuides current="/ibkr-import" />
    </article>
  );
}
