export interface Complaint {
  id: string;
  token?: string;
  category: string;
  description: string;
  location: string;
  photoURL?: string;
  status: string;
  priority: string;
  timestamp: any;
  coordinates?: { lat: number; lng: number };
  department?: string | null;
  upvotes?: number;
  assigned_squad_id?: string | null;
  assigned_agent_id?: string | null;
  resolvedAt?: any;
}

export type AdminRole = "superadmin" | "admin" | "department_admin" | "field_worker";

export interface StaffMember {
  id: string; // The email in Firestore
  email: string;
  role: string;
  department: string | null;
  squad_id: string | null;
  status: "active" | "suspended";
}

export interface AuditLog {
  id: string;
  complaintId: string | null;
  action: string;
  actorEmail: string;
  details: Record<string, any>;
  timestamp: any;
}
