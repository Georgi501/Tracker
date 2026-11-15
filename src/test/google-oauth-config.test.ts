import { expect, it } from "vitest";
import { productionGoogleClientId, resolveGoogleClientId } from "../../config/google-oauth";

it("preserves the existing production client through production configuration", () => {
  expect(resolveGoogleClientId("production", {})).toBe(productionGoogleClientId);
});
it("does not inherit a production override when staging has no client", () => {
  expect(
    resolveGoogleClientId("staging", { VITE_GOOGLE_WEB_CLIENT_ID: productionGoogleClientId }),
  ).toBe("");
});
it("uses the explicit staging client and trims it", () => {
  expect(
    resolveGoogleClientId("staging", {
      VITE_GOOGLE_STAGING_CLIENT_ID: " 123-test.apps.googleusercontent.com ",
    }),
  ).toBe("123-test.apps.googleusercontent.com");
});
it("rejects production credentials selected explicitly for staging", () => {
  expect(() =>
    resolveGoogleClientId("staging", { VITE_GOOGLE_STAGING_CLIENT_ID: productionGoogleClientId }),
  ).toThrow("separate");
});
it("rejects malformed client configuration and leaves development unconfigured by default", () => {
  expect(() =>
    resolveGoogleClientId("staging", { VITE_GOOGLE_STAGING_CLIENT_ID: "not-a-client" }),
  ).toThrow("Invalid");
  expect(resolveGoogleClientId("development", {})).toBe("");
});
