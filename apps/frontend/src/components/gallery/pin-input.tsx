"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface PinInputProps {
  onComplete?: (pin: string) => void;
  error?: boolean;
  disabled?: boolean;
  value?: string;
  onValueChange?: (pin: string) => void;
  errorShakeKey?: number;
}

/**
 * 6-digit PIN entry styled for the light editorial gallery — warm paper
 * tiles, ink dots, hairline borders. A single hidden input carries the
 * real value for accessibility and autofill (one-time-code).
 */
export function PinInput({ onComplete, error, disabled, value, onValueChange, errorShakeKey }: PinInputProps) {
  const [internal, setInternal] = React.useState("");
  const pin = value !== undefined ? value : internal;
  const setPin = (next: string) => {
    const clamped = next.replace(/\D/g, "").slice(0, 6);
    if (value === undefined) setInternal(clamped);
    onValueChange?.(clamped);
    if (clamped.length === 6) onComplete?.(clamped);
  };

  const hiddenRef = React.useRef<HTMLInputElement>(null);
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    hiddenRef.current?.focus();
  }, []);

  return (
    <div>
      <input
        ref={hiddenRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="6-digit gallery PIN"
        aria-invalid={error}
        className="sr-only"
        value={pin}
        disabled={disabled}
        onChange={(e) => setPin(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && pin.length > 0) {
            setPin(pin.slice(0, -1));
            e.preventDefault();
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <button
        type="button"
        onClick={() => hiddenRef.current?.focus()}
        onFocus={() => hiddenRef.current?.focus()}
        className="flex cursor-pointer items-center gap-2.5 focus-visible:outline-none"
        aria-label="Enter PIN"
        disabled={disabled}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={`${i}-${errorShakeKey ?? 0}`}
            aria-hidden="true"
            className={cn(
              "flex size-11 items-center justify-center rounded-xl border bg-white font-display text-xl font-semibold shadow-hairline transition-all sm:size-13",
              focused && i === pin.length && "ring-2 ring-[#3d53d6]/30",
              error
                ? "border-destructive text-destructive animate-scale-in"
                : focused && i === pin.length
                  ? "border-[#1c1917]"
                  : "border-[#e6e1d6]"
            )}
          >
            {pin[i] ? "•" : ""}
          </span>
        ))}
      </button>
    </div>
  );
}
