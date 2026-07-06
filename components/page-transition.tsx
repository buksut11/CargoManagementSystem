"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";

/**
 * Wraps page content and plays a short GSAP fade/rise-in every time the route
 * changes, giving the app cohesive transitions. Direct children are staggered
 * so cards and sections cascade in. Honours prefers-reduced-motion.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = el.children.length ? Array.from(el.children) : el;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { autoAlpha: 0, y: 18 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.06,
          clearProps: "transform,opacity,visibility",
        },
      );
    }, el);

    return () => ctx.revert();
  }, [pathname]);

  return <div ref={ref}>{children}</div>;
}
