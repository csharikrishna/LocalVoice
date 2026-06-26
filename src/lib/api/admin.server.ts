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

    const domain = (import.meta.env.VITE_APP_NAME || process.env.VITE_APP_NAME || "LocalVoice").toLowerCase().replace(/\s+/g, "");
    if (
      decodedToken.email === import.meta.env.VITE_ADMIN_EMAIL ||
      decodedToken.email === process.env.VITE_ADMIN_EMAIL ||
      decodedToken.email === process.env.ADMIN_EMAIL ||
      ((import.meta.env.VITE_ADMIN_USERNAME || process.env.VITE_ADMIN_USERNAME) && decodedToken.email === `${import.meta.env.VITE_ADMIN_USERNAME || process.env.VITE_ADMIN_USERNAME}@${domain}.admin`)
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
    // Check if email already exists in auth
    try {
      await auth.getUserByEmail(data.email);
      return { ok: false, message: "That email is already registered." } as const;
    } catch (e: any) {
      if (e.code !== "auth/user-not-found") throw e;
    }

    // Check if an active invitation already exists
    const existingInvite = await db.collection("invitations").where("email", "==", data.email).where("status", "==", "pending").get();
    if (!existingInvite.empty) {
      return { ok: false, message: "A pending invitation already exists for this email." } as const;
    }

    const { FieldValue } = await import("firebase-admin/firestore");
    const crypto = await import("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    const decodedToken = await auth.verifyIdToken(data.adminToken);

    await db.collection("invitations").doc(token).set({
      email: data.email,
      role: data.role,
      department: data.department,
      token,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });

    // Audit log
    await db.collection("audit_logs").add({
      action: "INVITE_STAFF",
      actorEmail: decodedToken.email || "unknown",
      details: { email: data.email, role: data.role, department: data.department },
      timestamp: FieldValue.serverTimestamp(),
    });

    try {
      const appUrl = import.meta.env.VITE_APP_URL || process.env.VITE_APP_URL || "https://localvoicee.vercel.app";
      const inviteLink = `${appUrl}/invite/${token}`;
      const { sendStaffInvitationEmail } = await import("../email.server");
      await sendStaffInvitationEmail(data.email, data.role, data.department, inviteLink);
    } catch (emailError) {
      console.error("Invitation created, but failed to send email", emailError);
    }

    return { ok: true, uid: "invited" } as const;
  } catch (error: any) {
    console.error("Error creating staff invitation", error);
    return { ok: false, message: error.message || "Failed to send staff invitation" } as const;
  }
}

export async function handleGetInvitation(token: string) {
  const db = getFirebaseAdminDb();
  if (!db) return null;

  try {
    const doc = await db.collection("invitations").doc(token).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
      ...data,
      createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : null,
    } as Record<string, any>;
  } catch (err) {
    console.error("Error fetching invitation", err);
    return null;
  }
}

