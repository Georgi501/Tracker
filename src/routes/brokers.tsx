import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/AppShell";
import { usePortfolio } from "@/lib/store";
import { BROKER_FORMATS, GENERIC_TEMPLATE, brokerLimit, parseBrokerCsv, detectBrokerFormat, type BrokerFormat } from "@/lib/csv-import";

export const Route = createFileRoute("/brokers")({
  head: () => ({
    meta: [
      { title: "Brokers — folio. CSV import" },
      { name: "description", content: "Connect brokers via CSV: Trading 212, Interactive Brokers, Revolut or a generic template." },
      { property: "og:title", content: "Brokers — folio." },
      { property: "og:description", content: "Import your broker transactions from CSV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Brokers,
});

const input = "rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function Brokers() {
  const p = usePortfolio();
  const [name, setName] = useState("");
  const [format, setFormat] = useState<BrokerFormat>("trading212");
  const limit = brokerLimit(p.isPro);
  const full = p.brokers.length >= limit;

  if (!p.user)
    return (
      <Card className="mx-auto max-w-lg text-center">
        <p className="mb-4">{p.t("signInToUse")}</p>
        <Link to="/auth" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">{p.t("signIn")}</Link>
      </Card>
    );

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("brokers").insert({ name: name || (BROKER_FORMATS.find((f) => f.id === format)?.label ?? format), format });
    if (error) { toast.error(error.message.includes("BROKER_LIMIT") ? p.t("limitReached") : error.message); return; }
    setName(""); await p.reload();
  };
  const remove = async (id: string) => { await supabase.from("brokers").delete().eq("id", id); await p.reload(); };
  const upload = async (brokerId: string, fmt: string, file: File) => {
    try {
      const text = await file.text();
      const detected = detectBrokerFormat(text);
      if (!detected) throw new Error("CSV format not recognized");
      const rows = parseBrokerCsv(detected, text);
      if (!rows.length) { toast.error("0 " + p.t("imported")); return; }
      toast.success(`${await p.importTransactions(brokerId, rows)} ${p.t("imported")}`);
    }
    catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
  };
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(GENERIC_TEMPLATE)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">{p.t("brokers")}</h1>
        <span className="text-sm text-muted-foreground">{p.brokers.length} / {limit} · {p.isPro ? p.t("pro") : p.t("free")}</span>
      </div>
      {p.brokers.map((b) => (
        <Card key={b.id} className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <p className="font-semibold">{b.name}</p>
            <p className="text-xs text-muted-foreground">{BROKER_FORMATS.find((f) => f.id === b.format)?.label}</p>
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Upload size={15} /> {p.t("importCsv")}
            <input type="file" accept=".csv,text/csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(b.id, b.format, f); e.target.value = ""; }} />
          </label>
          <button onClick={() => remove(b.id)} className="text-sm text-destructive">✕</button>
        </Card>
      ))}
      {full ? (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm">{p.t("limitReached")}</span>
          {!p.isPro && <Link to="/pricing" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{p.t("upgrade")}</Link>}
        </Card>
      ) : (
        <Card>
          <form onSubmit={add} className="flex flex-wrap gap-2">
            <input className={`${input} flex-1`} placeholder={p.t("brokerName")} value={name} onChange={(e) => setName(e.target.value)} />
            <select className={input} value={format} onChange={(e) => setFormat(e.target.value as BrokerFormat)} aria-label={p.t("format")}>
              {BROKER_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{p.t("addBroker")}</button>
          </form>
          <a href={templateHref} download="folio-template.csv" className="mt-3 inline-block text-sm font-semibold text-primary">{p.t("template")}</a>
        </Card>
      )}
    </div>
  );
}
