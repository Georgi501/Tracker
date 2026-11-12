import { useSyncExternalStore } from "react";
const KEY = "capispot-hide-balances";
let volatileHidden = false;
let storageUnavailable = false;
function read() {
  if (storageUnavailable) return volatileHidden;
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    return volatileHidden;
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("capispot-privacy", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("capispot-privacy", callback);
    window.removeEventListener("storage", callback);
  };
}
export function setPrivacyMode(hidden: boolean) {
  volatileHidden = hidden;
  try {
    localStorage.setItem(KEY, String(hidden));
  } catch {
    storageUnavailable = true;
  }
  window.dispatchEvent(new Event("capispot-privacy"));
}
export function usePrivacyMode() {
  return useSyncExternalStore(subscribe, read, () => false);
}
