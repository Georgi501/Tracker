import { expect, it } from "vitest";
import {
  detectBrokerFormat,
  parseBrokerCsv,
  rejectedCsvRows,
  splitDuplicates,
} from "@/lib/csv-import";
import { SAMPLE_IMPORT_CSV } from "@/lib/sample-import";

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
