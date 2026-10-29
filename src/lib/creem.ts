export function isCreemTestMode(): boolean {
  const configuredMode = import.meta.env["VITE_CREEM_MODE"];
  return configuredMode ? configuredMode === "test" : import.meta.env.DEV;
}
