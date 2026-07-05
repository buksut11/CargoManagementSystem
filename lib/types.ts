export type ShipmentStatus = "pending" | "shipped" | "delivered";

export type UserRole = "admin" | "agent";

export type Profile = {
  id: string;
  email: string | null;
  role: UserRole;
  created_at: string;
};

export type TransportMode = "airplane" | "car" | "motorcycle" | "other";

export type Destination = {
  id: number;
  name: string;
  country: string | null;
  created_at: string;
};

export type Shipment = {
  id: number;
  description: string;
  destination_id: number | null;
  weight_kg: number;
  rate_per_kg: number | null;
  total: number;
  status: ShipmentStatus;
  ship_date: string | null;
  notes: string | null;
  invoice_id: number | null;
  created_at: string;
  destinations?: Pick<Destination, "id" | "name" | "country"> | null;
};

export type Invoice = {
  id: number;
  bill_to: string;
  issued_date: string;
  notes: string | null;
  created_at: string;
};

export type Expense = {
  id: number;
  shipment_id: number;
  transport_mode: TransportMode;
  description: string | null;
  amount: number;
  expense_date: string;
  created_at: string;
  shipments?: Pick<Shipment, "id" | "description" | "total"> | null;
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
