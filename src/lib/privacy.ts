export const MONEY_MASK = "••••••";
const currencyCodes = (
  typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("currency")
    : ["USD", "EUR", "GBP", "BGN", "JPY", "CHF", "CAD", "AUD", "CNY", "INR", "NOK", "SEK", "DKK"]
).join("|");
const currency = "(?:US\\$|CA\\$|A\\$|\\p{Sc}|" + currencyCodes + "|щ\\.д\\.|лв\\.)";
const number = "[+−-]?\\d(?:[\\d\\s\\u00a0\\u202f.,]*\\d)?(?:[KMBT]|\\s*(?:млн\\.|млрд\\.))?";
const moneyPattern = new RegExp(
  `${currency}\\s*${number}(?![\\d\\s.,]*%)|${number}\\s*${currency}`,
  "gu",
);
export function maskMonetaryText(text: string) {
  return text.replace(moneyPattern, MONEY_MASK);
}
/** Screen privacy, not encryption. Original display text is kept only in WeakMaps, never HTML attributes. */
export function maskMonetaryDom(root: HTMLElement) {
  const textValues = new WeakMap<Text, { raw: string; masked: string }>();
  const attributeValues = new WeakMap<Element, Map<string, { raw: string; masked: string }>>();
  const privateInputs = new WeakSet<HTMLInputElement>();
  const moneyCells = new WeakSet<Element>();
  const frameRestores = new WeakMap<HTMLIFrameElement, () => void>();
  const frameListeners = new WeakMap<HTMLIFrameElement, () => void>();
  const processText = (node: Text) => {
    const parent = node.parentElement;
    if (!parent || parent.closest("script,style,textarea,input,[data-privacy-public]")) return;
    const value = node.data,
      old = textValues.get(node);
    if (old?.masked === value) return;
    let masked =
      parent.closest('[data-private="raw"]') && value.trim() ? MONEY_MASK : maskMonetaryText(value);
    if (
      masked === value &&
      /^[+−-]?[\d\s.,]+[KMBT]?$/.test(value.trim()) &&
      !parent.closest(".recharts-xAxis,time") &&
      !parent.textContent?.includes("%")
    ) {
      const explicit = parent.closest('[data-private="money"]');
      const context = parent.parentElement?.textContent ?? "";
      if (explicit || maskMonetaryText(context) !== context) masked = MONEY_MASK;
    }
    if (masked !== value) {
      textValues.set(node, { raw: value, masked });
      node.data = masked;
    } else textValues.delete(node);
  };
  const processElement = (element: Element) => {
    if (
      element instanceof
        (element.ownerDocument.defaultView?.HTMLIFrameElement ?? HTMLIFrameElement) &&
      !frameListeners.has(element)
    ) {
      const syncFrame = () => {
        try {
          const body = element.contentDocument?.body;
          if (!body) return;
          frameRestores.get(element)?.();
          frameRestores.set(element, maskMonetaryDom(body));
        } catch {
          /* Cross-origin widgets do not receive portfolio values. */
        }
      };
      frameListeners.set(element, syncFrame);
      element.addEventListener("load", syncFrame);
      syncFrame();
    }
    if (
      element.classList.contains("recharts-yAxis") &&
      !element.textContent?.includes("%") &&
      !element.hasAttribute("data-private")
    ) {
      element.setAttribute("data-private", "money");
      moneyCells.add(element);
    }
    const row =
      element instanceof
      (element.ownerDocument.defaultView?.HTMLTableRowElement ?? HTMLTableRowElement)
        ? element
        : element instanceof
            (element.ownerDocument.defaultView?.HTMLTableCellElement ?? HTMLTableCellElement)
          ? (element.parentElement as HTMLTableRowElement)
          : null;
    if (row) {
      const headers = [...(row.closest("table")?.querySelectorAll("thead tr:last-child th") ?? [])];
      headers.forEach((header, index) => {
        if (
          /price|cost|value|gain|loss|fee|amount|proceeds|dividend|цена|стойност|печалба|загуба|такс|сума|дивидент/i.test(
            header.textContent ?? "",
          )
        ) {
          const cell = row.cells[index];
          if (cell && !cell.hasAttribute("data-private")) {
            cell.setAttribute("data-private", "money");
            moneyCells.add(cell);
          }
        }
      });
    }
    if (element.closest("script,style,[data-privacy-public]")) return;
    for (const name of ["aria-label", "title", "aria-valuetext", "alt"]) {
      const raw = element.getAttribute(name);
      if (!raw) continue;
      const saved = attributeValues.get(element)?.get(name);
      if (saved?.masked === raw) continue;
      const masked = element.closest('[data-private="raw"]') ? MONEY_MASK : maskMonetaryText(raw);
      if (raw !== masked) {
        const entries = attributeValues.get(element) ?? new Map();
        entries.set(name, { raw, masked });
        attributeValues.set(element, entries);
        element.setAttribute(name, masked);
      }
    }
    if (
      element instanceof
        (element.ownerDocument.defaultView?.HTMLInputElement ?? HTMLInputElement) &&
      element.type === "number"
    ) {
      const label =
        [...(element.labels ?? [])].map((label) => label.textContent ?? "").join(" ") ||
        element.previousElementSibling?.textContent ||
        "";
      if (
        !/%|percent|quantity|shares|years|количество|години/i.test(label) &&
        /price|cost|amount|income|expense|contribution|budget|цена|сума|вноска|доход|разход/i.test(
          label,
        )
      ) {
        element.setAttribute("data-private-input", "");
        privateInputs.add(element);
      }
    }
  };
  const scan = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      processText(node as Text);
      return;
    }
    if (!(node instanceof (node.ownerDocument?.defaultView?.Element ?? Element))) return;
    processElement(node);
    for (const child of [...node.childNodes]) scan(child);
  };
  scan(root);
  const observer = new MutationObserver((records) => {
    const targets = new Set<Node>();
    for (const record of records) {
      if (record.type === "childList") for (const node of record.addedNodes) targets.add(node);
      else targets.add(record.target);
    }
    for (const node of targets) if (root.contains(node)) scan(node);
  });
  observer.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["aria-label", "title", "aria-valuetext", "alt"],
  });
  return () => {
    observer.disconnect();
    const restoreNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const value = textValues.get(node as Text);
        if (value && (node as Text).data === value.masked) (node as Text).data = value.raw;
      }
      if (node instanceof (node.ownerDocument?.defaultView?.Element ?? Element)) {
        if (
          node instanceof (node.ownerDocument?.defaultView?.HTMLIFrameElement ?? HTMLIFrameElement)
        ) {
          frameRestores.get(node)?.();
          const listener = frameListeners.get(node);
          if (listener) node.removeEventListener("load", listener);
        }
        const entries = attributeValues.get(node);
        if (entries)
          for (const [name, value] of entries)
            if (node.getAttribute(name) === value.masked) node.setAttribute(name, value.raw);
        if (moneyCells.has(node)) node.removeAttribute("data-private");
        if (
          node instanceof (node.ownerDocument?.defaultView?.HTMLInputElement ?? HTMLInputElement) &&
          privateInputs.has(node)
        )
          node.removeAttribute("data-private-input");
        for (const child of [...node.childNodes]) restoreNode(child);
      }
    };
    restoreNode(root);
  };
}
