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
    visitorFrame: "CapiSpot portfolio walkthrough",
    proFrame: "CapiSpot Pro tools walkthrough",
  },
  bg: {
    label: "РАЗГЛЕДАЙ ПРОДУКТА",
    title: "Виж CapiSpot в действие.",
    description:
      "Разгледай реални екрани — от проследяването на портфейл до пазарния контекст и Pro анализите.",
    fullWalkthrough: "Отвори пълното представяне",
    visitorFrame: "Представяне на портфейла в CapiSpot",
    proFrame: "Представяне на Pro инструментите в CapiSpot",
  },
  de: {
    label: "PRODUKTEINBLICK",
    title: "CapiSpot in Aktion erleben.",
    description:
      "Entdecke echte Ansichten – von der Portfolioübersicht bis zu Marktdaten und Pro-Analysen.",
    fullWalkthrough: "Vollständigen Rundgang öffnen",
    visitorFrame: "CapiSpot-Portfolio-Rundgang",
    proFrame: "Rundgang durch die CapiSpot-Pro-Tools",
  },
  es: {
    label: "RECORRIDO DEL PRODUCTO",
    title: "Descubre CapiSpot en acción.",
    description:
      "Explora pantallas reales, desde el seguimiento de cartera hasta el contexto de mercado y los análisis Pro.",
    fullWalkthrough: "Abrir el recorrido completo",
    visitorFrame: "Recorrido por la cartera de CapiSpot",
    proFrame: "Recorrido por las herramientas Pro de CapiSpot",
  },
  it: {
    label: "PANORAMICA DEL PRODOTTO",
    title: "Scopri CapiSpot in azione.",
    description:
      "Esplora schermate reali, dal monitoraggio del portafoglio al contesto di mercato e alle analisi Pro.",
    fullWalkthrough: "Apri la panoramica completa",
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
  const [height, setHeight] = useState(560);
  const c = COPY[lang];

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
      aria-label={c.title}
      className="grid overflow-hidden rounded-3xl border border-border bg-card lg:col-span-3 lg:grid-cols-[minmax(0,0.62fr)_minmax(0,1.38fr)]"
    >
      <div className="flex flex-col items-start justify-center gap-2 border-b border-border p-4 sm:gap-4 sm:p-8 lg:border-b-0 lg:border-r">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary sm:text-xs">
          {c.label}
        </p>
        <h2 className="max-w-md text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
          {c.title}
        </h2>
        <p className="max-w-md text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
          {c.description}
        </p>
        <a
          href="/video-preview/"
          className="inline-flex items-center gap-2 text-xs font-medium text-primary transition-colors hover:text-primary/80 sm:text-sm"
        >
          {c.fullWalkthrough}
          <ArrowUpRight size={16} aria-hidden />
        </a>
      </div>
      <div className="min-w-0 bg-background/30">
        <iframe
          key={`${mode}-${lang}`}
          ref={frame}
          title={mode === "pro" ? c.proFrame : c.visitorFrame}
          src={`/video-preview/?embed=1&mode=${mode}&theme=${theme}&lang=${lang}`}
          className="block w-full border-0"
          style={{ height }}
          allowFullScreen
          loading="lazy"
        />
      </div>
    </section>
  );
}
