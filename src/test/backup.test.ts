import { describe, expect, it } from "vitest";
import { parsePortfolioBackup } from "@/lib/backup";

const backup = {
  assets: [{ id: "asset-1", symbol: "AAPL", name: "Apple Inc.", type: "stock" }],
  transactions: [
    {
      id: "transaction-1",
      assetId: "asset-1",
      kind: "buy",
      quantity: 2,
      price: 180,
      fee: 0,
      date: "2024-01-15",
    },
  ],
};

describe("parsePortfolioBackup", () => {
  it("maps a Capispot backup into USD transaction import rows", () => {
    expect(parsePortfolioBackup(backup)).toEqual([
      {
        symbol: "AAPL",
        name: "Apple Inc.",
        assetType: "stock",
        kind: "buy",
        quantity: 2,
        price: 180,
        fee: 0,
        date: "2024-01-15",
        currency: "USD",
      },
    ]);
  });

  it("preserves bond valuation and contract details from a JSON backup", () => {
    const rows = parsePortfolioBackup({
      assets: [
        {
          id: "bond-1",
          symbol: "US-TREASURY",
          name: "Treasury note",
          type: "bond",
          price: 98.5,
          bondCouponRate: 4.25,
          bondMaturityDate: "2030-01-15",
          bondFaceValue: 100,
        },
      ],
      transactions: [
        {
          assetId: "bond-1",
          kind: "buy",
          quantity: 2,
          price: 97,
          fee: 1.5,
          date: "2024-01-15",
        },
      ],
    });
    expect(rows[0]).toMatchObject({
      assetType: "bond",
      bondCouponRate: 4.25,
      bondMaturityDate: "2030-01-15",
      bondFaceValue: 100,
      bondManualPrice: 98.5,
      fee: 1.5,
    });
  });

  it("rejects transactions whose asset is missing from the backup", () => {
    expect(() =>
      parsePortfolioBackup({
        ...backup,
        transactions: [{ ...backup.transactions[0], assetId: "missing" }],
      }),
    ).toThrow("without a matching asset");
  });

  it("rejects impossible dates", () => {
    expect(() =>
      parsePortfolioBackup({
        ...backup,
        transactions: [{ ...backup.transactions[0], date: "2024-02-31" }],
      }),
    ).toThrow();
  });
});
