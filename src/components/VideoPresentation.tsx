import type { Lang } from "@/lib/i18n";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type VideoMode = "visitor" | "pro";
type AppTheme = "light" | "dark";

const COPY: Record<
  Lang,
  {
    label: string;
    title: string;
    description: string;
    fullWalkthrough: string;
    visitorTab: string;
    proTab: string;
    visitorFrame: string;
    proFrame: string;
  }
> = {
  en: {
    label: "PRODUCT WALKTHROUGH",
    title: "See CapiSpot in action.",
    description:
      "Explore real screens, from portfolio tracking to market context and Pro insights.",
    fullWalkthrough: "Open the full walkthrough",
    visitorTab: "Portfolio tour",
    proTab: "Pro tools",
    visitorFrame: "CapiSpot portfolio walkthrough",
    proFrame: "CapiSpot Pro tools walkthrough",
  },
  bg: {
    label: "РАЗГЛЕДАЙ ПРОДУКТА",
    title: "Виж CapiSpot в действие.",
    description:
      "Разгледай реални екрани — от проследяването на портфейл до пазарния контекст и Pro анализите.",
    fullWalkthrough: "Отвори пълното представяне",
    visitorTab: "Преглед на портфейл",
    proTab: "Pro инструменти",
    visitorFrame: "Представяне на портфейла в CapiSpot",
    proFrame: "Представяне на Pro инструментите в CapiSpot",
  },
  de: {
    label: "PRODUKTEINBLICK",
    title: "CapiSpot in Aktion erleben.",
    description:
      "Entdecke echte Ansichten – von der Portfolioübersicht bis zu Marktdaten und Pro-Analysen.",
    fullWalkthrough: "Vollständigen Rundgang öffnen",
    visitorTab: "Portfolio-Tour",
    proTab: "Pro-Tools",
    visitorFrame: "CapiSpot-Portfolio-Rundgang",
    proFrame: "Rundgang durch die CapiSpot-Pro-Tools",
  },
  es: {
    label: "RECORRIDO DEL PRODUCTO",
    title: "Descubre CapiSpot en acción.",
    description:
      "Explora pantallas reales, desde el seguimiento de cartera hasta el contexto de mercado y los análisis Pro.",
    fullWalkthrough: "Abrir el recorrido completo",
    visitorTab: "Vista de cartera",
    proTab: "Herramientas Pro",
    visitorFrame: "Recorrido por la cartera de CapiSpot",
    proFrame: "Recorrido por las herramientas Pro de CapiSpot",
  },
  it: {
    label: "PANORAMICA DEL PRODOTTO",
    title: "Scopri CapiSpot in azione.",
    description:
      "Esplora schermate reali, dal monitoraggio del portafoglio al contesto di mercato e alle analisi Pro.",
    fullWalkthrough: "Apri la panoramica completa",
    visitorTab: "Tour portafoglio",
    proTab: "Strumenti Pro",
    visitorFrame: "Panoramica del portafoglio CapiSpot",
    proFrame: "Panoramica degli strumenti Pro di CapiSpot",
  },
};

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

export function VideoPresentation({
  mode,
  theme,
  lang,
}: {
  mode: VideoMode;
  theme: AppTheme;
  lang: Lang;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [activeMode, setActiveMode] = useState<VideoMode>(mode);
  const [height, setHeight] = useState<number | null>(null);
  const c = COPY[lang];

  useEffect(() => {
    setActiveMode(mode);
  }, [mode]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frame.current?.contentWindow ||
        !isHeightMessage(event.data)
      ) {
        return;
      }
      setHeight(Math.max(440, Math.min(Math.ceil(event.data.height), 980)));
    };

    const requestHeight = () => {
      try {
        frame.current?.contentWindow?.postMessage(
          { type: "capispot-video-preview:request-height" },
          window.location.origin,
        );
      } catch {
        // Ignore cross-frame timing errors before load
      }
    };

    window.addEventListener("message", handleMessage);
    requestHeight();
    const t1 = window.setTimeout(requestHeight, 120);
    const t2 = window.setTimeout(requestHeight, 400);
    return () => {
      window.removeEventListener("message", handleMessage);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [activeMode, lang, theme]);

  return (
    <section
      aria-label={c.title}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] lg:col-span-3"
    >
      <div className="flex flex-col gap-3 border-b border-border/80 bg-card/80 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            {c.label}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {c.title}
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {c.description}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label={c.label}
            className="inline-flex rounded-full border border-border bg-secondary/70 p-0.5 text-xs"
          >
            {(["visitor", "pro"] as const).map((tabMode) => (
              <button
                key={tabMode}
                type="button"
                aria-pressed={activeMode === tabMode}
                onClick={() => setActiveMode(tabMode)}
                className={`min-h-8 rounded-full px-3 py-1 font-semibold transition-colors ${
                  activeMode === tabMode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tabMode === "visitor" ? c.visitorTab : c.proTab}
              </button>
            ))}
          </div>
          <a
            href={`/video-preview/?mode=${activeMode}&theme=${theme}&lang=${lang}`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-secondary"
          >
            <span>{c.fullWalkthrough}</span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>
      </div>
      <div
        className="h-[610px] w-full min-w-0 bg-background/40"
        style={height !== null ? { height } : undefined}
      >
        <iframe
          key={`${activeMode}-${lang}-${theme}`}
          ref={frame}
          title={activeMode === "pro" ? c.proFrame : c.visitorFrame}
          src={`/video-preview/?embed=1&mode=${activeMode}&theme=${theme}&lang=${lang}`}
          className="block h-full w-full border-0"
          allowFullScreen
          onLoad={() => {
            try {
              frame.current?.contentWindow?.postMessage(
                { type: "capispot-video-preview:request-height" },
                window.location.origin,
              );
            } catch {
              // Ignore
            }
          }}
        />
      </div>
    </section>
  );
}
