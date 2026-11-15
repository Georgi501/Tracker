import { createServerFn } from "@tanstack/react-start";
import {
  getCookie,
  getRequestUrl,
  setCookie,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { selectCompanySuggestions } from "./company-suggestions";

export const getCompanySuggestions = createServerFn({ method: "GET" }).handler(() => {
  const cookieName = "capispot-company-selection";
  const companies = selectCompanySuggestions(getCookie(cookieName), () => {
    const [value] = crypto.getRandomValues(new Uint32Array(1));
    return value! / 2 ** 32;
  });
  // The HTML varies by a non-account preference; never replay a cached
  // selection (or its Set-Cookie) across reloads or visitors.
  setResponseHeader("Cache-Control", "private, no-store");
  setCookie(cookieName, companies.map(({ symbol }) => symbol).join(","), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: getRequestUrl().protocol === "https:",
    maxAge: 60 * 60 * 24 * 30,
  });
  return companies;
});
