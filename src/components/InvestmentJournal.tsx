import { Card } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/lib/i18n";
import { reviewDue } from "@/lib/journey";
import { usePortfolio } from "@/lib/store";
import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type JournalCopy = Record<
  "journal" | "signIn" | "thesis" | "horizon" | "review" | "due" | "save" | "saved",
  string
>;
const STATUS_COPY: Record<
  Lang,
  { loading: string; loadError: string; retry: string; saveError: string }
> = {
  en: {
    loading: "Loading journal…",
    loadError: "We couldn't load this journal. Try again before editing or saving.",
    retry: "Try again",
    saveError: "The journal could not be saved. Your draft is still here. Try again.",
  },
  bg: {
    loading: "Зареждане на дневника…",
    loadError: "Не успяхме да заредим дневника. Опитай отново, преди да редактираш или запазваш.",
    retry: "Опитай отново",
    saveError: "Дневникът не беше запазен. Черновата е запазена във формата. Опитай отново.",
  },
  de: {
    loading: "Anlagejournal wird geladen…",
    loadError:
      "Das Anlagejournal konnte nicht geladen werden. Versuche es erneut, bevor du es bearbeitest oder speicherst.",
    retry: "Erneut versuchen",
    saveError:
      "Das Anlagejournal konnte nicht gespeichert werden. Dein Entwurf bleibt erhalten. Versuche es erneut.",
  },
  es: {
    loading: "Cargando el diario…",
    loadError: "No se pudo cargar el diario. Inténtalo de nuevo antes de editarlo o guardarlo.",
    retry: "Reintentar",
    saveError:
      "No se pudo guardar el diario. Tu borrador sigue en el formulario. Inténtalo de nuevo.",
  },
  it: {
    loading: "Caricamento del diario…",
    loadError: "Impossibile caricare il diario. Riprova prima di modificarlo o salvarlo.",
    retry: "Riprova",
    saveError: "Impossibile salvare il diario. La bozza rimane nel modulo. Riprova.",
  },
};

export function InvestmentJournal({ symbol, c }: { symbol: string; c: JournalCopy }) {
  const p = usePortfolio();
  const userId = p.user?.id ?? null;
  const normalizedSymbol = symbol.toUpperCase();
  // Each identity owns a separate form lifetime, including A → B → A navigation.
  return (
    <JournalForm
      key={JSON.stringify([userId, normalizedSymbol])}
      userId={userId}
      symbol={normalizedSymbol}
      c={c}
      lang={p.lang}
    />
  );
}

function JournalForm({
  userId,
  symbol,
  c,
  lang,
}: {
  userId: string | null;
  symbol: string;
  c: JournalCopy;
  lang: Lang;
}) {
  const [thesis, setThesis] = useState("");
  const [horizon, setHorizon] = useState("");
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const mounted = useRef(false);
  const saving = useRef(false);
  const statusCopy = STATUS_COPY[lang];
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("journal_notes")
          .select("thesis,horizon,review_date")
          .eq("user_id", userId)
          .eq("symbol", symbol)
          .maybeSingle();
        if (!active) return;
        if (error) {
          setLoadStatus("error");
          return;
        }
        setThesis(data?.thesis ?? "");
        setHorizon(data?.horizon ?? "");
        setReview(data?.review_date ?? "");
        setLoadStatus("ready");
      } catch {
        if (active) setLoadStatus("error");
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [userId, symbol, retry]);
  const save = async () => {
    if (!userId || loadStatus !== "ready" || saving.current || !mounted.current) return;
    saving.current = true;
    setBusy(true);
    // Capture this form's identity and draft before starting the write.
    const row = {
      user_id: userId,
      symbol,
      thesis: thesis.slice(0, 4000),
      horizon: horizon.slice(0, 100),
      review_date: review || null,
      updated_at: new Date().toISOString(),
    };
    try {
      const { error } = await supabase
        .from("journal_notes")
        .upsert(row, { onConflict: "user_id,symbol" });
      if (!mounted.current) return;
      if (error) toast.error(statusCopy.saveError);
      else toast.success(c.saved);
    } catch {
      if (mounted.current) toast.error(statusCopy.saveError);
    } finally {
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const disabled = loadStatus !== "ready" || busy;
  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 font-display font-semibold">
        <BookOpen className="h-4 w-4 text-primary" />
        {c.journal}
      </h2>
      {!userId ? (
        <Link to="/auth" className="text-sm font-semibold text-primary">
          {c.signIn}
        </Link>
      ) : (
        <div className="space-y-3">
          {loadStatus === "loading" && (
            <p role="status" className="text-sm text-muted-foreground">
              {statusCopy.loading}
            </p>
          )}
          {loadStatus === "error" && (
            <div role="alert" className="space-y-2 text-sm">
              <p>{statusCopy.loadError}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setLoadStatus("loading");
                  setRetry((value) => value + 1);
                }}
              >
                {statusCopy.retry}
              </Button>
            </div>
          )}
          <fieldset
            disabled={disabled}
            className="space-y-3"
            aria-busy={loadStatus === "loading" || busy}
          >
            {reviewDue(review || null) && (
              <p className="rounded-xl bg-accent px-3 py-2 text-sm text-accent-foreground">
                {c.due}
              </p>
            )}
            <label className="block text-sm">
              {c.thesis}
              <textarea
                value={thesis}
                onChange={(e) => setThesis(e.target.value)}
                rows={4}
                maxLength={4000}
                className="mt-1 w-full rounded-xl border border-border bg-background p-2 disabled:opacity-60"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                {c.horizon}
                <input
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value)}
                  maxLength={100}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2 disabled:opacity-60"
                />
              </label>
              <label className="text-sm">
                {c.review}
                <input
                  type="date"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2 disabled:opacity-60"
                />
              </label>
            </div>
            <Button onClick={() => void save()} disabled={disabled}>
              {c.save}
            </Button>
          </fieldset>
        </div>
      )}
    </Card>
  );
}
