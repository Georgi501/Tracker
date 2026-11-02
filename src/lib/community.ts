import { supabase } from "@/integrations/supabase/client";

export type ShareLevel = "assets" | "weights" | "shares" | "amounts";
export const SHARE_LEVELS: ShareLevel[] = ["assets", "weights", "shares", "amounts"];

export interface MemberProfile {
  id: string;
  display_name: string | null;
  bio: string;
  investing_style: string;
  avatar_path: string | null;
  is_public: boolean;
  share_portfolio: boolean;
  share_level: ShareLevel;
}
export const PROFILE_COLS =
  "id, display_name, bio, investing_style, avatar_path, is_public, share_portfolio, share_level";

/** Avatars live in a private bucket; members get short-lived signed links. */
export async function avatarUrls(paths: (string | null)[]) {
  const list = [...new Set(paths.filter((p): p is string => !!p))];
  if (!list.length) return {} as Record<string, string>;
  const { data } = await supabase.storage.from("avatars").createSignedUrls(list, 3600);
  return Object.fromEntries(
    (data ?? []).flatMap((d) => (d.signedUrl && d.path ? [[d.path, d.signedUrl]] : [])),
  );
}

export const initials = (name?: string | null) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const communityCopy = {
  bg: {
    community: "Общност",
    profile: "Моят профил",
    messages: "Съобщения",
    save: "Запази",
    name: "Име",
    bio: "За мен",
    style: "Инвестиционен стил",
    stylePh: "напр. дивиденти, дългосрочно, ETF",
    photo: "Смени снимката",
    public: "Покажи профила ми на другите членове",
    share: "Покажи състава на портфолиото ми на другите членове",
    shareLevel: "Какво да се вижда",
    lvAssets: "Само активите (без числа)",
    lvWeights: "Активи + проценти",
    lvShares: "Активи + проценти + брой дялове",
    lvAmounts: "Всичко, включително парични суми (себестойност в USD)",
    lvHint:
      "Можеш да го смениш по всяко време. Публикациите в стената пазят нивото от момента на публикуване.",
    wall: "Стена",
    qty: "Дялове",
    cost: "Себестойност",
    saved: "Запазено",
    members: "Членове",
    none: "Още няма публични профили.",
    message: "Съобщение",
    portfolio: "Портфолио",
    private: "Портфолиото не е споделено.",
    write: "Напиши съобщение…",
    send: "Изпрати",
    noChats: "Няма разговори.",
    signIn: "Влез, за да използваш общността.",
    makePublic: "Направи профила си публичен, за да те намират другите.",
    search: "Търси членове",
    loading: "Зареждане…",
    loadError: "Данните не можаха да се заредят. Провери връзката и опитай отново.",
    retry: "Опитай отново",
  },
  en: {
    community: "Community",
    profile: "My profile",
    messages: "Messages",
    save: "Save",
    name: "Name",
    bio: "About me",
    style: "Investing style",
    stylePh: "e.g. dividends, long-term, ETFs",
    photo: "Change photo",
    public: "Show my profile to other members",
    share: "Show my portfolio composition to other members",
    shareLevel: "What others can see",
    lvAssets: "Assets only (no numbers)",
    lvWeights: "Assets + percentages",
    lvShares: "Assets + percentages + number of shares",
    lvAmounts: "Everything, including money amounts (cost basis in USD)",
    lvHint:
      "You can change this any time. Wall posts keep the level chosen when they were published.",
    wall: "Wall",
    qty: "Shares",
    cost: "Cost basis",
    saved: "Saved",
    members: "Members",
    none: "No public profiles yet.",
    message: "Message",
    portfolio: "Portfolio",
    private: "Portfolio not shared.",
    write: "Write a message…",
    send: "Send",
    noChats: "No conversations yet.",
    signIn: "Sign in to use the community.",
    makePublic: "Make your profile public so others can find you.",
    search: "Search members",
    loading: "Loading…",
    loadError: "The data could not be loaded. Check your connection and try again.",
    retry: "Try again",
  },
};
type CommunityCopy = typeof communityCopy.en;
const extra: Record<"de" | "es" | "it", CommunityCopy> = {
  de: {
    community: "Community",
    profile: "Mein Profil",
    messages: "Nachrichten",
    save: "Speichern",
    name: "Name",
    bio: "Über mich",
    style: "Anlagestil",
    stylePh: "z. B. Dividenden, langfristig, ETFs",
    photo: "Foto ändern",
    public: "Mein Profil anderen Mitgliedern zeigen",
    share: "Zusammensetzung meines Portfolios anderen Mitgliedern zeigen",
    shareLevel: "Was andere sehen",
    lvAssets: "Nur Werte (keine Zahlen)",
    lvWeights: "Werte + Prozente",
    lvShares: "Werte + Prozente + Stückzahl",
    lvAmounts: "Alles, auch Geldbeträge (Einstandswert in USD)",
    lvHint:
      "Du kannst das jederzeit ändern. Beiträge auf der Pinnwand behalten die Stufe vom Zeitpunkt der Veröffentlichung.",
    wall: "Pinnwand",
    qty: "Stück",
    cost: "Einstandswert",
    saved: "Gespeichert",
    members: "Mitglieder",
    none: "Noch keine öffentlichen Profile.",
    message: "Nachricht",
    portfolio: "Portfolio",
    private: "Portfolio nicht geteilt.",
    write: "Nachricht schreiben…",
    send: "Senden",
    noChats: "Noch keine Unterhaltungen.",
    signIn: "Melde dich an, um die Community zu nutzen.",
    makePublic: "Mach dein Profil öffentlich, damit andere dich finden.",
    search: "Mitglieder suchen",
    loading: "Wird geladen…",
    loadError:
      "Die Daten konnten nicht geladen werden. Prüfe deine Verbindung und versuche es erneut.",
    retry: "Erneut versuchen",
  },
  es: {
    community: "Comunidad",
    profile: "Mi perfil",
    messages: "Mensajes",
    save: "Guardar",
    name: "Nombre",
    bio: "Sobre mí",
    style: "Estilo de inversión",
    stylePh: "p. ej. dividendos, largo plazo, ETF",
    photo: "Cambiar foto",
    public: "Mostrar mi perfil a otros miembros",
    share: "Mostrar la composición de mi cartera a otros miembros",
    shareLevel: "Qué pueden ver los demás",
    lvAssets: "Solo los activos (sin cifras)",
    lvWeights: "Activos + porcentajes",
    lvShares: "Activos + porcentajes + número de participaciones",
    lvAmounts: "Todo, incluidos importes (coste en USD)",
    lvHint:
      "Puedes cambiarlo en cualquier momento. Las publicaciones del muro conservan el nivel del momento de publicarlas.",
    wall: "Muro",
    qty: "Participaciones",
    cost: "Coste",
    saved: "Guardado",
    members: "Miembros",
    none: "Aún no hay perfiles públicos.",
    message: "Mensaje",
    portfolio: "Cartera",
    private: "Cartera no compartida.",
    write: "Escribe un mensaje…",
    send: "Enviar",
    noChats: "Aún no hay conversaciones.",
    signIn: "Inicia sesión para usar la comunidad.",
    makePublic: "Haz público tu perfil para que otros te encuentren.",
    search: "Buscar miembros",
    loading: "Cargando…",
    loadError: "No se pudieron cargar los datos. Revisa tu conexión e inténtalo de nuevo.",
    retry: "Reintentar",
  },
  it: {
    community: "Community",
    profile: "Il mio profilo",
    messages: "Messaggi",
    save: "Salva",
    name: "Nome",
    bio: "Su di me",
    style: "Stile di investimento",
    stylePh: "es. dividendi, lungo termine, ETF",
    photo: "Cambia foto",
    public: "Mostra il mio profilo agli altri membri",
    share: "Mostra la composizione del mio portafoglio agli altri membri",
    shareLevel: "Cosa possono vedere gli altri",
    lvAssets: "Solo gli asset (senza numeri)",
    lvWeights: "Asset + percentuali",
    lvShares: "Asset + percentuali + numero di quote",
    lvAmounts: "Tutto, compresi gli importi (costo in USD)",
    lvHint:
      "Puoi cambiarlo in qualsiasi momento. I post in bacheca mantengono il livello del momento della pubblicazione.",
    wall: "Bacheca",
    qty: "Quote",
    cost: "Costo",
    saved: "Salvato",
    members: "Membri",
    none: "Ancora nessun profilo pubblico.",
    message: "Messaggio",
    portfolio: "Portafoglio",
    private: "Portafoglio non condiviso.",
    write: "Scrivi un messaggio…",
    send: "Invia",
    noChats: "Ancora nessuna conversazione.",
    signIn: "Accedi per usare la community.",
    makePublic: "Rendi pubblico il tuo profilo così gli altri possono trovarti.",
    search: "Cerca membri",
    loading: "Caricamento…",
    loadError: "Impossibile caricare i dati. Controlla la connessione e riprova.",
    retry: "Riprova",
  },
};
export const cc = (lang: string): CommunityCopy =>
  lang === "bg"
    ? communityCopy.bg
    : lang === "de" || lang === "es" || lang === "it"
      ? extra[lang]
      : communityCopy.en;
export const levelLabel = (c: ReturnType<typeof cc>, lv: ShareLevel) =>
  ({ assets: c.lvAssets, weights: c.lvWeights, shares: c.lvShares, amounts: c.lvAmounts })[lv];
