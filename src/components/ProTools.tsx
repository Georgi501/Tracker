import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { CheckCircle2, Sparkles, Square, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { usePortfolio } from "@/lib/store";
import { qualityIssues, type IssueKind } from "@/lib/quality";

type L = "en" | "bg" | "de" | "es" | "it";
const en = {
  review: "AI portfolio review",
  reviewDesc:
    "A review of your own portfolio: concentration, risks, questions and a weekly checklist.",
  go: "Review my portfolio",
  stop: "Stop",
  err: "Review failed",
  quality: "Data quality check",
  qualityDesc: "Finds duplicates, oversells, missing prices and future dates in your transactions.",
  clean: "No issues found — your data looks clean.",
  k: {
    duplicate: "Duplicate transactions",
    oversell: "Sold more than held",
    missingPrice: "Missing price",
    future: "Future date",
    noQuote: "No live quote",
    orphan: "Transaction without asset",
  } as Record<IssueKind, string>,
};
const bg: typeof en = {
  review: "AI преглед на портфолиото",
  reviewDesc:
    "Преглед на собственото ти портфолио: концентрация, рискове, въпроси и седмичен чеклист.",
  go: "Прегледай портфолиото ми",
  stop: "Спри",
  err: "Прегледът не успя",
  quality: "Проверка на данните",
  qualityDesc: "Открива дубликати, продажби над наличното, липсващи цени и бъдещи дати.",
  clean: "Няма открити проблеми — данните изглеждат чисти.",
  k: {
    duplicate: "Дублирани трансакции",
    oversell: "Продадено повече от наличното",
    missingPrice: "Липсваща цена",
    future: "Бъдеща дата",
    noQuote: "Няма текуща цена",
    orphan: "Трансакция без актив",
  },
};
const de: typeof en = {
  ...en,
  review: "KI-Portfolio-Review",
  reviewDesc: "Review deines Portfolios: Konzentration, Risiken, Fragen und Wochen-Checkliste.",
  go: "Portfolio prüfen",
  stop: "Stopp",
  quality: "Datenqualität",
  clean: "Keine Probleme gefunden.",
};
const es: typeof en = {
  ...en,
  review: "Revisión IA de cartera",
  reviewDesc: "Revisión de tu cartera: concentración, riesgos, preguntas y lista semanal.",
  go: "Revisar mi cartera",
  stop: "Detener",
  quality: "Calidad de datos",
  clean: "Sin problemas.",
};
const it: typeof en = {
  ...en,
  review: "Revisione IA del portafoglio",
  reviewDesc:
    "Revisione del tuo portafoglio: concentrazione, rischi, domande e checklist settimanale.",
  go: "Rivedi il portafoglio",
  stop: "Ferma",
  quality: "Qualità dei dati",
  clean: "Nessun problema.",
};
export const proToolsCopy: Record<L, typeof en> = { en, bg, de, es, it };

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
  const issues = qualityIssues(p.assets, p.transactions);
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
