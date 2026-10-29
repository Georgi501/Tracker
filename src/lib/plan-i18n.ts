import type { Lang } from "@/lib/i18n";

type PlanCopy = {
  compareTitle: string;
  compareSub: string;
  freeTag: string;
  proTag: string;
  groups: { title: string; free: string; pro: string }[];
  watchlist: string;
  gateNote: string;
  taxIncluded: string;
  trialFaqTitle: string;
  trialFaq: [string, string][];
  yearlySave: string;
  yearlyDetails: string;
  monthlyDetails: string;
  seeWhat: string;
  referralTitle: string;
  referralBody: string;
  referralCopy: string;
  referralCopied: string;
  referralStatus: (pending: number, rewarded: number) => string;
};

const en: PlanCopy = {
  compareTitle: "Free vs Pro",
  compareSub:
    "Free tracks your money with confidence. Pro helps you make better investing decisions.",
  freeTag: "Free",
  proTag: "Pro",
  groups: [
    {
      title: "Brokers & import",
      free: "1 broker, CSV import",
      pro: "Up to 5 brokers, import preview & duplicate checks",
    },
    {
      title: "Portfolio",
      free: "Net worth, P&L, holdings, live prices",
      pro: "Everything in Free",
    },
    {
      title: "Analytics",
      free: "Basic allocation & history",
      pro: "Heatmap, benchmark, risk & concentration insights",
    },
    {
      title: "Dividends",
      free: "Confirmed dividend events",
      pro: "Income matrix, yield on cost, income goals",
    },
    {
      title: "Research",
      free: "Search, news, key stats",
      pro: "DCF fair value, AI thesis check, AI advisor",
    },
    {
      title: "Watchlist",
      free: "Live prices, charts & personal buy targets",
      pro: "Top gainers & losers, buy-zone opportunities & DCF fair values",
    },
    { title: "Planning", free: "Investment goals", pro: "FIRE calculator & scenarios" },
    { title: "Community", free: "—", pro: "Profile, shared allocation, private chat" },
  ],
  watchlist: "Watchlist analysis: top gainers and losers, buy-zone opportunities & DCF fair values",
  gateNote: "€4.99/month or €49.99/year, incl. VAT",
  taxIncluded: "Prices include VAT; the total shown above is what you'll pay.",
  trialFaqTitle: "Your free trial, clearly explained",
  trialFaq: [
    [
      "Do I need to enter a card?",
      "Yes. Checkout asks for your card details to start the trial and securely saves the card for later. You are not charged during the 5-day free trial.",
    ],
    [
      "When will I pay, and how much?",
      "Your first payment is taken automatically when the 5-day trial ends: €4.99 for the monthly plan or €49.99 for the yearly plan, including VAT. The trial is before the paid billing period; it does not reduce the month or year you pay for.",
    ],
    [
      "What if I cancel before the trial ends?",
      "Cancel before the trial end date and you will not be charged. If you keep the subscription, it renews automatically every month or year at the selected price.",
    ],
  ],
  yearlySave: "Save 17% yearly",
  yearlyDetails:
    "5 days free, then €49.99 per year including VAT; renews automatically. Cancel before the trial ends and you won't be charged.",
  monthlyDetails:
    "5 days free, then €4.99 per month including VAT; renews automatically. Cancel before the trial ends and you won't be charged.",
  seeWhat: "See everything in Pro",
  referralTitle: "Invite a friend",
  referralBody:
    "You and a new friend each get one month of Pro after their first successful paid subscription. The month is added after any active paid period.",
  referralCopy: "Copy invite link",
  referralCopied: "Invite link copied",
  referralStatus: (pending, rewarded) => `${pending} pending · ${rewarded} rewarded`,
};

