import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Command, Globe2, Plus, Search, SunMoon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { usePortfolio } from "@/lib/store";
import { searchCatalog, type MarketAsset } from "@/lib/market-search";
import { searchMarket } from "@/lib/market.functions";
import { commandCopy, commandRoutes } from "@/lib/command-copy";
import { languages } from "@/lib/i18n";

/** Public market search is cached by query; private holdings never leave the browser. */
export function CommandMenu({ onAddTx }: { onAddTx: () => void }) {
  const p = usePortfolio();
  const navigate = useNavigate();
  const search = useServerFn(searchMarket);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const q = query.trim();
  const c = commandCopy[p.lang];
  const changeOpen = (value: boolean) => {
    if (value)
      returnFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(value);
    if (!value) {
      setQuery("");
      setDebounced("");
    }
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        !event.repeat &&
        !event.isComposing &&
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        if (document.activeElement instanceof HTMLElement)
          returnFocus.current = document.activeElement;
        setOpen((previous) => !previous);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebounced("");
      return;
    }
    const timer = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(timer);
  }, [q, open]);
  const results = useQuery({
    queryKey: ["command-assets", debounced],
    queryFn: () => search({ data: { query: debounced, includeNews: false } }),
    enabled: open && debounced === q && q.length >= 2 && q.length <= 60,
    staleTime: 60_000,
    gcTime: 300_000,
    retry: false,
  });
  // Never display an earlier response while the user is typing a newer query.
  const current = debounced === q ? results.data : undefined;
  const searching = open && q.length >= 2 && (debounced !== q || results.isFetching);
  const holdings = useMemo(
    () =>
      p.holdings
        .filter(
          (h) =>
            !q ||
            `${h.asset.symbol} ${h.asset.name}`.toLocaleLowerCase().includes(q.toLocaleLowerCase()),
        )
        .slice(0, 8),
    [p.holdings, q],
  );
  const assets = useMemo(() => {
    if (!q) return [];
    const merged = new Map<string, MarketAsset>();
    for (const asset of [...searchCatalog(q), ...(current?.assets ?? [])])
      merged.set(asset.symbol.toUpperCase(), asset);
    const owned = new Set(holdings.map((h) => h.asset.symbol.toUpperCase()));
    return [...merged.values()]
      .filter((asset) => !owned.has(asset.symbol.toUpperCase()))
      .slice(0, 8);
  }, [q, current, holdings]);
  const go = (fn: () => void) => {
    changeOpen(false);
    fn();
  };
  const assetItem = (asset: { symbol: string; name: string }, prefix: string) => (
    <CommandItem
      key={`${prefix}-${asset.symbol}`}
      value={`${prefix} ${asset.symbol} ${asset.name}`}
      keywords={[q]}
      onSelect={() =>
        go(() => void navigate({ to: "/asset/$symbol", params: { symbol: asset.symbol } }))
      }
    >
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-[10px] font-bold text-primary"
      >
        {asset.symbol.slice(0, 4)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{asset.symbol}</span>
        <span className="block truncate text-xs text-muted-foreground">{asset.name}</span>
      </span>
      <ArrowUpRight aria-hidden className="size-4 text-muted-foreground" />
    </CommandItem>
  );
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => changeOpen(true)}
        aria-label={c.title}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={`${c.title} (Ctrl/⌘+K)`}
        className="press grid size-11 shrink-0 place-items-center rounded-full border border-border/70 bg-secondary/50 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Command size={18} aria-hidden />
        <span className="sr-only">Ctrl/⌘+K</span>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={changeOpen}
        title={c.title}
        description={c.description}
        closeLabel={c.close}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const previous = returnFocus.current;
          if (previous?.isConnected) previous.focus();
          else triggerRef.current?.focus();
        }}
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          maxLength={60}
          className="pr-11"
          aria-label={c.placeholder}
          placeholder={c.placeholder}
        />
        <div
          className="flex h-9 items-center border-b border-border/60 px-4 text-[11px] text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {searching
            ? c.searching
            : current?.unavailable || (debounced === q && results.isError)
              ? c.limited
              : c.description}
        </div>
        <CommandList
          className="h-[min(26rem,50dvh)] max-h-none overscroll-contain p-1"
          aria-busy={searching}
        >
          <CommandEmpty>{c.empty}</CommandEmpty>
          {holdings.length > 0 && (
            <CommandGroup heading={c.holdings}>
              {holdings.map((h) => assetItem(h.asset, "holding"))}
            </CommandGroup>
          )}
          {assets.length > 0 && (
            <CommandGroup heading={c.assets}>
              {assets.map((asset) => assetItem(asset, "asset"))}
            </CommandGroup>
          )}
          <CommandGroup heading={c.actions}>
            <CommandItem
              value={`add transaction ${p.t("addTx")}`}
              onSelect={() =>
                go(() => {
                  if (p.user) onAddTx();
                  else void navigate({ to: "/auth" });
                })
              }
            >
              <Plus aria-hidden />
              {p.t("addTx")}
            </CommandItem>
            <CommandItem
              value={`theme dark light ${p.t("toggleTheme")}`}
              onSelect={() => go(p.toggleTheme)}
            >
              <SunMoon aria-hidden />
              {p.t("toggleTheme")}
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading={c.pages}>
            {commandRoutes.map((to) => (
              <CommandItem
                key={to}
                value={`${c.routes[to]} ${commandCopy.en.routes[to]}`}
                onSelect={() => go(() => void navigate({ to }))}
              >
                <Search aria-hidden className="text-muted-foreground" />
                <span className="flex-1">{c.routes[to]}</span>
                <ArrowUpRight aria-hidden className="size-3 text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading={c.languages}>
            {languages.map((language) => (
              <CommandItem
                key={language.code}
                value={`language ${c.languages} ${language.name} ${language.code}`}
                onSelect={() => go(() => p.setLang(language.code))}
              >
                <Globe2 aria-hidden />
                {language.name}
                <span className="ml-auto text-xs text-muted-foreground">
                  {language.code.toUpperCase()}
                  {p.lang === language.code ? " ✓" : ""}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
        <div className="flex items-center gap-4 border-t border-border/60 bg-secondary/30 px-4 py-3 text-[10px] text-muted-foreground">
          <span>
            <kbd>↑ ↓</kbd> {c.navigate}
          </span>
          <span>
            <kbd>↵</kbd> {c.select}
          </span>
          <span className="ml-auto">
            <kbd>Esc</kbd> {c.close}
          </span>
        </div>
      </CommandDialog>
    </>
  );
}
