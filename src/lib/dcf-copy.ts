import type { Lang } from "./i18n";
export type Copy = {
  ticker: string;
  calc: string;
  bear: string;
  base: string;
  bull: string;
  intrinsic: string;
  price: string;
  under: string;
  over: string;
  growth: string;
  discount: string;
  terminal: string;
  na: string;
  loading: string;
  explain: (g: string, n: string) => string;
  sliderHelp: Record<"growth" | "discount" | "terminal", string>;
  gateDescription: string;
  disclaimer: string;
  providerError: string;
  noData: string;
  incompleteData: string;
  currencyMismatch: string;
  assumptions: string;
  dataSource: string;
  fetchedAt: string;
  priceAsOf: string;
  unknownDate: string;
  terminalShare: string;
  sensitivity: string;
  growthAxis: string;
  discountAxis: string;
  revenueProxy: string;
  defaultGrowth: string;
  noPositiveValue: string;
  retry: string;
  invalidTicker: string;
  stalePrice: string;
  missingPriceTime: string;
  terminalWarning: string;
  fcfLabel: string;
  fcfPeriod: string;
  operatingCashFlow: string;
  capitalExpenditure: string;
  fcfDefinition: string;
  cashLabel: string;
  debtLabel: string;
  sharesLabel: string;
  equityOnly: string;
};

