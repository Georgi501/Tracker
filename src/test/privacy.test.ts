import { MONEY_MASK, maskMonetaryDom, maskMonetaryText } from "@/lib/privacy";
import { afterEach, expect, it } from "vitest";
afterEach(() => document.body.replaceChildren());
it.each(["$16,985.00", "16 985,50 €", "16\u00a0985\u00a0щ.д.", "USD 42.25", "−£142.85", "$1.2B"])(
  "masks localized monetary text %s",
  (text) => {
    expect(maskMonetaryText(text)).toContain(MONEY_MASK);
    expect(maskMonetaryText(text)).not.toMatch(/\d/);
  },
);
it("preserves percentages, dates and nonmonetary identifiers", () => {
  const value = "NVDA +24.3% · 2026-11-12";
  expect(maskMonetaryText(value)).toBe(value);
  expect(maskMonetaryText("$20 (+2.5%)")).toBe(`${MONEY_MASK} (+2.5%)`);
});
it("masks dynamic text and accessible labels then restores the latest real value", async () => {
  document.body.innerHTML = '<p title="Value $100"><span>$100</span><b>+2%</b></p>';
  const restore = maskMonetaryDom(document.body);
  const span = document.querySelector("span")!;
  expect(span.textContent).toBe(MONEY_MASK);
  expect(document.querySelector("p")).toHaveAttribute("title", `Value ${MONEY_MASK}`);
  span.firstChild!.textContent = "$250";
  await new Promise((r) => setTimeout(r, 0));
  expect(span.textContent).toBe(MONEY_MASK);
  expect(document.querySelector("b")!.textContent).toBe("+2%");
  restore();
  expect(span.textContent).toBe("$250");
  expect(document.querySelector("p")).toHaveAttribute("title", "Value $100");
});
it("masks unitless price cells while leaving percentage cells and actual input data intact", () => {
  document.body.innerHTML =
    '<table><thead><tr><th>Price</th><th>Return %</th></tr></thead><tbody><tr><td>142.85</td><td>2.5%</td></tr></tbody></table><label for="amount">Amount</label><input id="amount" type="number" value="5000">';
  const restore = maskMonetaryDom(document.body);
  expect(document.querySelector("td")!.textContent).toBe(MONEY_MASK);
  expect(document.querySelectorAll("td")[1]!.textContent).toBe("2.5%");
  expect(document.querySelector("input")!.value).toBe("5000");
  expect(document.querySelector("input")).toHaveAttribute("data-private-input");
  restore();
  expect(document.querySelector("td")!.textContent).toBe("142.85");
  expect(document.querySelector("input")).not.toHaveAttribute("data-private-input");
});
it("includes same-origin embedded previews without changing their stored source", () => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  frame.contentDocument!.body.innerHTML = "<p>$142.85</p><b>+2.5%</b>";
  const restore = maskMonetaryDom(document.body);
  expect(frame.contentDocument!.querySelector("p")!.textContent).toBe(MONEY_MASK);
  expect(frame.contentDocument!.querySelector("b")!.textContent).toBe("+2.5%");
  restore();
  expect(frame.contentDocument!.querySelector("p")!.textContent).toBe("$142.85");
});
it("masks raw CSV review text and titles without modifying the stored row", () => {
  document.body.innerHTML =
    '<code data-private="raw" title="2026-01-01,buy,AAPL,1,142.85,USD">2026-01-01,buy,AAPL,1,142.85,USD</code>';
  const restore = maskMonetaryDom(document.body);
  expect(document.querySelector("code")!.textContent).toBe(MONEY_MASK);
  expect(document.querySelector("code")).toHaveAttribute("title", MONEY_MASK);
  restore();
  expect(document.querySelector("code")!.textContent).toContain("142.85");
});
it.each(["SEK 142.85", "₹142.85"])("masks additional supported currencies %s", (value) => {
  expect(maskMonetaryText(value)).toBe(MONEY_MASK);
});
it("keeps a currency exposure percentage visible", () => {
  expect(maskMonetaryText("USD +2.5%")).toBe("USD +2.5%");
});
