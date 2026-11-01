import { useEffect, useRef, useState } from "react";

type VideoMode = "visitor" | "pro";

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

export function VideoPresentation({ mode }: { mode: VideoMode }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(760);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frame.current?.contentWindow ||
        !isHeightMessage(event.data)
      ) {
        return;
      }
      setHeight(Math.max(600, Math.min(event.data.height, 2400)));
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <section
      aria-label={mode === "pro" ? "Capispot Pro presentation" : "Capispot product presentation"}
      className="lg:col-span-3 overflow-hidden rounded-3xl border border-border bg-card"
    >
      <iframe
        key={mode}
        ref={frame}
        title={mode === "pro" ? "Capispot Pro tools walkthrough" : "Capispot portfolio walkthrough"}
        src={`/video-preview/?embed=1&mode=${mode}`}
        className="block w-full border-0"
        style={{ height }}
        loading="lazy"
      />
    </section>
  );
}
