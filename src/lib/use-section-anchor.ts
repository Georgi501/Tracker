import { useEffect, useRef } from "react";

// The anchor may mount late or move when profile access, quotes and statistics resolve.
export function useSectionAnchor(hash: string, pageKey: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const html = document.documentElement;
    const header = document.querySelector<HTMLElement>(".header-as");
    let tabs: HTMLElement | null = null;
    const measure = () => {
      const nextTabs = root.querySelector<HTMLElement>(".asset-section-tabs");
      if (nextTabs !== tabs) {
        if (tabs) sizes.unobserve(tabs);
        tabs = nextTabs;
        if (tabs) sizes.observe(tabs);
      }
      html.style.setProperty(
        "--asset-header-height",
        `${header?.getBoundingClientRect().height ?? 0}px`,
      );
      html.style.setProperty(
        "--asset-tabs-height",
        `${tabs?.getBoundingClientRect().height ?? 0}px`,
      );
    };
    const sizes = new ResizeObserver(measure);
    if (header) sizes.observe(header);
    // Asset resolution can mount the research tabs after the initial render.
    const mutations = new MutationObserver(measure);
    mutations.observe(root, { childList: true, subtree: true });
    html.setAttribute("data-asset-navigation", "");
    measure();
    return () => {
      sizes.disconnect();
      mutations.disconnect();
      html.removeAttribute("data-asset-navigation");
      html.style.removeProperty("--asset-header-height");
      html.style.removeProperty("--asset-tabs-height");
    };
  }, [pageKey]);
  useEffect(() => {
    const root = containerRef.current;
    if (!root || !hash) return;
    let following = true;
    let frame = 0;
    const align = () => {
      cancelAnimationFrame(frame);
      if (!following) return;
      frame = requestAnimationFrame(() => {
        const target = document.getElementById(hash);
        if (following && target && root.contains(target)) {
          target.scrollIntoView({ block: "start", behavior: "instant" });
        }
      });
    };
    const stop = () => {
      following = false;
      cancelAnimationFrame(frame);
    };
    const onKey = (event: KeyboardEvent) => {
      if (
        ["Tab", "Enter", "ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(
          event.key,
        )
      )
        stop();
    };
    const mutations = new MutationObserver(align);
    const sizes = new ResizeObserver(align);
    mutations.observe(root, { childList: true, subtree: true });
    sizes.observe(root);
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("pointerdown", stop, { passive: true });
    window.addEventListener("keydown", onKey);
    align();
    return () => {
      stop();
      mutations.disconnect();
      sizes.disconnect();
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("keydown", onKey);
    };
  }, [hash, pageKey]);
  return containerRef;
}
