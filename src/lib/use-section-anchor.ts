import { useEffect, useRef } from "react";

// The anchor may mount late or move when profile access, quotes and statistics resolve.
export function useSectionAnchor(hash: string, pageKey: string) {
  const containerRef = useRef<HTMLDivElement>(null);
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
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key))
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
