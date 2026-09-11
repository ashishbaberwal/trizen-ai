"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion";

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode }[];
  ariaLabel: string;
  className?: string;
  idPrefix?: string;
}

/**
 * Radio-group segmented control with a sliding indicator. The indicator is
 * a shared-layout element, so it glides between segments instead of
 * teleporting.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  idPrefix,
}: SegmentedControlProps<T>) {
  const autoId = React.useId();
  const groupKey = idPrefix ?? autoId;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border bg-secondary/60 p-0.5",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative inline-flex h-7 cursor-pointer items-center rounded-full px-3 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={`${groupKey}-indicator`}
                transition={springSnappy}
                className="absolute inset-0 rounded-full bg-card shadow-hairline"
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
