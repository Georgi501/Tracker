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
    title: "Import your Trading 212 CSV into CapiSpot",
    intro:
      "Turn your transaction history into a portfolio you can follow. Try the Trading 212 sample first, then import your own trades and dividends with a preview before saving.",
    sampleCta: "Try a Trading 212 CSV — no account needed",
    importCta: "I already have a CSV",
    sampleNote:
      "The sample stays in your browser. No broker connection or account is needed to try it.",
    exportTitle: "1. Download your Trading 212 transaction history",
    exportSteps: [
      "Open the menu in Trading 212 and go to History.",
      "Use the export control and choose the period and activity types you need, including orders and dividends.",
      "Download the CSV to your device. Keep its original column headers and currencies.",
      "Include the history from your first purchase. If it takes several exports, review the date ranges so earlier trades are not missed.",
    ],
    exportNote:
      "Use the transaction-history CSV, rather than a PDF statement or a pie/holdings export. Those are different file formats.",
    source: "Trading 212’s official export instructions",
    newTab: "opens in a new tab",
    reviewTitle: "2. Review the rows before adding them",
    reviewIntro:
      "In CapiSpot, open Brokers, choose Trading 212, create or select its broker account and choose your CSV. Check the preview before confirming the import.",
    reviewItems: [
      [
        "Trades and dividends",
        "Review the dates, tickers, quantities, prices and fees. Original currencies remain visible in the preview.",
      ],
      [
        "Possible duplicates",
        "Rows already recorded are skipped by default. Review a flagged row before choosing to include it.",
      ],
      [
        "Rows that need attention",
        "Unsupported actions, such as interest on cash, and incomplete rows are listed for review instead of silently becoming trades.",
      ],
    ],
    plansTitle: "CSV import is Free. Direct sync is Pro.",
    freeTitle: "Free · CSV import",
    free: "Upload a compatible CSV, review the transactions and duplicates, then confirm the import. To leave out a new row, correct the CSV and upload it again.",
    proTitle: "Pro · Read-only sync and FIFO reports",
    pro: "Connect a read-only Trading 212 API for trades and dividends. Annual FIFO reports of realized gains and losses are also Pro features.",
    pricing: "Compare Free and Pro",
    faqTitle: "Before your first import",
    questions: [
      [
        "Why does the sample show a duplicate and a row to review?",
        "They are deliberately included so you can see how the preview handles them. They do not mean the sample file failed.",
      ],
      [
        "Do I need a Trading 212 API key?",
        "Not for a CSV import. Download your history from Trading 212 and upload the file. The read-only API connection is a separate Pro option.",
      ],
      [
        "When are my transactions saved?",
        "The sample does not save portfolio data. Your own import requires a CapiSpot account, and transactions are saved when you confirm the preview.",
      ],
    ],
    resultTitle: "3. Open your portfolio after import",
    result:
      "The import summary shows what was added, skipped or needs review. Use View holdings to open your positions, or explore an example portfolio before signing up.",
    demo: "See an example portfolio",
    note: "General information, not tax or investment advice. CapiSpot is not affiliated with Trading 212.",
  },
  bg: {
    title: "Импортирай своя Trading 212 CSV в CapiSpot",
    intro:
      "Превърни историята на сделките си в портфолио, което можеш да следиш. Първо пробвай примера за Trading 212, после импортирай своите сделки и дивиденти с преглед преди запис.",
    sampleCta: "Пробвай Trading 212 CSV — без акаунт",
    importCta: "Вече имам CSV файл",
    sampleNote: "Примерът остава в браузъра. За пробата не са нужни акаунт или връзка с брокера.",
    exportTitle: "1. Изтегли историята си от Trading 212",
    exportSteps: [
      "Отвори менюто в Trading 212 и избери History (История).",
      "Избери експорта, периода и видовете записи, включително поръчките и дивидентите.",
      "Изтегли CSV файла на устройството си. Запази оригиналните заглавия на колоните и валутите.",
      "Включи историята от първата покупка. Ако са нужни няколко файла, провери периодите, за да не пропуснеш ранни сделки.",
    ],
    exportNote:
      "Използвай CSV с историята на сделките, а не PDF извлечение или експорт на пай/позиции. Те са в различен формат.",
    source: "Официалните инструкции за експорт на Trading 212",
    newTab: "отваря се в нов раздел",
    reviewTitle: "2. Прегледай редовете преди запис",
    reviewIntro:
      "В CapiSpot отвори „Брокери“, избери Trading 212, създай или избери брокерската сметка и посочи CSV файла. Провери прегледа, преди да потвърдиш импорта.",
    reviewItems: [
      [
        "Сделки и дивиденти",
        "Провери датите, тикерите, количествата, цените и таксите. Оригиналните валути остават видими в прегледа.",
      ],
      [
        "Възможни дубликати",
        "Вече записаните редове се пропускат по подразбиране. Прегледай отбелязания ред, преди да избереш да го включиш.",
      ],
      [
        "Редове за проверка",
        "Неподдържаните действия, например лихви по свободни средства, и непълните редове се показват за проверка, вместо да се превръщат в сделки.",
      ],
    ],
    plansTitle: "CSV импортът е Free. Директната връзка е Pro.",
    freeTitle: "Free · CSV импорт",
    free: "Качи съвместим CSV, прегледай транзакциите и дубликатите, после потвърди импорта. За да изключиш нов ред, коригирай CSV файла и го качи отново.",
    proTitle: "Pro · Връзка само за четене и FIFO справки",
    pro: "Свържи Trading 212 чрез API само за четене на сделки и дивиденти. Годишните FIFO справки за реализирани печалби и загуби също са Pro функции.",
    pricing: "Сравни Free и Pro",
    faqTitle: "Преди първия импорт",
    questions: [
      [
        "Защо примерът има дубликат и ред за проверка?",
        "Те са добавени умишлено, за да видиш как прегледът ги обработва. Това не означава, че примерният файл е неуспешен.",
      ],
      [
        "Нужен ли е API ключ от Trading 212?",
        "Не и за CSV импорт. Изтегли историята от Trading 212 и качи файла. API връзката само за четене е отделна Pro възможност.",
      ],
      [
        "Кога се записват транзакциите ми?",
        "Примерът не записва данни за портфолио. За собствен импорт е нужен CapiSpot акаунт, а транзакциите се записват при потвърждение на прегледа.",
      ],
    ],
    resultTitle: "3. Отвори портфолиото след импорта",
    result:
      "Обобщението показва добавените и пропуснатите редове и тези за проверка. Отвори позициите си от бутона в обобщението или разгледай примерно портфолио преди регистрация.",
    demo: "Виж примерно портфолио",
    note: "Обща информация, не е данъчен или инвестиционен съвет. CapiSpot не е свързан с Trading 212.",
  },
  de: {
    title: "Trading 212 CSV in CapiSpot importieren",
    intro:
      "Verwandle deine Transaktionshistorie in ein übersichtliches Portfolio. Teste zuerst die Trading-212-Beispieldatei und importiere danach deine eigenen Trades und Dividenden mit Vorschau.",
    sampleCta: "Trading 212 CSV testen — ohne Konto",
    importCta: "Ich habe bereits eine CSV-Datei",
    sampleNote:
      "Das Beispiel bleibt in deinem Browser. Zum Testen sind kein Konto und keine Broker-Verbindung nötig.",
    exportTitle: "1. Transaktionshistorie aus Trading 212 herunterladen",
    exportSteps: [
      "Öffne das Menü in Trading 212 und gehe zu Verlauf (History).",
      "Wähle den Export, den Zeitraum und die gewünschten Aktivitätstypen einschließlich Orders und Dividenden.",
      "Lade die CSV-Datei herunter und behalte die originalen Spaltenüberschriften und Währungen bei.",
      "Schließe die Historie ab dem ersten Kauf ein. Bei mehreren Exporten prüfe die Zeiträume, damit keine frühen Käufe fehlen.",
    ],
    exportNote:
      "Verwende den CSV-Transaktionsverlauf statt eines PDF-Kontoauszugs oder Pie-Exports.",
    source: "Offizielle Export-Anleitung von Trading 212",
    newTab: "öffnet in neuem Tab",
    reviewTitle: "2. Zeilen vor dem Speichern prüfen",
    reviewIntro:
      "Öffne in CapiSpot den Bereich Broker, wähle Trading 212, erstelle oder wähle das Konto und lade deine CSV hoch. Prüfe die Vorschau vor dem Bestätigen.",
    reviewItems: [
      [
        "Trades und Dividenden",
        "Prüfe Datum, Ticker, Stückzahl, Kurse und Gebühren. Originalwährungen bleiben in der Vorschau sichtbar.",
      ],
      [
        "Mögliche Duplikate",
        "Bereits erfasste Zeilen werden standardmäßig übersprungen. Prüfe markierte Zeilen vor einer Auswahl.",
      ],
      [
        "Zu prüfende Zeilen",
        "Nicht unterstützte Einträge wie Zinsen auf Guthaben sowie unvollständige Zeilen werden separat ausgewiesen.",
      ],
    ],
    plansTitle: "CSV-Import ist Free. Direkter Sync ist Pro.",
    freeTitle: "Free · CSV-Import",
    free: "Lade eine kompatible CSV hoch, prüfe Transaktionen und Duplikate und bestätige den Import kostenlos.",
    proTitle: "Pro · Read-only-Sync und FIFO-Berichte",
    pro: "Verbinde einen Read-only Trading 212 API-Schlüssel für Trades und Dividenden. Jährliche FIFO-Berichte über realisierte Gewinne und Verluste sind ebenfalls Teil von Pro.",
    pricing: "Free und Pro vergleichen",
    faqTitle: "Vor deinem ersten Import",
    questions: [
      [
        "Warum zeigt das Beispiel ein Duplikat und eine zu prüfende Zeile?",
        "Sie sind absichtlich enthalten, damit du siehst, wie die Vorschau sie behandelt.",
      ],
      [
        "Brauche ich einen Trading 212 API-Schlüssel?",
        "Nicht für den CSV-Import. Der Read-only API-Sync ist eine separate Pro-Option.",
      ],
      [
        "Wann werden meine Transaktionen gespeichert?",
        "Das Beispiel speichert keine Daten. Dein eigener Import wird erst gespeichert, wenn du die Vorschau bestätigst.",
      ],
    ],
    resultTitle: "3. Portfolio nach dem Import öffnen",
    result:
      "Die Importübersicht zeigt hinzugefügte, übersprungene und zu prüfende Zeilen. Öffne danach deine Positionen oder sieh dir ein Beispielportfolio an.",
    demo: "Beispielportfolio ansehen",
    note: "Allgemeine Informationen, keine Steuer- oder Anlageberatung. CapiSpot ist nicht mit Trading 212 verbunden.",
  },
  es: {
    title: "Importa tu CSV de Trading 212 en CapiSpot",
    intro:
      "Convierte tu historial de operaciones en una cartera fácil de seguir. Prueba primero el ejemplo de Trading 212 y luego importa tus propias operaciones y dividendos con vista previa.",
    sampleCta: "Probar CSV de Trading 212 — sin cuenta",
    importCta: "Ya tengo un archivo CSV",
    sampleNote:
      "El ejemplo permanece en tu navegador. No necesitas cuenta ni conexión con el bróker para probarlo.",
    exportTitle: "1. Descarga tu historial de Trading 212",
    exportSteps: [
      "Abre el menú en Trading 212 y entra en Historial (History).",
      "Elige la opción de exportación, el período y los tipos de actividad, incluyendo órdenes y dividendos.",
      "Descarga el archivo CSV conservando los encabezados y divisas originales.",
      "Incluye el historial desde tu primera compra para no omitir operaciones antiguas.",
    ],
    exportNote:
      "Usa el CSV del historial de transacciones en lugar de un extracto PDF o exportación de pies.",
    source: "Instrucciones oficiales de exportación de Trading 212",
    newTab: "se abre en una pestaña nueva",
    reviewTitle: "2. Revisa las filas antes de guardarlas",
    reviewIntro:
      "En CapiSpot, abre Brokers, elige Trading 212, selecciona la cuenta y sube tu CSV. Revisa la vista previa antes de confirmar.",
    reviewItems: [
      [
        "Operaciones y dividendos",
        "Comprueba fechas, tickers, cantidades, precios y comisiones. Las divisas originales permanecen visibles.",
      ],
      [
        "Posibles duplicados",
        "Las filas ya registradas se omiten por defecto. Revisa cualquier fila marcada antes de incluirla.",
      ],
      [
        "Filas por revisar",
        "Acciones no compatibles, como intereses sobre efectivo, y filas incompletas se muestran por separado.",
      ],
    ],
    plansTitle: "La importación CSV es Free. La sincronización directa es Pro.",
    freeTitle: "Free · Importación CSV",
    free: "Sube un CSV compatible, revisa las operaciones y duplicados y confirma la importación gratis.",
    proTitle: "Pro · Sincronización de solo lectura e informes FIFO",
    pro: "Conecta una API de Trading 212 de solo lectura para operaciones y dividendos, además de informes anuales FIFO.",
    pricing: "Comparar Free y Pro",
    faqTitle: "Antes de tu primera importación",
    questions: [
      [
        "¿Por qué el ejemplo muestra un duplicado y una fila por revisar?",
        "Están incluidos deliberadamente para mostrar cómo los gestiona la vista previa.",
      ],
      [
        "¿Necesito una clave API de Trading 212?",
        "No para importar un CSV. La conexión API de solo lectura es una opción Pro independiente.",
      ],
      [
        "¿Cuándo se guardan mis operaciones?",
        "El ejemplo no guarda datos. Tu importación se guarda únicamente al confirmar la vista previa.",
      ],
    ],
    resultTitle: "3. Abre tu cartera después de importar",
    result:
      "El resumen muestra lo añadido, omitido o pendiente de revisión. Abre tus posiciones o explora una cartera de ejemplo.",
    demo: "Ver una cartera de ejemplo",
    note: "Información general, no asesoramiento fiscal ni de inversión. CapiSpot no está afiliado a Trading 212.",
  },
  it: {
    title: "Importa il tuo CSV di Trading 212 in CapiSpot",
    intro:
      "Trasforma lo storico delle tue operazioni in un portafoglio chiaro. Prova prima il file di esempio Trading 212 e poi importa operazioni e dividendi con anteprima.",
    sampleCta: "Prova un CSV Trading 212 — senza account",
    importCta: "Ho già un file CSV",
    sampleNote:
      "L'esempio resta nel tuo browser. Non servono account o collegamenti al broker per provarlo.",
    exportTitle: "1. Scarica lo storico transazioni da Trading 212",
    exportSteps: [
      "Apri il menu in Trading 212 e vai su Cronologia (History).",
      "Scegli l'esportazione, il periodo e i tipi di attività, inclusi ordini e dividendi.",
      "Scarica il file CSV mantenendo intestazioni e valute originali.",
      "Includi lo storico dal primo acquisto per non perdere le operazioni iniziali.",
    ],
    exportNote:
      "Usa il CSV dello storico transazioni anziché un estratto conto PDF o un'esportazione delle torte (Pie).",
    source: "Istruzioni ufficiali di esportazione di Trading 212",
    newTab: "si apre in una nuova scheda",
    reviewTitle: "2. Controlla le righe prima di salvarle",
    reviewIntro:
      "In CapiSpot apri Broker, scegli Trading 212, seleziona il conto e carica il CSV. Verifica l'anteprima prima di confermare.",
    reviewItems: [
      [
        "Operazioni e dividendi",
        "Controlla date, ticker, quantità, prezzi e commissioni. Le valute originali restano visibili nell'anteprima.",
      ],
      [
        "Possibili duplicati",
        "Le righe già registrate vengono ignorate per impostazione predefinita.",
      ],
      [
        "Righe da controllare",
        "Voci non supportate, come interessi sulla liquidità, e righe incomplete vengono elencate separatamente.",
      ],
    ],
    plansTitle: "L'importazione CSV è Free. La sincronizzazione diretta è Pro.",
    freeTitle: "Free · Importazione CSV",
    free: "Carica un CSV compatibile, controlla operazioni e duplicati e conferma l'importazione gratuitamente.",
    proTitle: "Pro · Sincronizzazione di sola lettura e report FIFO",
    pro: "Collega un'API Trading 212 di sola lettura per operazioni e dividendi e sblocca i report annuali FIFO.",
    pricing: "Confronta Free e Pro",
    faqTitle: "Prima della tua prima importazione",
    questions: [
      [
        "Perché l'esempio mostra un duplicato e una riga da controllare?",
        "Sono inclusi intenzionalmente per mostrare come vengono gestiti nell'anteprima.",
      ],
      [
        "Serve una chiave API di Trading 212?",
        "Non per l'importazione CSV. La connessione API di sola lettura è un'opzione Pro separata.",
      ],
      [
        "Quando vengono salvate le mie transazioni?",
        "L'esempio non salva dati. Le tue operazioni vengono salvate solo quando confermi l'anteprima.",
      ],
    ],
    resultTitle: "3. Apri il portafoglio dopo l'importazione",
    result:
      "Il riepilogo mostra le righe aggiunte, ignorate o da verificare. Apri le tue posizioni o esplora un portafoglio di esempio.",
    demo: "Vedi un portafoglio di esempio",
    note: "Informazioni generali, non consulenza fiscale o d'investimento. CapiSpot non è affiliato a Trading 212.",
  },
};

