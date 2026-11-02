import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type VideoMode = "visitor" | "pro";
type AppTheme = "light" | "dark";

function isHeightMessage(value: unknown): value is { type: string; height: number } {
  if (typeof value !== "object" || value === null || !("type" in value) || !("height" in value)) {
    return false;
  }
  return (
    value.type === "capispot-video-preview:resize" &&
    typeof value.height === "number" &&
    Number.isFinite(value.height)
  );
}

export function VideoPresentation({ mode, theme }: { mode: VideoMode; theme: AppTheme }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(560);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frame.current?.contentWindow ||
        !isHeightMessage(event.data)
      ) {
        return;
      }
      setHeight(Math.max(360, Math.min(event.data.height, 1800)));
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <section
      aria-label="Capispot product walkthrough"
      className="grid overflow-hidden rounded-3xl border border-border bg-card lg:col-span-3 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]"
    >
      <div className="flex flex-col items-start justify-center gap-4 border-b border-border p-6 sm:p-8 lg:border-b-0 lg:border-r">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          PRODUCT WALKTHROUGH
        </p>
        <h2 className="max-w-md text-2xl font-semibold tracking-tight sm:text-3xl">
          See Capispot in action.
        </h2>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          Explore real screens, from portfolio tracking to market context and Pro insights.
        </p>
        <a
          href="/video-preview/"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Open the full walkthrough
          <ArrowUpRight size={16} aria-hidden />
        </a>
      </div>
      <div className="min-w-0 bg-background/30">
        <iframe
          key={mode}
          ref={frame}
          title={
            mode === "pro" ? "Capispot Pro tools walkthrough" : "Capispot portfolio walkthrough"
          }
          src={`/video-preview/?embed=1&mode=${mode}&theme=${theme}`}
          className="block w-full border-0"
          style={{ height }}
          loading="lazy"
        />
      </div>
    </section>
  );
}
