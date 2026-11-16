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
    title: "Import your Revolut trading CSV into CapiSpot",
    intro:
      "Track the stocks and ETFs you bought through Revolut alongside your other brokers. Try the Revolut sample first, then import your own trading statement CSV with a full preview before saving.",
    sampleCta: "Try a Revolut CSV — no account needed",
    importCta: "I already have a CSV",
    sampleNote:
      "The sample stays in your browser. No broker connection or account is needed to try it.",
    exportTitle: "1. Export your Revolut trading statement as CSV",
    exportSteps: [
      "Open the Revolut app and go to the Invest (Stocks) section.",
      "Open Statements or Account documents and select your trading account.",
      "Choose CSV (Excel) format and select the date range covering your first purchase to today.",
      "Save the CSV file keeping its original headers (Date, Ticker, Type, Quantity, Price per share, Total Amount, Currency).",
    ],
    exportNote:
      "Download the CSV trading statement rather than the PDF statement so rows can be parsed directly.",
    reviewTitle: "2. Review the rows before adding them",
    reviewIntro:
      "In CapiSpot, open Brokers, drop your Revolut CSV into the auto-detect zone or choose Revolut. Check the preview before confirming the import.",
    reviewItems: [
      [
        "Trades and dividends",
        "Verify dates, tickers, quantities, share prices and dividend payouts. Original currencies are preserved and converted using dated FX rates.",
      ],
      [
        "Possible duplicates",
        "Rows already recorded in the selected Revolut account are flagged and skipped by default.",
      ],
      [
        "Rows that need attention",
        "Cash top-ups, custody fee lines and non-trade entries are set aside for review instead of silently becoming trades.",
      ],
    ],
    plansTitle: "Revolut CSV import is Free. Pro adds multi-broker sync & FIFO tax reports.",
    freeTitle: "Free · Revolut CSV import",
    free: "Upload your Revolut CSV, review parsed trades, dividends and duplicates in the preview, and combine Revolut with any other broker for free.",
    proTitle: "Pro · Annual FIFO tax reports & direct sync for supported brokers",
    pro: "Unlock annual FIFO realized gains reports across all your brokers, plus read-only API sync for Interactive Brokers Flex and Trading 212.",
    pricing: "Compare Free and Pro",
    faqTitle: "Before your first Revolut import",
    questions: [
      [
        "Why does the Revolut sample show a duplicate and a row to review?",
        "They are included intentionally so you can see how the preview flags duplicate trades and separates cash top-ups before saving.",
      ],
      [
        "Does Revolut CSV import require an API connection?",
        "No. Export your trading statement as a CSV file from the Revolut app and drop it into CapiSpot for free.",
      ],
      [
        "Can I combine Revolut with Trading 212 and Interactive Brokers?",
        "Yes. Create a separate broker container for each provider in CapiSpot to view unified holdings, allocation and dividend income in one portfolio.",
      ],
    ],
    resultTitle: "3. Open your portfolio after import",
    result:
      "After confirming the preview, your Revolut positions, cost basis and dividends appear immediately across Holdings, Analytics and Dividends.",
    demo: "See an example portfolio",
    note: "General information, not tax or investment advice. CapiSpot is not affiliated with Revolut.",
  },
  bg: {
    title: "Импортирай своя Revolut CSV в CapiSpot",
    intro:
      "Следи акциите и ETF-ите, купени през Revolut, заедно с останалите си брокери. Първо пробвай примерния Revolut файл, а после качи своето CSV извлечение с преглед преди запис.",
    sampleCta: "Пробвай Revolut CSV — без акаунт",
    importCta: "Вече имам CSV файл",
    sampleNote:
      "Примерът остава в браузъра ти. За пробата не са нужни регистрация или връзка с брокера.",
    exportTitle: "1. Изтегли инвестиционното си извлечение от Revolut като CSV",
    exportSteps: [
      "Отвори приложението Revolut и влез в секция Invest (Инвестиции / Акции).",
      "Отвори Statements (Извлечения / Документи) и избери инвестиционната си сметка.",
      "Избери формат CSV (Excel) и период от първата покупка до днес.",
      "Запази CSV файла с оригиналните заглавия на колоните (Date, Ticker, Type, Quantity, Price per share, Total Amount, Currency).",
    ],
    exportNote:
      "Използвай CSV извлечението за сделки, а не PDF документа, за да се разпознаят редовете автоматично.",
    reviewTitle: "2. Прегледай редовете преди запис",
    reviewIntro:
      "В CapiSpot отвори „Брокери“, пусни Revolut CSV файла в зоната за автоматично разпознаване или избери Revolut. Провери прегледа преди потвърждение.",
    reviewItems: [
      [
        "Сделки и дивиденти",
        "Провери датите, тикерите, количествата, цените и дивидентите. Оригиналните валути се запазват и преизчисляват по историческия курс за датата.",
      ],
      [
        "Възможни дубликати",
        "Вече записаните редове в избраната Revolut сметка се маркират и пропускат по подразбиране.",
      ],
      [
        "Редове за проверка",
        "Захранвания на кеш (Cash top-up) и такси за съхранение се отделят за преглед, вместо тихо да стават сделки.",
      ],
    ],
    plansTitle: "CSV импортът от Revolut е Free. Pro добавя FIFO данъчни справки.",
    freeTitle: "Free · Revolut CSV импорт",
    free: "Качи своя Revolut CSV, прегледай сделките, дивидентите и дубликатите в прегледа и комбинирай Revolut с други брокери безплатно.",
    proTitle: "Pro · Годишни FIFO справки и read-only синхронизация за поддържани брокери",
    pro: "Отключи годишните FIFO справки за реализирани печалби и загуби за всички брокери, както и директна read-only връзка за IBKR Flex и Trading 212.",
    pricing: "Сравни Free и Pro",
    faqTitle: "Преди първия Revolut импорт",
    questions: [
      [
        "Защо примерният Revolut файл показва дубликат и ред за проверка?",
        "Те са добавени умишлено, за да видиш как прегледът маркира дублирани сделки и отделя кеш преводи (Cash top-up) преди запис.",
      ],
      [
        "Нужна ли е API връзка за импорт от Revolut?",
        "Не. Изтегли инвестиционното си извлечение като CSV от приложението на Revolut и го качи безплатно в CapiSpot.",
      ],
      [
        "Мога ли да комбинирам Revolut с Trading 212 и Interactive Brokers?",
        "Да. Всеки брокер има отделна сметка в CapiSpot, а позициите, разпределението и дивидентите се обединяват в едно портфолио.",
      ],
    ],
    resultTitle: "3. Отвори портфолиото си след импорта",
    result:
      "След потвърждение позициите, покупната цена и дивидентите от Revolut се появяват веднага в „Позиции“, „Анализи“ и „Дивиденти“.",
    demo: "Виж примерно портфолио",
    note: "Обща информация, не е данъчен или инвестиционен съвет. CapiSpot не е свързан с Revolut.",
  },
  de: {
    title: "Revolut-Handels-CSV in CapiSpot importieren",
    intro:
      "Verfolge deine über Revolut gekauften Aktien und ETFs zusammen mit deinen anderen Brokern. Teste zuerst das Revolut-Beispiel und importiere danach deinen eigenen CSV-Kontoauszug.",
    sampleCta: "Revolut-CSV testen — ohne Konto",
    importCta: "Ich habe bereits eine CSV-Datei",
    sampleNote:
      "Das Beispiel bleibt in deinem Browser. Zum Testen sind kein Konto und keine Broker-Verbindung nötig.",
    exportTitle: "1. Revolut-Handelsauszug als CSV exportieren",
    exportSteps: [
      "Öffne die Revolut-App und wechsle zum Bereich Invest (Aktien).",
      "Öffne Kontoauszüge (Statements) und wähle dein Anlagekonto.",
      "Wähle CSV (Excel) als Format und den Zeitraum ab deinem ersten Kauf.",
      "Speichere die CSV-Datei mit den Originalüberschriften (Date, Ticker, Type, Quantity, Price per share, Total Amount, Currency).",
    ],
    exportNote:
      "Lade den CSV-Handelsauszug statt eines PDF-Dokuments herunter, damit die Zeilen direkt erkannt werden.",
    reviewTitle: "2. Zeilen vor dem Speichern prüfen",
    reviewIntro:
      "Öffne in CapiSpot den Bereich Broker, ziehe deine Revolut-CSV in das Auto-Detect-Feld oder wähle Revolut aus und prüfe die Vorschau.",
    reviewItems: [
      [
        "Trades und Dividenden",
        "Prüfe Datum, Ticker, Stückzahl, Kurse und Dividenden. Originalwährungen bleiben erhalten.",
      ],
      [
        "Mögliche Duplikate",
        "Bereits erfasste Zeilen werden markiert und standardmäßig übersprungen.",
      ],
      [
        "Zu prüfende Zeilen",
        "Einzahlungen (Cash Top-up) und Nicht-Handelszeilen werden zur Prüfung isoliert.",
      ],
    ],
    plansTitle: "Revolut-CSV-Import ist Free. Pro ergänzt FIFO-Steuerberichte.",
    freeTitle: "Free · Revolut-CSV-Import",
    free: "Lade deine Revolut-CSV hoch, prüfe Trades, Dividenden und Duplikate in der Vorschau und kombiniere Revolut kostenlos mit anderen Brokern.",
    proTitle: "Pro · Jährliche FIFO-Berichte & Read-only-Sync für unterstützte Broker",
    pro: "Schalte jährliche FIFO-Berichte über realisierte Gewinne und Verluste sowie Read-only-API-Sync für IBKR Flex und Trading 212 frei.",
    pricing: "Free und Pro vergleichen",
    faqTitle: "Vor deinem ersten Revolut-Import",
    questions: [
      [
        "Warum zeigt das Revolut-Beispiel ein Duplikat und eine zu prüfende Zeile?",
        "Sie sind absichtlich enthalten, damit du siehst, wie die Vorschau Duplikate und Cash-Top-ups vor dem Speichern behandelt.",
      ],
      [
        "Benötige ich für Revolut einen API-Schlüssel?",
        "Nein. Exportiere einfach deinen Handelsauszug als CSV aus der Revolut-App und lade ihn kostenlos hoch.",
      ],
      [
        "Kann ich Revolut mit Trading 212 und Interactive Brokers kombinieren?",
        "Ja. Alle Broker-Konten werden in einem gemeinsamen Portfolio zusammengeführt.",
      ],
    ],
    resultTitle: "3. Portfolio nach dem Import öffnen",
    result:
      "Nach Bestätigung der Vorschau erscheinen deine Revolut-Positionen und Dividenden sofort im Portfolio.",
    demo: "Beispielportfolio ansehen",
    note: "Allgemeine Informationen, keine Steuer- oder Anlageberatung. CapiSpot ist nicht mit Revolut verbunden.",
  },
  es: {
    title: "Importa tu CSV de Revolut en CapiSpot",
    intro:
      "Sigue las acciones y ETFs comprados en Revolut junto con tus otros brókers. Prueba primero el ejemplo de Revolut y luego importa tu extracto CSV con vista previa antes de guardar.",
    sampleCta: "Probar CSV de Revolut — sin cuenta",
    importCta: "Ya tengo un archivo CSV",
    sampleNote:
      "El ejemplo permanece en tu navegador. No necesitas cuenta ni conexión con el bróker para probarlo.",
    exportTitle: "1. Exporta tu extracto de inversión de Revolut en CSV",
    exportSteps: [
      "Abre la app de Revolut y entra en la sección Invest (Acciones).",
      "Abre Extractos (Statements) y selecciona tu cuenta de inversión.",
      "Elige el formato CSV (Excel) y el período completo desde tu primera compra.",
      "Guarda el archivo CSV manteniendo los encabezados originales (Date, Ticker, Type, Quantity, Price per share, Total Amount, Currency).",
    ],
    exportNote:
      "Descarga el extracto en formato CSV en lugar de PDF para que las filas se reconozcan automáticamente.",
    reviewTitle: "2. Revisa las filas antes de guardarlas",
    reviewIntro:
      "En CapiSpot, abre Brokers, suelta tu CSV de Revolut en la zona de detección automática o selecciona Revolut y revisa la vista previa.",
    reviewItems: [
      [
        "Operaciones y dividendos",
        "Comprueba fechas, tickers, cantidades, precios y dividendos. Las divisas originales se conservan.",
      ],
      ["Posibles duplicados", "Las filas ya registradas se marcan y se omiten por defecto."],
      [
        "Filas por revisar",
        "Los ingresos de efectivo (Cash top-up) y filas sin operación se separan para revisión.",
      ],
    ],
    plansTitle: "La importación CSV de Revolut es Free. Pro añade informes FIFO.",
    freeTitle: "Free · Importación CSV de Revolut",
    free: "Sube tu CSV de Revolut, revisa operaciones, dividendos y duplicados en la vista previa y combínalo gratis con otros brókers.",
    proTitle: "Pro · Informes anuales FIFO y sincronización de solo lectura",
    pro: "Desbloquea informes anuales FIFO de ganancias y pérdidas realizadas y sincronización API de solo lectura para IBKR Flex y Trading 212.",
    pricing: "Comparar Free y Pro",
    faqTitle: "Antes de tu primera importación de Revolut",
    questions: [
      [
        "¿Por qué el ejemplo de Revolut muestra un duplicado y una fila por revisar?",
        "Se incluyen deliberadamente para mostrar cómo la vista previa detecta duplicados y separa recargas de efectivo antes de guardar.",
      ],
      [
        "¿Necesito una conexión API para importar desde Revolut?",
        "No. Solo exporta el extracto CSV desde la app de Revolut y súbelo gratis en CapiSpot.",
      ],
      [
        "¿Puedo combinar Revolut con Trading 212 e Interactive Brokers?",
        "Sí. Todas tus cuentas de bróker se consolidan en una sola cartera.",
      ],
    ],
    resultTitle: "3. Abre tu cartera después de importar",
    result:
      "Al confirmar la vista previa, tus posiciones y dividendos de Revolut aparecerán al instante en tu cartera.",
    demo: "Ver una cartera de ejemplo",
    note: "Información general, no asesoramiento fiscal ni de inversión. CapiSpot no está afiliado a Revolut.",
  },
  it: {
    title: "Importa il tuo CSV di Revolut in CapiSpot",
    intro:
      "Monitora azioni ed ETF acquistati su Revolut insieme agli altri tuoi broker. Prova prima il file di esempio Revolut e poi importa il tuo estratto conto CSV con anteprima prima del salvataggio.",
    sampleCta: "Prova un CSV Revolut — senza account",
    importCta: "Ho già un file CSV",
    sampleNote:
      "L'esempio resta nel tuo browser. Non servono account o collegamenti al broker per provarlo.",
    exportTitle: "1. Esporta il tuo estratto conto investimenti Revolut in CSV",
    exportSteps: [
      "Apri l'app Revolut e vai nella sezione Invest (Azioni).",
      "Apri Estratti conto (Statements) e seleziona il tuo conto di investimento.",
      "Scegli il formato CSV (Excel) e seleziona l'intervallo di date dal primo acquisto.",
      "Salva il file CSV mantenendo le intestazioni originali (Date, Ticker, Type, Quantity, Price per share, Total Amount, Currency).",
    ],
    exportNote:
      "Scarica l'estratto conto in formato CSV anziché PDF per analizzare direttamente le righe.",
    reviewTitle: "2. Controlla le righe prima di salvarle",
    reviewIntro:
      "In CapiSpot apri Broker, trascina il tuo CSV Revolut nell'area di rilevamento automatico o scegli Revolut e verifica l'anteprima.",
    reviewItems: [
      [
        "Operazioni e dividendi",
        "Verifica date, ticker, quantità, prezzi e dividendi. Le valute originali vengono mantenute.",
      ],
      [
        "Possibili duplicati",
        "Le righe già registrate vengono segnalate e saltate per impostazione predefinita.",
      ],
      [
        "Righe da controllare",
        "Le ricariche di liquidità (Cash top-up) e le voci non operative vengono isolate per la verifica.",
      ],
    ],
    plansTitle: "L'importazione CSV di Revolut è Free. Pro aggiunge i report FIFO.",
    freeTitle: "Free · Importazione CSV Revolut",
    free: "Carica il tuo CSV Revolut, controlla operazioni, dividendi e duplicati nell'anteprima e uniscilo gratis agli altri tuoi broker.",
    proTitle: "Pro · Report annuali FIFO e sincronizzazione di sola lettura",
    pro: "Sblocca i report annuali FIFO su plusvalenze e minusvalenze realizzate e la sincronizzazione API di sola lettura per IBKR Flex e Trading 212.",
    pricing: "Confronta Free e Pro",
    faqTitle: "Prima della tua prima importazione Revolut",
    questions: [
      [
        "Perché l'esempio Revolut mostra un duplicato e una riga da controllare?",
        "Sono inclusi appositamente per mostrare come l'anteprima gestisce duplicati e ricariche di cassa prima del salvataggio.",
      ],
      [
        "Serve una chiave API per importare da Revolut?",
        "No. Esporta semplicemente l'estratto conto CSV dall'app Revolut e caricalo gratuitamente in CapiSpot.",
      ],
      [
        "Posso combinare Revolut con Trading 212 e Interactive Brokers?",
        "Sì. Tutti i conti broker vengono consolidati in un unico portafoglio.",
      ],
    ],
    resultTitle: "3. Apri il tuo portafoglio dopo l'importazione",
    result:
      "Dopo la conferma dell'anteprima, le posizioni e i dividendi Revolut sono subito visibili nel portafoglio.",
    demo: "Vedi un portafoglio di esempio",
    note: "Informazioni generali, non consulenza fiscale o di investimento. CapiSpot non è affiliato con Revolut.",
  },
};

