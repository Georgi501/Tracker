import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { usePortfolio } from "@/lib/store";

// "g" followed by a key jumps to a page, like in GitHub or Gmail.
const GO: Record<string, string> = {
  d: "/",
  h: "/holdings",
  m: "/markets",
  w: "/watchlist",
  a: "/analytics",
  v: "/dividends",
  t: "/tools",
  c: "/community",
  p: "/profile",
};

const isTyping = (el: EventTarget | null) => {
  const n = el as HTMLElement | null;
  return !!n && (n.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName));
};

export function KeyboardShortcuts({ onAddTx }: { onAddTx: () => void }) {
  const p = usePortfolio();
  const navigate = useNavigate();
  const [help, setHelp] = useState(false);
  const bg = p.lang === "bg";
  useEffect(() => {
    let armed = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const k = e.key.toLowerCase();
      if (armed && Date.now() - armed < 1200 && GO[k]) {
        armed = 0;
        e.preventDefault();
        void navigate({ to: GO[k] });
        return;
      }
      armed = 0;
      if (k === "g") armed = Date.now();
      else if (k === "n") {
        e.preventDefault();
        if (p.user) onAddTx();
        else void navigate({ to: "/auth" });
      } else if (e.key === "?") {
        e.preventDefault();
        setHelp(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, onAddTx, p.user]);
  const rows: [string, string][] = [
    ["Ctrl/⌘ + K", bg ? "Бързо меню и търсене" : "Quick menu and search"],
    ["N", p.t("addTx")],
    ["G  D", p.t("dashboard")],
    ["G  H", p.t("holdings")],
    ["G  M", bg ? "Пазари" : "Markets"],
    ["G  W", "Watchlist"],
    ["G  A", p.t("analytics")],
    ["G  V", p.t("dividends")],
    ["G  T", bg ? "Инструменти" : "Tools"],
    ["G  C", bg ? "Общност" : "Community"],
    ["G  P", bg ? "Профил" : "Profile"],
    ["?", bg ? "Този списък" : "This list"],
  ];
  return (
    <Dialog open={help} onOpenChange={setHelp}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-2xl border-border bg-background sm:max-w-md">
        <DialogTitle>{bg ? "Клавишни комбинации" : "Keyboard shortcuts"}</DialogTitle>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
          {rows.map(([keys, label]) => (
            <div key={keys} className="contents">
              <dt>
                <kbd className="rounded-md border border-border bg-secondary px-2 py-0.5 font-mono text-xs">
                  {keys}
                </kbd>
              </dt>
              <dd className="text-muted-foreground">{label}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
