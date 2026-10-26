import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { usePortfolio } from "@/lib/store";
import { groupBy } from "@/lib/portfolio";
import { Card } from "./AppShell";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];

export function AllocationCard() {
  const p = usePortfolio();
  const [mode, setMode] = useState<"class" | "sector" | "region">("class");
  const data = groupBy(
    p.holdings.filter((h) => Number.isFinite(h.value)),
    (h) =>
      mode === "class"
        ? p.t(h.asset.type)
        : p.label(mode === "sector" ? h.asset.sector : h.asset.region),
  );
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display font-semibold">{p.t("allocation")}</h3>
        <div className="flex rounded-full bg-secondary p-0.5 text-xs">
          {(["class", "sector", "region"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-2.5 py-1 font-semibold ${mode === m ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              {p.t(m === "class" ? "byClass" : m === "sector" ? "bySector" : "byRegion")}
            </button>
          ))}
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="95%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => p.money(v)}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                color: "var(--foreground)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="flex-1">{d.name}</span>
            <span className="text-muted-foreground">{p.money(d.value, { compact: true })}</span>
            <span className="w-14 text-right font-semibold">
              {((d.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