export async function handleRespondToInvitation(token: string, action: "accept" | "reject", password?: string) {
  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminDb();
  if (!auth || !db) return { ok: false, message: "Server configuration missing" };

  try {
    const docRef = db.collection("invitations").doc(token);
    const doc = await docRef.get();
    if (!doc.exists) return { ok: false, message: "Invalid or expired invitation." };

    const invite = doc.data()!;
    if (invite.status !== "pending") {
      return { ok: false, message: `This invitation has already been ${invite.status}.` };
    }

    const { FieldValue } = await import("firebase-admin/firestore");

    if (action === "reject") {
      await docRef.update({ status: "rejected" });
      await db.collection("audit_logs").add({
        action: "REJECT_INVITE",
        actorEmail: invite.email,
        details: { role: invite.role, department: invite.department },
        timestamp: FieldValue.serverTimestamp(),
      });
      return { ok: true };
    }

    if (action === "accept") {
      if (!password || password.length < 6) {
        return { ok: false, message: "A valid password is required to accept the invitation." };
      }

      // Create the user
      const userRecord = await auth.createUser({
        email: invite.email,
        password: password,
      });

      // Save to admins collection
      await db.collection("admins").doc(userRecord.uid).set({
        role: invite.role,
        department: invite.department,
        status: "active",
        email: invite.email,
      });

      await db.collection("admins").doc(invite.email).set({
        role: invite.role,
        department: invite.department,
        status: "active",
        uid: userRecord.uid,
      });

      // Mark invite as accepted
      await docRef.update({ status: "accepted" });

      // Audit log
      await db.collection("audit_logs").add({
        action: "ACCEPT_INVITE",
        actorEmail: invite.email,
        details: { role: invite.role, department: invite.department },
        timestamp: FieldValue.serverTimestamp(),
      });

      return { ok: true };
    }

    return { ok: false, message: "Invalid action." };
  } catch (err: any) {
    console.error("Error responding to invitation", err);
    return { ok: false, message: err.message || "Failed to process invitation." };
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

    const complaintRef = db.collection("complaints").doc(data.complaintId);
    
    // Fetch current state to check if we need to send emails
    let previousState = null;
    if (data.updates.status === "closed") {
      const snap = await complaintRef.get();
      if (snap.exists) {
        previousState = snap.data();
      }
    }

    const batch = db.batch();
    
    // 1. Update Complaint
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

    // 3. Trigger Emails in background
    if (data.updates.status === "closed" && previousState && previousState.status !== "closed") {
      const emailsToSend = new Set<string>();
      if (previousState.reporterEmail) emailsToSend.add(previousState.reporterEmail);
      if (Array.isArray(previousState.subscriberEmails)) {
        previousState.subscriberEmails.forEach((email: string) => emailsToSend.add(email));
      }
      
      if (emailsToSend.size > 0) {
        import("../email.server")
          .then((m) => m.sendResolutionEmail(Array.from(emailsToSend), previousState?.token || data.complaintId, previousState.location, previousState.category))
          .catch((err) => console.error("Failed to load email service:", err));
      }
    }

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

  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminDb();
  if (!auth || !db) return { ok: false, message: "Server configuration missing" };

  try {
    const decodedToken = await auth.verifyIdToken(data.adminToken);
    const { FieldValue } = await import("firebase-admin/firestore");

    await db.collection("admins").doc(data.staffId).update({ status: data.status });

    // Audit log
    await db.collection("audit_logs").add({
      action: "TOGGLE_STAFF_STATUS",
      actorEmail: decodedToken.email || "unknown",
      details: { staffId: data.staffId, newStatus: data.status },
      timestamp: FieldValue.serverTimestamp(),
    });

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

export async function handleGetInvites(adminToken: string) {
  const isSuperAdmin = await verifySuperAdmin(adminToken);
  if (!isSuperAdmin) {
    throw new Error("Unauthorized. Only Central Dispatchers can manage staff.");
  }

  const db = getFirebaseAdminDb();
  if (!db) return [];

  const snapshot = await db.collection("invitations").orderBy("createdAt", "desc").get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : null,
    };
  });
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
    
    const domain = (import.meta.env.VITE_APP_NAME || process.env.VITE_APP_NAME || "LocalVoice").toLowerCase().replace(/\s+/g, "");
    const isMasterAdmin = 
      decodedToken.email === import.meta.env.VITE_ADMIN_EMAIL ||
      decodedToken.email === process.env.VITE_ADMIN_EMAIL ||
      decodedToken.email === process.env.ADMIN_EMAIL ||
      ((import.meta.env.VITE_ADMIN_USERNAME || process.env.VITE_ADMIN_USERNAME) && decodedToken.email === `${import.meta.env.VITE_ADMIN_USERNAME || process.env.VITE_ADMIN_USERNAME}@${domain}.admin`);

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

// ============================================================
// Revoke Invite
// ============================================================
export async function handleRevokeInvite(adminToken: string, inviteId: string) {
  const isSuperAdmin = await verifySuperAdmin(adminToken);
  if (!isSuperAdmin) {
    throw new Error("Unauthorized. Only Central Dispatchers can revoke invites.");
  }

  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminDb();
  if (!auth || !db) throw new Error("Server not configured");

  const inviteRef = db.collection("invitations").doc(inviteId);
  const inviteDoc = await inviteRef.get();

  if (!inviteDoc.exists) throw new Error("Invitation not found.");
  const data = inviteDoc.data()!;

  const decodedToken = await auth.verifyIdToken(adminToken);
  const { FieldValue } = await import("firebase-admin/firestore");

  await inviteRef.delete();

  // Audit log
  await db.collection("audit_logs").add({
    action: "REVOKE_INVITE",
    actorEmail: decodedToken.email || "unknown",
    details: { email: data.email, role: data.role, department: data.department },
    timestamp: FieldValue.serverTimestamp(),
  });

  if (data.status === "pending") {
    try {
      const { sendRevokeEmail } = await import("../email.server");
      await sendRevokeEmail(data.email, data.role, data.department);
    } catch (e) {
      console.warn("Could not send revocation email:", e);
    }
  }

  return { ok: true };
}

// ============================================================
// Resend Invite
// ============================================================
export async function handleResendInvite(adminToken: string, inviteId: string) {
  const isSuperAdmin = await verifySuperAdmin(adminToken);
  if (!isSuperAdmin) {
    throw new Error("Unauthorized. Only Central Dispatchers can resend invites.");
  }

  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminDb();
  if (!auth || !db) throw new Error("Server not configured");

  const inviteRef = db.collection("invitations").doc(inviteId);
  const inviteDoc = await inviteRef.get();

  if (!inviteDoc.exists) throw new Error("Invitation not found.");
  const data = inviteDoc.data()!;

  if (data.status !== "pending") {
    throw new Error("Can only resend pending invitations.");
  }

  const decodedToken = await auth.verifyIdToken(adminToken);
  const { FieldValue } = await import("firebase-admin/firestore");

  const appUrl = import.meta.env.VITE_APP_URL || process.env.VITE_APP_URL || "https://localvoicee.vercel.app";
  const inviteLink = `${appUrl}/invite/${inviteId}`;

  const { sendStaffInvitationEmail } = await import("../email.server");
  await sendStaffInvitationEmail(data.email, data.role, data.department, inviteLink);

  // Audit log
  await db.collection("audit_logs").add({
    action: "RESEND_INVITE",
    actorEmail: decodedToken.email || "unknown",
    details: { email: data.email, role: data.role, department: data.department },
    timestamp: FieldValue.serverTimestamp(),
  });

  return { ok: true };
}

// ============================================================
// Audit Logs
// ============================================================
export async function handleGetAuditLogs(adminToken: string, limit = 50, actionFilter?: string) {
  const isSuperAdmin = await verifySuperAdmin(adminToken);
  if (!isSuperAdmin) {
    throw new Error("Unauthorized.");
  }

  const db = getFirebaseAdminDb();
  if (!db) return [];

  let query: FirebaseFirestore.Query = db.collection("audit_logs").orderBy("timestamp", "desc").limit(limit);

  if (actionFilter && actionFilter !== "all") {
    query = db.collection("audit_logs").where("action", "==", actionFilter).orderBy("timestamp", "desc").limit(limit);
  }

  const snapshot = await query.get();
  const rawLogs = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      action: d.action,
      actorEmail: d.actorEmail,
      details: d.details || {},
      complaintId: d.complaintId || null,
      timestamp: d.timestamp?.toMillis ? d.timestamp.toMillis() : null,
    };
  });

  return JSON.parse(JSON.stringify(rawLogs));
}