const bg: PlanCopy = {
  compareTitle: "Free срещу Pro",
  compareSub:
    "Free следи парите ти уверено. Pro ти помага да взимаш по-добри инвестиционни решения.",
  freeTag: "Free",
  proTag: "Pro",
  groups: [
    {
      title: "Брокери и импорт",
      free: "1 брокер, CSV импорт",
      pro: "До 5 брокера, преглед и проверка за дублирани сделки",
    },
    {
      title: "Портфолио",
      free: "Нетна стойност, P&L, позиции, реални цени",
      pro: "Всичко от Free",
    },
    {
      title: "Анализи",
      free: "Основни разпределения и история",
      pro: "Heatmap, сравнение с индекс, риск и концентрация",
    },
    {
      title: "Дивиденти",
      free: "Потвърдени дивидентни събития",
      pro: "Месечна матрица, yield on cost, цели за доход",
    },
    {
      title: "Проучване",
      free: "Търсене, новини, ключови показатели",
      pro: "DCF справедлива цена, AI проверка на теза, AI съветник",
    },
    {
      title: "Watchlist",
      free: "Цени на живо, графики и лични цели за покупка",
      pro: "Най-печеливши и губещи, възможности в зона за покупка и DCF справедливи стойности",
    },
    { title: "Планиране", free: "Инвестиционни цели", pro: "FIRE калкулатор и сценарии" },
    { title: "Общност", free: "—", pro: "Профил, споделено разпределение, лични съобщения" },
  ],
  watchlist:
    "Анализ на Watchlist-а: най-печеливши и губещи, възможности в зона за покупка и DCF справедливи стойности",
  gateNote: "€4.99/месец или €49.99/година с ДДС",
  taxIncluded: "Посочените цени са с включен ДДС — това е крайната сума, която ще платиш.",
  trialFaqTitle: "Безплатният пробен период — ясно и накратко",
  trialFaq: [
    [
      "Трябва ли да въведа карта?",
      "Да. При започване на пробния период checkout-ът изисква данни за карта и я запазва сигурно за по-късно. През 5-те безплатни дни не се извършва таксуване.",
    ],
    [
      "Кога и колко ще платя?",
      "Първото плащане се извършва автоматично след края на 5-дневния пробен период: €4,99 за месечния план или €49,99 за годишния план, с включен ДДС. Пробният период е преди платения период — не се приспада от месеца или годината, за които плащаш.",
    ],
    [
      "Какво става, ако отменя преди края на пробния период?",
      "Ако отмениш преди посочената крайна дата, няма да бъдеш таксуван. Ако запазиш абонамента, той се подновява автоматично всеки месец или година на избраната цена.",
    ],
  ],
  yearlySave: "Спестяваш 17% годишно",
  yearlyDetails:
    "5 дни безплатно, после €49,99 годишно с включен ДДС и автоматично подновяване. Ако отмениш преди края на пробния период, няма да бъдеш таксуван.",
  monthlyDetails:
    "5 дни безплатно, после €4,99 месечно с включен ДДС и автоматично подновяване. Ако отмениш преди края на пробния период, няма да бъдеш таксуван.",
  seeWhat: "Виж всичко в Pro",
  referralTitle: "Покани приятел",
  referralBody:
    "Ти и новият ти приятел получавате по един месец Pro след първото му успешно платено плащане. Наградният месец се добавя след активния платен период.",
  referralCopy: "Копирай покана",
  referralCopied: "Линкът за покана е копиран",
  referralStatus: (pending, rewarded) => `${pending} чакащи · ${rewarded} наградени`,
};

const de: PlanCopy = {
  compareTitle: "Free vs. Pro",
  compareSub:
    "Free verfolgt dein Vermögen zuverlässig. Pro hilft dir, bessere Anlageentscheidungen zu treffen.",
  freeTag: "Free",
  proTag: "Pro",
  groups: [
    {
      title: "Broker & Import",
      free: "1 Broker, CSV-Import",
      pro: "Bis zu 5 Broker, Importvorschau & Duplikatprüfung",
    },
    {
      title: "Portfolio",
      free: "Nettovermögen, G&V, Positionen, Live-Kurse",
      pro: "Alles aus Free",
    },
    {
      title: "Analysen",
      free: "Basis-Aufteilung & Verlauf",
      pro: "Heatmap, Benchmark, Risiko & Konzentration",
    },
    {
      title: "Dividenden",
      free: "Bestätigte Dividendentermine",
      pro: "Einkommensmatrix, Yield on Cost, Einkommensziele",
    },
    {
      title: "Research",
      free: "Suche, News, Kennzahlen",
      pro: "DCF-Fair-Value, KI-Thesencheck, KI-Berater",
    },
    {
      title: "Watchlist",
      free: "Live-Kurse, Charts & persönliche Kaufziele",
      pro: "Top-Gewinner und -Verlierer, Kaufchancen & DCF-Fair-Values",
    },
    { title: "Planung", free: "Anlageziele", pro: "FIRE-Rechner & Szenarien" },
    { title: "Community", free: "—", pro: "Profil, geteilte Aufteilung, private Chats" },
  ],
  watchlist: "Watchlist-Analyse: Top-Gewinner und -Verlierer, Kaufchancen & DCF-Fair-Values",
  gateNote: "€4,99/Monat oder €49,99/Jahr inkl. MwSt.",
  taxIncluded:
    "Die angezeigten Preise enthalten die Mehrwertsteuer; der Betrag oben ist der Gesamtpreis.",
  trialFaqTitle: "Deine kostenlose Testphase, einfach erklärt",
  trialFaq: [
    [
      "Muss ich eine Karte angeben?",
      "Ja. Beim Start der Testphase gibst du deine Kartendaten im Checkout ein. Die Karte wird sicher für später gespeichert. Während der 5-tägigen kostenlosen Testphase wird nichts abgebucht.",
    ],
    [
      "Wann und wie viel zahle ich?",
      "Die erste Zahlung wird automatisch nach der 5-tägigen Testphase fällig: €4,99 für den Monatsplan oder €49,99 für den Jahresplan, inklusive Mehrwertsteuer. Die Testphase liegt vor dem bezahlten Zeitraum und wird nicht vom bezahlten Monat oder Jahr abgezogen.",
    ],
    [
      "Was passiert, wenn ich vor Ende der Testphase kündige?",
      "Kündige vor dem Enddatum der Testphase, wird dir nichts berechnet. Wenn du das Abo behältst, verlängert es sich automatisch jeden Monat oder jedes Jahr zum gewählten Preis.",
    ],
  ],
  yearlySave: "17% sparen jährlich",
  yearlyDetails:
    "5 Tage kostenlos, danach €49,99 pro Jahr inklusive Mehrwertsteuer; automatische Verlängerung. Wenn du vor Ende der Testphase kündigst, wird nichts abgebucht.",
  monthlyDetails:
    "5 Tage kostenlos, danach €4,99 pro Monat inklusive Mehrwertsteuer; automatische Verlängerung. Wenn du vor Ende der Testphase kündigst, wird nichts abgebucht.",
  seeWhat: "Alles in Pro ansehen",
  referralTitle: "Freund einladen",
  referralBody:
    "Du und ein neuer Freund erhalten je einen Pro-Monat nach der ersten erfolgreichen Zahlung des Freundes. Der Monat wird an einen aktiven bezahlten Zeitraum angehängt.",
  referralCopy: "Einladungslink kopieren",
  referralCopied: "Einladungslink kopiert",
  referralStatus: (pending, rewarded) => `${pending} ausstehend · ${rewarded} belohnt`,
};

