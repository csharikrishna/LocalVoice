export type ComplaintStatus = "open" | "working" | "closed";
export type ComplaintPriority = "low" | "medium" | "high" | "critical";

export interface Complaint {
  id: string;
  token?: string;
  category: string;
  description: string;
  location: string;
  photoURL?: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  timestamp: string | null; // ISO string after server serialization
  coordinates?: { lat: number; lng: number };
  department?: string | null;
  upvotes?: number;
  assigned_squad_id?: string | null;
  assigned_agent_id?: string | null;
  resolvedAt?: string | null; // ISO string after server serialization
  reporterEmail?: string;
  subscriberEmails?: string[];
}

export type AdminRole = "superadmin" | "admin" | "department_admin" | "field_worker";

export interface StaffMember {
  id: string; // The email in Firestore
  email: string;
  role: string;
  department: string | null;
  squad_id: string | null;
  status: "active" | "suspended" | "pending" | "rejected" | "accepted";
  isInvite?: boolean;
}

export interface AuditLog {
  id: string;
  complaintId: string | null;
  action: string;
  actorEmail: string;
  details: Record<string, any>;
  timestamp: any;
}
