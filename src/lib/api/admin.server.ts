import "@tanstack/react-start/server-only";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "../firebase-admin.server";
import { getAdminEmail, getAdminUsername, getAppDomain, getAppUrl, getEnv } from "../env.server";
import type { CreateStaffInput } from "./admin.functions";

// ============================================================
// Authorization helpers
// ============================================================

interface AdminIdentity {
  uid: string;
  email: string | undefined;
  role: string | null;
  department: string | null;
  isMasterAdmin: boolean;
}

/**
 * Decode a Firebase ID token and resolve the actor's admin role.
 * Does NOT enforce any specific role — callers should check themselves.
 */
async function resolveAdminIdentity(token: string): Promise<AdminIdentity> {
  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminDb();
  if (!auth || !db) {
    throw new Error("Server not configured for admin operations.");
  }

  const decodedToken = await auth.verifyIdToken(token);
  const uid = decodedToken.uid;
  const email = decodedToken.email;

  // Check role in firestore (by UID first, then by email as fallback)
  let role: string | null = null;
  let department: string | null = null;
  let status: string | null = null;

  const adminDoc = await db.collection("admins").doc(uid).get();
  if (adminDoc.exists) {
    const data = adminDoc.data()!;
    role = data.role || null;
    department = data.department || null;
    status = data.status || null;
  } else if (email) {
    const emailDoc = await db.collection("admins").doc(email).get();
    if (emailDoc.exists) {
      const data = emailDoc.data()!;
      role = data.role || null;
      department = data.department || null;
      status = data.status || null;
    }
  }

  // Check if this is the master admin (env-configured superadmin)
  const domain = getAppDomain();
  const adminEmail = getAdminEmail();
  const adminUsername = getAdminUsername();

  const isMasterAdmin =
    (!!adminEmail && email === adminEmail) ||
    (!!adminUsername && email === `${adminUsername}@${domain}.admin`);

  // Master admin always gets superadmin role
  if (isMasterAdmin) {
    role = "superadmin";
  }

  if (status === "suspended") {
    throw new Error("Your account has been suspended by the administrator.");
  }

  return { uid, email, role, department, isMasterAdmin };
}

/**
 * Verify that the actor is a superadmin or admin (Central Dispatcher).
 * Used for operations like staff management, bulk delete, etc.
 */
async function verifyAdminOrAbove(token: string): Promise<AdminIdentity> {
  const identity = await resolveAdminIdentity(token);
  if (identity.role !== "superadmin" && identity.role !== "admin") {
    throw new Error("Unauthorized. Only Central Dispatchers can perform this action.");
  }
  return identity;
}

/**
 * Verify that the actor is specifically a superadmin.
 * Used for destructive operations like bulk delete.
 */
async function verifySuperAdminOnly(token: string): Promise<AdminIdentity> {
  const identity = await resolveAdminIdentity(token);
  if (identity.role !== "superadmin") {
    throw new Error("Unauthorized. Only Super Admins can perform this action.");
  }
  return identity;
}

/**
 * Verify that the actor has any admin role (including department_admin).
 * Used for operations like updating complaints within scope.
 */
async function verifyAnyAdmin(token: string): Promise<AdminIdentity> {
  const identity = await resolveAdminIdentity(token);
  if (!identity.role) {
    throw new Error("Unauthorized. No admin role found for this account.");
  }
  return identity;
}

