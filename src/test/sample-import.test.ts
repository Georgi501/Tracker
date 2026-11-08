import { expect, it } from "vitest";
import {
  detectBrokerFormat,
  parseBrokerCsv,
  rejectedCsvRows,
  splitDuplicates,
} from "@/lib/csv-import";
import { SAMPLE_IBKR_CSV, SAMPLE_IMPORT_CSV, SAMPLE_TRADING212_CSV } from "@/lib/sample-import";

it("demonstrates format detection, duplicate handling, and rejected rows", () => {
  const format = detectBrokerFormat(SAMPLE_IMPORT_CSV);
  expect(format).toBe("generic");
  if (!format) throw new Error("Sample CSV should have a detectable format");

  const parsed = parseBrokerCsv(format, SAMPLE_IMPORT_CSV);
  const { fresh, duplicates } = splitDuplicates(parsed, []);
  const rejected = rejectedCsvRows(format, SAMPLE_IMPORT_CSV);

  expect(fresh).toHaveLength(3);
  expect(duplicates).toHaveLength(1);
  expect(rejected).toHaveLength(1);
  expect(rejected[0]?.reason).toBe("unsupported_action");
});

it.each([
  ["Trading 212", "trading212", SAMPLE_TRADING212_CSV],
  ["Interactive Brokers", "ibkr", SAMPLE_IBKR_CSV],
] as const)("demonstrates %s CSV import parsing", (_label, expectedFormat, csv) => {
  const format = detectBrokerFormat(csv);
  expect(format).toBe(expectedFormat);
  if (!format) throw new Error("Sample CSV should have a detectable format");

  const parsed = parseBrokerCsv(format, csv);
  const { fresh, duplicates } = splitDuplicates(parsed, []);

  expect(fresh.length).toBeGreaterThanOrEqual(2);
  expect(duplicates).toHaveLength(1);
  expect(rejectedCsvRows(format, csv)).toHaveLength(1);
});
