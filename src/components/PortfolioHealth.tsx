import { Link } from "@tanstack/react-router";
import { Activity, Lock, ShieldAlert, Sparkles } from "lucide-react";
import { Card } from "@/components/AppShell";
import { ProBadge } from "@/components/ProFeatures";
import { portfolioHealth, stressScenarios, type HealthPart, type Scenario } from "@/lib/health";
import { usePortfolio } from "@/lib/store";
import type { Lang } from "@/lib/i18n";

type Copy = {
  title: string; sub: string; score: string; parts: Record<HealthPart["key"], string>;
  actions: string; scen: string; scenKeys: Record<Scenario["key"], string>; hypo: string;
  aTop: (s: string, w: string) => string; aSector: (w: string) => string; aCur: (w: string) => string; aDiv: (n: number) => string; aOk: string;
  teaser: (n: number) => string; teaserOk: string; unlock: string; empty: string;
};

const copy: Record<Lang, Copy> = {
  en: { title: "Investor Brief", sub: "Your portfolio health and this week's priorities", score: "Health score", parts: { diversification: "Diversification", position: "Largest position", sector: "Sector focus", currency: "Currency exposure" }, actions: "Top actions this week", scen: "What if…", scenKeys: { market: "Stock market −20%", crypto: "Crypto −50%", usd: "USD −10% vs base" }, hypo: "Hypothetical shocks on your current real values, not forecasts.", aTop: (s, w) => `Review concentration in ${s} (${w} of portfolio).`, aSector: (w) => `One sector holds ${w} of your stocks — consider spreading out.`, aCur: (w) => `${w} sits in one currency — FX moves affect you strongly.`, aDiv: (n) => `Only ${n} position(s) — add more holdings to reduce single-name risk.`, aOk: "No urgent issues — keep your plan and contributions steady.", teaser: (n) => `We found ${n} risk signal(s) in your portfolio Pro shows which positions create them and what a market drop would cost.`, teaserOk: "Pro gives you a health score, weekly priorities and stress scenarios for your portfolio", unlock: "Unlock Investor Brief", empty: "Add positions with live prices to see your brief." },
  bg: { title: "Инвеститорски бриф", sub: "Здравето на портфолиото и приоритетите за седмицата", score: "Здравен индекс", parts: { diversification: "Диверсификация", position: "Най-голяма позиция", sector: "Секторен фокус", currency: "Валутна експозиция" }, actions: "Топ действия тази седмица", scen: "Какво ако…", scenKeys: { market: "Акции −20%", crypto: "Крипто −50%", usd: "USD −10% спрямо базата" }, hypo: "Хипотетични шокове върху реалните текущи стойности, не прогнози.", aTop: (s, w) => `Провери концентрацията в ${s} (${w} от портфолиото).`, aSector: (w) => `Един сектор държи ${w} от акциите ти — помисли за разпределение.`, aCur: (w) => `${w} е в една валута — валутните движения те засягат силно.`, aDiv: (n) => `Само ${n} позиция(и) — добави още, за да намалиш риска от една компания.`, aOk: "Няма спешни проблеми — продължавай с плана и вноските си.", teaser: (n) => `Открихме ${n} рисков(и) сигнал(а) в портфолиото ти. Pro показва кои позиции ги създават и колко би струвал пазарен спад.`, teaserOk: "Pro ти дава здравен индекс, седмични приоритети и стрес сценарии за портфолиото.", unlock: "Отключи бриф", empty: "Добави позиции с реални цени, за да видиш брифа." },
  de: { title: "Investor-Briefing", sub: "Depot-Gesundheit und Prioritäten der Woche", score: "Gesundheitswert", parts: { diversification: "Diversifikation", position: "Größte Position", sector: "Sektorfokus", currency: "Währungsrisiko" }, actions: "Top-Aktionen dieser Woche", scen: "Was wäre, wenn…", scenKeys: { market: "Aktien −20%", crypto: "Krypto −50%", usd: "USD −10% ggü. Basis" }, hypo: "Hypothetische Schocks auf aktuelle reale Werte, keine Prognosen.", aTop: (s, w) => `Konzentration in ${s} prüfen (${w} des Depots).`, aSector: (w) => `Ein Sektor hält ${w} deiner Aktien — breiter streuen.`, aCur: (w) => `${w} in einer Währung — Wechselkurse wirken stark.`, aDiv: (n) => `Nur ${n} Position(en) — mehr Titel senken das Einzelrisiko.`, aOk: "Keine dringenden Punkte — bleib bei deinem Plan.", teaser: (n) => `Wir haben ${n} Risikosignal(e) gefunden. Pro zeigt, welche Positionen sie verursachen und was ein Crash kosten würde.`, teaserOk: "Pro bietet Gesundheitswert, Wochenprioritäten und Stressszenarien.", unlock: "Briefing freischalten", empty: "Füge Positionen mit Kursen hinzu, um dein Briefing zu sehen." },
  es: { title: "Informe del inversor", sub: "Salud de tu cartera y prioridades de la semana", score: "Índice de salud", parts: { diversification: "Diversificación", position: "Mayor posición", sector: "Foco sectorial", currency: "Exposición a divisas" }, actions: "Acciones clave esta semana", scen: "Qué pasaría si…", scenKeys: { market: "Bolsa −20%", crypto: "Cripto −50%", usd: "USD −10% vs base" }, hypo: "Choques hipotéticos sobre tus valores reales actuales, no previsiones.", aTop: (s, w) => `Revisa la concentración en ${s} (${w} de la cartera).`, aSector: (w) => `Un sector concentra ${w} de tus acciones — diversifica.`, aCur: (w) => `${w} está en una divisa — el tipo de cambio te afecta mucho.`, aDiv: (n) => `Solo ${n} posición(es) — añade más para reducir el riesgo individual.`, aOk: "Sin problemas urgentes — mantén tu plan.", teaser: (n) => `Encontramos ${n} señal(es) de riesgo. Pro muestra qué posiciones las crean y cuánto costaría una caída.`, teaserOk: "Pro te da índice de salud, prioridades semanales y escenarios de estrés.", unlock: "Desbloquear informe", empty: "Añade posiciones con precios para ver tu informe." },
  it: { title: "Brief dell'investitore", sub: "Salute del portafoglio e priorità della settimana", score: "Indice di salute", parts: { diversification: "Diversificazione", position: "Posizione maggiore", sector: "Focus settoriale", currency: "Esposizione valutaria" }, actions: "Azioni chiave della settimana", scen: "E se…", scenKeys: { market: "Azioni −20%", crypto: "Cripto −50%", usd: "USD −10% vs base" }, hypo: "Shock ipotetici sui valori reali attuali, non previsioni.", aTop: (s, w) => `Verifica la concentrazione in ${s} (${w} del portafoglio).`, aSector: (w) => `Un settore pesa ${w} delle tue azioni — diversifica.`, aCur: (w) => `${w} è in una sola valuta — il cambio pesa molto.`, aDiv: (n) => `Solo ${n} posizione/i — aggiungine altre per ridurre il rischio singolo.`, aOk: "Nessun problema urgente — mantieni il piano.", teaser: (n) => `Abbiamo trovato ${n} segnale/i di rischio. Pro mostra quali posizioni li creano e quanto costerebbe un calo.`, teaserOk: "Pro offre indice di salute, priorità settimanali e scenari di stress.", unlock: "Sblocca il brief", empty: "Aggiungi posizioni con prezzi per vedere il brief." },
};