// Legacy compat wrapper: returns boolean like the old verifySuperAdmin
async function isAdminOrAbove(token: string): Promise<boolean> {
  try {
    await verifyAdminOrAbove(token);
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// Staff Management
// ============================================================

export async function handleCreateStaff(data: CreateStaffInput) {
  let identity: AdminIdentity;
  try {
    identity = await verifyAdminOrAbove(data.adminToken);
  } catch {
    return {
      ok: false,
      message: "Unauthorized. Only Central Dispatchers can create staff.",
    } as const;
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
    const existingInvite = await db
      .collection("invitations")
      .where("email", "==", data.email)
      .where("status", "==", "pending")
      .get();
    if (!existingInvite.empty) {
      return { ok: false, message: "A pending invitation already exists for this email." } as const;
    }

    const { FieldValue } = await import("firebase-admin/firestore");
    const crypto = await import("crypto");
    const token = crypto.randomBytes(32).toString("hex");

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
      actorEmail: identity.email || "unknown",
      details: { email: data.email, role: data.role, department: data.department },
      timestamp: FieldValue.serverTimestamp(),
    });

    try {
      const appUrl = getAppUrl();
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

export async function handleRespondToInvitation(
  token: string,
  action: "accept" | "reject",
  password?: string,
) {
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

// ============================================================
// Complaint Management
// ============================================================

export async function handleUpdateComplaint(data: {
  adminToken: string;
  complaintId: string;
  updates: any;
}) {
  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminDb();
  if (!auth || !db) return { ok: false, message: "Server configuration missing" };

  try {
    // Resolve actor identity and verify they have admin access
    const identity = await verifyAnyAdmin(data.adminToken);
    const { FieldValue } = await import("firebase-admin/firestore");

    const complaintRef = db.collection("complaints").doc(data.complaintId);

    // Fetch current complaint to enforce department scoping and email triggers
    const snap = await complaintRef.get();
    if (!snap.exists) {
      return { ok: false, message: "Complaint not found." };
    }
    const previousState = snap.data()!;

    // Sanitize updates to prevent mass assignment (Elite Audit Fix)
    const allowedFields = ["status", "department", "description"];
    const sanitizedUpdates: Record<string, any> = {};
    for (const key of Object.keys(data.updates)) {
      if (allowedFields.includes(key)) {
        sanitizedUpdates[key] = data.updates[key];
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return { ok: false, message: "No valid fields provided for update." };
    }

    // Department admins and field workers can only update complaints in their department
    if (
      (identity.role === "department_admin" || identity.role === "field_worker") &&
      identity.department
    ) {
      if (previousState.department !== identity.department) {
        return {
          ok: false,
          message: "You can only update complaints assigned to your department.",
        };
      }

      // Department admins cannot reassign complaints to other departments
      if (sanitizedUpdates.department && sanitizedUpdates.department !== identity.department) {
        return { ok: false, message: "You cannot reassign complaints to other departments." };
      }
    }

    // Process SLA if closed
    if (sanitizedUpdates.status === "closed") {
      sanitizedUpdates.resolvedAt = FieldValue.serverTimestamp();
    }

    const batch = db.batch();

    // 1. Update Complaint
    batch.update(complaintRef, sanitizedUpdates);

    // 2. Audit Log
    const auditRef = db.collection("audit_logs").doc();
    batch.set(auditRef, {
      complaintId: data.complaintId,
      action: "UPDATE_COMPLAINT",
      actorEmail: identity.email || "unknown",
      details: sanitizedUpdates,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // 3. Trigger Emails in background (only when transitioning to closed)
    if (sanitizedUpdates.status === "closed" && previousState.status !== "closed") {
      const emailsToSend = new Set<string>();
      if (previousState.reporterEmail) emailsToSend.add(previousState.reporterEmail);
      if (Array.isArray(previousState.subscriberEmails)) {
        previousState.subscriberEmails.forEach((email: string) => emailsToSend.add(email));
      }

      if (emailsToSend.size > 0) {
        import("../email.server")
          .then((m) =>
            m.sendResolutionEmail(
              Array.from(emailsToSend),
              previousState?.token || data.complaintId,
              previousState.location,
              previousState.category,
            ),
          )
          .catch((err) => console.error("Failed to load email service:", err));
      }
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, message: err.message || "Failed to update complaint" };
  }
}

export async function handleDeleteComplaints(data: { adminToken: string; complaintIds: string[] }) {
  let identity: AdminIdentity;
  try {
    identity = await verifySuperAdminOnly(data.adminToken);
  } catch {
    return { ok: false, message: "Only Super Admins can delete complaints." };
  }

  const db = getFirebaseAdminDb();
  if (!db) return { ok: false, message: "Server configuration missing" };

  try {
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
      actorEmail: identity.email || "unknown",
      details: { deletedIds: data.complaintIds },
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, message: err.message || "Failed to delete complaints" };
  }
}

// ============================================================
// Staff Status Management
// ============================================================

export async function handleToggleStaffStatus(data: {
  adminToken: string;
  staffId: string;
  status: "active" | "suspended";
}) {
  let identity: AdminIdentity;
  try {
    identity = await verifyAdminOrAbove(data.adminToken);
  } catch {
    return { ok: false, message: "Unauthorized. Only Central Dispatchers can manage staff." };
  }

  const db = getFirebaseAdminDb();
  if (!db) return { ok: false, message: "Server configuration missing" };

  try {
    const { FieldValue } = await import("firebase-admin/firestore");

    const targetDoc = await db.collection("admins").doc(data.staffId).get();
    if (!targetDoc.exists) return { ok: false, message: "Staff member not found." };

    const targetData = targetDoc.data()!;
    if (targetData.role === "superadmin") {
      return { ok: false, message: "Cannot modify a superadmin account." };
    }

    if (targetData.email === identity.email || targetDoc.id === identity.uid) {
      return { ok: false, message: "You cannot suspend or reactivate your own account." };
    }

    await db.collection("admins").doc(data.staffId).update({ status: data.status });

    // Send suspension email if suspended
    if (data.status === "suspended") {
      try {
        const staffDoc = await db.collection("admins").doc(data.staffId).get();
        if (staffDoc.exists) {
          const staffData = staffDoc.data()!;
          const email = staffData.email || staffDoc.id;
          const { sendSuspensionEmail } = await import("../email.server");
          await sendSuspensionEmail(email, staffData.role || "staff", staffData.department || null);
        }
      } catch (err) {
        console.error("Failed to send suspension email:", err);
      }
    }

    // Audit log
    await db.collection("audit_logs").add({
      action: "TOGGLE_STAFF_STATUS",
      actorEmail: identity.email || "unknown",
      details: { staffId: data.staffId, newStatus: data.status },
      timestamp: FieldValue.serverTimestamp(),
    });

    return { ok: true };
  } catch (err: any) {
    return { ok: false, message: err.message || "Failed to update staff status" };
  }
}

export async function handleDeleteStaff(adminToken: string, staffId: string, email: string) {
  let identity: AdminIdentity;
  try {
    identity = await verifyAdminOrAbove(adminToken);
  } catch {
    return { ok: false, message: "Unauthorized. Only Central Dispatchers can delete staff." };
  }

  const db = getFirebaseAdminDb();
  const auth = getFirebaseAdminAuth();
  if (!db || !auth) return { ok: false, message: "Server configuration missing" };

  try {
    const { FieldValue } = await import("firebase-admin/firestore");

    const targetDoc = await db.collection("admins").doc(staffId).get();
    if (!targetDoc.exists) return { ok: false, message: "Staff member not found." };

    const targetData = targetDoc.data()!;
    if (targetData.role === "superadmin") {
      return { ok: false, message: "Cannot delete a superadmin account." };
    }

    if (targetData.email === identity.email || targetDoc.id === identity.uid) {
      return { ok: false, message: "You cannot delete your own account." };
    }

    // 1. Delete from Firestore
    await db.collection("admins").doc(staffId).delete();

    // 2. Try to delete from Firebase Auth (if the user exists)
    try {
      const userRecord = await auth.getUserByEmail(email);
      await auth.deleteUser(userRecord.uid);
    } catch (e: any) {
      if (e.code !== "auth/user-not-found") {
        console.error("Error deleting user from Firebase Auth:", e);
      }
    }

    // 3. Audit log
    await db.collection("audit_logs").add({
      action: "DELETE_STAFF",
      actorEmail: identity.email || "unknown",
      details: { staffId, email },
      timestamp: FieldValue.serverTimestamp(),
    });

    return { ok: true };
  } catch (err: any) {
    return { ok: false, message: err.message || "Failed to delete staff" };
  }
}

export async function handleGetStaff(adminToken: string) {
  await verifyAdminOrAbove(adminToken);

  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Server configuration missing");

  const snapshot = await db.collection("admins").get();

  // Deduplicate by email (some older docs use email as document ID)
  const staffMap = new Map<string, any>();

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const email = data.email || doc.id;

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
  await verifyAdminOrAbove(adminToken);

  const db = getFirebaseAdminDb();
  if (!db) return [];

  const snapshot = await db.collection("invitations").orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : null,
    };
  });
}

// ============================================================
// Admin Role Resolution
// ============================================================

export async function handleGetAdminRole(adminToken: string) {
  try {
    const identity = await resolveAdminIdentity(adminToken);

    if (!identity.role) {
      return null;
    }

    return {
      role: identity.role,
      department: identity.department,
      squad_id: null,
      agent_id: null,
      status: "active",
    };
  } catch (error: any) {
    // Check if it's a suspension error
    if (error.message?.includes("suspended")) {
      return { status: "suspended" } as any;
    }
    console.error("Failed to fetch admin role", error);
    throw error;
  }
}

// ============================================================
// Revoke Invite
// ============================================================
export async function handleRevokeInvite(
  adminToken: string,
  inviteId: string,
  reason: "mistake" | "revoked",
) {
  const identity = await verifyAdminOrAbove(adminToken);

  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Server not configured");

  const inviteRef = db.collection("invitations").doc(inviteId);
  const inviteDoc = await inviteRef.get();

  if (!inviteDoc.exists) throw new Error("Invitation not found.");
  const data = inviteDoc.data()!;

  const { FieldValue } = await import("firebase-admin/firestore");

  await inviteRef.delete();

  // Audit log
  await db.collection("audit_logs").add({
    action: "REVOKE_INVITE",
    actorEmail: identity.email || "unknown",
    details: { email: data.email, role: data.role, department: data.department },
    timestamp: FieldValue.serverTimestamp(),
  });

  if (data.status === "pending") {
    try {
      const { sendRevokeEmail } = await import("../email.server");
      await sendRevokeEmail(data.email, data.role, data.department, reason);
    } catch (err) {
      console.error("Failed to send revocation email:", err);
    }
  }

  return { ok: true };
}

// ============================================================
// Resend Invite
// ============================================================
export async function handleResendInvite(adminToken: string, inviteId: string) {
  const identity = await verifyAdminOrAbove(adminToken);

  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Server not configured");

  const inviteRef = db.collection("invitations").doc(inviteId);
  const inviteDoc = await inviteRef.get();

  if (!inviteDoc.exists) throw new Error("Invitation not found.");
  const data = inviteDoc.data()!;

  if (data.status !== "pending") {
    throw new Error("Can only resend pending invitations.");
  }

  const { FieldValue } = await import("firebase-admin/firestore");

  const appUrl = getAppUrl();
  const inviteLink = `${appUrl}/invite/${inviteId}`;

  const { sendStaffInvitationEmail } = await import("../email.server");
  await sendStaffInvitationEmail(data.email, data.role, data.department, inviteLink);

  // Audit log
  await db.collection("audit_logs").add({
    action: "RESEND_INVITE",
    actorEmail: identity.email || "unknown",
    details: { email: data.email, role: data.role, department: data.department },
    timestamp: FieldValue.serverTimestamp(),
  });

  return { ok: true };
}

// ============================================================
// Audit Logs
// ============================================================
export async function handleGetAuditLogs(adminToken: string, limit = 50, actionFilter?: string) {
  await verifyAdminOrAbove(adminToken);

  const db = getFirebaseAdminDb();
  if (!db) return [];

  let query: FirebaseFirestore.Query = db
    .collection("audit_logs")
    .orderBy("timestamp", "desc")
    .limit(limit);

  if (actionFilter && actionFilter !== "all") {
    query = db
      .collection("audit_logs")
      .where("action", "==", actionFilter)
      .orderBy("timestamp", "desc")
      .limit(limit);
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
  await verifyAdminOrAbove(adminToken);

  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Server not configured");

  // 1. Get all audit logs for this actor
  const auditSnapshot = await db
    .collection("audit_logs")
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
    (a) => a.action === "UPDATE_COMPLAINT" && a.details?.status === "closed",
  ).length;
  const lastActive = allActions.length > 0 ? allActions[0].timestamp : null;
  const recentActivity = allActions.slice(0, 10);

  // 2. Compute average resolution time from complaints resolved by this user
  let avgResolutionMs = 0;
  const resolvedComplaintIds = allActions
    .filter(
      (a) => a.action === "UPDATE_COMPLAINT" && a.details?.status === "closed" && a.complaintId,
    )
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
      } catch {
        /* skip */
      }
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

// ============================================================
// System Health (for Phase 7 dashboard)
// ============================================================
export async function handleGetSystemHealth(adminToken: string) {
  await verifySuperAdminOnly(adminToken);

  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Server not configured");

  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

  // 1. Get all complaints for analysis
  const complaintsSnap = await db.collection("complaints").get();
  const complaints = complaintsSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      status: d.status,
      department: d.department,
      category: d.category,
      timestamp: d.timestamp?.toMillis ? d.timestamp.toMillis() : null,
    };
  });

  // Orphaned: open + no department + older than 24h
  const orphaned = complaints.filter((c) => {
    if (c.status !== "open" || c.department) return false;
    if (!c.timestamp) return true;
    return now - c.timestamp > TWENTY_FOUR_HOURS;
  });

  // Stale: open + older than 7 days
  const stale = complaints.filter((c) => {
    if (c.status === "closed") return false;
    if (!c.timestamp) return false;
    return now - c.timestamp > SEVEN_DAYS;
  });

  // 2. Staff & invites counts
  const staffSnap = await db.collection("admins").get();
  const invitesSnap = await db.collection("invitations").where("status", "==", "pending").get();

  // 3. Env config checks
  const configStatus = {
    smtp: !!(getEnv("SMTP_HOST") && getEnv("SMTP_USER") && getEnv("SMTP_PASS")),
    cloudinary: !!(getEnv("VITE_CLOUDINARY_CLOUD_NAME") && getEnv("VITE_CLOUDINARY_UPLOAD_PRESET")),
    recaptcha: !!getEnv("RECAPTCHA_SECRET_KEY"),
    firebaseAdmin: !!(
      getEnv("FIREBASE_PROJECT_ID") &&
      getEnv("FIREBASE_CLIENT_EMAIL") &&
      getEnv("FIREBASE_PRIVATE_KEY")
    ),
  };

  // 4. Recent errors from audit logs (look for any with "error" or "fail" in details)
  const recentAuditSnap = await db
    .collection("audit_logs")
    .orderBy("timestamp", "desc")
    .limit(10)
    .get();

  const recentAudit = recentAuditSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      action: d.action,
      actorEmail: d.actorEmail,
      timestamp: d.timestamp?.toMillis ? d.timestamp.toMillis() : null,
    };
  });

  return JSON.parse(
    JSON.stringify({
      totalComplaints: complaints.length,
      openComplaints: complaints.filter((c) => c.status === "open").length,
      orphanedComplaints: orphaned.map((c) => ({
        id: c.id,
        category: c.category,
        timestamp: c.timestamp,
      })),
      staleComplaints: stale.map((c) => ({
        id: c.id,
        category: c.category,
        department: c.department,
        timestamp: c.timestamp,
        status: c.status,
      })),
      totalStaff: staffSnap.size,
      pendingInvites: invitesSnap.size,
      configStatus,
      recentAudit,
    }),
  );
}
