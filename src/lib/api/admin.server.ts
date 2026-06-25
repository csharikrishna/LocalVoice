import "@tanstack/react-start/server-only";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "../firebase-admin.server";
import type { CreateStaffInput } from "./admin.functions";

async function verifySuperAdmin(token: string): Promise<boolean> {
  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminDb();
  if (!auth || !db) {
    throw new Error("Server not configured for admin operations.");
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    // Check role in firestore
    const adminDoc = await db.collection("admins").doc(decodedToken.uid).get();
    
    // Some older docs might be using email as document ID, fallback
    let role = null;
    if (adminDoc.exists) {
      role = adminDoc.data()?.role;
    } else if (decodedToken.email) {
      const emailDoc = await db.collection("admins").doc(decodedToken.email).get();
      if (emailDoc.exists) {
        role = emailDoc.data()?.role;
      }
    }

    if (
      decodedToken.email === process.env.VITE_ADMIN_EMAIL ||
      decodedToken.email === process.env.ADMIN_EMAIL
    ) {
      return true;
    }

    return role === "admin" || role === "superadmin";
  } catch (error) {
    console.error("Failed to verify admin token", error);
    return false;
  }
}

export async function handleCreateStaff(data: CreateStaffInput) {
  const isSuperAdmin = await verifySuperAdmin(data.adminToken);
  if (!isSuperAdmin) {
    return { ok: false, message: "Unauthorized. Only Central Dispatchers can create staff." } as const;
  }

  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminDb();
  if (!auth || !db) {
    return { ok: false, message: "Server configuration missing" } as const;
  }

  try {
    const userRecord = await auth.createUser({
      email: data.email,
      password: data.password,
    });

    // Save to admins collection by UID
    await db.collection("admins").doc(userRecord.uid).set({
      role: data.role,
      department: data.department,
      status: "active",
      email: data.email, // for UI display
    });
    
    // Also save by email for backward compatibility with existing queries
    await db.collection("admins").doc(data.email).set({
      role: data.role,
      department: data.department,
      status: "active",
      uid: userRecord.uid,
    });

    return { ok: true, uid: userRecord.uid } as const;
  } catch (error: any) {
    console.error("Error creating staff", error);
    if (error.code === "auth/email-already-exists") {
      return { ok: false, message: "That email is already registered." } as const;
    }
    return { ok: false, message: error.message || "Failed to create staff account" } as const;
  }
}

export async function handleUpdateComplaint(data: { adminToken: string; complaintId: string; updates: any }) {
  const isSuperAdmin = await verifySuperAdmin(data.adminToken);
  
  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminDb();
  if (!auth || !db) return { ok: false, message: "Server configuration missing" };
  
  try {
    const decodedToken = await auth.verifyIdToken(data.adminToken);
    const { FieldValue } = await import("firebase-admin/firestore");

    // Process SLA if closed
    if (data.updates.status === "closed") {
      data.updates.resolvedAt = FieldValue.serverTimestamp();
    }

    const batch = db.batch();
    
    // 1. Update Complaint
    const complaintRef = db.collection("complaints").doc(data.complaintId);
    batch.update(complaintRef, data.updates);

    // 2. Audit Log
    const auditRef = db.collection("audit_logs").doc();
    batch.set(auditRef, {
      complaintId: data.complaintId,
      action: "UPDATE_COMPLAINT",
      actorEmail: decodedToken.email || "unknown",
      details: data.updates,
      timestamp: FieldValue.serverTimestamp()
    });

    await batch.commit();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, message: err.message || "Failed to update complaint" };
  }
}

export async function handleDeleteComplaints(data: { adminToken: string; complaintIds: string[] }) {
  const isSuperAdmin = await verifySuperAdmin(data.adminToken);
  if (!isSuperAdmin) {
    return { ok: false, message: "Only Central Dispatchers can delete complaints." };
  }

  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminDb();
  if (!auth || !db) return { ok: false, message: "Server configuration missing" };

  try {
    const decodedToken = await auth.verifyIdToken(data.adminToken);
    const { FieldValue } = await import("firebase-admin/firestore");
    const batch = db.batch();
    
    // 1. Delete Complaints
    for (const id of data.complaintIds) {
      batch.delete(db.collection("complaints").doc(id));
    }

    // 2. Audit Log
    const auditRef = db.collection("audit_logs").doc();
    batch.set(auditRef, {
      complaintId: null,
      action: "BULK_DELETE_COMPLAINTS",
      actorEmail: decodedToken.email || "unknown",
      details: { deletedIds: data.complaintIds },
      timestamp: FieldValue.serverTimestamp()
    });

    await batch.commit();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, message: err.message || "Failed to delete complaints" };
  }
}

export async function handleToggleStaffStatus(data: { adminToken: string; staffId: string; status: "active" | "suspended" }) {
  const isSuperAdmin = await verifySuperAdmin(data.adminToken);
  if (!isSuperAdmin) {
    return { ok: false, message: "Unauthorized. Only Central Dispatchers can manage staff." };
  }

  const db = getFirebaseAdminDb();
  if (!db) return { ok: false, message: "Server configuration missing" };

  try {
    await db.collection("admins").doc(data.staffId).update({ status: data.status });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, message: err.message || "Failed to update staff status" };
  }
}

export async function handleGetStaff(adminToken: string) {
  const isSuperAdmin = await verifySuperAdmin(adminToken);
  if (!isSuperAdmin) {
    throw new Error("Unauthorized. Only Central Dispatchers can manage staff.");
  }

  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Server configuration missing");

  const snapshot = await db.collection("admins").get();
  
  // Need to filter out documents that have 'uid' fields, as they are duplicate
  // 'email' based documents, or just return all and deduplicate. Let's deduplicate by email.
  const staffMap = new Map<string, any>();
  
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const email = data.email || doc.id; // Fallback to doc ID if email not stored
    
    // If we haven't seen this email, or this doc has more info, store it
    if (!staffMap.has(email) || data.uid) {
      staffMap.set(email, {
        id: doc.id,
        email: email,
        role: data.role || "department_admin",
        department: data.department || null,
        squad_id: data.squad_id || null,
        status: data.status || "active",
      });
    }
  });

  return Array.from(staffMap.values());
}

export async function handleGetAdminRole(adminToken: string) {
  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminDb();
  if (!auth || !db) throw new Error("Server configuration missing");

  try {
    const decodedToken = await auth.verifyIdToken(adminToken);
    const adminDoc = await db.collection("admins").doc(decodedToken.uid).get();
    
    let adminData = null;
    if (adminDoc.exists) {
      adminData = adminDoc.data();
    } else if (decodedToken.email) {
      const emailDoc = await db.collection("admins").doc(decodedToken.email).get();
      if (emailDoc.exists) {
        adminData = emailDoc.data();
      }
    }
    
    const isMasterAdmin = 
      decodedToken.email === process.env.VITE_ADMIN_EMAIL ||
      decodedToken.email === process.env.ADMIN_EMAIL;

    if (adminData) {
      return {
        role: isMasterAdmin ? "superadmin" : adminData.role,
        department: adminData.department || null,
        squad_id: adminData.squad_id || null,
        agent_id: adminData.agent_id || null,
        status: adminData.status || "active",
      };
    }

    // Implicitly grant superadmin to VITE_ADMIN_EMAIL if doc doesn't exist yet
    if (isMasterAdmin) {
      return {
        role: "superadmin",
        department: null,
        squad_id: null,
        agent_id: null,
        status: "active",
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch admin role", error);
    throw error;
  }
}
