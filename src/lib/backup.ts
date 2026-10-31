import { z } from "zod";
import type { ImportedTx } from "./csv-import";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const time = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
  });

const backupSchema = z
  .object({
    assets: z
      .array(
        z.object({
          id: z.string().min(1),
          symbol: z.string().min(1).max(30),
          name: z.string().min(1).max(200),
          type: z.enum(["stock", "etf", "crypto", "bond", "cash", "realEstate"]),
          price: z.number().positive().nullable().optional(),
          bondCouponRate: z.number().nonnegative().nullable().optional(),
          bondMaturityDate: dateSchema.nullable().optional(),
          bondFaceValue: z.number().positive().nullable().optional(),
        }),
      )
      .max(10000),
    transactions: z
      .array(
        z.object({
          assetId: z.string().min(1),
          kind: z.enum(["buy", "sell", "dividend"]),
          quantity: z.number().finite().positive(),
          price: z.number().finite().positive(),
          fee: z.number().finite().nonnegative().default(0),
          date: dateSchema,
        }),
      )
      .min(1)
      .max(10000),
  })
  .passthrough();

export function parsePortfolioBackup(value: unknown): ImportedTx[] {
  const parsed = backupSchema.parse(value);
  const assets = new Map(parsed.assets.map((asset) => [asset.id, asset]));

  return parsed.transactions.map((transaction) => {
    const asset = assets.get(transaction.assetId);
    if (!asset) throw new Error("Backup contains a transaction without a matching asset.");
    return {
      symbol: asset.symbol.toUpperCase(),
      name: asset.name,
      assetType: asset.type,
      kind: transaction.kind,
      quantity: transaction.quantity,
      price: transaction.price,
      fee: transaction.fee,
      date: transaction.date,
      currency: "USD",
      ...(asset.type === "bond"
        ? {
            ...(asset.bondCouponRate !== null && asset.bondCouponRate !== undefined
              ? { bondCouponRate: asset.bondCouponRate }
              : {}),
            ...(asset.bondMaturityDate ? { bondMaturityDate: asset.bondMaturityDate } : {}),
            ...(asset.bondFaceValue !== null && asset.bondFaceValue !== undefined
              ? { bondFaceValue: asset.bondFaceValue }
              : {}),
            ...(asset.price !== null && asset.price !== undefined
              ? { bondManualPrice: asset.price }
              : {}),
          }
        : {}),
    };
  });
}
