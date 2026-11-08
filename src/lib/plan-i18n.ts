import type { Lang } from "@/lib/i18n";

type PlanCopy = {
  compareTitle: string;
  compareSub: string;
  freeTag: string;
  proTag: string;
  groups: { title: string; free: string; pro: string }[];
  watchlist: string;
  taxIncluded: string;
  trialFaqTitle: string;
  trialFaq: [string, string][];
  yearlySave: string;
  yearlyDetails: string;
  monthlyDetails: string;
  comparePlans: string;
  freeRemains: string;
  researchDemo: string;
  interactiveDemo: string;
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
      free: "Unlimited CSV imports with a preview and duplicate checks",
      pro: "Direct read-only sync with IBKR & Trading 212",
    },
    {
      title: "Portfolio",
      free: "Net worth, P&L, holdings, market quotes",
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
      free: "Full company profiles for 2 companies per calendar week; each includes that company's DCF calculator in the same view, with no extra view used, plus search & news. Standalone DCF in Tools is Pro.",
      pro: "Unlimited full company profiles with DCF calculators, plus standalone DCF in Tools, earnings calendar, forecasts & revisions, earnings surprises, holders, deep research & AI thesis check",
    },
    {
      title: "Watchlist",
      free: "Market quotes, charts & personal buy targets",
      pro: "Top gainers & losers, buy-zone opportunities & DCF fair values",
    },
    { title: "Planning", free: "Investment goals", pro: "FIRE calculator & scenarios" },
    { title: "Community", free: "—", pro: "Profile, shared allocation, private chat" },
  ],
  watchlist: "Watchlist analysis: top gainers and losers, buy-zone opportunities & DCF fair values",
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
    "5 days free (card required), then €49.99 per year including VAT; renews automatically. Cancel before the trial ends and you won't be charged.",
  monthlyDetails:
    "5 days free (card required), then €4.99 per month including VAT; renews automatically. Cancel before the trial ends and you won't be charged.",
  comparePlans: "Compare plans",
  freeRemains: "Your Free plan and existing portfolio stay available if you choose not to upgrade.",
  researchDemo: "Explore real company research with Oracle (ORCL)",
  interactiveDemo: "Try the interactive Pro demo",
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
    "С Free следиш инвестициите си, а Pro добавя директна синхронизация с IBKR и Trading 212.",
  freeTag: "Free",
  proTag: "Pro",
  groups: [
    {
      title: "Брокери и импорт",
      free: "Неограничен CSV импорт с преглед на файла и проверка за дублирани сделки",
      pro: "Директна синхронизация с IBKR и Trading 212 (само за четене)",
    },
    {
      title: "Портфолио",
      free: "Нетна стойност, печалба и загуба, позиции и актуални котировки",
      pro: "Всичко от Free",
    },
    {
      title: "Анализи",
      free: "Основни разпределения и история",
      pro: "Топлинна карта, сравнение с индекс, анализ на риска и концентрацията",
    },
    {
      title: "Дивиденти",
      free: "Потвърдени дивидентни събития",
      pro: "Месечна таблица на дивидентите, доходност спрямо себестойността и цели за доход",
    },
    {
      title: "Проучване",
      free: "Пълни профили на 2 компании за календарна седмица; DCF калкулаторът за съответната компания е включен в същия преглед и не изразходва допълнителен преглед, плюс търсене и новини. Самостоятелният DCF в Инструменти е Pro.",
      pro: "Неограничени пълни фирмени профили с DCF калкулатори, както и самостоятелен DCF в Инструменти, календар на отчетите, прогнози и промени, изненади в печалбата, акционери, задълбочено проучване и AI проверка на теза",
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
    "Анализ на списъка за наблюдение: най-силно поскъпващи и поевтиняващи активи, възможности за покупка и справедливи стойности по DCF",
  taxIncluded: "Посочените цени са с включен ДДС — това е крайната сума, която ще платиш.",
  trialFaqTitle: "Безплатният пробен период — ясно и накратко",
  trialFaq: [
    [
      "Трябва ли да въведа карта?",
      "Да. За да започнеш пробния период, въвеждаш данни за карта на защитената страница за плащане. През първите 5 дни няма да бъдеш таксуван.",
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
    "5 дни безплатно (изисква се карта), после €49,99 годишно с включен ДДС и автоматично подновяване. Ако отмениш преди края на пробния период, няма да бъдеш таксуван.",
  monthlyDetails:
    "5 дни безплатно (изисква се карта), после €4,99 месечно с включен ДДС и автоматично подновяване. Ако отмениш преди края на пробния период, няма да бъдеш таксуван.",
  comparePlans: "Сравни плановете",
  freeRemains: "Безплатният ти план и портфолиото ти остават достъпни, ако не избереш надграждане.",
  researchDemo: "Разгледай реален фирмен анализ — Oracle (ORCL)",
  interactiveDemo: "Разгледай интерактивното Pro демо",
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
      free: "Unbegrenzte CSV-Importe mit Vorschau und Duplikatprüfung",
      pro: "Direkte Synchronisierung mit IBKR und Trading 212 (nur Lesezugriff)",
    },
    {
      title: "Portfolio",
      free: "Nettovermögen, G&V, Positionen, Marktkurse",
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
      free: "Vollständige Unternehmensprofile für 2 Unternehmen pro Kalenderwoche; der DCF-Rechner für das jeweilige Unternehmen ist in derselben Ansicht enthalten und verbraucht keinen zusätzlichen Aufruf, plus Suche & News. Der eigenständige DCF-Rechner unter Tools ist Pro.",
      pro: "Unbegrenzte vollständige Unternehmensprofile mit DCF-Rechnern sowie eigenständiger DCF-Rechner unter Tools, Berichtskalender, Prognosen & Revisionen, Gewinnüberraschungen, Anteilseigner, Deep Research & KI-Theseprüfung",
    },
    {
      title: "Watchlist",
      free: "Marktkurse, Charts & persönliche Kaufziele",
      pro: "Top-Gewinner und -Verlierer, Kaufchancen & DCF-Fair-Values",
    },
    { title: "Planung", free: "Anlageziele", pro: "FIRE-Rechner & Szenarien" },
    { title: "Community", free: "—", pro: "Profil, geteilte Aufteilung, private Chats" },
  ],
  watchlist: "Watchlist-Analyse: Top-Gewinner und -Verlierer, Kaufchancen & DCF-Fair-Values",
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
    "5 Tage kostenlos (Karte erforderlich), danach €49,99 pro Jahr inklusive Mehrwertsteuer; automatische Verlängerung. Wenn du vor Ende der Testphase kündigst, wird nichts abgebucht.",
  monthlyDetails:
    "5 Tage kostenlos (Karte erforderlich), danach €4,99 pro Monat inklusive Mehrwertsteuer; automatische Verlängerung. Wenn du vor Ende der Testphase kündigst, wird nichts abgebucht.",
  comparePlans: "Tarife vergleichen",
  freeRemains:
    "Dein Free-Plan und dein bestehendes Portfolio bleiben verfügbar, wenn du nicht upgradest.",
  researchDemo: "Echte Unternehmensanalyse ansehen — Oracle (ORCL)",
  interactiveDemo: "Interaktive Pro-Demo ansehen",
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
      free: "Importaciones CSV ilimitadas con vista previa y detección de duplicados",
      pro: "Sincronización directa con IBKR y Trading 212 (solo lectura)",
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
      free: "Perfiles completos de 2 empresas por semana natural; la calculadora DCF de cada empresa está incluida en esa misma vista y no consume otra, además de búsqueda y noticias. El DCF independiente en Herramientas es Pro.",
      pro: "Perfiles completos ilimitados con calculadoras DCF, además del DCF independiente en Herramientas, calendario de resultados, previsiones y revisiones, sorpresas, accionistas, investigación profunda y análisis de tesis con IA",
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
    "5 días gratis (se requiere tarjeta), luego €49,99 al año con IVA incluido y renovación automática. Si cancelas antes de que termine la prueba, no se te cobrará.",
  monthlyDetails:
    "5 días gratis (se requiere tarjeta), luego €4,99 al mes con IVA incluido y renovación automática. Si cancelas antes de que termine la prueba, no se te cobrará.",
  comparePlans: "Comparar planes",
  freeRemains: "Tu plan Free y tu cartera actual seguirán disponibles si no actualizas.",
  researchDemo: "Explora un análisis real de empresa — Oracle (ORCL)",
  interactiveDemo: "Prueba la demo interactiva de Pro",
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
      free: "Importazioni CSV illimitate con anteprima e controllo dei duplicati",
      pro: "Sincronizzazione diretta con IBKR e Trading 212 (sola lettura)",
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
      free: "Profili completi per 2 aziende a settimana; il calcolatore DCF della singola azienda è incluso nella stessa visita e non ne consuma un'altra, oltre a ricerca e notizie. Il DCF autonomo in Strumenti è Pro.",
      pro: "Profili aziendali completi illimitati con calcolatori DCF e DCF autonomo in Strumenti, oltre a calendario degli utili, stime e revisioni, sorprese sugli utili, azionisti, ricerca approfondita e verifica della tesi con IA",
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
    "5 giorni gratis (carta richiesta), poi €49,99 all'anno IVA inclusa con rinnovo automatico. Se annulli prima della fine della prova, non verrà addebitato nulla.",
  monthlyDetails:
    "5 giorni gratis (carta richiesta), poi €4,99 al mese IVA inclusa con rinnovo automatico. Se annulli prima della fine della prova, non verrà addebitato nulla.",
  comparePlans: "Confronta i piani",
  freeRemains:
    "Il tuo piano Free e il portafoglio attuale restano disponibili se non effettui l'upgrade.",
  researchDemo: "Esplora un'analisi aziendale reale — Oracle (ORCL)",
  interactiveDemo: "Prova la demo interattiva Pro",
  referralTitle: "Invita un amico",
  referralBody:
    "Tu e un nuovo amico ricevete un mese di Pro ciascuno dopo il primo pagamento riuscito dell'amico. Il mese si aggiunge al periodo già pagato.",
  referralCopy: "Copia link d'invito",
  referralCopied: "Link copiato",
  referralStatus: (pending, rewarded) => `${pending} in attesa · ${rewarded} premiati`,
};

export const planCopy: Record<Lang, PlanCopy> = { en, bg, de, es, it };
