import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, CheckCheck, SendHorizontal, Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cc } from "@/lib/community";
import { isLang, languageLocale } from "@/lib/i18n";

interface Msg {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

const COPY = {
  en: {
    today: "Today",
    yesterday: "Yesterday",
    empty: "Say hello 👋",
    emojis: "Emoji",
    hint: "Enter to send · Shift+Enter for a new line",
    seen: "Seen",
    sent: "Sent",
  },
  bg: {
    today: "Днес",
    yesterday: "Вчера",
    empty: "Кажи здравей 👋",
    emojis: "Емотикони",
    hint: "Enter за изпращане · Shift+Enter за нов ред",
    seen: "Прочетено",
    sent: "Изпратено",
  },
  de: {
    today: "Heute",
    yesterday: "Gestern",
    empty: "Sag Hallo 👋",
    emojis: "Emojis",
    hint: "Enter zum Senden · Umschalt+Enter für neue Zeile",
    seen: "Gelesen",
    sent: "Gesendet",
  },
  es: {
    today: "Hoy",
    yesterday: "Ayer",
    empty: "Saluda 👋",
    emojis: "Emojis",
    hint: "Enter para enviar · Mayús+Enter para nueva línea",
    seen: "Leído",
    sent: "Enviado",
  },
  it: {
    today: "Oggi",
    yesterday: "Ieri",
    empty: "Saluta 👋",
    emojis: "Emoji",
    hint: "Invio per inviare · Maiusc+Invio per andare a capo",
    seen: "Letto",
    sent: "Inviato",
  },
} as const;

const EMOJIS = [
  "😀",
  "😂",
  "🙂",
  "😉",
  "😍",
  "🤔",
  "😎",
  "🥳",
  "🙏",
  "👍",
  "👎",
  "👏",
  "🙌",
  "💪",
  "🤝",
  "👀",
  "🔥",
  "🚀",
  "💎",
  "🌙",
  "📈",
  "📉",
  "💰",
  "💵",
  "🏦",
  "📊",
  "🪙",
  "🎯",
  "✅",
  "⚠️",
  "💡",
  "🎉",
  "❤️",
  "😅",
  "😢",
  "😮",
  "🤑",
  "🐂",
  "🐻",
  "⏳",
];

const MAX_LENGTH = 2000;
const GROUP_GAP_MS = 5 * 60 * 1000;

const isEmojiOnly = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 24) return false;
  if (!/^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\u200d|\ufe0f|\s)+$/u.test(trimmed))
    return false;
  const count = [...new Intl.Segmenter().segment(trimmed.replace(/\s/g, ""))].length;
  return count > 0 && count <= 3;
};

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** One-to-one chat. RLS limits reads to the two participants; realtime appends new messages live. */
export function ChatThread({ me, other, lang }: { me: string; other: string; lang: string }) {
  const c = cc(lang);
  const code = isLang(lang) ? lang : "en";
  const t = COPY[code];
  const locale = languageLocale(code);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const markRead = () =>
      void supabase
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", other)
        .eq("recipient_id", me)
        .is("read_at", null);
    void supabase
      .from("direct_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`,
      )
      .order("created_at")
      .limit(500)
      .then(({ data }) => {
        if (!alive) return;
        setMsgs((data ?? []) as Msg[]);
        setLoaded(true);
      });
    markRead();
    const isThread = (m: Msg) =>
      (m.sender_id === me && m.recipient_id === other) ||
      (m.sender_id === other && m.recipient_id === me);
    const ch = supabase
      .channel(`dm-${me}-${other}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.new as Msg;
          if (!isThread(m)) return;
          setMsgs((s) => (s.some((x) => x.id === m.id) ? s : [...s, m]));
          if (m.sender_id === other) markRead();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.new as Msg;
          if (isThread(m)) setMsgs((s) => s.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
        },
      )
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(ch);
    };
  }, [me, other]);

  useEffect(() => {
    const el = scroller.current;
    if (el) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: loaded && !reduceMotion ? "smooth" : "auto",
      });
    }
  }, [msgs.length, loaded]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!picker.current?.contains(event.target as Node)) setPickerOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pickerOpen]);

  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [text]);

  const insertEmoji = (emoji: string) => {
    const el = input.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText((text.slice(0, start) + emoji + text.slice(end)).slice(0, MAX_LENGTH));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = text.trim().slice(0, MAX_LENGTH);
    if (!body || sending) return;
    setSending(true);
    setText("");
    setPickerOpen(false);
    const { data, error } = await supabase
      .from("direct_messages")
      .insert({ recipient_id: other, body })
      .select()
      .single();
    setSending(false);
    if (error) {
      toast.error(error.message);
      setText(body);
      return;
    }
    setMsgs((s) => (s.some((x) => x.id === data.id) ? s : [...s, data as Msg]));
    input.current?.focus();
  };

  const dayLabel = useMemo(() => {
    const now = Date.now();
    const today = dayKey(new Date(now).toISOString());
    const yesterday = dayKey(new Date(now - 86_400_000).toISOString());
    return (iso: string) => {
      const key = dayKey(iso);
      if (key === today) return t.today;
      if (key === yesterday) return t.yesterday;
      return new Date(iso).toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    };
  }, [t, locale]);

  const lastMineId = [...msgs].reverse().find((m) => m.sender_id === me)?.id;

  return (
    <div className="flex h-[65vh] min-h-96 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div
        ref={scroller}
        role="log"
        aria-live="polite"
        className="flex-1 space-y-0.5 overflow-y-auto bg-gradient-to-b from-secondary/30 to-transparent p-4"
      >
        {loaded && !msgs.length && (
          <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
            {t.empty}
          </div>
        )}
        {msgs.map((m, i) => {
          const mine = m.sender_id === me;
          const prev = msgs[i - 1];
          const next = msgs[i + 1];
          const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
          const joinsPrev =
            !!prev &&
            !newDay &&
            prev.sender_id === m.sender_id &&
            +new Date(m.created_at) - +new Date(prev.created_at) < GROUP_GAP_MS;
          const joinsNext =
            !!next &&
            dayKey(next.created_at) === dayKey(m.created_at) &&
            next.sender_id === m.sender_id &&
            +new Date(next.created_at) - +new Date(m.created_at) < GROUP_GAP_MS;
          const big = isEmojiOnly(m.body);
          const corner = mine
            ? `${joinsPrev ? "rounded-tr-md" : ""} ${joinsNext ? "rounded-br-md" : ""}`
            : `${joinsPrev ? "rounded-tl-md" : ""} ${joinsNext ? "rounded-bl-md" : ""}`;
          return (
            <div key={m.id}>
              {newDay && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-muted-foreground">
                    {dayLabel(m.created_at)}
                  </span>
                </div>
              )}
              <div
                className={`chat-bubble-in flex ${mine ? "justify-end" : "justify-start"} ${joinsPrev ? "mt-0.5" : "mt-2"}`}
              >
                <div
                  className={
                    big
                      ? "text-4xl leading-tight"
                      : `max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${corner} ${mine ? "bg-brand-gradient text-primary-foreground" : "bg-secondary"}`
                  }
                >
                  {m.body}
                </div>
              </div>
              {!joinsNext && (
                <div
                  className={`mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground ${mine ? "justify-end" : "justify-start"}`}
                >
                  <time dateTime={m.created_at}>
                    {new Date(m.created_at).toLocaleTimeString(locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  {mine &&
                    (m.read_at ? (
                      <CheckCheck size={13} className="text-primary" aria-label={t.seen} />
                    ) : (
                      <Check size={13} aria-label={t.sent} />
                    ))}
                  {mine && m.id === lastMineId && m.read_at && <span>{t.seen}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="relative border-t border-border bg-card/80 p-3">
        {pickerOpen && (
          <div
            ref={picker}
            role="dialog"
            aria-label={t.emojis}
            className="modal-panel absolute bottom-full left-3 z-10 mb-2 grid w-72 grid-cols-8 gap-1 rounded-2xl border border-border bg-popover p-2 shadow-xl"
          >
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="grid size-8 place-items-center rounded-lg text-xl transition-transform hover:scale-125 hover:bg-secondary"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-3xl border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
          <button
            type="button"
            onClick={() => setPickerOpen((open) => !open)}
            aria-label={t.emojis}
            aria-expanded={pickerOpen}
            className="press grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Smile size={20} />
          </button>
          <textarea
            ref={input}
            value={text}
            rows={1}
            maxLength={MAX_LENGTH}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={c.write}
            aria-label={c.write}
            className="chat-input max-h-36 min-h-9 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-base outline-none sm:text-sm"
          />
          <button
            type="submit"
            aria-label={c.send}
            disabled={!text.trim() || sending}
            className="press grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          >
            <SendHorizontal size={17} />
          </button>
        </div>
        <p className="mt-1.5 flex justify-between px-3 text-[10px] text-muted-foreground">
          <span className="hidden sm:inline">{t.hint}</span>
          {text.length > MAX_LENGTH - 200 && (
            <span className="ml-auto tabular-nums">
              {text.length}/{MAX_LENGTH}
            </span>
          )}
        </p>
      </form>
    </div>
  );
}
