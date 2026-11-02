import type { Lang } from "@/lib/i18n";

export interface WallCopy {
  title: string;
  sub: string;
  placeholder: string;
  attach: string;
  attachNone: string;
  post: string;
  moods: { brag: string; vent: string; question: string; chat: string };
  empty: string;
  commentPh: string;
  needPublic: string;
  report: string;
  reported: string;
  del: string;
  snapshotNote: string;
  tagsPh: string;
  all: string;
  edit: string;
  save: string;
  cancel: string;
  edited: string;
  clearTag: string;
  noMatch: string;
  privacy: string;
  back: string;
  unknown: string;
  follow: string;
  unfollow: string;
  followingOnly: string;
  block: string;
  unblock: string;
  blockConfirm: string;
  blockedTitle: string;
  blockedNone: string;
  blockedDone: string;
}

export const wallCopy: Record<Lang, WallCopy> = {
  bg: {
    title: "Стена на общността",
    sub: "Похвали се, пооплачи се или попитай — другите Pro членове ще го видят.",
    placeholder: "Какво се случва в портфолиото ти?",
    attach: "Прикачи портфолио",
    attachNone: "Без портфолио",
    post: "Публикувай",
    moods: { brag: "Хваля се", vent: "Оплаквам се", question: "Въпрос", chat: "Разговор" },
    empty: "Още няма публикации. Бъди първият!",
    commentPh: "Напиши коментар…",
    needPublic: "Направи профила си публичен, за да публикуваш и коментираш.",
    report: "Докладвай",
    reported: "Благодарим, ще го прегледаме.",
    del: "Изтрий",
    snapshotNote: "Снимка на портфолиото от момента на публикуване",
    tagsPh: "Тагове, напр. дивиденти etf крипто (до 5)",
    all: "Всички",
    edit: "Редактирай",
    save: "Запази",
    cancel: "Отказ",
    edited: "редактирано",
    clearTag: "Махни филтъра",
    noMatch: "Няма публикации за този филтър.",
    privacy:
      "Избраното ниво е окончателно за публикацията. Парични суми се виждат само ако изберете „Всичко“.",
    back: "Общност",
    unknown: "Член",
    follow: "Следвай",
    unfollow: "Спри да следваш",
    followingOnly: "Последвани",
    block: "Блокирай",
    unblock: "Отблокирай",
    blockConfirm:
      "Да блокираш ли този член? Няма да виждате публикациите и коментарите си, нито да си пишете.",
    blockedTitle: "Блокирани членове",
    blockedNone: "Няма блокирани членове.",
    blockedDone: "Членът е блокиран.",
  },
  en: {
    title: "Community wall",
    sub: "Brag, vent or ask — other Pro members will see it.",
    placeholder: "What's happening in your portfolio?",
    attach: "Attach portfolio",
    attachNone: "No portfolio",
    post: "Post",
    moods: { brag: "Bragging", vent: "Venting", question: "Question", chat: "Chat" },
    empty: "No posts yet. Be the first!",
    commentPh: "Write a comment…",
    needPublic: "Make your profile public to post and comment.",
    report: "Report",
    reported: "Thanks, we will review it.",
    del: "Delete",
    snapshotNote: "Portfolio snapshot from the time of posting",
    tagsPh: "Tags, e.g. dividends etf crypto (up to 5)",
    all: "All",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    edited: "edited",
    clearTag: "Clear filter",
    noMatch: "No posts match this filter.",
    privacy:
      "The chosen level is final for that post. Money amounts are only visible if you pick “Everything”.",
    back: "Community",
    unknown: "Member",
    follow: "Follow",
    unfollow: "Unfollow",
    followingOnly: "Following",
    block: "Block",
    unblock: "Unblock",
    blockConfirm:
      "Block this member? You will no longer see each other's posts and comments, or message each other.",
    blockedTitle: "Blocked members",
    blockedNone: "No blocked members.",
    blockedDone: "Member blocked.",
  },
  de: {
    title: "Community-Pinnwand",
    sub: "Gib an, ärgere dich oder frag nach — andere Pro-Mitglieder sehen es.",
    placeholder: "Was tut sich in deinem Portfolio?",
    attach: "Portfolio anhängen",
    attachNone: "Kein Portfolio",
    post: "Veröffentlichen",
    moods: { brag: "Angeben", vent: "Frust", question: "Frage", chat: "Plausch" },
    empty: "Noch keine Beiträge. Sei der Erste!",
    commentPh: "Kommentar schreiben…",
    needPublic: "Mach dein Profil öffentlich, um zu posten und zu kommentieren.",
    report: "Melden",
    reported: "Danke, wir prüfen das.",
    del: "Löschen",
    snapshotNote: "Portfolio-Momentaufnahme zum Zeitpunkt des Beitrags",
    tagsPh: "Tags, z. B. dividenden etf krypto (bis zu 5)",
    all: "Alle",
    edit: "Bearbeiten",
    save: "Speichern",
    cancel: "Abbrechen",
    edited: "bearbeitet",
    clearTag: "Filter entfernen",
    noMatch: "Keine Beiträge für diesen Filter.",
    privacy:
      "Die gewählte Stufe gilt endgültig für diesen Beitrag. Geldbeträge sind nur sichtbar, wenn du „Alles“ wählst.",
    back: "Community",
    unknown: "Mitglied",
    follow: "Folgen",
    unfollow: "Nicht mehr folgen",
    followingOnly: "Gefolgt",
    block: "Blockieren",
    unblock: "Entblocken",
    blockConfirm:
      "Dieses Mitglied blockieren? Ihr seht weder Beiträge und Kommentare des anderen noch könnt ihr euch schreiben.",
    blockedTitle: "Blockierte Mitglieder",
    blockedNone: "Keine blockierten Mitglieder.",
    blockedDone: "Mitglied blockiert.",
  },
  es: {
    title: "Muro de la comunidad",
    sub: "Presume, desahógate o pregunta: otros miembros Pro lo verán.",
    placeholder: "¿Qué pasa en tu cartera?",
    attach: "Adjuntar cartera",
    attachNone: "Sin cartera",
    post: "Publicar",
    moods: { brag: "Presumo", vent: "Me quejo", question: "Pregunta", chat: "Charla" },
    empty: "Aún no hay publicaciones. ¡Sé el primero!",
    commentPh: "Escribe un comentario…",
    needPublic: "Haz público tu perfil para publicar y comentar.",
    report: "Denunciar",
    reported: "Gracias, lo revisaremos.",
    del: "Eliminar",
    snapshotNote: "Instantánea de la cartera en el momento de publicar",
    tagsPh: "Etiquetas, p. ej. dividendos etf cripto (hasta 5)",
    all: "Todas",
    edit: "Editar",
    save: "Guardar",
    cancel: "Cancelar",
    edited: "editado",
    clearTag: "Quitar filtro",
    noMatch: "No hay publicaciones para este filtro.",
    privacy:
      "El nivel elegido es definitivo para esta publicación. Los importes solo se ven si eliges «Todo».",
    back: "Comunidad",
    unknown: "Miembro",
    follow: "Seguir",
    unfollow: "Dejar de seguir",
    followingOnly: "Seguidos",
    block: "Bloquear",
    unblock: "Desbloquear",
    blockConfirm:
      "¿Bloquear a este miembro? No veréis las publicaciones ni los comentarios del otro, ni podréis escribiros.",
    blockedTitle: "Miembros bloqueados",
    blockedNone: "No hay miembros bloqueados.",
    blockedDone: "Miembro bloqueado.",
  },
  it: {
    title: "Bacheca della community",
    sub: "Vanta, sfogati o chiedi: gli altri membri Pro lo vedranno.",
    placeholder: "Cosa succede nel tuo portafoglio?",
    attach: "Allega portafoglio",
    attachNone: "Nessun portafoglio",
    post: "Pubblica",
    moods: { brag: "Mi vanto", vent: "Mi sfogo", question: "Domanda", chat: "Chiacchiere" },
    empty: "Ancora nessun post. Sii il primo!",
    commentPh: "Scrivi un commento…",
    needPublic: "Rendi pubblico il tuo profilo per pubblicare e commentare.",
    report: "Segnala",
    reported: "Grazie, lo esamineremo.",
    del: "Elimina",
    snapshotNote: "Istantanea del portafoglio al momento della pubblicazione",
    tagsPh: "Tag, es. dividendi etf cripto (fino a 5)",
    all: "Tutti",
    edit: "Modifica",
    save: "Salva",
    cancel: "Annulla",
    edited: "modificato",
    clearTag: "Rimuovi filtro",
    noMatch: "Nessun post per questo filtro.",
    privacy:
      "Il livello scelto è definitivo per questo post. Gli importi sono visibili solo se scegli «Tutto».",
    back: "Community",
    unknown: "Membro",
    follow: "Segui",
    unfollow: "Smetti di seguire",
    followingOnly: "Seguiti",
    block: "Blocca",
    unblock: "Sblocca",
    blockConfirm:
      "Bloccare questo membro? Non vedrete i post e i commenti dell'altro e non potrete scrivervi.",
    blockedTitle: "Membri bloccati",
    blockedNone: "Nessun membro bloccato.",
    blockedDone: "Membro bloccato.",
  },
};
