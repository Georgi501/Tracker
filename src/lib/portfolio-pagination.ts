export const PORTFOLIO_PAGE_SIZE = 500;
type Page<Row> = { data: Row[] | null; error: { message: string } | null; count: number | null };

/** Legacy pagination comparator. Not a consistent snapshot: never use for financial inputs. */
export async function readAllPortfolioRows<Row extends { id: string }>(
  fetchPage: (from: number, to: number) => PromiseLike<Page<Row>>,
): Promise<{ data: Row[]; error: { message: string } | null }> {
  const data: Row[] = [];
  const ids = new Set<string>();
  let expected: number | null = null;
  while (true) {
    const page = await fetchPage(data.length, data.length + PORTFOLIO_PAGE_SIZE - 1);
    if (page.error) throw new Error(`Portfolio page unavailable: ${page.error.message}`);
    if (
      !Array.isArray(page.data) ||
      page.count === null ||
      !Number.isSafeInteger(page.count) ||
      page.count < 0
    )
      throw new Error("Portfolio page completeness could not be verified");
    if (expected === null) expected = page.count;
    if (page.count !== expected)
      throw new Error("Portfolio changed while loading. Retry the complete history.");
    if (!page.data.length && data.length < expected)
      throw new Error("Portfolio history is incomplete");
    for (const row of page.data) {
      if (!row.id || ids.has(row.id))
        throw new Error("Portfolio pages contain missing or repeated IDs");
      ids.add(row.id);
      data.push(row);
    }
    if (data.length > expected) throw new Error("Portfolio history count mismatch");
    if (data.length === expected) return { data, error: null };
  }
}
