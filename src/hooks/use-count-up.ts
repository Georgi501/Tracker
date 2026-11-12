import { useEffect, useRef, useState } from "react";
export function useCountUp(value: number, duration = 700) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (!Number.isFinite(value)) {
      setShown(value);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const origin = Number.isFinite(from.current) ? from.current : value;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = origin + (value - origin) * eased;
      from.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return shown;
}
