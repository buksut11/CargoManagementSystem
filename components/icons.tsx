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

export const MailIcon = () => (
  <Base>
    <rect x={3} y={5} width={18} height={14} rx={2} />
    <path d="M3 7l9 6 9-6" />
  </Base>
);

export const LockIcon = () => (
  <Base>
    <rect x={5} y={11} width={14} height={10} rx={2} />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    <circle cx={12} cy={16} r={1} />
  </Base>
);

export const EyeIcon = () => (
  <Base>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx={12} cy={12} r={3} />
  </Base>
);

export const EyeOffIcon = () => (
  <Base>
    <path d="M10.6 5.3A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.5 17.5 0 0 1-2.7 3.6" />
    <path d="M6.4 6.4A16.8 16.8 0 0 0 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1" />
    <path d="M9.9 9.9a3 3 0 1 0 4.2 4.2" />
    <path d="M3 3l18 18" />
  </Base>
);

export const WalletIcon = () => (
  <Base>
    <path d="M3 7a2 2 0 0 1 2-2h13v3" />
    <path d="M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z" />
    <circle cx={16.5} cy={14} r={1} />
  </Base>
);

export const ClockIcon = () => (
  <Base>
    <circle cx={12} cy={12} r={9} />
    <path d="M12 7v5l3 3" />
  </Base>
);

export const MenuIcon = () => (
  <Base>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Base>
);

export const CloseIcon = () => (
  <Base>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const UserIcon = () => (
  <Base>
    <circle cx={12} cy={8} r={4} />
    <path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
  </Base>
);

export const UsersIcon = () => (
  <Base>
    <circle cx={9} cy={8} r={3.5} />
    <path d="M2.5 20c1-3 3.5-4.5 6.5-4.5s5.5 1.5 6.5 4.5" />
    <path d="M16 5.5a3.5 3.5 0 0 1 0 6.9" />
    <path d="M17.5 15.6c2.3.5 4 2 4.5 4.4" />
  </Base>
);

export const SettingsIcon = () => (
  <Base>
    <circle cx={12} cy={12} r={3} />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Base>
);
