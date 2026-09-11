"use client";

import { MotionConfig } from "motion/react";

/**
 * Global motion policy: transforms are dropped automatically when the user
 * prefers reduced motion; opacity fades remain. Wrap the tree once.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
