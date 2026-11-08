export interface DcfInputs {
  fcf: number;
  growth: number;
  discount: number;
  terminal: number;
  cash: number;
  debt: number;
  shares: number;
  years?: number;
}

export interface DcfAnalysis {
  valuePerShare: number;
  presentValueOfCashFlows: number;
  presentValueOfTerminalValue: number;
  terminalValueShare: number;
}

export type DcfCase = "bear" | "base" | "bull";

export interface DcfFundamentals {
  quoteType: string | null;
  currency: string | null;
  finCurrency: string | null;
  fcf: number | null;
  fcfPeriodEnd: string | null;
  fcfPeriodType: "12M" | null;
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  cash: number | null;
  debt: number | null;
  shares: number | null;
}

const isFiniteNumber = (value: number) => Number.isFinite(value);
const isValidCurrency = (value: string | null): value is string =>
  typeof value === "string" && /^[A-Za-z]{3}$/.test(value);

export function hasUsableDcfFundamentals(data: DcfFundamentals): data is DcfFundamentals & {
  fcf: number;
  operatingCashFlow: number;
  capitalExpenditure: number;
  cash: number;
  debt: number;
  shares: number;
  fcfPeriodEnd: string;
  fcfPeriodType: "12M";
} {
  return (
    data.quoteType?.toUpperCase() === "EQUITY" &&
    isValidCurrency(data.currency) &&
    isValidCurrency(data.finCurrency) &&
    data.currency.toUpperCase() === data.finCurrency.toUpperCase() &&
    typeof data.fcf === "number" &&
    Number.isFinite(data.fcf) &&
    data.fcf > 0 &&
    typeof data.fcfPeriodEnd === "string" &&
    Number.isFinite(Date.parse(data.fcfPeriodEnd)) &&
    data.fcfPeriodType === "12M" &&
    typeof data.operatingCashFlow === "number" &&
    Number.isFinite(data.operatingCashFlow) &&
    typeof data.capitalExpenditure === "number" &&
    Number.isFinite(data.capitalExpenditure) &&
    data.capitalExpenditure >= 0 &&
    Math.abs(data.fcf - (data.operatingCashFlow - data.capitalExpenditure)) < 0.01 &&
    typeof data.cash === "number" &&
    Number.isFinite(data.cash) &&
    data.cash >= 0 &&
    typeof data.debt === "number" &&
    Number.isFinite(data.debt) &&
    data.debt >= 0 &&
    typeof data.shares === "number" &&
    Number.isFinite(data.shares) &&
    data.shares > 0
  );
}

export function dcfValueFromFundamentals(
  data: DcfFundamentals,
  assumptions: Pick<DcfInputs, "growth" | "discount" | "terminal">,
): number | null {
  if (!hasUsableDcfFundamentals(data)) return null;
  return dcfValue({
    fcf: data.fcf,
    cash: data.cash,
    debt: data.debt,
    shares: data.shares,
    ...assumptions,
  });
}

/** Two-stage year-end DCF. Returns null when inputs are missing, invalid, or unstable. */
export function dcfAnalysis(i: DcfInputs): DcfAnalysis | null {
  const years = i.years ?? 5;
  if (
    ![i.fcf, i.growth, i.discount, i.terminal, i.cash, i.debt, i.shares, years].every(
      isFiniteNumber,
    ) ||
    i.fcf <= 0 ||
    i.growth < -0.5 ||
    i.growth > 0.5 ||
    i.discount <= 0 ||
    i.discount > 0.5 ||
    i.terminal < -0.05 ||
    i.terminal > 0.1 ||
    i.discount <= i.terminal ||
    i.cash < 0 ||
    i.debt < 0 ||
    i.shares <= 0 ||
    !Number.isInteger(years) ||
    years < 1 ||
    years > 10
  ) {
    return null;
  }

  let presentValueOfCashFlows = 0;
  let projectedFcf = i.fcf;
  for (let year = 1; year <= years; year++) {
    projectedFcf *= 1 + i.growth;
    presentValueOfCashFlows += projectedFcf / (1 + i.discount) ** year;
  }

  const terminalValue = (projectedFcf * (1 + i.terminal)) / (i.discount - i.terminal);
  const presentValueOfTerminalValue = terminalValue / (1 + i.discount) ** years;
  const operatingValue = presentValueOfCashFlows + presentValueOfTerminalValue;
  const equityValue = operatingValue + i.cash - i.debt;
  const valuePerShare = equityValue / i.shares;
  if (
    ![
      presentValueOfCashFlows,
      presentValueOfTerminalValue,
      operatingValue,
      equityValue,
      valuePerShare,
    ].every(Number.isFinite) ||
    operatingValue <= 0
  ) {
    return null;
  }

  return {
    valuePerShare,
    presentValueOfCashFlows,
    presentValueOfTerminalValue,
    terminalValueShare: presentValueOfTerminalValue / operatingValue,
  };
}

/** Compatibility helper for callers that only need the per-share result. */
export function dcfValue(i: DcfInputs): number | null {
  return dcfAnalysis(i)?.valuePerShare ?? null;
}

/** Scenario assumptions derived from a bounded baseline growth assumption. */
export function scenario(c: DcfCase, baseGrowth: number) {
  const growth = Number.isFinite(baseGrowth) ? Math.max(-0.05, Math.min(0.3, baseGrowth)) : 0.05;
  if (c === "bear") {
    return { growth: Math.max(-0.05, growth - 0.05), discount: 0.105, terminal: 0.02 };
  }
  if (c === "bull") {
    return { growth: Math.min(0.3, growth + 0.05), discount: 0.08, terminal: 0.03 };
  }
  return { growth, discount: 0.09, terminal: 0.025 };
}

/** Positive = price is below intrinsic value, expressed as a share of intrinsic value. */
export const valuationGap = (intrinsic: number, price: number) =>
  Number.isFinite(intrinsic) && Number.isFinite(price) && intrinsic > 0 && price >= 0
    ? (intrinsic - price) / intrinsic
    : null;

/** Expected return to the modeled value, expressed relative to the current share price. */
export const potentialUpside = (intrinsic: number, price: number) =>
  Number.isFinite(intrinsic) && Number.isFinite(price) && intrinsic > 0 && price > 0
    ? intrinsic / price - 1
    : null;
