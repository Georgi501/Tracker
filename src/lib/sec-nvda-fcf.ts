export const NVDA_FINANCED_ASSET_TAG =
  "PaymentsForFinancedPropertyPlantAndEquipmentAndIntangibleAssetsFinancingActivities";

/** Narrow, fail-closed reader for NVIDIA's audited inline-XBRL extension.
 * No inferred zeros, dimensional facts, currency conversion or arbitrary HTML numbers.
 */
export function extractNvdaFinancedAssetPayments(
  html: string,
  filing: { accession: string; filed: string },
) {
  const attributes = (text: string) =>
    Object.fromEntries(
      [...text.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map((match) => [
        match[1]!,
        match[2]!,
      ]),
    );
  const contexts = new Map<string, { start: string; end: string }>();
  for (const match of html.matchAll(/<xbrli:context\b([^>]*)>([\s\S]*?)<\/xbrli:context>/g)) {
    const id = attributes(match[1]!)["id"];
    const body = match[2]!;
    if (!id || /<(?:\w+:)?(?:segment|scenario)\b/.test(body)) continue;
    const identifier = body.match(/<xbrli:identifier\b([^>]*)>(\d+)<\/xbrli:identifier>/);
    if (
      !identifier ||
      attributes(identifier[1]!)["scheme"] !== "http://www.sec.gov/CIK" ||
      Number(identifier[2]) !== 1045810
    )
      continue;
    const start = body.match(/<xbrli:startDate>(\d{4}-\d{2}-\d{2})<\/xbrli:startDate>/)?.[1];
    const end = body.match(/<xbrli:endDate>(\d{4}-\d{2}-\d{2})<\/xbrli:endDate>/)?.[1];
    if (start && end) contexts.set(id, { start, end });
  }
  const usdUnits = new Set<string>();
  for (const match of html.matchAll(/<xbrli:unit\b([^>]*)>([\s\S]*?)<\/xbrli:unit>/g)) {
    const id = attributes(match[1]!)["id"];
    if (id && /^\s*<xbrli:measure>iso4217:USD<\/xbrli:measure>\s*$/.test(match[2]!))
      usdUnits.add(id);
  }
  const facts: {
    start: string;
    end: string;
    val: number;
    accn: string;
    filed: string;
    form: "10-K";
  }[] = [];
  for (const match of html.matchAll(/<ix:nonFraction\b([^>]*)>([\s\S]*?)<\/ix:nonFraction>/g)) {
    const attrs = attributes(match[1]!);
    if (
      attrs["name"] !== `nvda:${NVDA_FINANCED_ASSET_TAG}` ||
      !usdUnits.has(attrs["unitRef"] ?? "") ||
      attrs["xsi:nil"] === "true" ||
      attrs["continuedAt"] ||
      attrs["format"]
    )
      continue;
    const period = contexts.get(attrs["contextRef"] ?? "");
    const value = match[2]!.trim();
    if (
      !period ||
      !/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value) ||
      !/^-?\d+$/.test(attrs["scale"] ?? "0")
    )
      continue;
    const scale = Number(attrs["scale"] ?? "0");
    if (scale < -12 || scale > 12 || (attrs["sign"] && attrs["sign"] !== "-")) continue;
    const val = Number(value.replaceAll(",", "")) * 10 ** scale * (attrs["sign"] === "-" ? -1 : 1);
    if (!Number.isFinite(val)) continue;
    facts.push({ ...period, val, accn: filing.accession, filed: filing.filed, form: "10-K" });
  }
  return facts;
}
