import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { proToolsCopy } from "@/lib/pro-tools-copy";
import { qualityIssues } from "@/lib/quality";
import { usePortfolio } from "@/lib/store";
import { readTargetReviews, readTargets } from "@/lib/watchlist";
import { CheckCircle2, Sparkles, Square, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export function PortfolioReview() {
  const p = usePortfolio();
  const c = proToolsCopy[p.lang];
  const [out, setOut] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  const run = async () => {
    setOut("");
    setError(null);
    setBusy(true);
    const ac = new AbortController();
    ctrl.current = ac;
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/review", {
        method: "POST",
        signal: ac.signal,
        headers: {
          "Content-Type": "application/json",
          ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
        },
        body: JSON.stringify({ lang: p.lang }),
      });
      if (!res.ok || !res.body) throw new Error((await res.text().catch(() => "")) || c.err);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setOut((o) => o + dec.decode(value, { stream: true }));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message || c.err);
    } finally {
      setBusy(false);
      ctrl.current = null;
    }
  };
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">{c.reviewDesc}</p>
      {busy ? (
        <Button variant="outline" onClick={() => ctrl.current?.abort()}>
          <Square />
          {c.stop}
        </Button>
      ) : (
        <Button className="press" disabled={!p.transactions.length} onClick={() => void run()}>
          <Sparkles />
          {c.go}
        </Button>
      )}
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
            <div className="h-16 animate-pulse rounded-xl bg-secondary" />
          )}
        </div>
      )}
    </div>
  );
}

export function DataQuality() {
  const p = usePortfolio();
  const c = proToolsCopy[p.lang];
  const [targetReviews, setTargetReviews] = useState<Record<string, string>>({});
  const [targets, setTargets] = useState<Record<string, number>>({});
  useEffect(() => {
    const sync = () => {
      setTargetReviews(readTargetReviews());
      setTargets(readTargets());
    };
    sync();
    window.addEventListener("folio-watch", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("folio-watch", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const activeReviews = Object.fromEntries(
    Object.keys(targets)
      .filter((symbol) => targetReviews[symbol])
      .map((symbol) => [symbol, targetReviews[symbol]!]),
  );
  const issues = qualityIssues(
    p.assets,
    p.transactions,
    undefined,
    activeReviews,
    Date.now(),
    p.corporateActions,
  );
  if (!issues.length)
    return (
      <p className="flex items-center gap-2 text-sm text-success">
        <CheckCircle2 size={16} />
        {c.clean}
      </p>
    );
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">{c.qualityDesc}</p>
      <ul className="space-y-2">
        {issues.slice(0, 30).map((i, n) => (
          <li key={n} className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm">
            <TriangleAlert size={15} className="shrink-0 text-destructive" />
            <span className="font-semibold">{i.symbol}</span>
            <span className="text-muted-foreground">
              {c.k[i.kind]}
              {i.count ? ` ×${i.count}` : ""}
            </span>
            {i.date && <span className="ml-auto text-xs text-muted-foreground">{i.date}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
