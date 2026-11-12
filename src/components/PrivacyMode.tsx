import { setPrivacyMode, usePrivacyMode } from "@/hooks/use-privacy-mode";
import type { Lang } from "@/lib/i18n";
import { maskMonetaryDom } from "@/lib/privacy";
import { trustCopy } from "@/lib/trust-i18n";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useLayoutEffect } from "react";
const useScreenEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
export function PrivacyController() {
  const hidden = usePrivacyMode();
  useScreenEffect(() => {
    if (!hidden) return;
    document.documentElement.classList.add("privacy-mode");
    const restore = maskMonetaryDom(document.body);
    return () => {
      restore();
      document.documentElement.classList.remove("privacy-mode");
    };
  }, [hidden]);
  return null;
}
export function PrivacyToggle({ lang }: { lang: Lang }) {
  const hidden = usePrivacyMode(),
    c = trustCopy[lang];
  return (
    <button
      type="button"
      data-privacy-public
      aria-label={hidden ? c.show : c.hide}
      title={`${hidden ? c.show : c.hide}. ${c.privacyHint}`}
      aria-pressed={hidden}
      onClick={() => setPrivacyMode(!hidden)}
      className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-secondary/60 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {hidden ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
    </button>
  );
}
