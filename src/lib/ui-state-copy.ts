import type { Lang } from "./i18n";
type Copy = {
  reset: string;
  searchHelp: string;
  membersHelp: string;
  messagesHelp: string;
  wallHelp: string;
  writeFirst: string;
  noMatches: string;
  direction: string;
  sort: string;
};
export const uiStateCopy: Record<Lang, Copy> = {
  en: {
    reset: "Clear filters",
    searchHelp: "Try a different name or clear your filters to see all available results.",
    membersHelp: "Public investor profiles appear here when members choose to share them.",
    messagesHelp: "Find an investor in the member directory to start a private conversation.",
    wallHelp: "Share an investing observation or a portfolio milestone to start the conversation.",
    writeFirst: "Write the first post",
    noMatches: "No matching results",
    direction: "Reverse sort direction",
    sort: "Sort holdings",
  },
  bg: {
    reset: "Изчисти филтрите",
    searchHelp: "Опитай друго име или изчисти филтрите, за да видиш всички налични резултати.",
    membersHelp: "Тук се показват профилите на инвеститори, избрали да ги споделят публично.",
    messagesHelp: "Намери инвеститор в списъка с членове, за да започнеш личен разговор.",
    wallHelp:
      "Сподели инвестиционно наблюдение или важен момент за портфейла си и започни разговор.",
    writeFirst: "Напиши първата публикация",
    noMatches: "Няма съвпадащи резултати",
    direction: "Обърни посоката на сортиране",
    sort: "Сортиране на позициите",
  },
  de: {
    reset: "Filter zurücksetzen",
    searchHelp: "Anderen Namen versuchen oder Filter löschen, um alle Ergebnisse zu sehen.",
    membersHelp: "Öffentliche Anlegerprofile erscheinen hier, wenn Mitglieder sie freigeben.",
    messagesHelp: "Finde ein Mitglied im Verzeichnis, um eine private Unterhaltung zu beginnen.",
    wallHelp:
      "Teile eine Beobachtung oder einen Portfolio-Meilenstein und beginne eine Diskussion.",
    writeFirst: "Ersten Beitrag schreiben",
    noMatches: "Keine passenden Ergebnisse",
    direction: "Sortierrichtung umkehren",
    sort: "Positionen sortieren",
  },
  es: {
    reset: "Borrar filtros",
    searchHelp: "Prueba otro nombre o borra los filtros para ver todos los resultados.",
    membersHelp: "Los perfiles públicos aparecen cuando los miembros deciden compartirlos.",
    messagesHelp: "Busca un inversor en el directorio para iniciar una conversación privada.",
    wallHelp: "Comparte una observación o un hito de tu cartera para iniciar la conversación.",
    writeFirst: "Escribir la primera publicación",
    noMatches: "Sin resultados coincidentes",
    direction: "Invertir orden",
    sort: "Ordenar posiciones",
  },
  it: {
    reset: "Cancella filtri",
    searchHelp: "Prova un altro nome o cancella i filtri per vedere tutti i risultati.",
    membersHelp: "I profili pubblici appaiono quando i membri scelgono di condividerli.",
    messagesHelp: "Trova un investitore nell'elenco per iniziare una conversazione privata.",
    wallHelp:
      "Condividi un'osservazione o un traguardo del portafoglio per iniziare la conversazione.",
    writeFirst: "Scrivi il primo post",
    noMatches: "Nessun risultato corrispondente",
    direction: "Inverti ordinamento",
    sort: "Ordina posizioni",
  },
};
