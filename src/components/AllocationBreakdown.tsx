import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { allocationColor } from "@/lib/palette";

type AllocationItem = { name: string; value: number };

export function AllocationBreakdown({
  data,
  totalLabel,
  formatValue,
}: {
  data: AllocationItem[];
  totalLabel: string;
  formatValue: (value: number, compact?: boolean) => string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const rows = data
    .filter((item) => Number.isFinite(item.value) && item.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  const activeIndex = hoveredIndex ?? selectedIndex;

  return (
    <div className="grid items-center gap-2 sm:grid-cols-[minmax(160px,0.9fr)_minmax(0,1.1fr)] sm:gap-5">
      <div
        role="img"
        aria-label={`${totalLabel}: ${formatValue(total)}. ${rows
          .map(
            (item) =>
              `${item.name}: ${formatValue(item.value)} (${((item.value / total) * 100).toFixed(1)}%)`,
          )
          .join(", ")}`}
        className="relative mx-auto h-36 w-full max-w-[240px] sm:h-44"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {total > 0 && (
              <Pie
                data={[{ name: "Portfolio", value: total }]}
                dataKey="value"
                innerRadius="60%"
                outerRadius="90%"
                stroke="none"
                fill="var(--secondary)"
                isAnimationActive={false}
                aria-hidden="true"
              />
            )}
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              innerRadius="61%"
              outerRadius="89%"
              paddingAngle={0}
              cornerRadius={0}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {rows.map((item, index) => (
                <Cell
                  key={item.name}
                  fill={allocationColor(item.name)}
                  opacity={activeIndex == null || activeIndex === index ? 1 : 0.32}
                  stroke={activeIndex === index ? "var(--background)" : "var(--card)"}
                  strokeWidth={activeIndex === index ? 3 : 2}
                  style={{ cursor: "pointer", transition: "opacity 160ms ease" }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() =>
                    setSelectedIndex((selected) => (selected === index ? null : index))
                  }
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
          <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">
            {totalLabel}
          </span>
          <span className="numeric-display mt-0.5 max-w-full truncate text-sm font-bold sm:text-base">
            {formatValue(total)}
          </span>
        </div>
      </div>

      <ul className="space-y-0.5">
        {rows.map((item, index) => {
          const share = (item.value / total) * 100;
          const active = activeIndex === index;
          return (
            <li key={item.name}>
              <button
                type="button"
                aria-pressed={selectedIndex === index}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(index)}
                onBlur={() => setHoveredIndex(null)}
                onClick={() => setSelectedIndex((selected) => (selected === index ? null : index))}
                className={`w-full rounded-xl px-2.5 py-1.5 text-left transition-colors ${
                  active ? "bg-secondary/80" : "hover:bg-secondary/50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: allocationColor(item.name) }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
                  <span className="numeric-display shrink-0 text-xs text-muted-foreground">
                    {formatValue(item.value, true)}
                  </span>
                  <span className="numeric-display w-12 shrink-0 text-right text-sm font-semibold">
                    {share.toFixed(1)}%
                  </span>
                </span>
                <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full transition-[width,opacity] duration-200"
                    style={{
                      width: `${share}%`,
                      backgroundColor: allocationColor(item.name),
                      opacity: activeIndex == null || active ? 1 : 0.4,
                    }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
