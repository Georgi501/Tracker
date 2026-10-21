import { Link } from "@tanstack/react-router";
import { ArrowRight, Eye, Search, Upload, PlusCircle, LineChart } from "lucide-react";
import { useEffect, useState } from "react";
import { usePortfolio } from "@/lib/store";
import type { Lang } from "@/lib/i18n";

type Copy = { morning: string; afternoon: string; evening: string; guestTitle: string; guestSub: string; signUp: string; explore: string; emptyTitle: string; emptySub: string; s1: string; s2: string; s3: string; activeSub: string; markets: string; watchlist: string; analytics: string; import: string };
const COPY: Record<Lang, Copy> = {
  en: { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening", guestTitle: "All your investments in one calm place", guestSub: "Track stocks, ETFs and crypto with live prices, dividends and real performance.", signUp: "Create free account", explore: "Explore markets", emptyTitle: "Let's build your portfolio", emptySub: "Three quick steps to get started:", s1: "Import a broker CSV", s2: "Or add a trade manually", s3: "Follow companies in your watchlist", activeSub: "Here's how your portfolio is doing today.", markets: "Markets", watchlist: "Watchlist", analytics: "Analytics", import: "Import" },
  bg: { morning: "Добро утро", afternoon: "Добър ден", evening: "Добър вечер", guestTitle: "Всички твои инвестиции на едно спокойно място", guestSub: "Следи акции, ETF-и и крипто с цени на живо, дивиденти и реална доходност.", signUp: "Създай безплатен профил", explore: "Разгледай пазарите", emptyTitle: "Да изградим портфолиото ти", emptySub: "Три бързи стъпки за начало:", s1: "Импортирай CSV от брокер", s2: "Или добави сделка ръчно", s3: "Следи компании в Watchlist", activeSub: "Ето как се представя портфолиото ти днес.", markets: "Пазари", watchlist: "Watchlist", analytics: "Анализи", import: "Импорт" },
  de: { morning: "Guten Morgen", afternoon: "Guten Tag", evening: "Guten Abend", guestTitle: "Alle Investments an einem ruhigen Ort", guestSub: "Aktien, ETFs und Krypto mit Live-Kursen, Dividenden und echter Rendite verfolgen.", signUp: "Kostenloses Konto", explore: "Märkte entdecken", emptyTitle: "Bauen wir dein Portfolio auf", emptySub: "Drei schnelle Schritte:", s1: "Broker-CSV importieren", s2: "Oder Trade manuell hinzufügen", s3: "Unternehmen auf der Watchlist folgen", activeSub: "So entwickelt sich dein Portfolio heute.", markets: "Märkte", watchlist: "Watchlist", analytics: "Analysen", import: "Import" },
  es: { morning: "Buenos días", afternoon: "Buenas tardes", evening: "Buenas noches", guestTitle: "Todas tus inversiones en un lugar tranquilo", guestSub: "Sigue acciones, ETF y cripto con precios en vivo, dividendos y rentabilidad real.", signUp: "Crear cuenta gratis", explore: "Explorar mercados", emptyTitle: "Construyamos tu cartera", emptySub: "Tres pasos rápidos:", s1: "Importa un CSV del bróker", s2: "O añade una operación manual", s3: "Sigue empresas en tu watchlist", activeSub: "Así va tu cartera hoy.", markets: "Mercados", watchlist: "Watchlist", analytics: "Análisis", import: "Importar" },
  it: { morning: "Buongiorno", afternoon: "Buon pomeriggio", evening: "Buonasera", guestTitle: "Tutti i tuoi investimenti in un posto sereno", guestSub: "Segui azioni, ETF e cripto con prezzi live, dividendi e rendimento reale.", signUp: "Crea account gratis", explore: "Esplora i mercati", emptyTitle: "Costruiamo il tuo portafoglio", emptySub: "Tre passi veloci:", s1: "Importa un CSV del broker", s2: "Oppure aggiungi un'operazione", s3: "Segui aziende nella watchlist", activeSub: "Ecco come va il tuo portafoglio oggi.", markets: "Mercati", watchlist: "Watchlist", analytics: "Analisi", import: "Importa" },
};

const chip = "press inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent";

export function WelcomeHero() {
  const p = usePortfolio();
  const c = COPY[p.lang] ?? COPY.en;
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => setHour(new Date().getHours()), []);
  const greet = hour === null ? "" : hour < 12 ? c.morning : hour < 18 ? c.afternoon : c.evening;
  const meta = p.user?.user_metadata;
  const name = p.displayName.trim() || (meta?.["display_name"] as string | undefined) || (meta?.["full_name"] as string | undefined) || (meta?.["name"] as string | undefined) || undefined;

  if (!p.user) return (
    <section className="rise rounded-3xl border border-border bg-card p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold tracking-tight md:text-5xl">{c.guestTitle}</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">{c.guestSub}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/auth" className="press inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground">{c.signUp}<ArrowRight className="size-4" /></Link>
        <Link to="/markets" className={chip}><Search className="size-4" />{c.explore}</Link>
      </div>
    </section>
  );

  if (!p.holdings.length) return (
    <section className="rise rounded-3xl border border-border bg-card p-6 md:p-8">
      <p className="text-sm text-muted-foreground">{greet}{name ? `, ${name}` : ""}</p>
      <h1 className="font-display text-2xl font-bold md:text-4xl">{c.emptyTitle}</h1>
      <p className="mt-2 text-muted-foreground">{c.emptySub}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[{ to: "/brokers", icon: Upload, t: c.s1 }, { to: "/holdings", icon: PlusCircle, t: c.s2 }, { to: "/watchlist", icon: Eye, t: c.s3 }].map((s, i) => (
          <Link key={s.to} to={s.to} className="card-interactive press flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-4">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
            <s.icon className="size-4 text-muted-foreground" /><span className="font-medium">{s.t}</span>
          </Link>
        ))}
      </div>
    </section>
  );

  return (
    <section className="rise flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{greet}{name ? `, ${name}` : ""}</h1>
        <p className="text-sm text-muted-foreground">{c.activeSub}</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Link to="/markets" className={chip}><Search className="size-4" />{c.markets}</Link>
        <Link to="/watchlist" className={chip}><Eye className="size-4" />{c.watchlist}</Link>
        <Link to="/analytics" className={chip}><LineChart className="size-4" />{c.analytics}</Link>
        <Link to="/brokers" className={chip}><Upload className="size-4" />{c.import}</Link>
      </div>
    </section>
  );
}
