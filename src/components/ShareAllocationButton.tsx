import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

interface Slice {
  name: string;
  value: number;
}

const COLORS = ["#34d399", "#60a5fa", "#fbbf24", "#f472b6", "#a78bfa", "#fb923c", "#94a3b8"];

const COPY = {
  en: {
    action: "Share as image",
    title: "My portfolio allocation",
    note: "Percentages only · no amounts shared",
    done: "Image ready",
    failed: "Could not create the image.",
    other: "Other",
  },
  bg: {
    action: "Сподели като картинка",
    title: "Разпределение на моето портфолио",
    note: "Само проценти · без суми",
    done: "Картинката е готова",
    failed: "Картинката не можа да бъде създадена.",
    other: "Други",
  },
} as const;

function render(slices: Slice[], copy: (typeof COPY)[keyof typeof COPY]) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const sorted = [...slices].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, 6);
  const rest = sorted.slice(6).reduce((sum, slice) => sum + slice.value, 0);
  const rows = rest > 0 ? [...top, { name: copy.other, value: rest }] : top;
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx || total <= 0) return null;
  ctx.fillStyle = "#060914";
  ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = "#f1f5f9";
  ctx.font = "700 44px system-ui, sans-serif";
  ctx.fillText(copy.title, 60, 88);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "400 24px system-ui, sans-serif";
  ctx.fillText(copy.note, 60, 128);
  rows.forEach((row, index) => {
    const y = 175 + index * 56;
    const share = (row.value / total) * 100;
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 26px system-ui, sans-serif";
    ctx.fillText(row.name.slice(0, 22), 60, y + 30);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(330, y, 640, 40);
    ctx.fillStyle = COLORS[index % COLORS.length]!;
    ctx.fillRect(330, y, Math.max(4, (640 * share) / 100), 40);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 28px system-ui, sans-serif";
    ctx.fillText(`${share.toFixed(share < 10 ? 1 : 0)}%`, 990, y + 30);
  });
  ctx.fillStyle = "#34d399";
  ctx.font = "700 30px system-ui, sans-serif";
  ctx.fillText("CapiSpot", 60, 590);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "400 24px system-ui, sans-serif";
  ctx.fillText("capispot.com", 220, 590);
  return canvas;
}

export function ShareAllocationButton({ data, lang }: { data: Slice[]; lang: string }) {
  const copy = lang === "bg" ? COPY.bg : COPY.en;
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    try {
      const canvas = render(
        data.filter((slice) => Number.isFinite(slice.value) && slice.value > 0),
        copy,
      );
      const blob = canvas
        ? await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
        : null;
      if (!blob) throw new Error("canvas");
      const file = new File([blob], "capispot-allocation.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "CapiSpot", url: "https://capispot.com" });
      } else {
        const href = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = href;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(href);
        toast.success(copy.done);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) toast.error(copy.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      disabled={busy}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
    >
      <Share2 size={14} aria-hidden />
      {copy.action}
    </button>
  );
}
