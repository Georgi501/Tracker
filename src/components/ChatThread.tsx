import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cc } from "@/lib/community";

interface Msg {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

/** One-to-one chat. RLS limits reads to the two participants; realtime appends new messages live. */
export function ChatThread({ me, other, lang }: { me: string; other: string; lang: string }) {
  const c = cc(lang);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    void supabase
      .from("direct_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`,
      )
      .order("created_at")
      .limit(500)
      .then(({ data }) => {
        if (alive) setMsgs((data ?? []) as Msg[]);
      });
    void supabase
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("sender_id", other)
      .eq("recipient_id", me)
      .is("read_at", null);
    const ch = supabase
      .channel(`dm-${me}-${other}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.new as Msg;
          const mine =
            (m.sender_id === me && m.recipient_id === other) ||
            (m.sender_id === other && m.recipient_id === me);
          if (mine) setMsgs((s) => (s.some((x) => x.id === m.id) ? s : [...s, m]));
        },
      )
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(ch);
    };
  }, [me, other]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim().slice(0, 2000);
    if (!body) return;
    setText("");
    const { data, error } = await supabase
      .from("direct_messages")
      .insert({ recipient_id: other, body })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      setText(body);
      return;
    }
    setMsgs((s) => (s.some((x) => x.id === data.id) ? s : [...s, data as Msg]));
  };
  return (
    <div className="flex h-[60vh] min-h-80 flex-col rounded-2xl border border-border bg-card">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {msgs.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender_id === me ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${m.sender_id === me ? "bg-brand-gradient text-primary-foreground" : "bg-secondary"}`}
            >
              {m.body}
              <span className="mt-0.5 block text-right text-[10px] opacity-70">
                {new Date(m.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder={c.write}
          className="min-w-0 flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          aria-label={c.send}
          disabled={!text.trim()}
          className="press flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
