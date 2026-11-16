export function isMobileNavRouteActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  if (to === "/markets") return pathname === "/markets" || pathname.startsWith("/asset/");
  return pathname === to || pathname.startsWith(`${to}/`);
}