const es: PlanCopy = {
  compareTitle: "Free vs Pro",
  compareSub:
    "Free sigue tu dinero con confianza. Pro te ayuda a tomar mejores decisiones de inversión.",
  freeTag: "Free",
  proTag: "Pro",
  groups: [
    {
      title: "Brókers e importación",
      free: "1 bróker, importación CSV",
      pro: "Hasta 5 brókers, vista previa y control de duplicados",
    },
    {
      title: "Cartera",
      free: "Patrimonio, P&L, posiciones, precios en vivo",
      pro: "Todo lo de Free",
    },
    {
      title: "Análisis",
      free: "Distribución e historial básicos",
      pro: "Heatmap, índice de referencia, riesgo y concentración",
    },
    {
      title: "Dividendos",
      free: "Eventos de dividendos confirmados",
      pro: "Matriz de ingresos, yield on cost, metas de ingresos",
    },
    {
      title: "Investigación",
      free: "Búsqueda, noticias, datos clave",
      pro: "Valor justo DCF, revisión de tesis con IA, asesor IA",
    },
    {
      title: "Watchlist",
      free: "Precios en vivo, gráficos y objetivos de compra personales",
      pro: "Mayores subidas y bajadas, oportunidades de compra y valores razonables DCF",
    },
    { title: "Planificación", free: "Metas de inversión", pro: "Calculadora FIRE y escenarios" },
    { title: "Comunidad", free: "—", pro: "Perfil, distribución compartida, chat privado" },
  ],
  watchlist:
    "Análisis de watchlist: mayores subidas y bajadas, oportunidades de compra & valores razonables DCF",
  gateNote: "€4,99/mes o €49,99/año, IVA incluido",
  taxIncluded:
    "Los precios mostrados incluyen el IVA; el importe indicado arriba es el total que pagarás.",
  trialFaqTitle: "Tu prueba gratuita, explicada claramente",
  trialFaq: [
    [
      "¿Tengo que introducir una tarjeta?",
      "Sí. Para iniciar la prueba, el checkout solicita los datos de tu tarjeta y la guarda de forma segura para más adelante. No se te cobrará durante los 5 días gratuitos.",
    ],
    [
      "¿Cuándo y cuánto pagaré?",
      "El primer pago se realiza automáticamente al terminar la prueba de 5 días: €4,99 para el plan mensual o €49,99 para el anual, con IVA incluido. La prueba precede al periodo de pago; no se descuenta del mes o año que pagas.",
    ],
    [
      "¿Qué pasa si cancelo antes de que termine la prueba?",
      "Cancela antes de la fecha de finalización y no se te cobrará. Si mantienes la suscripción, se renovará automáticamente cada mes o año al precio elegido.",
    ],
  ],
  yearlySave: "Ahorra 17% al año",
  yearlyDetails:
    "5 días gratis, luego €49,99 al año con IVA incluido y renovación automática. Si cancelas antes de que termine la prueba, no se te cobrará.",
  monthlyDetails:
    "5 días gratis, luego €4,99 al mes con IVA incluido y renovación automática. Si cancelas antes de que termine la prueba, no se te cobrará.",
  seeWhat: "Ver todo en Pro",
  referralTitle: "Invita a un amigo",
  referralBody:
    "Tú y un nuevo amigo reciben un mes de Pro cada uno tras el primer pago válido del amigo. El mes se añade después de cualquier periodo pagado activo.",
  referralCopy: "Copiar enlace de invitación",
  referralCopied: "Enlace copiado",
  referralStatus: (pending, rewarded) => `${pending} pendientes · ${rewarded} recompensados`,
};

