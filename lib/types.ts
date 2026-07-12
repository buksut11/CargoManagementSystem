export type ShipmentStatus = "pending" | "shipped" | "delivered";

export type UserRole = "admin" | "agent";

// Per-organization role, stored in public.memberships.
// - owner / admin: full access, including members, settings and billing.
// - manager: full operational access (shipments, invoices, payments, expenses,
//   destinations, audit) but NOT members/settings/billing.
// - agent: read shipments; may only change a shipment's status and notes.
export type OrgRole = "owner" | "admin" | "manager" | "agent";

export type Organization = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  plan: string;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  // Which product modules the org has turned on ('cargo' | 'flights').
  // Backfilled to ['cargo'] for every existing org by migration 0026.
  modules: string[];
  created_at: string;
};

export type Membership = {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string | null;
  role: UserRole;
  created_at: string;
};

export type TransportMode = "airplane" | "car" | "motorcycle" | "other";

export type ExpenseCategory = {
  id: number;
  name: string;
  created_at: string;
};

export type Destination = {
  id: number;
  name: string;
  country: string | null;
  created_at: string;
};

export type Shipment = {
  id: number;
  organization_id: string | null;
  description: string;
  destination_id: number | null;
  weight_kg: number;
  rate_per_kg: number | null;
  total: number;
  status: ShipmentStatus;
  ship_date: string | null;
  notes: string | null;
  attachment_url: string | null;
  invoice_id: number | null;
  created_at: string;
  destinations?: Pick<Destination, "id" | "name" | "country"> | null;
  invoices?: Pick<Invoice, "id" | "bill_to" | "phone" | "address"> | null;
};

export type Invoice = {
  id: number;
  organization_id: string | null;
  bill_to: string;
  phone: string | null;
  address: string | null;
  issued_date: string;
  notes: string | null;
  created_at: string;
};

export type Expense = {
  id: number;
  shipment_id: number;
  transport_mode: string;
  description: string | null;
  amount: number;
  expense_date: string;
  created_at: string;
  shipments?: Pick<Shipment, "id" | "description" | "total"> | null;
};

export type AuditEntry = {
  id: number;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  action: "create" | "update" | "delete";
  shipment_id: number | null;
  shipment_desc: string | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  created_at: string;
};

export type Payment = {
  id: number;
  invoice_id: number;
  amount: number;
  paid_date: string;
  method: string | null;
  note: string | null;
  created_at: string;
};

// ── Flight Booking & Financial Management module ────────────────────────────
// Passenger air-ticketing built on the same multi-tenant rails as cargo.

export type FlightBookingStatus =
  | "quote"
  | "booked"
  | "ticketed"
  | "cancelled"
  | "refunded"
  | "void";

export type TripType = "oneway" | "return" | "multicity";

export type PassengerType = "adult" | "child" | "infant";

export type SupplierType =
  | "airline"
  | "consolidator"
  | "bsp"
  | "gds"
  | "other";

export type RefundType = "refund" | "void" | "reissue";

export type FlightCustomer = {
  id: number;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
};

export type FlightSupplier = {
  id: number;
  organization_id: string;
  name: string;
  type: SupplierType;
  contact: string | null;
  created_at: string;
};

export type FlightBooking = {
  id: number;
  organization_id: string;
  booking_ref: string | null;
  pnr: string | null;
  customer_id: number | null;
  supplier_id: number | null;
  airline: string | null;
  trip_type: TripType;
  status: FlightBookingStatus;
  booking_date: string;
  travel_date: string | null;
  source: string;
  base_fare: number;
  taxes: number;
  service_fee: number;
  markup: number;
  commission_amount: number;
  net_cost: number;
  sale_total: number; // generated: base_fare + taxes + service_fee + markup
  profit: number; // generated: sale_total - net_cost
  notes: string | null;
  created_by: string | null;
  created_at: string;
  flight_customers?: Pick<FlightCustomer, "id" | "name" | "phone" | "email"> | null;
  flight_suppliers?: Pick<FlightSupplier, "id" | "name" | "type"> | null;
};

export type FlightSegment = {
  id: number;
  organization_id: string;
  booking_id: number;
  segment_no: number;
  airline: string | null;
  flight_number: string | null;
  origin: string | null;
  destination: string | null;
  departure_at: string | null;
  arrival_at: string | null;
  cabin_class: string | null;
  created_at: string;
};

export type FlightPassenger = {
  id: number;
  organization_id: string;
  booking_id: number;
  full_name: string;
  type: PassengerType;
  ticket_number: string | null;
  sale_amount: number;
  created_at: string;
};

export type BookingPayment = {
  id: number;
  organization_id: string;
  booking_id: number;
  amount: number;
  paid_date: string;
  method: string | null;
  note: string | null;
  created_at: string;
  flight_bookings?: Pick<FlightBooking, "id" | "booking_ref"> | null;
};

export type SupplierPayment = {
  id: number;
  organization_id: string;
  booking_id: number | null;
  supplier_id: number | null;
  amount: number;
  paid_date: string;
  method: string | null;
  note: string | null;
  created_at: string;
  flight_suppliers?: Pick<FlightSupplier, "id" | "name"> | null;
  flight_bookings?: Pick<FlightBooking, "id" | "booking_ref"> | null;
};

export type BookingRefund = {
  id: number;
  organization_id: string;
  booking_id: number;
  refund_type: RefundType;
  refund_date: string;
  customer_refund: number;
  supplier_refund: number;
  penalty: number;
  adm_amount: number;
  note: string | null;
  created_at: string;
};

export type FlightAuditEntry = {
  id: number;
  organization_id: string;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  action: "create" | "update" | "delete";
  booking_id: number | null;
  booking_ref: string | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  created_at: string;
};
