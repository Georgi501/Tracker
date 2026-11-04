import type { Lang } from "./i18n";

const en = {
  advisor: "AI Advisor",
  newChat: "New conversation",
  placeholder: "Ask about your portfolio, e.g. “How concentrated am I in tech?”",
  send: "Send",
  stop: "Stop",
  thinking: "Thinking…",
  proOnly: "AI Advisor is a Pro feature.",
  upgrade: "Upgrade to Pro",
  signIn: "Sign in to use the AI Advisor.",
  empty: "No conversations yet.",
  loading: "Loading conversations…",
  retry: "Try again",
  disclaimer:
    "Answers use your real positions and transactions. General information, not financial advice.",
  error: "The assistant could not answer.",
  reasoning: "Reasoning",
  suggestions: [
    "How concentrated is my portfolio?",
    "Which positions are my biggest risks?",
    "How diversified am I by region?",
  ],
};
type Copy = typeof en;
const bg: Copy = {
  advisor: "AI съветник",
  newChat: "Нов разговор",
  placeholder: "Попитай за портфейла си, напр. „Колко съм концентриран в технологии?“",
  send: "Изпрати",
  stop: "Спри",
  thinking: "Мисля…",
  proOnly: "AI съветникът е Pro функция.",
  upgrade: "Вземи Pro",
  signIn: "Влез, за да използваш AI съветника.",
  empty: "Все още няма разговори.",
  loading: "Зареждане на разговорите…",
  retry: "Опитай отново",
  disclaimer:
    "Отговорите използват реалните ти позиции и трансакции. Обща информация, не финансов съвет.",
  error: "Асистентът не успя да отговори.",
  reasoning: "Разсъждение",
  suggestions: [
    "Колко е концентрирано портфолиото ми?",
    "Кои позиции са най-големият ми риск?",
    "Колко съм диверсифициран по региони?",
  ],
};
const de: Copy = {
  advisor: "KI-Berater",
  newChat: "Neues Gespräch",
  placeholder: "Frag zu deinem Portfolio, z. B. „Wie stark bin ich in Tech konzentriert?“",
  send: "Senden",
  stop: "Stopp",
  thinking: "Denke nach…",
  proOnly: "Der KI-Berater ist eine Pro-Funktion.",
  upgrade: "Auf Pro upgraden",
  signIn: "Melde dich an, um den KI-Berater zu nutzen.",
  empty: "Noch keine Gespräche.",
  loading: "Gespräche werden geladen…",
  retry: "Erneut versuchen",
  disclaimer:
    "Antworten nutzen deine echten Positionen und Transaktionen. Allgemeine Information, keine Finanzberatung.",
  error: "Der Assistent konnte nicht antworten.",
  reasoning: "Überlegung",
  suggestions: [
    "Wie konzentriert ist mein Portfolio?",
    "Welche Positionen sind mein größtes Risiko?",
    "Wie breit bin ich nach Regionen gestreut?",
  ],
};
const es: Copy = {
  advisor: "Asesor IA",
  newChat: "Nueva conversación",
  placeholder: "Pregunta sobre tu cartera, p. ej. «¿Cuánto peso tengo en tecnología?»",
  send: "Enviar",
  stop: "Detener",
  thinking: "Pensando…",
  proOnly: "El Asesor IA es una función Pro.",
  upgrade: "Pasar a Pro",
  signIn: "Inicia sesión para usar el Asesor IA.",
  empty: "Aún no hay conversaciones.",
  loading: "Cargando conversaciones…",
  retry: "Reintentar",
  disclaimer:
    "Las respuestas usan tus posiciones y operaciones reales. Información general, no asesoramiento financiero.",
  error: "El asistente no pudo responder.",
  reasoning: "Razonamiento",
  suggestions: [
    "¿Qué tan concentrada está mi cartera?",
    "¿Cuáles son mis posiciones de mayor riesgo?",
    "¿Qué tan diversificado estoy por regiones?",
  ],
};
const it: Copy = {
  advisor: "Consulente IA",
  newChat: "Nuova conversazione",
  placeholder: "Chiedi del tuo portafoglio, es. «Quanto sono concentrato nel tech?»",
  send: "Invia",
  stop: "Ferma",
  thinking: "Sto pensando…",
  proOnly: "Il Consulente IA è una funzione Pro.",
  upgrade: "Passa a Pro",
  signIn: "Accedi per usare il Consulente IA.",
  empty: "Nessuna conversazione.",
  loading: "Caricamento delle conversazioni…",
  retry: "Riprova",
  disclaimer:
    "Le risposte usano posizioni e operazioni reali. Informazioni generali, non consulenza finanziaria.",
  error: "L'assistente non ha potuto rispondere.",
  reasoning: "Ragionamento",
  suggestions: [
    "Quanto è concentrato il mio portafoglio?",
    "Quali posizioni sono il mio rischio maggiore?",
    "Quanto sono diversificato per regione?",
  ],
};
export const advisorCopy: Record<Lang, Copy> = { en, bg, de, es, it };
