import "@tanstack/react-start/server-only";

import { getRequestHeader, getRequestIP } from "@tanstack/start-server-core/request-response";

import {
  calculatePriority,
  generateTrackingToken,
  getDepartmentForCategory,
  getDistanceMeters,
  sanitiseText,
  type CategoryId,
  type Coords,
} from "../civic-logic";
import { FieldValue, getFirebaseAdminDb } from "../firebase-admin.server";
import {
  checkServerReportRateLimit,
  recordServerReportSubmission,
} from "../server-rate-limit.server";
import type { SubmitComplaintInput } from "./complaints.functions";

const DUPLICATE_RADIUS_METERS = 50;

type DuplicateCandidate = {
  id: string;
  coordinates?: Coords | null;
};

function getEnv(name: string) {
  return process.env[name] || import.meta.env[name];
}

async function verifyRecaptcha(token: string) {
  const secret = getEnv("RECAPTCHA_SECRET_KEY");

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Server reCAPTCHA secret is not configured.");
    }
    console.warn("RECAPTCHA_SECRET_KEY is missing; skipping verification outside production.");
    return;
  }

  const params = new URLSearchParams();
  params.set("secret", secret);
  params.set("response", token);

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!response.ok) {
    throw new Error("Could not verify CAPTCHA. Please try again.");
  }

  const result = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
  if (!result.success) {
    console.warn("reCAPTCHA verification failed", result["error-codes"]);
    throw new Error("CAPTCHA verification failed. Please try again.");
  }
}

export async function handleSendReceiptEmail(data: { token: string; email: string; base64Image: string }) {
  if (!data.email) return { ok: false };
  try {
    const { sendSubmissionEmail } = await import("../email.server");
    await sendSubmissionEmail(data.email, data.token, "Your Local Issue", "various", null, data.base64Image);
    return { ok: true };
  } catch (err) {
    console.error("Failed to send receipt email:", err);
    return { ok: false };
  }
}

async function uploadBase64ToCloudinary(base64: string): Promise<string> {
  const cloudName = getEnv("VITE_CLOUDINARY_CLOUD_NAME");
  const uploadPreset = getEnv("VITE_CLOUDINARY_UPLOAD_PRESET");
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary configuration missing on server.");
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const formData = new FormData();
  formData.append("file", base64);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Cloudinary upload failed on server:", errorData);
    throw new Error(errorData.error?.message || "Image upload failed");
  }

  const data = await response.json();
  return data.secure_url.replace("/upload/", "/upload/w_1000,f_auto,q_auto/");
}

function getRateLimitKey(clientId?: string) {
  let ip = "unknown";
  try {
    ip =
      getRequestIP({ xForwardedFor: true }) ||
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      getRequestHeader("cf-connecting-ip") ||
      "unknown";
  } catch {
    ip = "unknown";
  }

  return `${ip}:${clientId || "anonymous-device"}`;
}

async function findDuplicateWithAdmin(category: CategoryId, coordinates: Coords) {
  const db = getFirebaseAdminDb();
  if (!db) return null;

  const snapshot = await db
    .collection("complaints")
    .where("category", "==", category)
    .where("status", "==", "open")
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data() as DuplicateCandidate;
    if (!data.coordinates) continue;
    const distance = getDistanceMeters(
      coordinates.lat,
      coordinates.lng,
      data.coordinates.lat,
      data.coordinates.lng,
    );
    if (distance < DUPLICATE_RADIUS_METERS) return doc.id;
  }

  return null;
}

function getRestConfig() {
  const projectId = getEnv("FIREBASE_PROJECT_ID") || getEnv("VITE_FIREBASE_PROJECT_ID");
  const apiKey = getEnv("VITE_FIREBASE_API_KEY");
  if (!projectId || !apiKey) {
    throw new Error("Firebase server fallback is not configured.");
  }
  return { projectId, apiKey };
}

function readNumberField(field: unknown): number | undefined {
  if (!field || typeof field !== "object") return undefined;
  if ("doubleValue" in field) return Number(field.doubleValue);
  if ("integerValue" in field) return Number(field.integerValue);
  return undefined;
}

async function findDuplicateWithRest(category: CategoryId, coordinates: Coords) {
  const { projectId, apiKey } = getRestConfig();
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "complaints" }],
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: "category" },
                    op: "EQUAL",
                    value: { stringValue: category },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: "status" },
                    op: "EQUAL",
                    value: { stringValue: "open" },
                  },
                },
              ],
            },
          },
        },
      }),
    },
  );

  if (!response.ok) {
    console.warn("Duplicate check fallback failed", await response.text());
    return null;
  }

  const rows = (await response.json()) as Array<{
    document?: {
      name?: string;
      fields?: {
        coordinates?: {
          mapValue?: {
            fields?: {
              lat?: unknown;
              lng?: unknown;
            };
          };
        };
      };
    };
  }>;
  for (const row of rows) {
    const document = row.document;
    const coordFields = document?.fields?.coordinates?.mapValue?.fields;
    const lat = readNumberField(coordFields?.lat);
    const lng = readNumberField(coordFields?.lng);
    if (lat == null || lng == null) continue;
    const distance = getDistanceMeters(coordinates.lat, coordinates.lng, lat, lng);
    if (distance < DUPLICATE_RADIUS_METERS) {
      return String(document?.name).split("/").pop() || null;
    }
  }

  return null;
}