const TITLE = "Import Revolut trades into a portfolio tracker — CapiSpot";
const DESCRIPTION =
  "Import your Revolut investing CSV into one portfolio for free: automatic format detection, original currencies, a preview before saving, and all brokers in one place.";

export const Route = createFileRoute("/revolut-import")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [canonicalLink("/revolut-import")],
    scripts: [articleJsonLd(TITLE, DESCRIPTION, "/revolut-import"), faqJsonLd(GUIDE.en.questions)],
  }),
  component: RevolutImport,
});

function RevolutImport() {
  const { lang } = usePortfolio();
  const g = GUIDE[lang];
  const sampleButton = (
    <Button
      asChild
      className="h-auto min-h-11 whitespace-normal rounded-full px-5 py-3 text-center leading-snug"
    >
      <Link to="/import-demo" search={{ broker: "revolut" }}>
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
            <Link to="/brokers" search={{ broker: "revolut" }}>
              {g.importCta}
            </Link>
          </Button>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{g.sampleNote}</p>
      </header>

      <Card>
        <section aria-labelledby="revolut-export-heading">
          <h2 id="revolut-export-heading" className="font-display text-xl font-semibold">
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
        </section>
      </Card>

      <Card>
        <section aria-labelledby="revolut-review-heading">
          <h2 id="revolut-review-heading" className="font-display text-xl font-semibold">
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

      <section aria-labelledby="revolut-plans-heading" className="space-y-4">
        <h2 id="revolut-plans-heading" className="font-display text-xl font-semibold">
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

      <section aria-labelledby="revolut-faq-heading" className="space-y-4">
        <h2 id="revolut-faq-heading" className="font-display text-xl font-semibold">
          {g.faqTitle}
        </h2>
        {g.questions.map(([question, answer]) => (
          <div key={question}>
            <h3 className="font-semibold">{question}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{answer}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="revolut-result-heading" className="space-y-4">
        <h2 id="revolut-result-heading" className="font-display text-xl font-semibold">
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
      <RelatedGuides current="/revolut-import" />
    </article>
  );
}