export const dcfCopy: Record<Lang, Copy> = {
  en: {
    ticker: "Ticker, e.g. ADBE",
    calc: "Calculate",
    bear: "Bear case",
    base: "Base case",
    bull: "Bull case",
    intrinsic: "DCF estimate",
    price: "Price",
    under: "Undervalued by",
    over: "Overvalued by",
    growth: "FCF growth / yr",
    discount: "Discount rate (assumption)",
    terminal: "Terminal growth",
    na: "DCF is not applicable: positive free cash flow or share data is missing.",
    loading: "Loading real financials…",
    explain: (g, n) =>
      `Simplified year-end DCF: ${n}'s free cash flow grows ${g} annually for five years, then at the terminal rate. Cash is added and debt subtracted.`,
    sliderHelp: {
      growth: "Your assumed annual free-cash-flow growth for the next five years.",
      discount:
        "The return used to discount future cash flows to today's value; a higher rate lowers estimated value.",
      terminal: "Assumed annual growth after year five; keep it below the discount rate.",
    },
    gateDescription:
      "Build bear, base and bull DCF scenarios from real company financials and assumptions you control.",
    disclaimer:
      "Simplified year-end model; it does not forecast dilution or company-specific risks. Not a forecast or investment advice.",
    providerError: "Financial data could not be loaded. Please try again.",
    noData: "No usable DCF fundamentals are available for this symbol.",
    incompleteData:
      "A valuation is withheld because required financial inputs are missing or invalid.",
    currencyMismatch:
      "Financials and share price use different or unknown currencies; valuation is withheld.",
    assumptions: "Model assumptions",
    dataSource: "Source: Yahoo Finance; latest reported fundamentals available to the provider.",
    fetchedAt: "Data retrieved",
    priceAsOf: "Market price timestamp",
    unknownDate: "Timestamp unavailable",
    terminalShare: "Terminal value share of operating value",
    sensitivity: "Sensitivity analysis · value per share",
    growthAxis: "FCF growth",
    discountAxis: "Discount rate",
    revenueProxy:
      "Starting growth assumption uses reported revenue growth as a proxy, not historical FCF growth.",
    defaultGrowth:
      "No revenue-growth input is available; a 5% starting assumption is used. Adjust it before relying on the result.",
    noPositiveValue:
      "The assumptions imply no positive equity value per share; the market comparison is omitted.",
    retry: "Try again",
    invalidTicker: "Enter a valid ticker symbol.",
    stalePrice:
      "The market quote is older than four days; comparison is hidden until a fresh quote is available.",
    missingPriceTime: "No usable timestamped market quote is available; comparison is hidden.",
    terminalWarning:
      "A large share of this estimate comes from the terminal value, so it is especially sensitive to long-term assumptions.",
    fcfLabel: "Annual free cash flow",
    fcfPeriod: "Reporting period ended",
    operatingCashFlow: "Operating cash flow",
    capitalExpenditure: "Capital expenditures",
    fcfDefinition: "Free cash flow = operating cash flow − capital expenditures.",
    cashLabel: "Cash",
    debtLabel: "Debt",
    sharesLabel: "Shares outstanding",
    equityOnly:
      "This simplified DCF model is for individual listed companies, not ETFs or other instruments.",
  },
  bg: {
    ticker: "Тикер, напр. ADBE",
    calc: "Изчисли",
    bear: "Песимистичен",
    base: "Базов",
    bull: "Оптимистичен",
    intrinsic: "DCF оценка",
    price: "Цена",
    under: "Подценена с",
    over: "Надценена с",
    growth: "Ръст на FCF / год.",
    discount: "Дисконтов процент (допускане)",
    terminal: "Терминален ръст",
    na: "DCF не е приложим: липсва положителен свободен паричен поток или данни за акциите.",
    loading: "Зареждане на реални финансови данни…",
    explain: (g, n) =>
      `Опростен DCF с потоци в края на годината: свободният паричен поток на ${n} расте с ${g} годишно за пет години, после с терминалния темп. Кешът се добавя, а дългът се приспада.`,
    sliderHelp: {
      growth: "Предполагаемият годишен ръст на свободния паричен поток през следващите пет години.",
      discount:
        "Процентът, с който бъдещите потоци се преизчисляват към днешна стойност; по-висок процент намалява оценката.",
      terminal:
        "Предполагаемият годишен ръст след петата година; трябва да е под дисконтовия процент.",
    },
    gateDescription:
      "Изгради песимистичен, базов и оптимистичен DCF сценарий по реални финансови данни и твои допускания.",
    disclaimer:
      "Опростен модел с потоци в края на годината; не прогнозира разводняване на акциите или специфичните рискове на компанията. Не е прогноза или инвестиционен съвет.",
    providerError: "Финансовите данни не се заредиха. Опитай отново.",
    noData: "Няма използваеми DCF финансови данни за този символ.",
    incompleteData:
      "Оценка не се показва, защото липсват задължителни или валидни финансови данни.",
    currencyMismatch:
      "Финансовите данни и цената са в различни или неизвестни валути; оценката е скрита.",
    assumptions: "Допускания на модела",
    dataSource:
      "Източник: Yahoo Finance; последните налични за доставчика отчетни финансови данни.",
    fetchedAt: "Данните са получени",
    priceAsOf: "Час на пазарната цена",
    unknownDate: "Няма наличен час",
    terminalShare: "Дял на терминалната стойност от оперативната стойност",
    sensitivity: "Анализ на чувствителността · стойност на акция",
    growthAxis: "Ръст на FCF",
    discountAxis: "Дисконтов процент",
    revenueProxy:
      "Началното допускане за ръст използва отчетения ръст на приходите като ориентир, не исторически ръст на FCF.",
    defaultGrowth:
      "Няма данни за ръста на приходите; използва се начално допускане 5%. Промени го, преди да разчиташ на резултата.",
    noPositiveValue:
      "Допусканията не дават положителна стойност на акция; сравнението с пазара е скрито.",
    retry: "Опитай отново",
    invalidTicker: "Въведи валиден борсов тикер.",
    stalePrice:
      "Пазарната котировка е по-стара от четири дни; сравнението е скрито до получаване на актуална цена.",
    missingPriceTime: "Няма валидна пазарна котировка с времеви печат; сравнението е скрито.",
    terminalWarning:
      "Голяма част от оценката идва от терминалната стойност и затова е особено чувствителна към дългосрочните допускания.",
    fcfLabel: "Годишен свободен паричен поток",
    fcfPeriod: "Отчетен период до",
    operatingCashFlow: "Оперативен паричен поток",
    capitalExpenditure: "Капиталови разходи",
    fcfDefinition: "Свободен паричен поток = оперативен паричен поток − капиталови разходи.",
    cashLabel: "Парични средства",
    debtLabel: "Дълг",
    sharesLabel: "Акции в обращение",
    equityOnly:
      "Опростеният DCF модел е за отделни публични компании, не за ETF-и или други инструменти.",
  },
  de: {
    ticker: "Ticker, z. B. ADBE",
    calc: "Berechnen",
    bear: "Bär-Szenario",
    base: "Basis",
    bull: "Bullen-Szenario",
    intrinsic: "DCF-Schätzung",
    price: "Kurs",
    under: "Unterbewertet um",
    over: "Überbewertet um",
    growth: "FCF-Wachstum / J.",
    discount: "Diskontsatz (Annahme)",
    terminal: "Ewiges Wachstum",
    na: "DCF nicht anwendbar: positiver Free Cashflow oder Aktienanzahl fehlt.",
    loading: "Lade echte Finanzdaten…",
    explain: (g, n) =>
      `Vereinfachtes DCF mit Jahresendwerten: Der Free Cashflow von ${n} wächst fünf Jahre lang jährlich um ${g}, danach mit der Endrate. Barmittel werden addiert und Schulden abgezogen.`,
    sliderHelp: {
      growth: "Angenommenes jährliches Free-Cashflow-Wachstum in den nächsten fünf Jahren.",
      discount:
        "Satz zur Abzinsung künftiger Cashflows auf den heutigen Wert; ein höherer Satz senkt den Schätzwert.",
      terminal:
        "Angenommenes jährliches Wachstum nach Jahr fünf; es muss unter dem Diskontsatz liegen.",
    },
    gateDescription:
      "Erstelle Bären-, Basis- und Bullen-DCF-Szenarien mit echten Unternehmensdaten und eigenen Annahmen.",
    disclaimer:
      "Vereinfachtes Jahresendmodell; Verwässerung und unternehmensspezifische Risiken werden nicht prognostiziert. Keine Prognose oder Anlageberatung.",
    providerError: "Finanzdaten konnten nicht geladen werden. Bitte erneut versuchen.",
    noData: "Für dieses Symbol sind keine verwendbaren DCF-Daten verfügbar.",
    incompleteData:
      "Die Bewertung wird ausgeblendet, da erforderliche Finanzdaten fehlen oder ungültig sind.",
    currencyMismatch:
      "Finanzdaten und Aktienkurs haben unterschiedliche oder unbekannte Währungen; Bewertung ausgeblendet.",
    assumptions: "Modellannahmen",
    dataSource: "Quelle: Yahoo Finance; zuletzt verfügbare gemeldete Fundamentaldaten.",
    fetchedAt: "Daten abgerufen",
    priceAsOf: "Zeitstempel des Marktpreises",
    unknownDate: "Zeitstempel nicht verfügbar",
    terminalShare: "Anteil des Endwerts am operativen Wert",
    sensitivity: "Sensitivitätsanalyse · Wert je Aktie",
    growthAxis: "FCF-Wachstum",
    discountAxis: "Diskontsatz",
    revenueProxy:
      "Die anfängliche Wachstumsannahme nutzt das gemeldete Umsatzwachstum als Näherung, nicht das historische FCF-Wachstum.",
    defaultGrowth:
      "Kein Umsatzwachstum verfügbar; anfängliche Annahme: 5 %. Vor der Verwendung anpassen.",
    noPositiveValue:
      "Die Annahmen ergeben keinen positiven Eigenkapitalwert je Aktie; der Marktvergleich entfällt.",
    retry: "Erneut versuchen",
    invalidTicker: "Bitte ein gültiges Tickersymbol eingeben.",
    stalePrice:
      "Der Marktkurs ist älter als vier Tage; der Vergleich bleibt bis zu einem aktuellen Kurs ausgeblendet.",
    missingPriceTime:
      "Kein gültiger zeitgestempelter Marktkurs verfügbar; der Vergleich bleibt ausgeblendet.",
    terminalWarning:
      "Ein großer Teil der Schätzung stammt aus dem Endwert und reagiert daher besonders empfindlich auf langfristige Annahmen.",
    fcfLabel: "Jährlicher freier Cashflow",
    fcfPeriod: "Berichtszeitraum bis",
    operatingCashFlow: "Operativer Cashflow",
    capitalExpenditure: "Investitionen",
    fcfDefinition: "Free Cashflow = operativer Cashflow − Investitionen.",
    cashLabel: "Barmittel",
    debtLabel: "Schulden",
    sharesLabel: "Ausstehende Aktien",
    equityOnly:
      "Dieses vereinfachte DCF-Modell ist für einzelne börsennotierte Unternehmen gedacht, nicht für ETFs oder andere Instrumente.",
  },
  es: {
    ticker: "Ticker, p. ej. ADBE",
    calc: "Calcular",
    bear: "Pesimista",
    base: "Base",
    bull: "Optimista",
    intrinsic: "Estimación DCF",
    price: "Precio",
    under: "Infravalorada un",
    over: "Sobrevalorada un",
    growth: "Crecimiento FCF / año",
    discount: "Tasa de descuento (supuesto)",
    terminal: "Crecimiento terminal",
    na: "DCF no aplicable: falta flujo de caja libre positivo o datos de acciones.",
    loading: "Cargando datos financieros reales…",
    explain: (g, n) =>
      `DCF simplificado con flujos al cierre del año: el flujo de caja libre de ${n} crece un ${g} anual durante cinco años y luego a la tasa terminal. Se suma el efectivo y se resta la deuda.`,
    sliderHelp: {
      growth: "Crecimiento anual supuesto del flujo de caja libre durante los próximos cinco años.",
      discount:
        "Tasa para descontar los flujos futuros a valor actual; una tasa mayor reduce el valor estimado.",
      terminal:
        "Crecimiento anual supuesto después del quinto año; debe ser inferior a la tasa de descuento.",
    },
    gateDescription:
      "Crea escenarios DCF pesimistas, base y optimistas con datos financieros reales y tus propios supuestos.",
    disclaimer:
      "Modelo simplificado con flujos al cierre del año; no proyecta dilución ni riesgos específicos de la empresa. No es una previsión ni asesoramiento financiero.",
    providerError: "No se pudieron cargar los datos financieros. Inténtalo de nuevo.",
    noData: "No hay datos fundamentales DCF utilizables para este símbolo.",
    incompleteData:
      "Se oculta la valoración porque faltan datos financieros necesarios o no son válidos.",
    currencyMismatch:
      "Los datos financieros y el precio usan divisas distintas o desconocidas; se oculta la valoración.",
    assumptions: "Supuestos del modelo",
    dataSource: "Fuente: Yahoo Finance; últimos datos fundamentales publicados disponibles.",
    fetchedAt: "Datos obtenidos",
    priceAsOf: "Fecha y hora del precio de mercado",
    unknownDate: "Fecha y hora no disponibles",
    terminalShare: "Porcentaje del valor terminal sobre el valor operativo",
    sensitivity: "Análisis de sensibilidad · valor por acción",
    growthAxis: "Crecimiento FCF",
    discountAxis: "Tasa de descuento",
    revenueProxy:
      "El supuesto inicial de crecimiento usa el crecimiento de ingresos publicado como referencia, no el crecimiento histórico del FCF.",
    defaultGrowth:
      "No hay datos de crecimiento de ingresos; se usa un supuesto inicial del 5 %. Ajústalo antes de usar el resultado.",
    noPositiveValue:
      "Los supuestos no producen un valor positivo por acción; se omite la comparación de mercado.",
    retry: "Reintentar",
    invalidTicker: "Introduce un símbolo bursátil válido.",
    stalePrice:
      "La cotización tiene más de cuatro días; se oculta la comparación hasta disponer de un precio actualizado.",
    missingPriceTime:
      "No hay una cotización de mercado válida con fecha y hora; se oculta la comparación.",
    terminalWarning:
      "Una parte importante de la estimación procede del valor terminal y es especialmente sensible a los supuestos a largo plazo.",
    fcfLabel: "Flujo de caja libre anual",
    fcfPeriod: "Período informado hasta",
    operatingCashFlow: "Flujo de caja operativo",
    capitalExpenditure: "Gastos de capital",
    fcfDefinition: "Flujo de caja libre = flujo de caja operativo − gastos de capital.",
    cashLabel: "Efectivo",
    debtLabel: "Deuda",
    sharesLabel: "Acciones en circulación",
    equityOnly:
      "Este modelo DCF simplificado es para empresas cotizadas individuales, no para ETF u otros instrumentos.",
  },
  it: {
    ticker: "Ticker, es. ADBE",
    calc: "Calcola",
    bear: "Pessimista",
    base: "Base",
    bull: "Ottimista",
    intrinsic: "Stima DCF",
    price: "Prezzo",
    under: "Sottovalutata del",
    over: "Sopravvalutata del",
    growth: "Crescita FCF / anno",
    discount: "Tasso di sconto (ipotesi)",
    terminal: "Crescita terminale",
    na: "DCF non applicabile: mancano flusso di cassa libero positivo o dati sulle azioni.",
    loading: "Caricamento dati finanziari reali…",
    explain: (g, n) =>
      `DCF semplificato con flussi a fine anno: il free cash flow di ${n} cresce del ${g} annuo per cinque anni, poi al tasso terminale. Si aggiunge la liquidità e si sottrae il debito.`,
    sliderHelp: {
      growth: "Crescita annua ipotizzata del free cash flow nei prossimi cinque anni.",
      discount:
        "Tasso per attualizzare i flussi futuri al valore odierno; un tasso maggiore riduce il valore stimato.",
      terminal:
        "Crescita annua ipotizzata dopo il quinto anno; deve restare sotto il tasso di sconto.",
    },
    gateDescription:
      "Crea scenari DCF ribassista, base e rialzista con dati finanziari reali e ipotesi personalizzate.",
    disclaimer:
      "Modello semplificato con flussi a fine anno; non prevede diluizione né rischi specifici dell'azienda. Non è una previsione né consulenza finanziaria.",
    providerError: "Impossibile caricare i dati finanziari. Riprova.",
    noData: "Non sono disponibili dati fondamentali DCF utilizzabili per questo simbolo.",
    incompleteData:
      "La valutazione è nascosta perché mancano dati finanziari necessari o non sono validi.",
    currencyMismatch:
      "Dati finanziari e prezzo usano valute diverse o sconosciute; valutazione nascosta.",
    assumptions: "Ipotesi del modello",
    dataSource: "Fonte: Yahoo Finance; ultimi dati fondamentali riportati disponibili.",
    fetchedAt: "Dati recuperati",
    priceAsOf: "Data e ora del prezzo di mercato",
    unknownDate: "Data e ora non disponibili",
    terminalShare: "Quota del valore terminale sul valore operativo",
    sensitivity: "Analisi di sensibilità · valore per azione",
    growthAxis: "Crescita FCF",
    discountAxis: "Tasso di sconto",
    revenueProxy:
      "L'ipotesi iniziale di crescita usa la crescita dei ricavi dichiarata come riferimento, non la crescita storica del FCF.",
    defaultGrowth:
      "Crescita dei ricavi non disponibile; ipotesi iniziale del 5%. Modificala prima di usare il risultato.",
    noPositiveValue:
      "Le ipotesi non producono un valore positivo per azione; il confronto di mercato è omesso.",
    retry: "Riprova",
    invalidTicker: "Inserisci un simbolo ticker valido.",
    stalePrice:
      "La quotazione è più vecchia di quattro giorni; il confronto è nascosto finché non è disponibile un prezzo aggiornato.",
    missingPriceTime:
      "Non è disponibile una quotazione di mercato valida con data e ora; il confronto è nascosto.",
    terminalWarning:
      "Una parte consistente della stima deriva dal valore terminale, quindi è particolarmente sensibile alle ipotesi di lungo periodo.",
    fcfLabel: "Free cash flow annuale",
    fcfPeriod: "Periodo contabile fino al",
    operatingCashFlow: "Flusso di cassa operativo",
    capitalExpenditure: "Spese in conto capitale",
    fcfDefinition: "Free cash flow = flusso di cassa operativo − spese in conto capitale.",
    cashLabel: "Liquidità",
    debtLabel: "Debito",
    sharesLabel: "Azioni in circolazione",
    equityOnly:
      "Questo modello DCF semplificato è per singole società quotate, non per ETF o altri strumenti.",
  },
};
