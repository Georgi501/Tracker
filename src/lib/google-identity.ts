import type { Lang } from "./i18n";
const SDK_URL = "https://accounts.google.com/gsi/client";
let pending: Promise<void> | null = null;
let requestedLocale: Lang | null = null;
let loadedLocale: Lang | null = null;
/** Serialize locale changes so a slower obsolete SDK cannot overwrite the currently requested language. */
export function loadGoogleIdentityScript(locale: Lang): Promise<void> {
  if (pending && requestedLocale === locale) return pending;
  if (!pending && loadedLocale === locale && window.google?.accounts.id) return Promise.resolve();
  const previous = pending;
  requestedLocale = locale;
  const request = (previous ?? Promise.resolve())
    .catch(() => undefined)
    .then(
      () =>
        new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = `${SDK_URL}?hl=${encodeURIComponent(locale)}`;
          script.async = true;
          script.onload = () => {
            loadedLocale = locale;
            resolve();
          };
          script.onerror = () => reject(new Error("Unable to load Google Identity Services"));
          document.head.append(script);
        }),
    );
  pending = request;
  const settled = () => {
    if (pending === request) pending = null;
  };
  void request.then(settled, settled);
  return request;
}
