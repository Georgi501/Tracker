import type { Lang } from "./i18n";
type TrustCopy = {
  retry: string;
  quoteFailure: string;
  privacyHint: string;
  fileError: string;
  attribution: string;
  drivers: readonly [string, string, string, string];
  net: string;
  method: string;
  taxNote: string;
  unavailable: string;
  loading: string;
  data: string;
  states: readonly [string, string, string];
  last: string;
  partial: string;
  complete: string;
  manual: string;
  hide: string;
  show: string;
  wizard: string;
  steps: readonly [string, string, string, string];
  chooseAccount: string;
  create: string;
  next: string;
  back: string;
  upload: string;
  preparing: string;
  instructions: Record<string, string>;
  review: string;
  summary: readonly [string, string, string];
};
export const trustCopy: Record<Lang, TrustCopy> = {
  en: {
    retry: "Refresh quotes",
    quoteFailure: "The last refresh failed. Older provider prices may still be shown.",
    privacyHint: "Screen privacy only. Exports retain actual values.",
    fileError:
      "The CSV could not be prepared. Check the file format and use at most 10,000 rows (10 MB).",
    attribution: "Why did my portfolio change?",
    drivers: ["Price change", "Dividends received", "Fees / taxes", "Currency impact"],
    net: "Result including recorded income",
    method:
      "Daily-close arithmetic attribution, not a return percentage. Deposits and withdrawals are excluded from gains. Price/FX interaction is assigned to FX; same-day trading impact to price.",
    taxNote:
      "Recorded fees only. Taxes are not stored separately; unrecorded payouts and taxes are excluded.",
    unavailable:
      "A reliable breakdown is unavailable for this period. Check price history, FX and stock split reconciliation.",
    loading: "Loading verified performance data",
    data: "Data status",
    states: ["Current", "Stale", "Missing"],
    last: "Latest provider price",
    partial:
      "Total value is incomplete: at least one position has no usable valuation. Missing prices are not treated as zero or purchase cost.",
    complete:
      "Available quotes are used for valuation. Current follows the provider freshness policy; it does not mean tick-by-tick live data.",
    manual: "Cash and manually valued assets are not included in quote counts.",
    hide: "Hide monetary values",
    show: "Show monetary values",
    wizard: "Import your first transactions",
    steps: ["Choose broker", "Export instructions", "Review preview", "Import summary"],
    chooseAccount: "Broker account",
    create: "Create this broker account",
    next: "Continue",
    back: "Back",
    upload: "Choose CSV to preview",
    preparing: "Preparing preview…",
    instructions: {
      trading212:
        "Export your account history as CSV, including trades and dividends. Keep the original currency and column headers.",
      ibkr: "Export a CSV activity statement or Flex Query with trades and dividends. Keep symbols, dates, currencies and commissions.",
      revolut:
        "Download a CSV trading statement for the account and period you want to import. Keep the original headers.",
      generic:
        "Use the generic CSV template below. Include ticker, transaction type, date, quantity, price and currency.",
    },
    review:
      "Every row is reviewed before saving. Duplicates are skipped by default; rejected rows require review.",
    summary: ["Added", "Skipped duplicates", "Needs review"],
  },
  bg: {
    retry: "Обнови котировките",
    quoteFailure:
      "Последното обновяване не успя. Възможно е да се показват по-стари цени от доставчика.",
    privacyHint: "Скриване само на екрана. Експортите запазват реалните стойности.",
    fileError:
      "CSV файлът не може да се подготви. Провери формата и използвай до 10 000 реда (10 MB).",
    attribution: "Защо се промени портфолиото ми?",
    drivers: ["Промяна на цените", "Получени дивиденти", "Такси / данъци", "Валутен ефект"],
    net: "Резултат със записаните доходи",
    method:
      "Аритметична разбивка по дневни цени на затваряне, а не процент доходност. Вноските и тегленията не са печалба. Общият ценови/валутен ефект се отнася към валутата, а ефектът от сделки в същия ден — към цената.",
    taxNote:
      "Само записаните такси. Данъците не се съхраняват отделно; незаписаните плащания и данъци не участват.",
    unavailable:
      "Няма надеждна разбивка за този период. Провери историческите цени, валутните курсове и потвърждението на сплитовете.",
    loading: "Зареждане на проверените данни за резултата",
    data: "Състояние на данните",
    states: ["Актуални", "Остарели", "Липсващи"],
    last: "Последна цена от доставчика",
    partial:
      "Общата стойност е непълна: поне една позиция няма използваема оценка. Липсващите цени не се приемат за нула или за покупна цена.",
    complete:
      "Оценката използва наличните котировки. Актуалността следва правилата на доставчика и не означава котировки в реално време за всяка сделка.",
    manual: "Кешът и активите с ръчна оценка не участват в броя котировки.",
    hide: "Скрий паричните стойности",
    show: "Покажи паричните стойности",
    wizard: "Импортирай първите си сделки",
    steps: ["Избери брокер", "Инструкции за експорт", "Прегледай файла", "Резултат от импорта"],
    chooseAccount: "Брокерска сметка",
    create: "Създай тази брокерска сметка",
    next: "Продължи",
    back: "Назад",
    upload: "Избери CSV за преглед",
    preparing: "Подготовка на прегледа…",
    instructions: {
      trading212:
        "Експортирай историята на сметката като CSV със сделки и дивиденти. Запази оригиналната валута и заглавията на колоните.",
      ibkr: "Експортирай CSV Activity Statement или Flex Query със сделки и дивиденти. Запази символите, датите, валутите и комисионите.",
      revolut:
        "Изтегли CSV извлечение за инвестиционната сметка и периода за импорт. Запази оригиналните заглавия.",
      generic:
        "Използвай общия CSV шаблон по-долу. Включи тикер, вид сделка, дата, количество, цена и валута.",
    },
    review:
      "Всеки ред се преглежда преди запис. Дубликатите се пропускат по подразбиране; отхвърлените редове изискват проверка.",
    summary: ["Добавени", "Пропуснати дубликати", "За проверка"],
  },
  de: {
    retry: "Kurse aktualisieren",
    quoteFailure:
      "Die letzte Aktualisierung ist fehlgeschlagen. Ältere Kurse können noch angezeigt werden.",
    privacyHint: "Nur Bildschirmansicht. Exporte behalten die echten Werte.",
    fileError:
      "CSV konnte nicht vorbereitet werden. Format prüfen; höchstens 10.000 Zeilen (10 MB).",
    attribution: "Warum hat sich mein Portfolio verändert?",
    drivers: ["Kursänderung", "Erhaltene Dividenden", "Gebühren / Steuern", "Währungseffekt"],
    net: "Ergebnis mit erfassten Erträgen",
    method:
      "Arithmetische Aufteilung anhand täglicher Schlusskurse, keine Rendite in Prozent. Ein- und Auszahlungen sind keine Gewinne. Kurs-/FX-Wechselwirkung zählt zu FX, Tageshandel zum Kurseffekt.",
    taxNote:
      "Nur erfasste Gebühren. Steuern werden nicht separat gespeichert; nicht erfasste Zahlungen und Steuern sind ausgeschlossen.",
    unavailable:
      "Keine verlässliche Aufteilung für diesen Zeitraum. Kursverlauf, Wechselkurse und Aktiensplits prüfen.",
    loading: "Geprüfte Performancedaten werden geladen",
    data: "Datenstatus",
    states: ["Aktuell", "Veraltet", "Fehlend"],
    last: "Letzter Kurs des Anbieters",
    partial:
      "Gesamtwert unvollständig: Mindestens eine Position hat keine nutzbare Bewertung. Fehlende Kurse werden weder als null noch als Kaufpreis ersetzt.",
    complete:
      "Bewertung anhand verfügbarer Kurse. Aktualität folgt der Anbieterregel und bedeutet keine Tick-Echtzeitdaten.",
    manual: "Bargeld und manuell bewertete Anlagen sind nicht in den Kurszahlen enthalten.",
    hide: "Geldwerte verbergen",
    show: "Geldwerte anzeigen",
    wizard: "Erste Transaktionen importieren",
    steps: ["Broker wählen", "Exportanleitung", "Vorschau prüfen", "Importergebnis"],
    chooseAccount: "Brokerkonto",
    create: "Dieses Brokerkonto erstellen",
    next: "Weiter",
    back: "Zurück",
    upload: "CSV zur Vorschau wählen",
    preparing: "Vorschau wird vorbereitet…",
    instructions: {
      trading212:
        "Kontohistorie als CSV mit Trades und Dividenden exportieren. Originalwährung und Spaltenüberschriften beibehalten.",
      ibkr: "CSV Activity Statement oder Flex Query mit Trades und Dividenden exportieren. Symbole, Daten, Währungen und Gebühren beibehalten.",
      revolut:
        "CSV-Handelsauszug für Konto und Zeitraum herunterladen. Originalüberschriften beibehalten.",
      generic:
        "Die allgemeine CSV-Vorlage unten verwenden: Ticker, Transaktionstyp, Datum, Menge, Preis und Währung.",
    },
    review:
      "Jede Zeile vor dem Speichern prüfen. Duplikate werden standardmäßig übersprungen; abgelehnte Zeilen erfordern Prüfung.",
    summary: ["Hinzugefügt", "Duplikate übersprungen", "Zu prüfen"],
  },
  es: {
    retry: "Actualizar cotizaciones",
    quoteFailure: "Falló la última actualización. Pueden mostrarse precios anteriores.",
    privacyHint: "Solo privacidad en pantalla. Las exportaciones conservan los valores reales.",
    fileError: "No se pudo preparar el CSV. Revisa el formato; máximo 10.000 filas (10 MB).",
    attribution: "¿Por qué cambió mi cartera?",
    drivers: [
      "Cambio de precio",
      "Dividendos recibidos",
      "Comisiones / impuestos",
      "Efecto de divisa",
    ],
    net: "Resultado con ingresos registrados",
    method:
      "Desglose aritmético con cierres diarios, no un porcentaje de rentabilidad. Los ingresos y retiros de capital no son ganancias. La interacción precio/divisa se asigna a divisa; las operaciones del día al precio.",
    taxNote:
      "Solo comisiones registradas. Los impuestos no se guardan por separado; se excluyen pagos e impuestos no registrados.",
    unavailable:
      "No hay un desglose fiable para este período. Revisa precios históricos, divisas y splits.",
    loading: "Cargando datos de rendimiento verificados",
    data: "Estado de datos",
    states: ["Actuales", "Antiguos", "Faltantes"],
    last: "Último precio del proveedor",
    partial:
      "Valor total incompleto: alguna posición no tiene valoración utilizable. Los precios faltantes no se sustituyen por cero ni por el coste.",
    complete:
      "Se usan las cotizaciones disponibles. La vigencia sigue la política del proveedor y no significa datos en tiempo real por operación.",
    manual: "El efectivo y los activos valorados manualmente no se incluyen en los recuentos.",
    hide: "Ocultar importes",
    show: "Mostrar importes",
    wizard: "Importa tus primeras operaciones",
    steps: [
      "Elegir bróker",
      "Instrucciones de exportación",
      "Revisar vista previa",
      "Resumen de importación",
    ],
    chooseAccount: "Cuenta de bróker",
    create: "Crear esta cuenta de bróker",
    next: "Continuar",
    back: "Atrás",
    upload: "Elegir CSV para revisar",
    preparing: "Preparando vista previa…",
    instructions: {
      trading212:
        "Exporta el historial de la cuenta como CSV con operaciones y dividendos. Conserva moneda y encabezados originales.",
      ibkr: "Exporta un Activity Statement o Flex Query CSV con operaciones y dividendos. Conserva símbolos, fechas, divisas y comisiones.",
      revolut:
        "Descarga un extracto CSV de la cuenta y período deseados. Conserva los encabezados originales.",
      generic: "Usa la plantilla CSV inferior: símbolo, tipo, fecha, cantidad, precio y moneda.",
    },
    review:
      "Revisa cada fila antes de guardar. Los duplicados se omiten por defecto; las filas rechazadas requieren revisión.",
    summary: ["Añadidas", "Duplicados omitidos", "Por revisar"],
  },
  it: {
    retry: "Aggiorna quotazioni",
    quoteFailure:
      "Ultimo aggiornamento non riuscito. Potrebbero essere mostrati prezzi precedenti.",
    privacyHint: "Solo privacy sullo schermo. Le esportazioni mantengono i valori reali.",
    fileError: "Impossibile preparare il CSV. Controlla il formato; massimo 10.000 righe (10 MB).",
    attribution: "Perché è cambiato il portafoglio?",
    drivers: [
      "Variazione del prezzo",
      "Dividendi ricevuti",
      "Commissioni / imposte",
      "Effetto valutario",
    ],
    net: "Risultato con redditi registrati",
    method:
      "Scomposizione aritmetica con chiusure giornaliere, non una percentuale di rendimento. Versamenti e prelievi non sono guadagni. L’interazione prezzo/valuta va alla valuta; le operazioni del giorno al prezzo.",
    taxNote:
      "Solo commissioni registrate. Le imposte non sono salvate separatamente; pagamenti e imposte non registrati sono esclusi.",
    unavailable:
      "Nessuna scomposizione affidabile per il periodo. Verifica prezzi storici, cambi e frazionamenti.",
    loading: "Caricamento dei dati di rendimento verificati",
    data: "Stato dei dati",
    states: ["Attuali", "Obsoleti", "Mancanti"],
    last: "Ultimo prezzo del fornitore",
    partial:
      "Valore totale incompleto: almeno una posizione non ha una valutazione utilizzabile. I prezzi mancanti non diventano zero o costo di acquisto.",
    complete:
      "Valutazione con quotazioni disponibili. L’attualità segue la politica del fornitore e non significa dati tick in tempo reale.",
    manual: "Liquidità e attività valutate manualmente non sono incluse nei conteggi.",
    hide: "Nascondi importi",
    show: "Mostra importi",
    wizard: "Importa le prime operazioni",
    steps: [
      "Scegli broker",
      "Istruzioni di esportazione",
      "Controlla anteprima",
      "Riepilogo importazione",
    ],
    chooseAccount: "Conto broker",
    create: "Crea questo conto broker",
    next: "Continua",
    back: "Indietro",
    upload: "Scegli CSV da controllare",
    preparing: "Preparazione anteprima…",
    instructions: {
      trading212:
        "Esporta la cronologia del conto in CSV con operazioni e dividendi. Mantieni valuta e intestazioni originali.",
      ibkr: "Esporta un Activity Statement o Flex Query CSV con operazioni e dividendi. Mantieni simboli, date, valute e commissioni.",
      revolut:
        "Scarica un estratto CSV del conto e periodo desiderati. Mantieni le intestazioni originali.",
      generic: "Usa il modello CSV qui sotto: simbolo, tipo, data, quantità, prezzo e valuta.",
    },
    review:
      "Controlla ogni riga prima di salvare. I duplicati sono saltati per impostazione predefinita; le righe rifiutate richiedono verifica.",
    summary: ["Aggiunte", "Duplicati saltati", "Da verificare"],
  },
};
