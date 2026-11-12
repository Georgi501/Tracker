import { extractSecInlinePayments } from "./sec-inline-payments";
export const NVDA_FINANCED_ASSET_TAG =
  "PaymentsForFinancedPropertyPlantAndEquipmentAndIntangibleAssetsFinancingActivities";

export function extractNvdaFinancedAssetPayments(
  html: string,
  filing: { accession: string; filed: string },
) {
  return extractSecInlinePayments(html, {
    ...filing,
    cik: 1045810,
    tag: `nvda:${NVDA_FINANCED_ASSET_TAG}`,
  });
}