const TITLE = "Trading 212 CSV Import & Portfolio Tracker | CapiSpot";
const DESCRIPTION =
  "Import your Trading 212 CSV for free. Preview trades and dividends, check duplicates, then save to your portfolio. Try a sample without an account.";

export const Route = createFileRoute("/trading212-import")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [canonicalLink("/trading212-import")],
    scripts: [
      articleJsonLd(TITLE, DESCRIPTION, "/trading212-import"),
      faqJsonLd(GUIDE.en.questions),
    ],
  }),
  component: Trading212Import,
});

function Trading212Import() {
  const { lang } = usePortfolio();
  const g = GUIDE[lang];
  const sampleButton = (
    <Button
      asChild
      className="h-auto min-h-11 whitespace-normal rounded-full px-5 py-3 text-center leading-snug"
    >
      <Link to="/import-demo" search={{ broker: "trading212" }}>
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
            <Link to="/brokers" search={{ broker: "trading212" }}>
              {g.importCta}
            </Link>
          </Button>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{g.sampleNote}</p>
      </header>

      <Card>
        <section aria-labelledby="trading212-export-heading">
          <h2 id="trading212-export-heading" className="font-display text-xl font-semibold">
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
            href="https://helpcentre.trading212.com/hc/en-us/articles/360016898917-Can-I-export-the-trading-data-from-my-account"
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
        <section aria-labelledby="trading212-review-heading">
          <h2 id="trading212-review-heading" className="font-display text-xl font-semibold">
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

      <section aria-labelledby="trading212-plans-heading" className="space-y-4">
        <h2 id="trading212-plans-heading" className="font-display text-xl font-semibold">
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

      <section aria-labelledby="trading212-faq-heading" className="space-y-4">
        <h2 id="trading212-faq-heading" className="font-display text-xl font-semibold">
          {g.faqTitle}
        </h2>
        {g.questions.map(([question, answer]) => (
          <div key={question}>
            <h3 className="font-semibold">{question}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{answer}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="trading212-result-heading" className="space-y-4">
        <h2 id="trading212-result-heading" className="font-display text-xl font-semibold">
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
      <RelatedGuides current="/trading212-import" />
    </article>
  );
}
