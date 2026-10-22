import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePortfolio } from "@/lib/store";
import { snapshotWeights } from "@/lib/journey";

/** Pro: privacy-safe snapshot with class percentages only (no amounts, quantities or costs). */
export function SnapshotCard() {
  const p = usePortfolio();
  const bg = p.lang === "bg";
  const w = snapshotWeights(p.holdings);
  if (!w.length) return <p className="text-sm text-muted-foreground">{bg ? "Няма позиции с реална цена." : "No priced positions yet."}</p>;
  const text = `${bg ? "Моето портфолио в Capispot" : "My portfolio on Capispot"}\n` + w.map((x) => `${p.t(x.cls as never)}: ${x.pct}%`).join("\n");
  return (
    <div className="space-y-3">
      <div className="bg-brand-gradient rounded-2xl p-4 text-primary-foreground">
        <p className="font-display font-semibold">Capispot</p>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-background/30">{w.map((x, i) => <div key={x.cls} style={{ width: `${x.pct}%`, opacity: 1 - i * 0.18 }} className="bg-primary-foreground" />)}</div>
        <ul className="mt-3 space-y-1 text-sm">{w.map((x) => <li key={x.cls} className="flex justify-between"><span>{p.t(x.cls as never)}</span><span className="font-semibold">{x.pct}%</span></li>)}</ul>
      </div>
      <p className="text-xs text-muted-foreground">{bg ? "Само проценти — без суми, бройки и цени." : "Percentages only — no amounts, quantities or prices."}</p>
      <Button onClick={() => void navigator.clipboard.writeText(text).then(() => toast.success(bg ? "Копирано" : "Copied"))}>{bg ? "Копирай за споделяне" : "Copy to share"}</Button>
    </div>
  );
}
