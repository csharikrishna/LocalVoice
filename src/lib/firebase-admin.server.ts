import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let adminDb: Firestore | undefined;
let adminAuth: Auth | undefined;

/**
 * Load service account credentials.
 *
 * Strategy (in order — env vars first for serverless compatibility):
 * 1. Construct from individual FIREBASE_* env vars (works on Vercel, Railway, etc.)
 * 2. Read firebase-service-account.json from project root (local dev)
 * 3. Read from GOOGLE_APPLICATION_CREDENTIALS path (local dev / GCP)
 */
function loadCredentials() {
  // Strategy 1: Individual env vars (primary — works on all platforms)
  let projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.VITE_FIREBASE_PROJECT_ID;
  let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Strip surrounding quotes from env vars (common issue with .env files)
  if (clientEmail?.startsWith('"') && clientEmail?.endsWith('"')) {
    clientEmail = clientEmail.slice(1, -1);
  }
  if (privateKey?.startsWith('"') && privateKey?.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  // Strategy 2 & 3: File-based reads (local dev only)
  // Wrapped in try-catch because fs/path may not be fully available on
  // all serverless runtimes and the JSON file won't exist on Vercel.
  try {
    const fs = require("fs");
    const path = require("path");

    // Strategy 2: JSON file in project root
    const jsonPath = path.resolve(process.cwd(), "firebase-service-account.json");
    if (fs.existsSync(jsonPath)) {
      const content = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      return {
        projectId: content.project_id,
        clientEmail: content.client_email,
        privateKey: content.private_key,
      };
    }

    // Strategy 3: GOOGLE_APPLICATION_CREDENTIALS
    const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (gacPath && fs.existsSync(gacPath)) {
      const content = JSON.parse(fs.readFileSync(gacPath, "utf-8"));
      return {
        projectId: content.project_id,
        clientEmail: content.client_email,
        privateKey: content.private_key,
      };
    }
  } catch (err) {
    // File-based credential loading failed — expected on serverless
    console.warn("File-based credential loading unavailable:", (err as Error).message);
  }

  return null;
}

function ensureInitialized() {
  if (adminDb && adminAuth) return;

  if (getApps().length === 0) {
    const creds = loadCredentials();
    if (!creds) {
      console.error(
        "Firebase Admin SDK: No credentials found. Checked:\n" +
          "  1. FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY + FIREBASE_PROJECT_ID env vars\n" +
          "  2. firebase-service-account.json in project root\n" +
          "  3. GOOGLE_APPLICATION_CREDENTIALS env var",
      );
      throw new Error("Firebase Admin SDK credentials not found.");
    }

    initializeApp({
      credential: cert(creds),
    });
  }

  adminDb = getFirestore();
  adminAuth = getAuth();
}

export function getFirebaseAdminDb(): Firestore {
  ensureInitialized();
  return adminDb!;
}

export function getFirebaseAdminAuth(): Auth {
  ensureInitialized();
  return adminAuth!;
}

export { FieldValue };
