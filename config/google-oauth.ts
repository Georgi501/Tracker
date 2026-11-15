// Public OAuth identifier, preserved from the existing production configuration.
export const productionGoogleClientId =
  "306300201431-r984q2kfae6tm75kt29htl8npnajbjh0.apps.googleusercontent.com";

export function resolveGoogleClientId(
  environment: string,
  env: Record<string, string | undefined>,
) {
  const production = env["VITE_GOOGLE_WEB_CLIENT_ID"]?.trim() || productionGoogleClientId;
  const client =
    environment === "production"
      ? production
      : environment === "staging"
        ? env["VITE_GOOGLE_STAGING_CLIENT_ID"]?.trim() || ""
        : env["VITE_GOOGLE_DEVELOPMENT_CLIENT_ID"]?.trim() || "";
  if (
    environment === "staging" &&
    client &&
    (client === production || client === productionGoogleClientId)
  )
    throw new Error("Staging requires a separate Google OAuth client");
  if (client && !/^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(client))
    throw new Error("Invalid Google OAuth web client identifier");
  return client;
}
