import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { searchCatalog } from "@/lib/market-search";
import { usePortfolio } from "@/lib/store";
import { thesisCopy } from "@/lib/thesis-copy";
import { Lightbulb, Square } from "lucide-react";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export function ThesisCheck() {
  const p = usePortfolio();
  const c = thesisCopy[p.lang];
  const [ticker, setTicker] = useState("");
  const [thesis, setThesis] = useState("");
  const [out, setOut] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (thesis.trim().length < 10) {
      setError(c.short);
      return;
    }
    const raw = ticker.trim();
    const symbol = (searchCatalog(raw)[0]?.symbol ?? raw).toUpperCase();
    setOut("");
    setError(null);
    setBusy(true);
    const ac = new AbortController();
    ctrl.current = ac;
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/thesis", {
        method: "POST",
        signal: ac.signal,
        headers: {
          "Content-Type": "application/json",
          ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
        },
        body: JSON.stringify({ symbol, thesis, lang: p.lang }),
      });
      if (!res.ok || !res.body) throw new Error((await res.text().catch(() => "")) || c.err);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setOut((o) => o + dec.decode(value, { stream: true }));
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message || c.err);
    } finally {
      setBusy(false);
      ctrl.current = null;
    }
  };
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">{c.desc}</p>
      <p className="mb-3 text-xs text-muted-foreground">
        {p.lang === "bg"
          ? "AI резултатите са обща информация, не са инвестиционен съвет или препоръка."
          : "AI output is general information, not investment advice or a recommendation."}{" "}
        <a
          href="/policies/ai-acceptable-use.html"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {p.lang === "bg" ? "Правила за AI" : "AI policy"}
        </a>
      </p>
      <form onSubmit={run} className="space-y-2">
        <Input
          aria-label={c.ticker}
          placeholder={c.ticker}
          maxLength={60}
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          required
        />
        <Textarea
          aria-label={c.thesis}
          placeholder={c.ph}
          maxLength={3000}
          rows={4}
          value={thesis}
          onChange={(e) => setThesis(e.target.value)}
          required
        />
        {busy ? (
          <Button type="button" variant="outline" onClick={() => ctrl.current?.abort()}>
            <Square />
            {c.stop}
          </Button>
        ) : (
          <Button type="submit" className="press">
            <Lightbulb />
            {c.go}
          </Button>
        )}
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {(out || busy) && (
        <div className="prose prose-sm mt-4 max-w-none dark:prose-invert">
          {out ? (
            <ReactMarkdown>{out}</ReactMarkdown>
          ) : (
            <div className="h-16 animate-pulse rounded-lg bg-secondary" />
          )}
        </div>
      )}
    </div>
  );
}
