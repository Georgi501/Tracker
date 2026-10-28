export function dedupeMarketNews<T extends { title: string; link: string }>(items: T[]): T[] {
  const links = new Set<string>();
  const titles = new Set<string>();
  return items.filter((item) => {
    const link = item.link
      .trim()
      .toLowerCase()
      .replace(/[?#].*$/, "")
      .replace(/\/$/, "");
    const title = item.title.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
    if (links.has(link) || titles.has(title)) return false;
    links.add(link);
    titles.add(title);
    return true;
  });
}
