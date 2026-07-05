"use client";

import { useState } from "react";

export type ChartPoint = { label: string; value: number };

export const CHART_COLORS = {
  indigo: "#6366f1",
  orange: "#ea580c",
};

const W = 320;
const H = 150;
const PAD = { top: 26, right: 10, bottom: 20, left: 10 };

function scale(points: ChartPoint[]) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = innerW / Math.max(1, points.length - 1);
  const x = (i: number) => PAD.left + i * step;
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  return { x, y, step, innerH };
}

function Tooltip({
  x,
  y,
  text,
}: {
  x: number;
  y: number;
  text: string;
}) {
  const w = text.length * 5.6 + 12;
  const tx = Math.min(Math.max(x - w / 2, 2), W - w - 2);
  const ty = Math.max(y - 24, 2);
  return (
    <g pointerEvents="none">
      <rect x={tx} y={ty} width={w} height={17} rx={5} fill="#1e293b" />
      <text
        x={tx + w / 2}
        y={ty + 12}
        textAnchor="middle"
        fontSize={9.5}
        fill="#ffffff"
      >
        {text}
      </text>
    </g>
  );
}

function GridAndLabels({ points }: { points: ChartPoint[] }) {
  const { x } = scale(points);
  return (
    <>
      {[0.33, 0.66, 1].map((f) => {
        const gy = PAD.top + (H - PAD.top - PAD.bottom) * (1 - f);
        return (
          <line
            key={f}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={gy}
            y2={gy}
            stroke="#eef0f8"
            strokeWidth={1}
          />
        );
      })}
      {points.map((p, i) => (
        <text
          key={i}
          x={x(i)}
          y={H - 5}
          textAnchor="middle"
          fontSize={9}
          fill="#94a3b8"
        >
          {p.label}
        </text>
      ))}
    </>
  );
}

export function AreaChart({
  points,
  color = CHART_COLORS.indigo,
  format,
}: {
  points: ChartPoint[];
  color?: string;
  format: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const { x, y, step } = scale(points);
  const gid = `area-${color.replace("#", "")}`;

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`)
    .join(" ");
  const area = `${line} L${x(points.length - 1)},${H - PAD.bottom} L${x(0)},${H - PAD.bottom} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={points.map((p) => `${p.label}: ${format(p.value)}`).join(", ")}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <GridAndLabels points={points} />
      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <rect
          key={i}
          x={x(i) - step / 2}
          y={0}
          width={step}
          height={H}
          fill="transparent"
          onMouseEnter={() => setHover(i)}
        />
      ))}
      {hover !== null && (
        <>
          <circle
            cx={x(hover)}
            cy={y(points[hover].value)}
            r={4.5}
            fill={color}
            stroke="#ffffff"
            strokeWidth={2}
          />
          <Tooltip
            x={x(hover)}
            y={y(points[hover].value)}
            text={`${points[hover].label} · ${format(points[hover].value)}`}
          />
        </>
      )}
    </svg>
  );
}

export function BarChart({
  points,
  color = CHART_COLORS.orange,
  format,
}: {
  points: ChartPoint[];
  color?: string;
  format: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const { x, y, step } = scale(points);
  const barW = Math.min(22, step * 0.5);

  // Bars are anchored to the baseline with only the top corners rounded.
  function bar(i: number, v: number) {
    const bx = x(i) - barW / 2;
    const by = y(v);
    const bh = H - PAD.bottom - by;
    if (bh <= 0) return null;
    const r = Math.min(4, bh);
    return `M${bx},${by + r} Q${bx},${by} ${bx + r},${by} H${bx + barW - r} Q${bx + barW},${by} ${bx + barW},${by + r} V${H - PAD.bottom} H${bx} Z`;
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={points.map((p) => `${p.label}: ${format(p.value)}`).join(", ")}
      onMouseLeave={() => setHover(null)}
    >
      <GridAndLabels points={points} />
      {points.map((p, i) => {
        const d = bar(i, p.value);
        return d ? (
          <path
            key={i}
            d={d}
            fill={color}
            opacity={hover === null || hover === i ? 1 : 0.45}
          />
        ) : null;
      })}
      {points.map((p, i) => (
        <rect
          key={`h${i}`}
          x={x(i) - step / 2}
          y={0}
          width={step}
          height={H}
          fill="transparent"
          onMouseEnter={() => setHover(i)}
        />
      ))}
      {hover !== null && (
        <Tooltip
          x={x(hover)}
          y={y(points[hover].value)}
          text={`${points[hover].label} · ${format(points[hover].value)}`}
        />
      )}
    </svg>
  );
}

export function Donut({
  paid,
  due,
  format,
}: {
  paid: number;
  due: number;
  format: (v: number) => string;
}) {
  const total = paid + due;
  const size = 150;
  const r = 56;
  const c = 2 * Math.PI * r;
  const gap = total > 0 && paid > 0 && due > 0 ? 6 : 0; // 2px-ish surface gap
  const paidFrac = total > 0 ? paid / total : 0;
  const paidLen = Math.max(0, paidFrac * c - gap);
  const dueLen = Math.max(0, (1 - paidFrac) * c - gap);
  const pct = total > 0 ? Math.round(paidFrac * 100) : 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-36 w-36" role="img"
          aria-label={`Paid ${format(paid)}, due ${format(due)}`}>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#eef0f8"
              strokeWidth={15}
            />
            {paid > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={CHART_COLORS.indigo}
                strokeWidth={15}
                strokeLinecap="round"
                strokeDasharray={`${paidLen} ${c - paidLen}`}
              >
                <title>Paid · {format(paid)}</title>
              </circle>
            )}
            {due > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={CHART_COLORS.orange}
                strokeWidth={15}
                strokeLinecap="round"
                strokeDasharray={`${dueLen} ${c - dueLen}`}
                strokeDashoffset={-(paidLen + gap)}
              >
                <title>Due · {format(due)}</title>
              </circle>
            )}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{pct}%</span>
          <span className="text-xs text-slate-500">paid</span>
        </div>
      </div>
      <div className="mt-4 w-full space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-slate-500">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: CHART_COLORS.indigo }}
            />
            Paid
          </span>
          <span className="font-semibold text-slate-900">{format(paid)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-slate-500">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: CHART_COLORS.orange }}
            />
            Due
          </span>
          <span className="font-semibold text-slate-900">{format(due)}</span>
        </div>
      </div>
    </div>
  );
}
