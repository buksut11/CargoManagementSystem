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

export const BoxIcon = (props: SVGProps<SVGSVGElement>) => (
  <Base {...props}>
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

export const PinIcon = (props: SVGProps<SVGSVGElement>) => (
  <Base {...props}>
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

export const MailIcon = (props: SVGProps<SVGSVGElement>) => (
  <Base {...props}>
    <rect x={3} y={5} width={18} height={14} rx={2} />
    <path d="M3 7l9 6 9-6" />
  </Base>
);

export const SearchIcon = (props: SVGProps<SVGSVGElement>) => (
  <Base {...props}>
    <circle cx={11} cy={11} r={7} />
    <path d="M21 21l-4.3-4.3" />
  </Base>
);

export const PhoneIcon = (props: SVGProps<SVGSVGElement>) => (
  <Base {...props}>
    <path d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L20 13l1 4v3a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 0-1z" />
  </Base>
);

export const StatementIcon = (props: SVGProps<SVGSVGElement>) => (
  <Base {...props}>
    <path d="M6 2h9l5 5v15H6V2z" />
    <path d="M14 2v6h6" />
    <path d="M9 13h6M9 17h4" />
  </Base>
);

export const EditIcon = (props: SVGProps<SVGSVGElement>) => (
  <Base {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </Base>
);

export const TrashIcon = (props: SVGProps<SVGSVGElement>) => (
  <Base {...props}>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
  </Base>
);

export const MergeIcon = (props: SVGProps<SVGSVGElement>) => (
  <Base {...props}>
    <circle cx={18} cy={18} r={3} />
    <circle cx={6} cy={6} r={3} />
    <path d="M6 21V9a9 9 0 0 0 9 9" />
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

export const CloseIcon = (props: SVGProps<SVGSVGElement>) => (
  <Base {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const UserIcon = (props: SVGProps<SVGSVGElement>) => (
  <Base {...props}>
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

export const BookIcon = () => (
  <Base>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    <path d="M9 7h7M9 11h7" />
  </Base>
);

export const BuildingIcon = () => (
  <Base>
    <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" />
    <path d="M15 9h4a1 1 0 0 1 1 1v11" />
    <path d="M8 8h3M8 12h3M8 16h3" />
    <path d="M2 21h20" />
  </Base>
);

export const PlaneIcon = (props: SVGProps<SVGSVGElement>) => (
  <Base {...props}>
    <path d="M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2a1 1 0 0 0-.9 1.7L9 11l-2 2H4l-1 1 3 1.5L7.5 20l1-1v-3l2-2 3.6 5.1a1 1 0 0 0 1.7-.9z" />
  </Base>
);

export const TicketIcon = () => (
  <Base>
    <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" />
    <path d="M13 6v12" strokeDasharray="2 2" />
  </Base>
);

export const ChartIcon = () => (
  <Base>
    <path d="M3 3v18h18" />
    <path d="M7 15l3-4 3 2 4-6" />
  </Base>
);

export const ReceiptIcon = () => (
  <Base>
    <path d="M5 2v20l2-1.2L9 22l2-1.2L13 22l2-1.2L17 22l2-1.2V2l-2 1.2L15 2l-2 1.2L11 2 9 3.2 7 2 5 3.2z" />
    <path d="M8 8h8M8 12h8" />
  </Base>
);

export const SettingsIcon = () => (
  <Base>
    <circle cx={12} cy={12} r={3} />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Base>
);

// A grid of panels — the classic "dashboard / overview" glyph.
export const DashboardIcon = () => (
  <Base>
    <rect x={3} y={3} width={7} height={9} rx={1.5} />
    <rect x={14} y={3} width={7} height={5} rx={1.5} />
    <rect x={14} y={12} width={7} height={9} rx={1.5} />
    <rect x={3} y={16} width={7} height={5} rx={1.5} />
  </Base>
);

// WhatsApp's brand glyph is a solid shape, so unlike the rest of the set it is
// drawn with fill rather than stroke.
export const WhatsAppIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5"
    aria-hidden
    {...props}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
  </svg>
);

// A contact card (ID badge): person on the left, detail lines on the right.
export const ContactCardIcon = (props: SVGProps<SVGSVGElement>) => (
  <Base {...props}>
    <rect x={2.5} y={4.5} width={19} height={15} rx={2} />
    <circle cx={8.5} cy={10.5} r={2} />
    <path d="M5.5 16c.6-1.5 1.7-2.3 3-2.3s2.4.8 3 2.3" />
    <path d="M14.5 10h4.5M14.5 13.5h3" />
  </Base>
);
