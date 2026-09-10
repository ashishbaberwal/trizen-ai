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
        className="flex items-center gap-2.5 focus-visible:outline-none cursor-pointer"
        aria-label="Enter PIN"
        disabled={disabled}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={`${i}-${errorShakeKey ?? 0}`}
            aria-hidden="true"
            className={cn(
              "flex size-11 items-center justify-center rounded-lg border-2 bg-white/10 font-display text-xl font-semibold text-white backdrop-blur-md transition-all sm:size-13",
              focused && i === pin.length && "border-white/90 ring-2 ring-white/30",
              error ? "border-destructive text-destructive animate-scale-in" : "border-white/25"
            )}
          >
            {pin[i] ? "•" : ""}
          </span>
        ))}
      </button>
    </div>
  );
}