const f = (n: number) => `${n.toFixed(0)}%`;
const tone = (s: number) => (s >= 75 ? "text-success" : s >= 45 ? "text-accent-foreground" : "text-destructive");
const bar = (s: number) => (s >= 75 ? "bg-success" : s >= 45 ? "bg-accent" : "bg-destructive");

export function PortfolioHealth() {
  const p = usePortfolio();
  const c = copy[p.lang];
  const report = portfolioHealth(p.holdings);
  if (!p.user || !report) return null;

  const by = (k: HealthPart["key"]) => report.parts.find((x) => x.key === k)!;
  const actions: string[] = [];
  if (by("position").score < 100 && report.topPosition) actions.push(c.aTop(report.topPosition.symbol, f(report.topPosition.weight)));
  if (by("sector").score < 100) actions.push(c.aSector(f(by("sector").value)));
  if (by("currency").score < 100) actions.push(c.aCur(f(by("currency").value)));
  if (by("diversification").score < 100) actions.push(c.aDiv(by("diversification").value));
  const signals = actions.length;
  const top3 = actions.slice(0, 3);

  if (!p.isPro) {
    return (
      <Card className="lg:col-span-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary"><ShieldAlert size={18} /></span>
            <div>
              <div className="flex items-center gap-2"><h3 className="font-display font-semibold">{c.title}</h3><ProBadge /></div>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">{signals ? c.teaser(signals) : c.teaserOk}</p>
            </div>
          </div>
          <Link to="/pricing" className="press inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 sm:self-center">
            <Lock size={14} /> {c.unlock}
          </Link>
        </div>
      </Card>
    );
  }

  const scenarios = stressScenarios(p.holdings, p.currency).filter((s) => s.loss > 0);
  return (
    <Card className="lg:col-span-3">
      <div className="mb-4 flex items-center gap-2"><Activity size={18} className="text-primary" /><h3 className="font-display font-semibold">{c.title}</h3><ProBadge /></div>
      <p className="-mt-3 mb-4 text-sm text-muted-foreground">{c.sub}</p>
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.score}</div>
          <div className={`font-display text-5xl font-bold ${tone(report.score)}`}>{report.score}<span className="text-lg text-muted-foreground">/100</span></div>
          <div className="mt-3 space-y-2">
            {report.parts.map((x) => (
              <div key={x.key}>
                <div className="flex justify-between text-xs"><span>{c.parts[x.key]}</span><span className="tabular-nums text-muted-foreground">{Math.round(x.score)}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className={`h-1.5 rounded-full ${bar(x.score)}`} style={{ width: `${x.score}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Sparkles size={14} className="text-primary" />{c.actions}</div>
          <ol className="space-y-2">
            {(top3.length ? top3 : [c.aOk]).map((a, i) => (
              <li key={a} className="flex gap-2 rounded-xl bg-muted/50 p-2.5 text-sm"><span className="font-display font-bold text-primary">{i + 1}</span>{a}</li>
            ))}
          </ol>
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold">{c.scen}</div>
          <div className="space-y-2">
            {scenarios.map((s) => (
              <div key={s.key} className="flex items-center justify-between rounded-xl border border-border p-2.5 text-sm">
                <span>{c.scenKeys[s.key]}</span>
                <span className="text-right tabular-nums text-destructive">−{p.money(s.loss)}<span className="block text-xs text-muted-foreground">−{s.lossPct.toFixed(1)}%</span></span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{c.hypo}</p>
        </div>
      </div>
    </Card>
  );
}
