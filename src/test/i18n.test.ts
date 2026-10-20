import { describe, expect, it } from "vitest";
import { isLang, languageLocale } from "@/lib/i18n";
describe("supported language preferences", () => {
  it.each(["de", "es", "it"])("accepts %s as a saved language", (code) => { expect(isLang(code)).toBe(true); });
  it("preserves English and Bulgarian support", () => { expect(isLang("en")).toBe(true); expect(isLang("bg")).toBe(true); });
  it("rejects invalid stored values", () => { expect(isLang("fr")).toBe(false); expect(isLang(null)).toBe(false); });
  it("uses the corresponding regional formatting", () => { expect(languageLocale("de")).toBe("de-DE"); expect(languageLocale("es")).toBe("es-ES"); expect(languageLocale("it")).toBe("it-IT"); });
});
