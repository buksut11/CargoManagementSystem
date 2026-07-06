"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Wraps content in a subtle 3D hover-tilt driven by GSAP. The card leans toward
 * the pointer and lifts slightly, then eases back on leave. Mouse-only, and a
 * no-op for touch input or when reduced motion is requested.
 */
export function TiltCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const inner = useRef<HTMLDivElement>(null);
  const reduce = useRef(false);
  const quick = useRef<{
    rx: (v: number) => void;
    ry: (v: number) => void;
  } | null>(null);

  useEffect(() => {
    reduce.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (inner.current && !reduce.current) {
      quick.current = {
        rx: gsap.quickTo(inner.current, "rotationX", {
          duration: 0.5,
          ease: "power2.out",
        }),
        ry: gsap.quickTo(inner.current, "rotationY", {
          duration: 0.5,
          ease: "power2.out",
        }),
      };
    }
    return () => {
      if (inner.current) gsap.killTweensOf(inner.current);
    };
  }, []);

  function onMove(e: React.PointerEvent) {
    if (reduce.current || e.pointerType !== "mouse" || !inner.current) return;
    const q = quick.current;
    if (!q) return;
    const r = inner.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    q.ry(px * 12);
    q.rx(-py * 12);
  }

  function onLeave() {
    const q = quick.current;
    if (!q) return;
    q.rx(0);
    q.ry(0);
  }

  return (
    <div
      className={className}
      style={{ perspective: 800 }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div
        ref={inner}
        className="h-full rounded-2xl transition-shadow duration-300 will-change-transform [transform-style:preserve-3d] hover:shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}
