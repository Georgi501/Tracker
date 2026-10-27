import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { usePortfolio } from "@/lib/store";
import { searchCatalog } from "@/lib/market-search";

/** Ctrl/⌘+K quick menu: navigate, add a transaction, or jump to an asset. */
export function CommandMenu({ onAddTx }: { onAddTx: () => void }) {
  const p = usePortfolio();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const bg = p.lang === "bg";
  const pages = [
    ["/", p.t("dashboard")],
    ["/holdings", p.t("holdings")],
    ["/markets", bg ? "Пазари" : "Markets"],
    ["/watchlist", "Watchlist"],
    ["/analytics", p.t("analytics")],
    ["/dividends", p.t("dividends")],
    ["/tools", bg ? "Инструменти (DCF, данъци, AI преглед)" : "Tools (DCF, tax, AI review)"],
    ["/brokers", p.t("brokers")],
    ["/demo", bg ? "Примерно портфолио" : "Sample portfolio"],
    ["/pricing", p.t("pricing")],
  ] as const;
  const go = (fn: () => void) => {
    setOpen(false);
    setQ("");
    fn();
  };
  const assets = q.trim().length > 0 ? searchCatalog(q).slice(0, 6) : [];
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={bg ? "Бързо меню" : "Quick menu"}
        title="Ctrl+K"
        className="press hidden size-9 place-items-center rounded-full bg-secondary text-muted-foreground hover:text-foreground md:grid"
      >
        <Command size={16} />
        <span className="sr-only">Ctrl+K</span>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={q}
          onValueChange={setQ}
          placeholder={
            bg ? "Търси страница, компания или действие…" : "Search a page, company or action…"
          }
        />
        <CommandList>
          <CommandEmpty>{bg ? "Няма резултати" : "No results"}</CommandEmpty>
          <CommandGroup heading={bg ? "Действия" : "Actions"}>
            <CommandItem
              onSelect={() => go(() => (p.user ? onAddTx() : navigate({ to: "/auth" })))}
            >
              {p.t("addTx")}
            </CommandItem>
            <CommandItem onSelect={() => go(() => p.toggleTheme())}>
              {p.t("toggleTheme")}
            </CommandItem>
            <CommandItem
              value="language език"
              onSelect={() => go(() => p.setLang(p.lang === "bg" ? "en" : "bg"))}
            >
              {bg ? "Смени езика (EN)" : "Switch language (BG)"}
            </CommandItem>
          </CommandGroup>
          {p.holdings.length > 0 && (
            <CommandGroup heading={bg ? "Моите холдинги" : "My holdings"}>
              {p.holdings.slice(0, 20).map((h) => (
                <CommandItem
                  key={h.asset.id}
                  value={`${h.asset.symbol} ${h.asset.name}`}
                  onSelect={() =>
                    go(() => navigate({ to: "/asset/$symbol", params: { symbol: h.asset.symbol } }))
                  }
                >
                  <span className="font-semibold">{h.asset.symbol}</span>
                  <span className="text-muted-foreground">{h.asset.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {assets.length > 0 && (
            <CommandGroup heading={bg ? "Активи" : "Assets"}>
              {assets.map((a) => (
                <CommandItem
                  key={a.symbol}
                  value={`${a.symbol} ${a.name}`}
                  onSelect={() => go(() => navigate({ to: "/markets", search: { q: a.symbol } }))}
                >
                  <span className="font-semibold">{a.symbol}</span>
                  <span className="text-muted-foreground">{a.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading={bg ? "Страници" : "Pages"}>
            {pages.map(([to, label]) => (
              <CommandItem key={to} onSelect={() => go(() => navigate({ to }))}>
                {label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
