import { BROKER_FORMATS, type BrokerFormat } from "@/lib/csv-import";
import type { Lang } from "@/lib/i18n";
import type { Broker } from "@/lib/store";
import { trustCopy } from "@/lib/trust-i18n";
import { Link } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { Button } from "./ui/button";
export function FirstImportWizard({
  lang,
  brokers,
  onCreate,
  onUpload,
  preview,
  completed,
  preparing,
}: {
  lang: Lang;
  brokers: Broker[];
  onCreate: (format: BrokerFormat) => Promise<void>;
  onUpload: (brokerId: string, format: string, file: File) => Promise<void>;
  preview: boolean;
  completed: boolean;
  preparing: boolean;
}) {
  const c = trustCopy[lang],
    id = useId();
  const [format, setFormat] = useState<BrokerFormat | null>(null),
    [account, setAccount] = useState(""),
    [instructions, setInstructions] = useState(false),
    [creating, setCreating] = useState(false);
  const matching = brokers.filter((b) => b.format === format);
  useEffect(() => {
    if (account && !brokers.some((b) => b.id === account)) setAccount("");
  }, [brokers, account]);
  const step = completed ? 3 : preview ? 2 : instructions ? 1 : 0;
  const choose = (value: BrokerFormat) => {
    setFormat(value);
    setAccount(brokers.find((b) => b.format === value)?.id ?? "");
    setInstructions(false);
  };
  return (
    <section className="analytics-surface min-w-0 rounded-2xl border border-primary/30 p-4 sm:p-5">
      <h2 className="font-display text-lg font-semibold">{c.wizard}</h2>
      <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {c.steps.map((label, index) => (
          <li
            key={label}
            aria-current={step === index ? "step" : undefined}
            className={`rounded-lg px-2 py-2 text-xs ${step === index ? "bg-primary/15 font-semibold text-primary" : "bg-secondary/50 text-muted-foreground"}`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      {!preview && !completed && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {BROKER_FORMATS.map((b) => (
              <button
                key={b.id}
                type="button"
                disabled={preparing || creating}
                aria-pressed={format === b.id}
                onClick={() => choose(b.id)}
                className={`min-h-12 rounded-xl border px-3 py-2 text-left text-sm font-semibold ${format === b.id ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}
              >
                {b.id === "generic" ? "CSV" : b.label}
              </button>
            ))}
          </div>
          {format && !instructions && (
            <div className="mt-4 space-y-3">
              {matching.length > 0 ? (
                <>
                  <label htmlFor={id} className="block text-xs font-semibold">
                    {c.chooseAccount}
                  </label>
                  <select
                    id={id}
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="" disabled>
                      {c.chooseAccount}
                    </option>
                    {matching.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <Button disabled={!account} onClick={() => setInstructions(true)}>
                    {c.next}
                  </Button>
                </>
              ) : (
                <Button
                  disabled={creating}
                  onClick={async () => {
                    setCreating(true);
                    try {
                      await onCreate(format);
                    } finally {
                      setCreating(false);
                    }
                  }}
                >
                  {c.create}
                </Button>
              )}
            </div>
          )}
          {format && instructions && (
            <div className="mt-4 space-y-3">
              <p className="text-sm leading-relaxed">{c.instructions[format]}</p>
              <p className="text-xs text-muted-foreground">{c.review}</p>
              {format !== "generic" && (
                <Link
                  to={
                    format === "trading212"
                      ? "/trading212-import"
                      : format === "ibkr"
                        ? "/ibkr-import"
                        : "/revolut-import"
                  }
                  className="inline-flex min-h-11 items-center text-xs font-semibold text-primary underline"
                >
                  {c.steps[1]}
                </Link>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={preparing}
                  onClick={() => setInstructions(false)}
                >
                  {c.back}
                </Button>
                <label
                  className={`inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-primary focus-within:ring-2 focus-within:ring-ring px-4 py-2 text-sm font-semibold text-primary-foreground ${preparing ? "opacity-60" : ""}`}
                >
                  {preparing ? c.preparing : c.upload}
                  <input
                    aria-label={c.upload}
                    type="file"
                    accept=".csv,text/csv"
                    disabled={preparing}
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void onUpload(account, format, file);
                    }}
                  />
                </label>
              </div>
            </div>
          )}
        </>
      )}
      {(preview || completed) && (
        <p className="mt-3 text-sm text-muted-foreground">{completed ? c.steps[3] : c.review}</p>
      )}
    </section>
  );
}
