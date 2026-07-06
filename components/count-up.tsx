"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Animates a number from 0 up to `value` on mount, formatting every frame with
 * the provided formatter so currency/units stay intact. Jumps straight to the
 * final value for users who prefer reduced motion.
 *
 * Pass a stable `format` reference (module-level function) to avoid re-runs.
 */
export function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = format(value);
      return;
    }
    const obj = { v: 0 };
    const tween = gsap.to(obj, {
      v: value,
      duration: 1.1,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = format(obj.v);
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, format]);

  return (
    <span ref={ref} className={className}>
      {format(0)}
    </span>
  );
}