// ============================================================
// Staff Metrics
// ============================================================
export async function handleGetStaffMetrics(adminToken: string, staffEmail: string) {
  const isSuperAdmin = await verifySuperAdmin(adminToken);
  if (!isSuperAdmin) {
    throw new Error("Unauthorized.");
  }

  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Server not configured");

  // 1. Get all audit logs for this actor
  const auditSnapshot = await db.collection("audit_logs")
    .where("actorEmail", "==", staffEmail)
    .orderBy("timestamp", "desc")
    .limit(100)
    .get();

  const allActions = auditSnapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      action: d.action,
      details: d.details || {},
      complaintId: d.complaintId || null,
      timestamp: d.timestamp?.toMillis ? d.timestamp.toMillis() : null,
    };
  });

  const totalActions = allActions.length;
  const complaintsResolved = allActions.filter(
    (a) => a.action === "UPDATE_COMPLAINT" && a.details?.status === "closed"
  ).length;
  const lastActive = allActions.length > 0 ? allActions[0].timestamp : null;
  const recentActivity = allActions.slice(0, 10);

  // 2. Compute average resolution time from complaints resolved by this user
  let avgResolutionMs = 0;
  const resolvedComplaintIds = allActions
    .filter((a) => a.action === "UPDATE_COMPLAINT" && a.details?.status === "closed" && a.complaintId)
    .map((a) => a.complaintId!)
    .slice(0, 20);

  if (resolvedComplaintIds.length > 0) {
    let totalMs = 0;
    let count = 0;
    for (const cid of resolvedComplaintIds) {
      try {
        const cDoc = await db.collection("complaints").doc(cid).get();
        if (cDoc.exists) {
          const cData = cDoc.data()!;
          const created = cData.timestamp?.toMillis ? cData.timestamp.toMillis() : null;
          const resolved = cData.resolvedAt?.toMillis ? cData.resolvedAt.toMillis() : null;
          if (created && resolved) {
            totalMs += resolved - created;
            count++;
          }
        }
      } catch { /* skip */ }
    }
    if (count > 0) avgResolutionMs = Math.round(totalMs / count);
  }

  const rawResult = {
    totalActions,
    complaintsResolved,
    avgResolutionMs,
    lastActive,
    recentActivity,
  };

  return JSON.parse(JSON.stringify(rawResult));
}
