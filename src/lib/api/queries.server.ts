import "@tanstack/react-start/server-only";
import { getFirebaseAdminDb, getFirebaseAdminAuth } from "../firebase-admin.server";

// Helper to sanitize timestamps for JSON serialization
function serializeTimestamp(ts: any) {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate().toISOString(); // Firestore Admin Timestamp
  if (ts.seconds) return new Date(ts.seconds * 1000).toISOString();
  return ts;
}

// Recursively sanitize to catch any nested Timestamps or Geopoints
function sanitize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj.toDate && typeof obj.toDate === "function") return obj.toDate().toISOString();
  // If it's a Firestore GeoPoint (has latitude/longitude properties and is not a plain object)
  if (typeof obj === "object" && 'latitude' in obj && 'longitude' in obj && typeof obj.isEqual === 'function') {
    return { lat: obj.latitude, lng: obj.longitude };
  }
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (typeof obj === "object") {
    const res: any = {};
    for (const key in obj) {
      res[key] = sanitize(obj[key]);
    }
    return res;
  }
  return obj;
}

// Public complaint strips internal fields
function toPublicComplaint(doc: any) {
  const data = doc.data();
  return {
    id: doc.id,
    category: data.category || "other",
    location: data.location || "",
    description: data.description || "",
    coordinates: sanitize(data.coordinates) || null,
    photoURL: data.photoURL || null,
    status: data.status || "open",
    timestamp: serializeTimestamp(data.timestamp),
    upvotes: data.upvotes || 0,
    department: data.department || null,
    token: data.token || null,
  };
}

export async function handleGetPublicComplaints() {
  const db = getFirebaseAdminDb();
  if (!db) return [];
  const snapshot = await db.collection("complaints")
    .orderBy("timestamp", "desc")
    .limit(100)
    .get();
  return snapshot.docs.map(toPublicComplaint);
}

export async function handleGetTrendingComplaints() {
  const db = getFirebaseAdminDb();
  if (!db) return [];
  const snapshot = await db.collection("complaints")
    .orderBy("upvotes", "desc")
    .limit(5)
    .get();
  return snapshot.docs.map(toPublicComplaint);
}

export async function handleGetComplaintByToken(token: string) {
  const db = getFirebaseAdminDb();
  if (!db) return null;
  const snapshot = await db.collection("complaints")
    .where("token", "==", token)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  return toPublicComplaint(snapshot.docs[0]);
}

export async function handleGetMyReports(ids: string[]) {
  const db = getFirebaseAdminDb();
  if (!db || ids.length === 0) return [];
  
  // Firestore IN queries are limited to 10 items
  const results = [];
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    const snapshot = await db.collection("complaints")
      .where("__name__", "in", chunk)
      .get();
    results.push(...snapshot.docs.map(toPublicComplaint));
  }
  // Sort by timestamp desc since IN doesn't guarantee order
  return results.sort((a, b) => {
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

export async function handleGetAdminComplaints(adminToken: string) {
  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminDb();
  if (!auth || !db) throw new Error("Server not configured");

  const decodedToken = await auth.verifyIdToken(adminToken);
  
  // Fetch admin role
  const adminDoc = await db.collection("admins").doc(decodedToken.uid).get();
  let role = null;
  let department = null;
  
  if (adminDoc.exists) {
    role = adminDoc.data()?.role;
    department = adminDoc.data()?.department;
  } else if (decodedToken.email) {
    const emailDoc = await db.collection("admins").doc(decodedToken.email).get();
    if (emailDoc.exists) {
      role = emailDoc.data()?.role;
      department = emailDoc.data()?.department;
    }
  }

  const domain = (import.meta.env.VITE_APP_NAME || process.env.VITE_APP_NAME || "LocalVoice").toLowerCase().replace(/\s+/g, "");
  const isMasterAdmin = 
    decodedToken.email === import.meta.env.VITE_ADMIN_EMAIL ||
    decodedToken.email === process.env.VITE_ADMIN_EMAIL ||
    decodedToken.email === process.env.ADMIN_EMAIL ||
    ((import.meta.env.VITE_ADMIN_USERNAME || process.env.VITE_ADMIN_USERNAME) && decodedToken.email === `${import.meta.env.VITE_ADMIN_USERNAME || process.env.VITE_ADMIN_USERNAME}@${domain}.admin`);

  if (!role && isMasterAdmin) {
    role = "superadmin";
  }

  if (!role) {
    throw new Error("Unauthorized: User has no admin role");
  }

  // Build query based on scope
  let complaintsQuery: FirebaseFirestore.Query = db.collection("complaints");
  
  if (role === "department_admin" || role === "field_worker") {
    if (!department) throw new Error("Unauthorized: Department admin has no department assigned");
    complaintsQuery = complaintsQuery.where("department", "==", department);
  }

  const snapshot = await complaintsQuery.orderBy("timestamp", "desc").get();
  
  // Return FULL complaint data to admins, including internal fields if any
  // We use a deep clone to strip Firestore prototypes that break superjson serialization
  return snapshot.docs.map(doc => {
    const data = doc.data();

    return {
      id: doc.id,
      ...sanitize(data),
      timestamp: serializeTimestamp(data.timestamp), // ensure main timestamp is ISO
    };
  });
}
