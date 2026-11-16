import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Lang } from "@/lib/i18n";
import type { Holding } from "@/lib/portfolio";
import { Check, Copy, Download, Share2, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export interface AllocationWeightItem {
  key: "stock" | "etf" | "crypto" | "bond" | "cash" | "realestate";
  pct: number;
}

const VALID_CLASS_KEYS = new Set<AllocationWeightItem["key"]>([
  "stock",
  "etf",
  "crypto",
  "bond",
  "cash",
  "realestate",
]);

/**
 * Computes privacy-safe, percentage-only asset-class weights for `/api/og?type=snapshot`.
 * Monetary balances, currencies, quantities, tickers, and user IDs are never included.
 */
export function buildAllocationShareParams(holdings: readonly Holding[]): {
  items: AllocationWeightItem[];
  weightsParam: string;
  ogPath: string;
} | null {
  const totals = new Map<AllocationWeightItem["key"], number>();
  let grandTotal = 0;

  for (const holding of holdings) {
    if (!Number.isFinite(holding.value) || holding.value <= 0) continue;
    const rawKey = holding.asset.type.toLowerCase();
    if (!VALID_CLASS_KEYS.has(rawKey as AllocationWeightItem["key"])) continue;
    const key = rawKey as AllocationWeightItem["key"];
    totals.set(key, (totals.get(key) ?? 0) + holding.value);
    grandTotal += holding.value;
  }

  if (grandTotal <= 0 || totals.size === 0) return null;

  const items: AllocationWeightItem[] = [...totals.entries()]
    .map(([key, value]) => ({
      key,
      pct: Math.round((value / grandTotal) * 1000) / 10,
    }))
    .filter((item) => item.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  if (!items.length) return null;

  const weightsParam = items.map((item) => `${item.key}:${item.pct.toFixed(1)}`).join(",");
  return {
    items,
    weightsParam,
    ogPath: `/api/og?type=snapshot&weights=${encodeURIComponent(weightsParam)}`,
  };
}

type Copy = {
  button: string;
  title: string;
  description: string;
  privacyBadge: string;
  copyLink: string;
  copied: string;
  downloadImage: string;
  downloadFailed: string;
  classLabels: Record<AllocationWeightItem["key"], string>;
};

const COPY: Record<Lang, Copy> = {
  en: {
    button: "Share allocation",
    title: "Share my allocation card",
    description:
      "Post your portfolio asset-class breakdown on X, Reddit, Discord, or YouTube without exposing any balances or personal data.",
    privacyBadge: "Percentages only · No balances, quantities, or account IDs",
    copyLink: "Copy shareable card link",
    copied: "Card link copied",
    downloadImage: "Download card image",
    downloadFailed: "Could not download the card image.",
    classLabels: {
      stock: "Stocks",
      etf: "ETFs",
      crypto: "Crypto",
      bond: "Bonds",
      cash: "Cash",
      realestate: "Real Estate",
    },
  },
  bg: {
    button: "Сподели разпределението",
    title: "Сподели карта с разпределението",
    description:
      "Публикувай процентното разпределение по класове активи в X, Reddit, Discord или YouTube без суми и лични данни.",
    privacyBadge: "Само проценти · Без суми, количества или профилни данни",
    copyLink: "Копирай линк към картата",
    copied: "Линкът към картата е копиран",
    downloadImage: "Изтегли изображение",
    downloadFailed: "Неуспешно изтегляне на изображението.",
    classLabels: {
      stock: "Акции",
      etf: "ETF-и",
      crypto: "Крипто",
      bond: "Облигации",
      cash: "Кеш",
      realestate: "Имоти",
    },
  },
  de: {
    button: "Aufteilung teilen",
    title: "Allokationskarte teilen",
    description:
      "Teile deine Anlageklassen-Verteilung auf X, Reddit, Discord oder YouTube, ohne Beträge oder Kontodaten preiszugeben.",
    privacyBadge: "Nur Prozente · Keine Beträge, Stückzahlen oder Konto-IDs",
    copyLink: "Kartenlink kopieren",
    copied: "Kartenlink kopiert",
    downloadImage: "Kartenbild herunterladen",
    downloadFailed: "Kartenbild konnte nicht heruntergeladen werden.",
    classLabels: {
      stock: "Aktien",
      etf: "ETFs",
      crypto: "Krypto",
      bond: "Anleihen",
      cash: "Bargeld",
      realestate: "Immobilien",
    },
  },
  es: {
    button: "Compartir asignación",
    title: "Compartir tarjeta de asignación",
    description:
      "Comparte el desglose por clase de activo en X, Reddit, Discord o YouTube sin mostrar saldos ni datos personales.",
    privacyBadge: "Solo porcentajes · Sin saldos, cantidades ni IDs de cuenta",
    copyLink: "Copiar enlace de la tarjeta",
    copied: "Enlace copiado",
    downloadImage: "Descargar imagen",
    downloadFailed: "No se pudo descargar la imagen.",
    classLabels: {
      stock: "Acciones",
      etf: "ETFs",
      crypto: "Cripto",
      bond: "Bonos",
      cash: "Efectivo",
      realestate: "Inmobiliario",
    },
  },
  it: {
    button: "Condividi allocazione",
    title: "Condividi la tua scheda allocazione",
    description:
      "Condividi la ripartizione per classe di attivo su X, Reddit, Discord o YouTube senza mostrare saldi o dati personali.",
    privacyBadge: "Solo percentuali · Nessun saldo, quantità o ID account",
    copyLink: "Copia link della scheda",
    copied: "Link copiato",
    downloadImage: "Scarica immagine",
    downloadFailed: "Impossibile scaricare l'immagine.",
    classLabels: {
      stock: "Azioni",
      etf: "ETF",
      crypto: "Crypto",
      bond: "Obbligazioni",
      cash: "Liquidità",
      realestate: "Immobiliare",
    },
  },
};

export function ShareAllocationButton({
  holdings,
  lang,
}: {
  holdings: readonly Holding[];
  lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const c = COPY[lang];
  const share = useMemo(() => buildAllocationShareParams(holdings), [holdings]);

  if (!share) return null;

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${share.ogPath}`
      : `https://capispot.com${share.ogPath}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(c.copied);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(c.downloadFailed);
    }
  };

  const downloadCard = async () => {
    try {
      const response = await fetch(share.ogPath);
      if (!response.ok) throw new Error("Failed to fetch card");
      const svgText = await response.text();
      const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "capispot-allocation.svg";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      toast.error(c.downloadFailed);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="min-h-10 gap-1.5 rounded-full"
      >
        <Share2 className="size-4" aria-hidden="true" />
        {c.button}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{c.title}</DialogTitle>
            <DialogDescription>{c.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-500">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {c.privacyBadge}
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-secondary/20">
              <img
                src={share.ogPath}
                alt={c.title}
                width={1200}
                height={630}
                className="h-auto w-full object-cover"
              />
            </div>

            <div className="flex flex-wrap gap-3 text-xs">
              {share.items.map((item) => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-2.5 py-1 font-medium tabular-nums"
                >
                  <span>{c.classLabels[item.key]}:</span>
                  <span className="font-semibold text-foreground">{item.pct.toFixed(1)}%</span>
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" onClick={copyLink} className="min-h-10 flex-1 gap-1.5">
                {copied ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
                {copied ? c.copied : c.copyLink}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={downloadCard}
                className="min-h-10 gap-1.5"
              >
                <Download className="size-4" aria-hidden="true" />
                {c.downloadImage}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