async function findDuplicate(category: CategoryId, coordinates: Coords | null) {
  if (!coordinates || category === "other") return null;

  try {
    if (getFirebaseAdminDb()) {
      const adminDuplicate = await findDuplicateWithAdmin(category, coordinates);
      return adminDuplicate;
    }
  } catch (error) {
    console.warn("Admin duplicate check failed", error);
  }

  return findDuplicateWithRest(category, coordinates);
}

function buildComplaintDocument(input: SubmitComplaintInput, token: string, photoURL: string | null) {
  const description = sanitiseText(input.description);
  return {
    category: input.category,
    location: sanitiseText(input.location),
    coordinates: input.coordinates,
    description,
    photoURL,
    timestamp: FieldValue.serverTimestamp(),
    status: "open",
    priority: calculatePriority(description),
    department: getDepartmentForCategory(input.category),
    schemaVersion: 2,
    token,
    isAnonymous: input.isAnonymous,
    upvotes: 0,
    reporterEmail: input.email || null,
    subscriberEmails: [],
  };
}

async function createComplaintWithAdmin(input: SubmitComplaintInput, token: string, photoURL: string | null) {
  const db = getFirebaseAdminDb();
  if (!db) return null;

  const docRef = await db.collection("complaints").add(buildComplaintDocument(input, token, photoURL));
  return docRef.id;
}

function toRestFields(input: SubmitComplaintInput, token: string, photoURL: string | null) {
  const description = sanitiseText(input.description);
  const department = getDepartmentForCategory(input.category);
  const priority = calculatePriority(description);

  return {
    category: { stringValue: input.category },
    location: { stringValue: sanitiseText(input.location) },
    coordinates: input.coordinates
      ? {
          mapValue: {
            fields: {
              lat: { doubleValue: input.coordinates.lat },
              lng: { doubleValue: input.coordinates.lng },
            },
          },
        }
      : { nullValue: null },
    description: { stringValue: description },
    photoURL: photoURL ? { stringValue: photoURL } : { nullValue: null },
    timestamp: { timestampValue: new Date().toISOString() },
    status: { stringValue: "open" },
    priority: { stringValue: priority },
    department: department ? { stringValue: department } : { nullValue: null },
    schemaVersion: { integerValue: "2" },
    token: { stringValue: token },
    isAnonymous: { booleanValue: input.isAnonymous },
    upvotes: { integerValue: "0" },
    reporterEmail: input.email ? { stringValue: input.email } : { nullValue: null },
    subscriberEmails: { arrayValue: { values: [] } },
  };
}

async function createComplaintWithRest(input: SubmitComplaintInput, token: string, photoURL: string | null) {
  const { projectId, apiKey } = getRestConfig();
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/complaints?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fields: toRestFields(input, token, photoURL) }),
    },
  );

  if (!response.ok) {
    console.error("Complaint create fallback failed", await response.text());
    throw new Error("Failed to submit. Please check your connection and try again.");
  }

  const result = (await response.json()) as { name?: string };
  const id = result.name?.split("/").pop();
  if (!id) throw new Error("Complaint was submitted but no document id was returned.");
  return id;
}

async function createComplaint(input: SubmitComplaintInput, token: string, photoURL: string | null) {
  try {
    if (getFirebaseAdminDb()) {
      const adminId = await createComplaintWithAdmin(input, token, photoURL);
      if (adminId) return adminId;
    }
  } catch (error) {
    console.warn("Admin complaint create failed; trying compatibility fallback.", error);
  }

  return createComplaintWithRest(input, token, photoURL);
}

export async function handleSubmitComplaint(data: SubmitComplaintInput) {
  const rateLimitKey = getRateLimitKey(data.clientId);
  const rateLimit = checkServerReportRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    throw new Error("You have reached the limit of 24 reports for today.");
  }

  await verifyRecaptcha(data.captchaToken);

  const duplicateIssueId = await findDuplicate(data.category, data.coordinates);
  if (duplicateIssueId) {
    return {
      ok: false as const,
      duplicateIssueId,
      message: "A similar issue has already been reported nearby.",
    };
  }

  let photoURL: string | null = null;
  if (data.photoBase64) {
    try {
      photoURL = await uploadBase64ToCloudinary(data.photoBase64);
    } catch (e) {
      console.error("Server upload error:", e);
      throw new Error("Failed to upload the image. Please try again.");
    }
  }

  const token = generateTrackingToken();
  const id = await createComplaint(data, token, photoURL);
  recordServerReportSubmission(rateLimitKey);

  // Email sending is now deferred to handleSendReceiptEmail which attaches the card image
  // if (data.email) {
  //   import("../email.server")
  //     .then((m) => m.sendSubmissionEmail(data.email!, token, data.location, data.category, photoURL))
  //     .catch((err) => console.error("Failed to load email service:", err));
  // }

  return {
    ok: true as const,
    id,
    token,
    remaining: Math.max(0, rateLimit.remaining - 1),
  };
}

export async function handleUpvoteComplaint(id: string, email?: string) {
  const db = await getFirebaseAdminDb();
  if (!db) throw new Error("Database not initialized");
  const docRef = db.collection("complaints").doc(id);
  
  const updates: any = { upvotes: FieldValue.increment(1) };
  if (email) {
    updates.subscriberEmails = FieldValue.arrayUnion(email);
  }
  
  await docRef.update(updates);
  return { ok: true, id };
}
