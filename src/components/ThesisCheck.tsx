import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Lightbulb, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { usePortfolio } from "@/lib/store";
import { searchCatalog } from "@/lib/market-search";

export const thesisCopy = {
  en: { title: "AI thesis check", desc: "Enter a ticker and your investment thesis to get a company summary and questions to verify it.", ticker: "Ticker or company", thesis: "Your investment thesis", ph: "e.g. Strong cloud growth and margin expansion will drive earnings over 3 years…", go: "Analyze", stop: "Stop", err: "Analysis failed", short: "Write at least 10 characters." },
  bg: { title: "AI проверка на теза", desc: "Въведи тикер и инвестиционната си теза, за да получиш резюме на компанията и въпроси за проверка.", ticker: "Тикер или компания", thesis: "Твоята инвестиционна теза", ph: "напр. Силният ръст в облака и по-високите маржове ще увеличат печалбата за 3 години…", go: "Анализирай", stop: "Спри", err: "Анализът не успя", short: "Напиши поне 10 символа." },
  de: { title: "KI-Thesencheck", desc: "Ticker und Investmentthese eingeben – erhalte eine Unternehmenszusammenfassung und Prüffragen.", ticker: "Ticker oder Unternehmen", thesis: "Deine Investmentthese", ph: "z. B. Starkes Cloud-Wachstum…", go: "Analysieren", stop: "Stopp", err: "Analyse fehlgeschlagen", short: "Mindestens 10 Zeichen." },
  es: { title: "Verificación de tesis IA", desc: "Introduce un ticker y tu tesis para obtener un resumen y preguntas de verificación.", ticker: "Ticker o empresa", thesis: "Tu tesis de inversión", ph: "p. ej. Fuerte crecimiento en la nube…", go: "Analizar", stop: "Detener", err: "El análisis falló", short: "Mínimo 10 caracteres." },
  it: { title: "Verifica tesi IA", desc: "Inserisci un ticker e la tua tesi per ottenere un riepilogo e domande di verifica.", ticker: "Ticker o azienda", thesis: "La tua tesi d'investimento", ph: "es. Forte crescita del cloud…", go: "Analizza", stop: "Ferma", err: "Analisi non riuscita", short: "Almeno 10 caratteri." },
} as const;

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
    if (thesis.trim().length < 10) { setError(c.short); return; }
    const raw = ticker.trim();
    const symbol = (searchCatalog(raw)[0]?.symbol ?? raw).toUpperCase();
    setOut(""); setError(null); setBusy(true);
    const ac = new AbortController(); ctrl.current = ac;
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/thesis", { method: "POST", signal: ac.signal, headers: { "Content-Type": "application/json", ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}) }, body: JSON.stringify({ symbol, thesis, lang: p.lang }) });
      if (!res.ok || !res.body) throw new Error((await res.text().catch(() => "")) || c.err);
      const reader = res.body.getReader(); const dec = new TextDecoder();
      for (;;) { const { done, value } = await reader.read(); if (done) break; setOut((o) => o + dec.decode(value, { stream: true })); }
    } catch (err) { if ((err as Error).name !== "AbortError") setError((err as Error).message || c.err); }
    finally { setBusy(false); ctrl.current = null; }
  };
  return <div>
    <p className="mb-3 text-sm text-muted-foreground">{c.desc}</p>
    <form onSubmit={run} className="space-y-2">
      <Input aria-label={c.ticker} placeholder={c.ticker} maxLength={60} value={ticker} onChange={(e) => setTicker(e.target.value)} required />
      <Textarea aria-label={c.thesis} placeholder={c.ph} maxLength={3000} rows={4} value={thesis} onChange={(e) => setThesis(e.target.value)} required />
      {busy ? <Button type="button" variant="outline" onClick={() => ctrl.current?.abort()}><Square />{c.stop}</Button>
        : <Button type="submit" className="press"><Lightbulb />{c.go}</Button>}
    </form>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    {(out || busy) && <div className="prose prose-sm mt-4 max-w-none dark:prose-invert">{out ? <ReactMarkdown>{out}</ReactMarkdown> : <div className="h-16 animate-pulse rounded-lg bg-secondary" />}</div>}
  </div>;
}
