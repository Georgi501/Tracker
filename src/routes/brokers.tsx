import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/AppShell";
import { usePortfolio } from "@/lib/store";
import { useState } from "react";
import {
  BROKER_FORMATS,
  GENERIC_TEMPLATE,
  brokerLimit,
  parseBrokerCsv,
  detectBrokerFormat,
  splitDuplicates,
  type BrokerFormat,
  type ImportedTx,
} from "@/lib/csv-import";

export const Route = createFileRoute("/brokers")({
  head: () => ({
    meta: [
      { title: "Brokers — Capispot CSV import" },
      {
        name: "description",
        content:
          "Connect brokers via CSV: Trading 212, Interactive Brokers, Revolut or a generic template.",
      },
      { property: "og:title", content: "Brokers — Capispot" },
      { property: "og:description", content: "Import your broker transactions from CSV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Brokers,
});

const input =
  "rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function Brokers() {
  const p = usePortfolio();
  const [preview, setPreview] = useState<{
    brokerId: string;
    format: BrokerFormat;
    fresh: ImportedTx[];
    duplicates: ImportedTx[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const limit = brokerLimit(p.isPro);
  const full = p.brokers.length >= limit;

  if (!p.user)
    return (
      <Card className="mx-auto max-w-lg text-center">
        <p className="mb-4">{p.t("signInToUse")}</p>
        <Link
          to="/auth"
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {p.t("signIn")}
        </Link>
      </Card>
    );

  const add = async (format: BrokerFormat) => {
    const label = BROKER_FORMATS.find((f) => f.id === format)?.label ?? format;
    const n = p.brokers.filter((b) => b.format === format).length;
    const { error } = await supabase
      .from("brokers")
      .insert({ name: n ? `${label} ${n + 1}` : label, format });
    if (error) {
      toast.error(error.message.includes("BROKER_LIMIT") ? p.t("limitReached") : error.message);
      return;
    }
    await p.reload();
  };
  const remove = async (id: string) => {
    await supabase.from("brokers").delete().eq("id", id);
    await p.reload();
  };
  const upload = async (brokerId: string, fmt: string, file: File) => {
    try {
      const text = await file.text();
      const detected = detectBrokerFormat(text);
      if (!detected) throw new Error("CSV format not recognized");
      const rows = parseBrokerCsv(detected, text);
      if (!rows.length) {
        toast.error("0 " + p.t("imported"));
        return;
      }
      const sym = new Map(p.assets.map((a) => [a.id, a.symbol]));
      const existing = p.transactions.map((t) => ({
        symbol: sym.get(t.assetId) ?? "",
        kind: t.kind,
        date: t.date,
        quantity: t.quantity,
      }));
      setPreview({ brokerId, format: detected, ...splitDuplicates(rows, existing) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };
  const confirmImport = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      toast.success(
        `${await p.importTransactions(preview.brokerId, preview.fresh)} ${p.t("imported")}`,
      );
      setPreview(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(GENERIC_TEMPLATE)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">{p.t("brokers")}</h1>
        <span className="text-sm text-muted-foreground">
          {p.brokers.length} / {limit} · {p.isPro ? p.t("pro") : p.t("free")}
        </span>
      </div>
      {p.brokers.map((b) => (
        <Card key={b.id} className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <p className="font-semibold">{b.name}</p>
            <p className="text-xs text-muted-foreground">
              {BROKER_FORMATS.find((f) => f.id === b.format)?.label}
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Upload size={15} /> {p.t("importCsv")}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(b.id, b.format, f);
                e.target.value = "";
              }}
            />
          </label>
          <button onClick={() => remove(b.id)} className="text-sm text-destructive">
            ✕
          </button>
        </Card>
      ))}
      {preview && (
        <ImportPreview
          bg={p.lang === "bg"}
          preview={preview}
          busy={busy}
          onCancel={() => setPreview(null)}
          onConfirm={() => void confirmImport()}
        />
      )}
      {full && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm">{p.t("limitReached")}</span>
          {!p.isPro && (
            <Link
              to="/pricing"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              {p.t("upgrade")}
            </Link>
          )}
        </Card>
      )}
      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">{p.t("addBroker")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {BROKER_FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              disabled={full}
              onClick={() => void add(f.id)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 font-display font-bold text-primary">
                {f.label.slice(0, 2).toUpperCase()}
              </span>
              <span className="flex-1 font-semibold">{f.label}</span>
              <Plus size={18} className="text-primary" />
            </button>
          ))}
        </div>
        <a
          href={templateHref}
          download="folio-template.csv"
          className="mt-3 inline-block text-sm font-semibold text-primary"
        >
          {p.t("template")}
        </a>
      </div>
    </div>
  );
}

function ImportPreview({
  bg,
  preview,
  busy,
  onCancel,
  onConfirm,
}: {
  bg: boolean;
  busy: boolean;
  preview: { format: BrokerFormat; fresh: ImportedTx[]; duplicates: ImportedTx[] };
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const count = (k: string) => preview.fresh.filter((r) => r.kind === k).length;
  const currencies = [...new Set(preview.fresh.map((r) => r.currency ?? "USD"))].join(", ");
  return (
    <Card className="space-y-3 border-primary">
      <h2 className="font-display text-lg font-semibold">
        {bg ? "Преглед преди импорт" : "Review before import"} ·{" "}
        {BROKER_FORMATS.find((f) => f.id === preview.format)?.label}
      </h2>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        {(["buy", "sell", "dividend"] as const).map((k) => (
          <div key={k} className="rounded-xl bg-secondary p-2">
            <b className="block text-lg">{count(k)}</b>
            {bg ? { buy: "покупки", sell: "продажби", dividend: "дивиденти" }[k] : k}
          </div>
        ))}
      </div>
      {currencies && (
        <p className="text-xs text-muted-foreground">
          {bg ? "Валути" : "Currencies"}: {currencies} ·{" "}
          {bg ? "конвертират се по курса за датата" : "converted at each date's rate"}
        </p>
      )}
      {preview.duplicates.length > 0 && (
        <p className="rounded-xl bg-accent text-accent-foreground p-2 text-sm">
          {bg
            ? `${preview.duplicates.length} реда вече съществуват и ще бъдат пропуснати.`
            : `${preview.duplicates.length} rows already exist and will be skipped.`}
        </p>
      )}
      <div className="max-h-56 overflow-auto rounded-xl border border-border text-xs">
        {preview.fresh.slice(0, 50).map((r, i) => (
          <div
            key={i}
            className="flex justify-between gap-2 border-b border-border px-3 py-1.5 last:border-0"
          >
            <span>
              {r.date} · {r.kind}
            </span>
            <b>{r.symbol}</b>
            <span>
              {r.quantity} × {r.price} {r.currency ?? "USD"}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-full px-4 py-2 text-sm text-muted-foreground">
          {bg ? "Отказ" : "Cancel"}
        </button>
        <button
          disabled={busy || !preview.fresh.length}
          onClick={onConfirm}
          className="press rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {bg ? `Импортирай ${preview.fresh.length}` : `Import ${preview.fresh.length}`}
        </button>
      </div>
    </Card>
  );
}
