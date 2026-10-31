import { useEffect, useState } from "react";
import { BellRing, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/AppShell";
import { usePortfolio } from "@/lib/store";
import {
  readRecurringReminders,
  SYMBOL_RE,
  writeRecurringReminders,
  type RecurringReminder,
} from "@/lib/watchlist";
import type { Lang } from "@/lib/i18n";

const COPY: Record<
  Lang,
  {
    title: string;
    description: string;
    ticker: string;
    amount: string;
    day: string;
    add: string;
    enable: string;
    permission: string;
    unsupported: string;
    dueTitle: string;
    dueBody: (symbol: string, amount: string) => string;
    remove: string;
    empty: string;
    privacy: string;
    invalid: string;
  }
> = {
  en: {
    title: "Monthly investment reminders",
    description: "Plan a recurring contribution. Capispot will remind you; it never places trades.",
    ticker: "Ticker (optional)",
    amount: "Planned amount",
    day: "Remind me on day",
    add: "Add reminder",
    enable: "Enable browser notifications",
    permission: "Browser notifications are enabled.",
    unsupported: "Browser notifications are unavailable in this browser.",
    dueTitle: "Investment reminder",
    dueBody: (symbol, amount) => `Your planned ${amount} contribution for ${symbol} is due.`,
    remove: "Remove reminder",
    empty: "No monthly reminders yet.",
    privacy: "Reminders stay in this browser and are checked when you open Tools.",
    invalid: "Enter a valid amount, day (1–28), and optional ticker.",
  },
  bg: {
    title: "Месечни напомняния за инвестиции",
    description: "Планирай повтаряща се вноска. Capispot само напомня — не подава сделки.",
    ticker: "Тикер (по избор)",
    amount: "Планирана сума",
    day: "Напомни ми на ден",
    add: "Добави напомняне",
    enable: "Разреши известия в браузъра",
    permission: "Известията в браузъра са разрешени.",
    unsupported: "Известията в браузъра не са налични.",
    dueTitle: "Напомняне за инвестиция",
    dueBody: (symbol, amount) => `Планираната вноска ${amount} за ${symbol} е настъпила.`,
    remove: "Премахни напомнянето",
    empty: "Все още няма месечни напомняния.",
    privacy:
      "Напомнянията се пазят само в този браузър и се проверяват при отваряне на Инструменти.",
    invalid: "Въведи валидна сума, ден (1–28) и тикер по избор.",
  },
  de: {
    title: "Monatliche Anlageerinnerungen",
    description:
      "Plane einen regelmäßigen Beitrag. Capispot erinnert dich, führt aber keine Trades aus.",
    ticker: "Ticker (optional)",
    amount: "Geplanter Betrag",
    day: "Erinnerung am Tag",
    add: "Erinnerung hinzufügen",
    enable: "Browserbenachrichtigungen aktivieren",
    permission: "Browserbenachrichtigungen sind aktiviert.",
    unsupported: "Browserbenachrichtigungen sind nicht verfügbar.",
    dueTitle: "Anlageerinnerung",
    dueBody: (symbol, amount) => `Dein geplanter Beitrag von ${amount} für ${symbol} ist fällig.`,
    remove: "Erinnerung entfernen",
    empty: "Noch keine monatlichen Erinnerungen.",
    privacy: "Erinnerungen bleiben in diesem Browser und werden beim Öffnen der Werkzeuge geprüft.",
    invalid: "Gib einen gültigen Betrag, Tag (1–28) und optionalen Ticker ein.",
  },
  es: {
    title: "Recordatorios mensuales de inversión",
    description:
      "Planifica una aportación recurrente. Capispot te avisa, pero nunca realiza operaciones.",
    ticker: "Ticker (opcional)",
    amount: "Importe previsto",
    day: "Recordarme el día",
    add: "Añadir recordatorio",
    enable: "Activar notificaciones del navegador",
    permission: "Las notificaciones del navegador están activadas.",
    unsupported: "Las notificaciones del navegador no están disponibles.",
    dueTitle: "Recordatorio de inversión",
    dueBody: (symbol, amount) => "Tu aportación prevista de " + amount + ` para ${symbol} vence.`,
    remove: "Eliminar recordatorio",
    empty: "Aún no hay recordatorios mensuales.",
    privacy:
      "Los recordatorios permanecen en este navegador y se comprueban al abrir Herramientas.",
    invalid: "Introduce un importe y día (1–28) válidos y un ticker opcional.",
  },
  it: {
    title: "Promemoria mensili d'investimento",
    description:
      "Pianifica un versamento ricorrente. Capispot ti avvisa, ma non esegue operazioni.",
    ticker: "Ticker (facoltativo)",
    amount: "Importo previsto",
    day: "Avvisami il giorno",
    add: "Aggiungi promemoria",
    enable: "Attiva notifiche del browser",
    permission: "Le notifiche del browser sono attive.",
    unsupported: "Le notifiche del browser non sono disponibili.",
    dueTitle: "Promemoria d'investimento",
    dueBody: (symbol, amount) => `Il versamento previsto di ${amount} per ${symbol} è in scadenza.`,
    remove: "Rimuovi promemoria",
    empty: "Nessun promemoria mensile.",
    privacy: "I promemoria restano in questo browser e vengono controllati aprendo Strumenti.",
    invalid: "Inserisci un importo e un giorno (1–28) validi e un ticker facoltativo.",
  },
};

export function RecurringReminders() {
  const p = usePortfolio();
  const c = COPY[p.lang];
  const [reminders, setReminders] = useState<RecurringReminder[]>([]);
  const [symbol, setSymbol] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "EUR">(p.currency);
  const [day, setDay] = useState("1");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );

  useEffect(() => {
    const sync = () => setReminders(readRecurringReminders());
    sync();
    window.addEventListener("folio-watch", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("folio-watch", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const due = reminders.filter(
      (reminder) => now.getDate() >= reminder.dayOfMonth && reminder.lastReminderMonth !== month,
    );
    if (!due.length) return;
    const updated = reminders.map((reminder) =>
      due.some((item) => item.id === reminder.id)
        ? { ...reminder, lastReminderMonth: month }
        : reminder,
    );
    writeRecurringReminders(updated);
    for (const reminder of due) {
      const money = new Intl.NumberFormat(p.lang, {
        style: "currency",
        currency: reminder.currency,
        maximumFractionDigits: 2,
      }).format(reminder.amount);
      if (typeof Notification !== "undefined" && Notification.permission === "granted")
        new Notification(c.dueTitle, {
          body: c.dueBody(
            reminder.symbol || (p.lang === "bg" ? "портфолиото" : "your portfolio"),
            money,
          ),
        });
      else
        toast.info(
          c.dueBody(reminder.symbol || (p.lang === "bg" ? "портфолиото" : "your portfolio"), money),
        );
    }
  }, [reminders, c, p.lang]);

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const ticker = symbol.trim().toUpperCase();
    const plannedAmount = Number(amount.replace(",", "."));
    const reminderDay = Number(day);
    if (
      !(plannedAmount > 0) ||
      !Number.isFinite(plannedAmount) ||
      !Number.isInteger(reminderDay) ||
      reminderDay < 1 ||
      reminderDay > 28 ||
      (ticker && !SYMBOL_RE.test(ticker)) ||
      reminders.length >= 20
    ) {
      toast.error(c.invalid);
      return;
    }
    const next = [
      ...reminders,
      {
        id: crypto.randomUUID(),
        symbol: ticker,
        amount: plannedAmount,
        currency,
        dayOfMonth: reminderDay,
      },
    ];
    writeRecurringReminders(next);
    setReminders(next);
    setSymbol("");
    setAmount("");
  };

  const enableNotifications = async () => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      return;
    }
    const next = await Notification.requestPermission();
    setPermission(next);
  };

  const formatMoney = (reminder: RecurringReminder) =>
    new Intl.NumberFormat(p.lang, {
      style: "currency",
      currency: reminder.currency,
      maximumFractionDigits: 2,
    }).format(reminder.amount);

  return (
    <Card>
      <div className="mb-1 flex items-center gap-2">
        <BellRing size={17} className="text-primary" aria-hidden />
        <h3 className="font-display font-semibold">{c.title}</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{c.description}</p>
      <form className="grid gap-2 sm:grid-cols-2" onSubmit={add}>
        <label className="grid gap-1 text-xs text-muted-foreground">
          {c.ticker}
          <input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            placeholder="VWCE.DE"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          {c.amount}
          <span className="flex gap-1">
            <input
              type="number"
              min="0.01"
              step="any"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            />
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as "USD" | "EUR")}
              className="h-10 rounded-md border border-input bg-background px-2 text-sm text-foreground"
              aria-label={c.amount}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </span>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          {c.day}
          <input
            type="number"
            min="1"
            max="28"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          />
        </label>
        <Button type="submit" className="h-10 self-end">
          {c.add}
        </Button>
      </form>
      {reminders.length ? (
        <ul className="mt-3 divide-y divide-border">
          {reminders.map((reminder) => (
            <li key={reminder.id} className="flex items-center gap-2 py-2 text-sm">
              <span className="min-w-0 flex-1">
                {formatMoney(reminder)}
                {reminder.symbol && ` · ${reminder.symbol}`}
                <span className="text-muted-foreground"> · {reminder.dayOfMonth}</span>
              </span>
              <button
                type="button"
                aria-label={c.remove}
                title={c.remove}
                onClick={() => {
                  const next = reminders.filter((item) => item.id !== reminder.id);
                  writeRecurringReminders(next);
                  setReminders(next);
                }}
                className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-destructive"
              >
                <Trash2 size={15} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{c.empty}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">{c.privacy}</p>
        {permission === "granted" ? (
          <span className="text-xs text-muted-foreground">{c.permission}</span>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void enableNotifications()}
            disabled={permission === "unsupported"}
          >
            {permission === "unsupported" ? c.unsupported : c.enable}
          </Button>
        )}
      </div>
    </Card>
  );
}
