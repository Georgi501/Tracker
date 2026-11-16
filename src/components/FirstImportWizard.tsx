import { BROKER_FORMATS, detectBrokerFormat, type BrokerFormat } from "@/lib/csv-import";
import type { Lang } from "@/lib/i18n";
import type { Broker } from "@/lib/store";
import { trustCopy } from "@/lib/trust-i18n";
import { Link } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "./ui/button";

function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Could not read CSV file"));
    reader.readAsText(file);
  });
}

export function FirstImportWizard({
  lang,
  brokers,
  initialFormat,
  onCreate,
  onUpload,
  preview,
  completed,
  preparing,
}: {
  lang: Lang;
  brokers: Broker[];
  initialFormat?: BrokerFormat | undefined;
  onCreate: (format: BrokerFormat) => Promise<string | void>;
  onUpload: (brokerId: string, format: string, file: File) => Promise<void>;
  preview: boolean;
  completed: boolean;
  preparing: boolean;
}) {
  const c = trustCopy[lang],
    id = useId();
  const [format, setFormat] = useState<BrokerFormat | null>(() => initialFormat ?? null),
    [account, setAccount] = useState(() =>
      initialFormat ? (brokers.find((b) => b.format === initialFormat)?.id ?? "") : "",
    ),
    [instructions, setInstructions] = useState(false),
    [creating, setCreating] = useState(false),
    [dragActive, setDragActive] = useState(false),
    [detectedFormat, setDetectedFormat] = useState<BrokerFormat | null>(null),
    [dropError, setDropError] = useState<string | null>(null),
    [pendingAutoFile, setPendingAutoFile] = useState<{
      format: BrokerFormat;
      file: File;
    } | null>(null);
  const matching = brokers.filter((b) => b.format === format);

  useEffect(() => {
    if (!initialFormat) return;
    setFormat(initialFormat);
    setAccount(brokers.find((b) => b.format === initialFormat)?.id ?? "");
    setInstructions(false);
  }, [initialFormat, brokers]);

  useEffect(() => {
    if (account && !brokers.some((b) => b.id === account)) {
      setAccount("");
      return;
    }
    if (!account && format) {
      const existing = brokers.find((b) => b.format === format);
      if (existing) setAccount(existing.id);
    }
  }, [brokers, account, format]);

  useEffect(() => {
    if (!pendingAutoFile) return;
    const target = brokers.find((b) => b.format === pendingAutoFile.format);
    if (!target) return;
    const { file, format: autoFormat } = pendingAutoFile;
    setPendingAutoFile(null);
    setAccount(target.id);
    void onUpload(target.id, autoFormat, file);
  }, [brokers, pendingAutoFile, onUpload]);

  const step = completed ? 3 : preview ? 2 : instructions ? 1 : 0;
  const choose = (value: BrokerFormat) => {
    setFormat(value);
    setAccount(brokers.find((b) => b.format === value)?.id ?? "");
    setInstructions(false);
    setDropError(null);
  };

  const handleAutoDetectFile = async (file: File) => {
    if (preparing || creating) return;
    setDropError(null);
    try {
      if (file.size > 10 * 1024 * 1024) {
        setDropError(c.fileError);
        return;
      }
      const text = await readFileText(file);
      const detected = detectBrokerFormat(text);
      if (!detected) {
        setDropError(c.fileError);
        return;
      }
      setDetectedFormat(detected);
      setFormat(detected);
      setInstructions(false);
      const existing = brokers.find((b) => b.format === detected);
      if (existing) {
        setAccount(existing.id);
        await onUpload(existing.id, detected, file);
        return;
      }
      setCreating(true);
      try {
        const createdId = await onCreate(detected);
        if (typeof createdId === "string" && createdId) {
          setAccount(createdId);
          await onUpload(createdId, detected, file);
        } else {
          setPendingAutoFile({ format: detected, file });
        }
      } finally {
        setCreating(false);
      }
    } catch {
      setDropError(c.fileError);
    }
  };

  const detectedLabel = detectedFormat
    ? (BROKER_FORMATS.find((b) => b.id === detectedFormat)?.label ?? detectedFormat)
    : null;

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
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!preparing && !creating) setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer?.files?.[0];
              if (file) void handleAutoDetectFile(file);
            }}
            className={`mt-4 rounded-xl border border-dashed p-3.5 transition-colors ${
              dragActive
                ? "border-primary bg-primary/10"
                : "border-border/80 bg-secondary/30 hover:border-primary/50"
            }`}
          >
            <label className="flex cursor-pointer flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-start gap-2.5">
                <Upload size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    {c.dropzoneTitle}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {c.dropzoneHint}
                  </span>
                </span>
              </span>
              <input
                aria-label={c.dropzoneTitle}
                type="file"
                accept=".csv,text/csv"
                disabled={preparing || creating}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void handleAutoDetectFile(file);
                }}
              />
            </label>
            {detectedLabel && (
              <p className="mt-2 text-xs font-semibold text-primary">
                {c.detectedBroker}: {detectedLabel}
              </p>
            )}
            {dropError && (
              <p role="alert" className="mt-2 text-xs font-medium text-destructive">
                {dropError}
              </p>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
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
                  className={`inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-within:ring-2 focus-within:ring-ring ${preparing ? "opacity-60" : ""}`}
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