const it: PlanCopy = {
  compareTitle: "Free vs Pro",
  compareSub:
    "Free monitora il tuo patrimonio con sicurezza. Pro ti aiuta a prendere decisioni d'investimento migliori.",
  freeTag: "Free",
  proTag: "Pro",
  groups: [
    {
      title: "Broker e import",
      free: "1 broker, import CSV",
      pro: "Fino a 5 broker, anteprima e controllo duplicati",
    },
    { title: "Portafoglio", free: "Patrimonio, P&L, posizioni, prezzi live", pro: "Tutto di Free" },
    {
      title: "Analisi",
      free: "Allocazione e storico di base",
      pro: "Heatmap, benchmark, rischio e concentrazione",
    },
    {
      title: "Dividendi",
      free: "Eventi di dividendo confermati",
      pro: "Matrice dei redditi, yield on cost, obiettivi di reddito",
    },
    {
      title: "Ricerca",
      free: "Ricerca, notizie, dati chiave",
      pro: "Fair value DCF, verifica tesi con IA, consulente IA",
    },
    {
      title: "Watchlist",
      free: "Prezzi live, grafici e obiettivi d'acquisto personali",
      pro: "Maggiori rialzi e ribassi, opportunità d'acquisto e fair value DCF",
    },
    {
      title: "Pianificazione",
      free: "Obiettivi d'investimento",
      pro: "Calcolatore FIRE e scenari",
    },
    { title: "Community", free: "—", pro: "Profilo, allocazione condivisa, chat privata" },
  ],
  watchlist:
    "Analisi watchlist: maggiori rialzi e ribassi, opportunità di acquisto & fair value DCF",
  gateNote: "€4,99/mese o €49,99/anno, IVA inclusa",
  taxIncluded: "I prezzi indicati includono l'IVA; l'importo sopra è il totale che pagherai.",
  trialFaqTitle: "La prova gratuita, spiegata chiaramente",
  trialFaq: [
    [
      "Devo inserire una carta?",
      "Sì. Per iniziare la prova, il checkout richiede i dati della carta e la salva in modo sicuro per un addebito successivo. Non pagherai nulla durante i 5 giorni gratuiti.",
    ],
    [
      "Quando e quanto pagherò?",
      "Il primo pagamento viene addebitato automaticamente al termine della prova di 5 giorni: €4,99 per il piano mensile o €49,99 per quello annuale, IVA inclusa. La prova precede il periodo a pagamento e non viene sottratta dal mese o dall'anno acquistato.",
    ],
    [
      "Cosa succede se annullo prima della fine della prova?",
      "Annulla prima della data di fine e non ti verrà addebitato nulla. Se mantieni l'abbonamento, si rinnoverà automaticamente ogni mese o anno al prezzo scelto.",
    ],
  ],
  yearlySave: "Risparmi il 17% all'anno",
  yearlyDetails:
    "5 giorni gratis, poi €49,99 all'anno IVA inclusa con rinnovo automatico. Se annulli prima della fine della prova, non verrà addebitato nulla.",
  monthlyDetails:
    "5 giorni gratis, poi €4,99 al mese IVA inclusa con rinnovo automatico. Se annulli prima della fine della prova, non verrà addebitato nulla.",
  seeWhat: "Scopri tutto in Pro",
  referralTitle: "Invita un amico",
  referralBody:
    "Tu e un nuovo amico ricevete un mese di Pro ciascuno dopo il primo pagamento riuscito dell'amico. Il mese si aggiunge al periodo già pagato.",
  referralCopy: "Copia link d'invito",
  referralCopied: "Link copiato",
  referralStatus: (pending, rewarded) => `${pending} in attesa · ${rewarded} premiati`,
};

export const planCopy: Record<Lang, PlanCopy> = { en, bg, de, es, it };
