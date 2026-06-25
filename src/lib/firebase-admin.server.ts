import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";

let adminDb: Firestore | undefined;
let adminAuth: Auth | undefined;

/**
 * Load service account credentials.
 * 
 * Strategy (in order):
 * 1. Read firebase-service-account.json from project root (most reliable)
 * 2. Read from GOOGLE_APPLICATION_CREDENTIALS path
 * 3. Construct from individual FIREBASE_* env vars
 * 4. Fallback: manually parse .env.local for the individual vars
 */
function loadCredentials() {
  // Strategy 1: JSON file in project root
  const jsonPath = path.resolve(process.cwd(), "firebase-service-account.json");
  if (fs.existsSync(jsonPath)) {
    const content = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    return {
      projectId: content.project_id,
      clientEmail: content.client_email,
      privateKey: content.private_key,
    };
  }

  // Strategy 2: GOOGLE_APPLICATION_CREDENTIALS
  const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (gacPath && fs.existsSync(gacPath)) {
    const content = JSON.parse(fs.readFileSync(gacPath, "utf-8"));
    return {
      projectId: content.project_id,
      clientEmail: content.client_email,
      privateKey: content.private_key,
    };
  }

  // Strategy 3: Individual env vars
  let projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.VITE_FIREBASE_PROJECT_ID;
  let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Strip surrounding quotes from env vars (common issue)
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

  // Strategy 4: Manually parse .env.local
  try {
    const envLocalPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envLocalPath)) {
      const envContent = fs.readFileSync(envLocalPath, "utf-8");

      if (!projectId) {
        const m = envContent.match(/VITE_FIREBASE_PROJECT_ID=["']?([^"'\r\n]+)["']?/);
        if (m) projectId = m[1];
      }
      if (!clientEmail) {
        const m = envContent.match(/FIREBASE_CLIENT_EMAIL=["']?([^"'\r\n]+)["']?/);
        if (m) clientEmail = m[1];
      }
      if (!privateKey) {
        const m = envContent.match(/FIREBASE_PRIVATE_KEY=["']?(-----BEGIN[^"']*-----\\n)["']?/);
        if (m) privateKey = m[1].replace(/\\n/g, "\n");
      }
    }
  } catch (err) {
    console.warn("Failed to manually parse .env.local fallback", err);
  }

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
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
        "  1. firebase-service-account.json in project root\n" +
        "  2. GOOGLE_APPLICATION_CREDENTIALS env var\n" +
        "  3. FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY env vars\n" +
        "  4. .env.local file fallback"
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
