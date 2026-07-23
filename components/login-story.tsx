"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import gsap from "gsap";
import { useT } from "@/lib/i18n";

/**
 * LoginStory — the pre-auth "storytelling" panel.
 *
 * A rotating set of illustrated vector scenes that explain what CargoBook does
 * before the user signs in: booking flights, tracking cargo port-to-door, and
 * invoicing / getting paid. Everything is inline SVG animated with GSAP using
 * only transform / opacity / stroke-dash (all GPU-cheap), so it stays crisp at
 * any size, ships no image assets, and runs smoothly on phones and desktops.
 *
 * Behaviour:
 *  - Scenes auto-advance every ~ADVANCE_MS; each has a choreographed timeline
 *    that (re)plays from the start whenever it becomes active.
 *  - Tapping a progress segment (or its dot) jumps to that scene; interacting
 *    pauses the auto-advance briefly so a curious user isn't fighting the timer.
 *  - Honours prefers-reduced-motion: no timelines, no auto-advance — each scene
 *    renders its final composed frame and the user pages through manually.
 *  - Pauses while the tab is hidden to save battery.
 */

const ADVANCE_MS = 4600;

type SceneDef = {
  key: string;
  title: string;
  subtitle: string;
  /** Accent used by the progress bar + caption dot for this scene. */
  accent: string;
  Art: () => ReactElement;
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared stage frame — a soft sky panel every scene is painted on. Kept light
// in both themes so the flat cartoon colours stay vivid; the surrounding glass
// card supplies the dark-mode contrast.
// ─────────────────────────────────────────────────────────────────────────────
function Sky() {
  return (
    <>
      <defs>
        <linearGradient id="ls-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef2ff" />
          <stop offset="55%" stopColor="#e0e7ff" />
          <stop offset="100%" stopColor="#f5f3ff" />
        </linearGradient>
        <linearGradient id="ls-plane" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="ls-box" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="320" height="240" rx="24" fill="url(#ls-sky)" />
    </>
  );
}

// ── Scene 1 · Book flights ───────────────────────────────────────────────────
function FlightArt() {
  return (
    <>
      <Sky />
      {/* drifting clouds */}
      <g className="st-cloud1" fill="#ffffff" opacity="0.9">
        <ellipse cx="70" cy="56" rx="26" ry="14" />
        <ellipse cx="92" cy="60" rx="20" ry="12" />
      </g>
      <g className="st-cloud2" fill="#ffffff" opacity="0.75">
        <ellipse cx="240" cy="92" rx="22" ry="12" />
        <ellipse cx="258" cy="96" rx="16" ry="10" />
      </g>
      {/* dashed flight route */}
      <path
        className="st-trail"
        d="M40 190 Q140 150 210 78"
        fill="none"
        stroke="#6366f1"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 12"
        opacity="0.55"
      />
      <circle cx="40" cy="190" r="6" fill="#4f46e5" />
      {/* plane */}
      <g className="st-plane">
        <g transform="translate(-14 -14)">
          <path
            d="M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2a1 1 0 0 0-.9 1.7L9 11l-2 2H4l-1 1 3 1.5L7.5 20l1-1v-3l2-2 3.6 5.1a1 1 0 0 0 1.7-.9z"
            transform="scale(1.9)"
            fill="url(#ls-plane)"
          />
        </g>
      </g>
      {/* boarding pass */}
      <g className="st-pass" transform="translate(150 150)">
        <rect x="0" y="0" width="150" height="66" rx="12" fill="#ffffff" />
        <rect x="0" y="0" width="150" height="66" rx="12" fill="none" stroke="#e2e8f0" />
        <rect x="12" y="12" width="30" height="30" rx="7" fill="#eef2ff" />
        <path
          d="M20 27l3-3 2.5 2.5L33 19"
          fill="none"
          stroke="#4f46e5"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="52" y="15" width="62" height="7" rx="3.5" fill="#c7d2fe" />
        <rect x="52" y="29" width="44" height="6" rx="3" fill="#e2e8f0" />
        <text x="120" y="30" fontSize="15" fontWeight="700" fill="#4f46e5">
          12A
        </text>
        <g stroke="#cbd5e1" strokeWidth="2">
          <path d="M14 54h1M18 54h2M23 54h1M27 54h3M33 54h1M37 54h2M42 54h3M48 54h1M52 54h2M57 54h1M61 54h3" />
        </g>
      </g>
    </>
  );
}

function flightTimeline(tl: gsap.core.Timeline) {
  tl.fromTo(
    ".st-trail",
    { strokeDashoffset: 220, opacity: 0 },
    { strokeDashoffset: 0, opacity: 0.55, duration: 1.4, ease: "power1.inOut" },
    0,
  )
    .fromTo(
      ".st-plane",
      { x: 40, y: 190, rotation: -6, transformOrigin: "50% 50%" },
      {
        keyframes: [
          { x: 120, y: 158, rotation: -22 },
          { x: 178, y: 118, rotation: -30 },
          { x: 210, y: 78, rotation: -34 },
        ],
        duration: 1.6,
        ease: "power1.inOut",
      },
      0,
    )
    .fromTo(
      ".st-pass",
      { y: 40, opacity: 0, scale: 0.9, transformOrigin: "50% 100%" },
      { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: "back.out(1.6)" },
      0.9,
    )
    .fromTo(
      [".st-cloud1", ".st-cloud2"],
      { x: -8 },
      { x: 8, duration: 3, ease: "sine.inOut", stagger: 0.4, yoyo: true, repeat: -1 },
      0,
    );
}

// ── Scene 2 · Track cargo, port to door ──────────────────────────────────────
function CargoArt() {
  const stops = [
    { x: 44, label: "port" },
    { x: 160, label: "transit" },
    { x: 276, label: "door" },
  ];
  return (
    <>
      <Sky />
      {/* base route */}
      <path d="M44 150 H276" stroke="#c7d2fe" strokeWidth="6" strokeLinecap="round" />
      {/* filled progress */}
      <path
        className="st-route"
        d="M44 150 H276"
        stroke="#6366f1"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="232"
        strokeDashoffset="232"
      />
      {stops.map((s, i) => (
        <g key={s.label}>
          <circle cx={s.x} cy="150" r="14" fill="#ffffff" stroke="#c7d2fe" strokeWidth="2.5" />
          <g className={`st-check st-check-${i}`} transform={`translate(${s.x} 150)`}>
            <circle r="14" fill="#6366f1" />
            <path
              d="M-6 0l4 4 8-9"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>
      ))}
      {/* stop labels */}
      <g fill="#6366f1" fontSize="11" fontWeight="600" textAnchor="middle">
        <text x="44" y="184">
          Port
        </text>
        <text x="160" y="184">
          Transit
        </text>
        <text x="276" y="184">
          Door
        </text>
      </g>
      {/* travelling cargo box */}
      <g className="st-cargo" transform="translate(44 150)">
        <g transform="translate(-16 -44)">
          <path d="M16 2 2 9v14l14 7 14-7V9L16 2z" fill="url(#ls-box)" />
          <path d="M2 9l14 7 14-7" fill="none" stroke="#ffffff" strokeWidth="1.6" opacity="0.85" />
          <path d="M16 16v14" fill="none" stroke="#ffffff" strokeWidth="1.6" opacity="0.85" />
        </g>
      </g>
    </>
  );
}

function cargoTimeline(tl: gsap.core.Timeline) {
  tl.set(".st-check", { scale: 0, transformOrigin: "50% 50%" });
  tl.set(".st-cargo", { x: 44, y: 150 });
  // pop the origin check immediately
  tl.to(".st-check-0", { scale: 1, duration: 0.4, ease: "back.out(2)" }, 0.1)
    .to(".st-route", { strokeDashoffset: 116, duration: 1.2, ease: "power1.inOut" }, 0.2)
    .to(".st-cargo", { x: 160, duration: 1.2, ease: "power1.inOut" }, 0.2)
    .to(".st-check-1", { scale: 1, duration: 0.4, ease: "back.out(2)" }, 1.4)
    .to(".st-route", { strokeDashoffset: 0, duration: 1.2, ease: "power1.inOut" }, 1.7)
    .to(".st-cargo", { x: 276, duration: 1.2, ease: "power1.inOut" }, 1.7)
    .to(".st-check-2", { scale: 1, duration: 0.45, ease: "back.out(2)" }, 2.9)
    // gentle bob throughout
    .to(
      ".st-cargo",
      { y: "-=8", duration: 0.5, ease: "sine.inOut", yoyo: true, repeat: -1 },
      0,
    );
}

// ── Scene 3 · Invoice & get paid ─────────────────────────────────────────────
function PaidArt() {
  return (
    <>
      <Sky />
      {/* invoice sheet */}
      <g className="st-sheet" transform="translate(46 40)">
        <rect x="0" y="0" width="150" height="160" rx="14" fill="#ffffff" />
        <rect x="0" y="0" width="150" height="160" rx="14" fill="none" stroke="#e2e8f0" />
        <rect x="18" y="20" width="60" height="10" rx="5" fill="#4f46e5" />
        <rect x="18" y="38" width="40" height="7" rx="3.5" fill="#c7d2fe" />
        {/* line items draw in */}
        <g>
          <rect className="st-line st-line-0" x="18" y="64" width="0" height="8" rx="4" fill="#e2e8f0" />
          <rect className="st-line st-line-1" x="18" y="82" width="0" height="8" rx="4" fill="#e2e8f0" />
          <rect className="st-line st-line-2" x="18" y="100" width="0" height="8" rx="4" fill="#e2e8f0" />
        </g>
        <path d="M18 122 H132" stroke="#e2e8f0" strokeWidth="1.5" />
        <rect x="18" y="132" width="46" height="9" rx="4.5" fill="#94a3b8" />
        <rect className="st-total" x="96" y="130" width="36" height="12" rx="6" fill="#4f46e5" />
      </g>
      {/* coins stacking */}
      <g className="st-coins" transform="translate(232 150)">
        <g className="st-coin st-coin-0">
          <ellipse cx="0" cy="40" rx="26" ry="9" fill="#f59e0b" />
          <ellipse cx="0" cy="36" rx="26" ry="9" fill="#fbbf24" />
        </g>
        <g className="st-coin st-coin-1">
          <ellipse cx="0" cy="26" rx="26" ry="9" fill="#f59e0b" />
          <ellipse cx="0" cy="22" rx="26" ry="9" fill="#fcd34d" />
        </g>
        <g className="st-coin st-coin-2">
          <ellipse cx="0" cy="12" rx="26" ry="9" fill="#f59e0b" />
          <ellipse cx="0" cy="8" rx="26" ry="9" fill="#fde68a" />
          <text x="0" y="12" fontSize="13" fontWeight="800" fill="#b45309" textAnchor="middle">
            $
          </text>
        </g>
      </g>
      {/* PAID stamp */}
      <g className="st-stamp" transform="translate(196 74)">
        <g transform="rotate(-14)">
          <rect x="-38" y="-18" width="76" height="36" rx="8" fill="none" stroke="#10b981" strokeWidth="3.5" />
          <text x="0" y="6" fontSize="18" fontWeight="800" fill="#10b981" textAnchor="middle" letterSpacing="1">
            PAID
          </text>
        </g>
      </g>
    </>
  );
}

function paidTimeline(tl: gsap.core.Timeline) {
  tl.set(".st-stamp", { scale: 0, opacity: 0, transformOrigin: "50% 50%" });
  tl.set(".st-coin", { y: 30, opacity: 0 });
  tl.set(".st-total", { scaleX: 0, transformOrigin: "0% 50%" });
  tl.fromTo(
    ".st-sheet",
    { y: 18, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
    0,
  )
    .to(".st-line-0", { width: 96, duration: 0.4, ease: "power1.out" }, 0.5)
    .to(".st-line-1", { width: 80, duration: 0.4, ease: "power1.out" }, 0.7)
    .to(".st-line-2", { width: 104, duration: 0.4, ease: "power1.out" }, 0.9)
    .to(".st-total", { scaleX: 1, duration: 0.4, ease: "back.out(1.8)" }, 1.2)
    .to(
      ".st-coin",
      { y: 0, opacity: 1, duration: 0.45, ease: "back.out(1.8)", stagger: 0.18 },
      1.3,
    )
    .to(".st-stamp", { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2.2)" }, 2.1);
}

const SCENES: SceneDef[] = [
  {
    key: "flights",
    title: "Book flights in seconds",
    subtitle: "Search, choose a seat and confirm — the whole booking in one flow.",
    accent: "#4f46e5",
    Art: () => <FlightArt />,
  },
  {
    key: "cargo",
    title: "Track cargo, port to door",
    subtitle: "Follow every shipment down the route with live status at each stop.",
    accent: "#6366f1",
    Art: () => <CargoArt />,
  },
  {
    key: "paid",
    title: "Invoice and get paid",
    subtitle: "Turn deliveries into invoices and record payments in a tap.",
    accent: "#10b981",
    Art: () => <PaidArt />,
  },
];

const TIMELINES: Record<string, (tl: gsap.core.Timeline) => void> = {
  flights: flightTimeline,
  cargo: cargoTimeline,
  paid: paidTimeline,
};

export function LoginStory({ className = "" }: { className?: string }) {
  const t = useT();
  const [active, setActive] = useState(0);
  const sceneRefs = useRef<(SVGSVGElement | null)[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const advanceRef = useRef<number | null>(null);
  const pauseTimer = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const reduceRef = useRef(false);

  // Build + play the active scene's timeline; schedule the next scene.
  useEffect(() => {
    reduceRef.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const svg = sceneRefs.current[active];
    tlRef.current?.kill();

    if (svg && !reduceRef.current) {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline();
        TIMELINES[SCENES[active].key]?.(tl);
        tlRef.current = tl;
      }, svg);
      // context cleanup handled on next effect run / unmount
      return () => ctx.revert();
    }
    return undefined;
  }, [active]);

  // Auto-advance loop (skipped entirely under reduced motion).
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    function tick() {
      advanceRef.current = window.setTimeout(() => {
        if (!pausedRef.current && !document.hidden) {
          setActive((i) => (i + 1) % SCENES.length);
        }
        tick();
      }, ADVANCE_MS);
    }
    tick();
    return () => {
      if (advanceRef.current) window.clearTimeout(advanceRef.current);
      if (pauseTimer.current) window.clearTimeout(pauseTimer.current);
    };
  }, []);

  function goTo(i: number) {
    // Briefly hold the auto-advance so a curious user isn't fighting the timer.
    pausedRef.current = true;
    if (pauseTimer.current) window.clearTimeout(pauseTimer.current);
    pauseTimer.current = window.setTimeout(() => {
      pausedRef.current = false;
    }, ADVANCE_MS * 1.5);
    setActive(i);
  }

  const scene = SCENES[active];

  return (
    // Frosted-glass card so the tour sits on the same surface as the auth card
    // and the in-app panels — one consistent design language, and the caption
    // reads on glass instead of directly on the busy background photo.
    <div className={`glass-card select-none rounded-[1.75rem] p-4 sm:p-5 ${className}`}>
      {/* stage — the illustration keeps its own soft surface for legibility */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
        {SCENES.map((s, i) => (
          <svg
            key={s.key}
            ref={(el) => {
              sceneRefs.current[i] = el;
            }}
            viewBox="0 0 320 240"
            preserveAspectRatio="xMidYMid slice"
            className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${
              i === active ? "opacity-100" : "opacity-0"
            }`}
            role="img"
            aria-label={t(s.title)}
          >
            <s.Art />
          </svg>
        ))}
      </div>

      {/* caption — crossfades with the scene */}
      <div className="mt-4 min-h-[4.25rem] px-1">
        <div key={scene.key} className="animate-rise-in">
          <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {t(scene.title)}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-slate-600 dark:text-white/70">
            {t(scene.subtitle)}
          </p>
        </div>
      </div>

      {/* segmented progress / navigation */}
      <div
        className="mt-3 flex items-center gap-2 px-1"
        role="tablist"
        aria-label={t("Feature tour")}
      >
        {SCENES.map((s, i) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={t(s.title)}
            onClick={() => goTo(i)}
            className="group relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/15"
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
              style={{
                width: i < active ? "100%" : i === active ? "100%" : "0%",
                background: s.accent,
                opacity: i <= active ? 1 : 0,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
