import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { ArrowUp, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/AppShell";
import { AdvisorLayout } from "@/components/AdvisorLayout";
import { Button } from "@/components/ui/button";
import { usePortfolio } from "@/lib/store";
import { advisorCopy } from "@/lib/advisor-i18n";

export const Route = createFileRoute("/advisor/$threadId")({
  head: () => ({
    meta: [
      { title: "Conversation — Capispot AI Advisor" },
      { name: "description", content: "Your saved AI Advisor conversation about your portfolio" },
      { property: "og:title", content: "AI Advisor conversation — Capispot" },
      {
        property: "og:description",
        content: "Answers grounded in your real positions and transactions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const p = usePortfolio();
  const history = useQuery({
    queryKey: ["ai-messages", threadId],
    enabled: !!p.user && p.isPro,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_messages")
        .select("message_id,role,parts")
        .eq("thread_id", threadId)
        .order("created_at");
      if (error) throw error;
      return data.map((m) => ({
        id: m.message_id,
        role: m.role as UIMessage["role"],
        parts: m.parts as UIMessage["parts"],
      }));
    },
  });
  return (
    <AdvisorLayout activeId={threadId}>
      {history.data ? (
        <ChatWindow key={threadId} threadId={threadId} initial={history.data} />
      ) : (
        <Card>
          <p className="text-sm text-muted-foreground">…</p>
        </Card>
      )}
    </AdvisorLayout>
  );
}

function ChatWindow({ threadId, initial }: { threadId: string; initial: UIMessage[] }) {
  const p = usePortfolio();
  const c = advisorCopy[p.lang];
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initial,
    transport: new DefaultChatTransport({
      api: "/api/advisor",
      body: { threadId },
      fetch: async (url, init) => {
        const { data } = await supabase.auth.getSession();
        const h = new Headers(init?.headers);
        if (data.session) h.set("Authorization", `Bearer ${data.session.access_token}`);
        const res = await fetch(url, { ...init, headers: h });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || c.error);
        return res;
      },
    }),
    onError: (e) => toast.error(e.message || c.error),
    onFinish: () => {
      void qc.invalidateQueries({ queryKey: ["ai-threads"] });
      qc.removeQueries({ queryKey: ["ai-messages", threadId] });
    },
  });
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages]);
  useEffect(() => {
    if (!busy) ref.current?.focus();
  }, [busy]);
  const submit = () => {
    const text = input.trim();
    if (!text || busy) return;
    void sendMessage({ text });
    setInput("");
  };
  return (
    <Card className="flex h-[calc(100vh-14rem)] min-h-[420px] flex-col p-0">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {!messages.length && <p className="text-sm text-muted-foreground">{c.disclaimer}</p>}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground"
                  : "max-w-none text-sm leading-relaxed"
              }
            >
              {m.parts.map((part, i) =>
                part.type === "text" ? (
                  m.role === "user" ? (
                    <p key={i} className="whitespace-pre-wrap">
                      {part.text}
                    </p>
                  ) : (
                    <div
                      key={i}
                      className="prose prose-sm max-w-none dark:prose-invert [&_table]:text-xs"
                    >
                      <ReactMarkdown>{part.text}</ReactMarkdown>
                    </div>
                  )
                ) : part.type === "reasoning" && part.text ? (
                  <details key={i} className="mb-2 text-xs text-muted-foreground">
                    <summary>{c.reasoning}</summary>
                    <p className="mt-1 whitespace-pre-wrap">{part.text}</p>
                  </details>
                ) : null,
              )}
            </div>
          </div>
        ))}
        {status === "submitted" && <p className="text-sm text-muted-foreground">{c.thinking}</p>}
        <div ref={end} />
      </div>
      <form
        className="flex items-end gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          ref={ref}
          autoFocus
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={c.placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {busy ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label={c.stop}
            onClick={() => void stop()}
          >
            <Square size={16} />
          </Button>
        ) : (
          <Button type="submit" size="icon" aria-label={c.send} disabled={!input.trim()}>
            <ArrowUp size={16} />
          </Button>
        )}
      </form>
    </Card>
  );
}
