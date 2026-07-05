import type { SVGProps } from "react";

function Base(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
      {...props}
    />
  );
}

export const HomeIcon = () => (
  <Base>
    <path d="M3 11l9-8 9 8" />
    <path d="M5 9.5V21h14V9.5" />
  </Base>
);

export const BoxIcon = () => (
  <Base>
    <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
    <path d="M3 8l9 5 9-5" />
    <path d="M12 13v8" />
  </Base>
);

export const InvoiceIcon = () => (
  <Base>
    <path d="M6 2h9l5 5v15H6V2z" />
    <path d="M14 2v6h6" />
    <path d="M9 13h8M9 17h8" />
  </Base>
);

export const CoinsIcon = () => (
  <Base>
    <circle cx={12} cy={12} r={9} />
    <path d="M12 6.5v11M14.8 8.8c-.6-.8-1.6-1.3-2.8-1.3-1.6 0-2.8.9-2.8 2.2s1.2 1.8 2.8 2.3 2.8.9 2.8 2.3-1.2 2.2-2.8 2.2c-1.2 0-2.2-.5-2.8-1.3" />
  </Base>
);

export const PinIcon = () => (
  <Base>
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z" />
    <circle cx={12} cy={10} r={3} />
  </Base>
);

export const LogoutIcon = () => (
  <Base>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </Base>
);

export const SunIcon = () => (
  <Base>
    <circle cx={12} cy={12} r={4} />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </Base>
);

export const MoonIcon = () => (
  <Base>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </Base>
);

export const UserIcon = () => (
  <Base>
    <circle cx={12} cy={8} r={4} />
    <path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
  </Base>
);
