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
export const cc = (lang: string) => (lang === "bg" ? communityCopy.bg : communityCopy.en);
export const levelLabel = (c: ReturnType<typeof cc>, lv: ShareLevel) =>
  ({ assets: c.lvAssets, weights: c.lvWeights, shares: c.lvShares, amounts: c.lvAmounts })[lv];
