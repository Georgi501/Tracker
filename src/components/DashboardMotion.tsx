import type { ReactNode } from "react";
import { LazyMotion, MotionConfig, useReducedMotion } from "framer-motion";
import * as m from "framer-motion/m";
const loadFeatures = () => import("./dashboard-motion-features").then((module) => module.default);
export function DashboardMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
export function MetricSurface({ children, className }: { children: ReactNode; className: string }) {
  const reduce = useReducedMotion();
  return (
    <m.div
      initial={false}
      animate={{ y: 0 }}
      whileHover={reduce ? { y: 0 } : { y: -2 }}
      transition={{ duration: reduce ? 0 : 0.18, ease: "easeOut" }}
      className={className}
    >
      {children}
    </m.div>
  );
}
