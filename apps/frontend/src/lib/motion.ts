import type { Transition, Variants } from "motion/react";

/**
 * The studio's motion language: one confident entrance, quick settles.
 * Springs for anything the user touches, tweens for anything they watch.
 */

export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const springSoft: Transition = { type: "spring", stiffness: 320, damping: 32 };
export const springSnappy: Transition = { type: "spring", stiffness: 500, damping: 40 };

/** Parent container: staggers children reveals. */
export const staggerContainer = (stagger = 0.05, delay = 0): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

/** Child item: rises 14px and fades in. */
export const riseItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_OUT },
  },
};

/** Section entrance used for mastheads and toolbars. */
export const fadeSlide: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE_OUT },
  },
};
