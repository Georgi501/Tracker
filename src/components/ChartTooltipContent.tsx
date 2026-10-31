import type { ReactNode } from "react";
import type { TooltipProps } from "recharts";

type ChartTooltipValue = number | string | Array<number | string>;
type ChartTooltipName = number | string;
type ChartTooltipDatum = NonNullable<
  TooltipProps<ChartTooltipValue, ChartTooltipName>["payload"]
>[number];

type ChartTooltipContentProps = Pick<
  TooltipProps<ChartTooltipValue, ChartTooltipName>,
  "active" | "payload" | "label"
> & {
  formatValue?: (value: number | string, name: string) => ReactNode;
  formatLabel?: (label: unknown, payload: ChartTooltipDatum[]) => ReactNode;
};

export function ChartTooltipContent({
  active,
  payload,
  label,
  formatValue,
  formatLabel,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null;

  const heading = formatLabel ? formatLabel(label, payload) : label;
  return (
    <div className="min-w-32 rounded-lg border border-border/80 bg-popover/90 p-3 text-xs text-popover-foreground shadow-xl backdrop-blur-md">
      {heading != null && <p className="mb-2 font-semibold">{heading}</p>}
      <div className="space-y-1.5">
        {payload.map((item, index) => {
          const value =
            typeof item.value === "number" || typeof item.value === "string" ? item.value : null;
          if (value == null) return null;
          const name = String(item.name ?? item.dataKey ?? "");
          return (
            <div key={`${String(item.dataKey)}-${index}`} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-sm"
                style={{ backgroundColor: item.color ?? "var(--primary)" }}
              />
              <span className="text-muted-foreground">{name}</span>
              <span className="ml-auto pl-3 font-medium tabular-nums text-foreground">
                {formatValue ? formatValue(value, name) : value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
